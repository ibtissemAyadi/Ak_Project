"""Outils (function calling) exposés au copilot IA — chaque fonction est
liée à l'utilisateur connecté via une fermeture (voir construire_outils) :
aucun outil ne peut faire plus que ce que cet utilisateur peut déjà faire
dans l'application (vérification de permission systématique, même règle que
HasModulePermission côté API REST classique).

Deux outils vont par paire pour toute action sensible (ex. création de
devis) : proposer_* ne touche jamais la base, il calcule/valide et enregistre
un brouillon (PropositionAction) ; confirmer_* n'exécute l'écriture réelle
qu'après confirmation explicite de l'utilisateur, en relisant exactement le
brouillon proposé (jamais ce que le modèle a pu reformuler)."""

from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError

from affaires.services import calculer_montant_en_attente, calculer_prevision_revenus, lister_affaires_a_risque
from crm.models import Client
from devis.models import STATUT_CHOICES as DEVIS_STATUT_CHOICES
from devis.models import Devis, LigneDevis
from devis.pdf_theme import formater_montant
from utilisateurs.permissions import utilisateur_a_permission

from .models import PropositionAction

DUREE_VALIDITE_PROPOSITION = timedelta(minutes=30)


def construire_outils(user):
    """Retourne la liste des fonctions-outils, chacune fermée sur `user`."""

    def rechercher_client(nom: str) -> dict:
        """Recherche un client par raison sociale (recherche partielle, insensible à la casse).

        Args:
            nom: Tout ou partie du nom du client recherché.
        """
        if not utilisateur_a_permission(user, 'clients', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les clients."}

        clients = Client.objects.filter(raison_sociale__icontains=nom)[:10]
        if not clients:
            return {'resultats': [], 'message': f'Aucun client trouvé pour "{nom}".'}
        return {
            'resultats': [
                {
                    'id_client': str(c.id_client),
                    'raison_sociale': c.raison_sociale,
                    'statut': c.statut,
                    'ville_pays': ', '.join(filter(None, [c.adresse, c.pays])) or None,
                }
                for c in clients
            ],
        }

    def ca_previsionnel(nombre_de_mois: int = 6) -> dict:
        """Donne le chiffre d'affaires prévisionnel, réparti par mois, basé sur
        la date de fin prévue des affaires en cours (non terminées).

        Args:
            nombre_de_mois: Nombre de mois à couvrir à partir du mois courant (1 à 24).
        """
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les affaires."}

        points = calculer_prevision_revenus(nombre_de_mois)
        return {'previsions': [{'mois': p['mois'], 'montant_prevu_eur': float(p['montant_prevu'])} for p in points]}

    def montant_en_attente() -> dict:
        """Donne le montant total (en euros) encore à encaisser sur l'ensemble
        des affaires dont la facture n'est pas payée."""
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les affaires."}

        return {'montant_en_attente_eur': float(calculer_montant_en_attente())}

    def affaires_a_risque(horizon_jours: int = 14) -> dict:
        """Liste les affaires en cours (non terminées) qui sont déjà en retard
        sur leur date de fin prévue, ou dont l'échéance approche dans les
        prochains jours.

        Args:
            horizon_jours: Fenêtre en jours pour considérer une échéance comme "proche" (ex. 14).
        """
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les affaires."}

        affaires = lister_affaires_a_risque(horizon_jours=horizon_jours)
        if not affaires:
            return {'affaires': [], 'message': "Aucune affaire en retard ou proche de son échéance."}
        return {
            'affaires': [
                {
                    'numero_affaire': a['numero_affaire'],
                    'client': a['client'],
                    'date_fin_prevue': a['date_fin_prevue'].isoformat(),
                    'statut': 'en retard' if a['en_retard'] else 'échéance proche',
                    'avancement_pourcent': a['etat_avancement'],
                }
                for a in affaires
            ],
        }

    def lister_devis(statut: str = '') -> dict:
        """Liste les devis, éventuellement filtrés par statut.

        Args:
            statut: Un des statuts suivants (laisser vide pour tous) : Brouillon, En_preparation, A_valider, Envoye, Accepte, Refuse, Annule.
        """
        if not utilisateur_a_permission(user, 'devis', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les devis."}

        statuts_valides = dict(DEVIS_STATUT_CHOICES)
        queryset = Devis.objects.filter(est_courante=True).select_related('client')
        if statut:
            if statut not in statuts_valides:
                return {'erreur': f'Statut inconnu "{statut}". Valeurs possibles : {", ".join(statuts_valides)}.'}
            queryset = queryset.filter(statut=statut)

        devis = list(queryset.order_by('-date_creation')[:15])
        return {
            'devis': [
                {
                    'numero': d.numero,
                    'client': d.client.raison_sociale,
                    'objet': d.objet,
                    'statut': d.get_statut_display(),
                    'montant_ttc_eur': float(d.montant_ttc),
                }
                for d in devis
            ],
        }

    def proposer_creation_devis(client_nom: str, objet: str, montant_ht: float, description_prestation: str = '') -> dict:
        """Prépare (sans l'enregistrer) un brouillon de nouveau devis pour un
        client existant. NE crée PAS le devis — retourne un identifiant de
        proposition à confirmer explicitement par l'utilisateur ensuite via
        confirmer_creation_devis. Après avoir appelé cet outil, arrêtez-vous et
        demandez confirmation à l'utilisateur avant toute autre action.

        Args:
            client_nom: Nom (raison sociale) du client, doit correspondre à un client existant.
            objet: Objet/titre du devis (ex. "Étude structure bâtiment A").
            montant_ht: Montant hors taxes proposé, en euros.
            description_prestation: Description de la ligne de prestation (par défaut, reprend l'objet).
        """
        if not utilisateur_a_permission(user, 'devis', 'creation'):
            return {'erreur': "Vous n'avez pas la permission de créer des devis."}

        clients = list(Client.objects.filter(raison_sociale__icontains=client_nom)[:2])
        if not clients:
            return {'erreur': f'Aucun client trouvé pour "{client_nom}". Vérifiez le nom exact avec rechercher_client.'}
        if len(clients) > 1:
            return {'erreur': f'Plusieurs clients correspondent à "{client_nom}". Précisez le nom exact.'}
        client = clients[0]

        try:
            montant = Decimal(str(montant_ht))
        except InvalidOperation:
            return {'erreur': 'Montant invalide.'}
        if montant <= 0:
            return {'erreur': 'Le montant doit être positif.'}

        description = (
            f'Brouillon de devis de {formater_montant(montant)} HT pour {client.raison_sociale} — "{objet}".'
        )

        proposition = PropositionAction.objects.create(
            utilisateur=user,
            type_action='creation_devis',
            payload={
                'id_client': str(client.id_client),
                'objet': objet,
                'montant_ht': str(montant),
                'description_prestation': description_prestation or objet,
            },
            description=description,
        )
        return {
            'proposition_id': str(proposition.id_proposition),
            'resume': description,
            'instruction': "Présentez ce résumé à l'utilisateur et demandez-lui de confirmer avant d'appeler confirmer_creation_devis.",
        }

    def confirmer_creation_devis(proposition_id: str) -> dict:
        """Crée réellement le devis brouillon correspondant à une proposition
        déjà présentée à l'utilisateur. N'appelez cet outil QUE si l'utilisateur
        vient de confirmer explicitement (ex. "oui", "confirmer", "vas-y") en
        réponse à la proposition — jamais dans le même tour que
        proposer_creation_devis.

        Args:
            proposition_id: L'identifiant de proposition renvoyé par proposer_creation_devis.
        """
        if not utilisateur_a_permission(user, 'devis', 'creation'):
            return {'erreur': "Vous n'avez pas la permission de créer des devis."}

        try:
            proposition = PropositionAction.objects.get(
                id_proposition=proposition_id, utilisateur=user, type_action='creation_devis',
            )
        except (PropositionAction.DoesNotExist, ValidationError):
            return {'erreur': "Proposition introuvable ou invalide. Refaites une proposition avec proposer_creation_devis."}

        if proposition.executee:
            return {'erreur': 'Cette proposition a déjà été confirmée précédemment.'}
        if datetime.now(proposition.date_creation.tzinfo) - proposition.date_creation > DUREE_VALIDITE_PROPOSITION:
            return {'erreur': 'Cette proposition a expiré (plus de 30 minutes). Refaites une proposition.'}

        payload = proposition.payload
        try:
            client = Client.objects.get(id_client=payload['id_client'])
        except Client.DoesNotExist:
            return {'erreur': 'Le client associé à cette proposition n\'existe plus.'}

        devis = Devis.objects.create(client=client, charge_affaires=user, objet=payload['objet'])
        LigneDevis.objects.create(
            devis=devis,
            description=payload['description_prestation'],
            quantite=Decimal('1'),
            prix_unitaire=Decimal(payload['montant_ht']),
        )
        devis.recalculer_montants()

        proposition.executee = True
        proposition.save(update_fields=['executee'])

        return {
            'succes': True,
            'numero_devis': devis.numero,
            'message': f'Devis {devis.numero} créé en Brouillon pour {client.raison_sociale}.',
        }

    return [
        rechercher_client,
        ca_previsionnel,
        montant_en_attente,
        affaires_a_risque,
        lister_devis,
        proposer_creation_devis,
        confirmer_creation_devis,
    ]
