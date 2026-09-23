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

from affaires.services import calculer_montant_en_attente, calculer_prevision_revenus, lister_affaires_a_risque
from crm.models import Client
from devis.models import STATUT_CHOICES as DEVIS_STATUT_CHOICES
from devis.models import Devis, LigneDevis
from devis.pdf_theme import formater_montant
from documents.models import CATEGORIE_CHOICES as DOCUMENT_CATEGORIE_CHOICES
from documents.models import Document
from factures.models import STATUT_CHOICES as FACTURE_STATUT_CHOICES
from factures.models import Facture
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

    def lister_documents(categorie: str = '', recherche: str = '') -> dict:
        """Liste les documents de la bibliothèque documentaire (fichiers importés).

        Args:
            categorie: Catégorie (vide = toutes) : contract, technical, financial, legal, report, other.
            recherche: Mot-clé à chercher dans la désignation du document.
        """
        if not utilisateur_a_permission(user, 'documents', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les documents."}

        categories = dict(DOCUMENT_CATEGORIE_CHOICES)
        queryset = Document.objects.all()
        if categorie:
            if categorie not in categories:
                return {'erreur': f'Catégorie inconnue "{categorie}". Valeurs possibles : {", ".join(categories)}.'}
            queryset = queryset.filter(categorie=categorie)
        if recherche:
            queryset = queryset.filter(designation__icontains=recherche)

        total = queryset.count()
        documents = list(queryset[:20])
        return {
            'nombre_total': total,
            'documents': [
                {
                    'designation': d.designation,
                    'categorie': categories.get(d.categorie, d.categorie),
                    'lie_a': d.lie_a or None,
                    'date_ajout': d.date_creation.date().isoformat(),
                }
                for d in documents
            ],
        }

    def lister_factures(statut: str = '') -> dict:
        """Liste les factures, éventuellement filtrées par statut.

        Args:
            statut: Statut (vide = toutes) : Brouillon, Envoyee, Payee, Partiellement_payee, En_retard, Annulee.
        """
        if not utilisateur_a_permission(user, 'factures', 'lecture'):
            return {'erreur': "Vous n'avez pas la permission de consulter les factures."}

        statuts_valides = dict(FACTURE_STATUT_CHOICES)
        queryset = Facture.objects.select_related('affaire__client')
        if statut:
            if statut not in statuts_valides:
                return {'erreur': f'Statut inconnu "{statut}". Valeurs possibles : {", ".join(statuts_valides)}.'}
            queryset = queryset.filter(statut=statut)

        total = queryset.count()
        factures = list(queryset.order_by('-date_facture')[:20])
        return {
            'nombre_total': total,
            'factures': [
                {
                    'numero': f.numero_facture,
                    'client': f.affaire.client.raison_sociale,
                    'statut': f.get_statut_display(),
                    'montant_total_eur': float(f.montant_total),
                    'date_echeance': f.date_echeance.isoformat() if f.date_echeance else None,
                }
                for f in factures
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

        # Une seule proposition en attente par utilisateur : "la dernière
        # proposition" que confirmer_creation_devis exécute est ainsi sans
        # ambiguïté, celle que l'utilisateur vient de voir.
        PropositionAction.objects.filter(utilisateur=user, type_action='creation_devis', executee=False).delete()
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

    def confirmer_creation_devis() -> dict:
        """Crée réellement le devis brouillon de la dernière proposition
        présentée à l'utilisateur. N'appelez cet outil QUE si l'utilisateur
        vient de confirmer explicitement (ex. "oui", "confirmer", "vas-y") en
        réponse à cette proposition — jamais dans le même tour que
        proposer_creation_devis. Sans paramètre : la proposition confirmée est
        toujours la dernière en attente de cet utilisateur, celle qu'il vient
        de voir (l'historique de conversation ne conserve pas les identifiants).
        """
        if not utilisateur_a_permission(user, 'devis', 'creation'):
            return {'erreur': "Vous n'avez pas la permission de créer des devis."}

        proposition = (
            PropositionAction.objects.filter(utilisateur=user, type_action='creation_devis', executee=False)
            .order_by('-date_creation')
            .first()
        )
        if proposition is None:
            return {'erreur': "Aucune proposition en attente. Faites d'abord une proposition avec proposer_creation_devis."}
        if datetime.now(proposition.date_creation.tzinfo) - proposition.date_creation > DUREE_VALIDITE_PROPOSITION:
            return {'erreur': 'La dernière proposition a expiré (plus de 30 minutes). Refaites une proposition.'}

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
        lister_documents,
        lister_factures,
        proposer_creation_devis,
        confirmer_creation_devis,
    ]


def _outil(nom, description, proprietes=None, requis=None):
    proprietes = proprietes or {}
    requis = requis or []
    # Les modèles envoient parfois null pour un paramètre optionnel : Groq
    # valide les appels côté serveur et rejetterait ce null (400) si le schéma
    # ne l'autorisait pas. Les null sont ignorés à l'exécution (voir views).
    proprietes = {
        cle: ({**prop, 'type': [prop['type'], 'null']} if cle not in requis else prop)
        for cle, prop in proprietes.items()
    }
    return {
        'type': 'function',
        'function': {
            'name': nom,
            'description': description,
            'parameters': {'type': 'object', 'properties': proprietes, 'required': requis},
        },
    }


# Schémas au format function calling (OpenAI/Groq) — doivent rester alignés
# avec les signatures des fonctions de construire_outils().
TOOL_SCHEMAS = [
    _outil(
        'rechercher_client',
        'Recherche un client par raison sociale (recherche partielle, insensible à la casse).',
        {'nom': {'type': 'string', 'description': 'Tout ou partie du nom du client recherché.'}},
        ['nom'],
    ),
    _outil(
        'ca_previsionnel',
        "Chiffre d'affaires prévisionnel réparti par mois, basé sur la date de fin prévue des affaires en cours.",
        {'nombre_de_mois': {'type': 'integer', 'description': 'Nombre de mois à couvrir à partir du mois courant (1 à 24).'}},
    ),
    _outil(
        'montant_en_attente',
        'Montant total (en euros) encore à encaisser sur les affaires dont la facture n\'est pas payée.',
    ),
    _outil(
        'affaires_a_risque',
        "Affaires en cours déjà en retard sur leur date de fin prévue ou dont l'échéance approche.",
        {'horizon_jours': {'type': 'integer', 'description': 'Fenêtre en jours pour considérer une échéance comme proche (ex. 14).'}},
    ),
    _outil(
        'lister_devis',
        'Liste les devis, éventuellement filtrés par statut.',
        {'statut': {
            'type': 'string',
            'description': 'Statut (vide = tous) : Brouillon, En_preparation, A_valider, Envoye, Accepte, Refuse, Annule.',
        }},
    ),
    _outil(
        'lister_documents',
        'Liste les documents de la bibliothèque documentaire (contrats, rapports, etc.), avec filtres optionnels.',
        {
            'categorie': {
                'type': 'string',
                'description': 'Catégorie (vide = toutes) : contract, technical, financial, legal, report, other.',
            },
            'recherche': {'type': 'string', 'description': 'Mot-clé à chercher dans la désignation.'},
        },
    ),
    _outil(
        'lister_factures',
        'Liste les factures, éventuellement filtrées par statut.',
        {'statut': {
            'type': 'string',
            'description': 'Statut (vide = toutes) : Brouillon, Envoyee, Payee, Partiellement_payee, En_retard, Annulee.',
        }},
    ),
    _outil(
        'proposer_creation_devis',
        "Prépare SANS l'enregistrer un brouillon de devis pour un client existant et renvoie un identifiant de "
        "proposition. Après cet appel, présente le résumé à l'utilisateur et demande-lui de confirmer.",
        {
            'client_nom': {'type': 'string', 'description': 'Raison sociale du client (doit exister).'},
            'objet': {'type': 'string', 'description': 'Objet/titre du devis.'},
            'montant_ht': {'type': 'number', 'description': 'Montant hors taxes en euros.'},
            'description_prestation': {'type': 'string', 'description': "Description de la ligne (par défaut l'objet)."},
        },
        ['client_nom', 'objet', 'montant_ht'],
    ),
    _outil(
        'confirmer_creation_devis',
        "Crée réellement le devis de la dernière proposition présentée à l'utilisateur (aucun paramètre). "
        "À n'appeler que si le dernier message de l'utilisateur confirme explicitement (ex. « oui », « confirme ») "
        "une proposition déjà affichée dans la conversation, jamais dans le même tour que proposer_creation_devis.",
    ),
]
