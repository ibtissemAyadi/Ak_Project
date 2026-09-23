"""Outils (function calling) exposés au copilot IA — chaque outil est lié à
l'utilisateur connecté via une fermeture (voir construire_outils) : aucun outil
ne peut faire plus que ce que cet utilisateur peut déjà faire dans
l'application (vérification de permission systématique, même règle que
HasModulePermission côté API REST).

Lecture : les outils lister_* / consulter_fiche / ca_previsionnel... renvoient
des données réelles, sans effet de bord.

Écriture : jamais directe. Le modèle n'a que des outils proposer_* (ils
valident et enregistrent un brouillon, n'écrivent rien). La confirmation et
l'exécution sont gérées par le serveur (views.py), pas par le modèle : il ne
dispose d'aucun outil capable de modifier les données — voir actions.py.

Chaque outil est défini une seule fois (schéma + fonction) via @outil ; les
schémas sont volontairement compacts : le plan gratuit du fournisseur limite
les tokens par minute, et les schémas sont renvoyés à chaque appel."""

from activites.models import Activite
from affaires.models import PRIORITE_CHOICES, Affaire, CommentaireAffaire
from affaires.services import calculer_montant_en_attente, calculer_prevision_revenus, lister_affaires_a_risque
from crm.models import Client
from devis.models import STATUT_CHOICES as DEVIS_STATUT_CHOICES
from devis.models import TRANSITIONS_AUTORISEES, CommentaireDevis, Devis
from documents.models import CATEGORIE_CHOICES as DOCUMENT_CATEGORIE_CHOICES
from documents.models import Document
from factures.models import MODE_REGLEMENT_CHOICES, TYPE_ECHEANCE_CHOICES
from factures.models import STATUT_CHOICES as FACTURE_STATUT_CHOICES
from factures.models import Facture
from utilisateurs.permissions import utilisateur_a_permission

from . import actions

STATUTS_DEVIS = [c[0] for c in DEVIS_STATUT_CHOICES]
STATUTS_FACTURE = [c[0] for c in FACTURE_STATUT_CHOICES]
STATUTS_CLIENT = [c[0] for c in Client.STATUT_CHOICES]
PRIORITES = [c[0] for c in PRIORITE_CHOICES]
MODES_REGLEMENT = [c[0] for c in MODE_REGLEMENT_CHOICES]
TYPES_ECHEANCE = [c[0] for c in TYPE_ECHEANCE_CHOICES]
CATEGORIES_DOCUMENT = [c[0] for c in DOCUMENT_CATEGORIE_CHOICES]


def _p(type_, description='', *, requis=False, enum=None):
    return {'type': type_, 'description': description, 'requis': requis, 'enum': enum}


def _schema(nom, description, params):
    proprietes, requis = {}, []
    for cle, spec in (params or {}).items():
        # Les modèles envoient parfois null pour un paramètre optionnel : le
        # fournisseur valide les appels côté serveur et rejetterait ce null
        # (400) si le schéma ne l'autorisait pas. Ignoré à l'exécution (views).
        prop = {'type': spec['type'] if spec['requis'] else [spec['type'], 'null']}
        if spec['description']:
            prop['description'] = spec['description']
        if spec['enum']:
            prop['enum'] = spec['enum'] if spec['requis'] else [*spec['enum'], None]
        proprietes[cle] = prop
        if spec['requis']:
            requis.append(cle)
    return {
        'type': 'function',
        'function': {
            'name': nom,
            'description': description,
            'parameters': {'type': 'object', 'properties': proprietes, 'required': requis},
        },
    }


def construire_outils(user):
    """Retourne la liste des (schéma, fonction) des outils, fermés sur `user`."""
    outils = []

    def outil(nom, description, params=None):
        def enregistrer(fonction):
            outils.append((_schema(nom, description, params), fonction))
            return fonction
        return enregistrer

    def refus(libelle):
        return {'erreur': f"Vous n'avez pas la permission de consulter {libelle}."}

    # ------------------------------------------------------------------
    # Lecture
    # ------------------------------------------------------------------

    @outil('rechercher_client', 'Recherche un client par nom (partiel).', {'nom': _p('string', requis=True)})
    def rechercher_client(nom):
        if not utilisateur_a_permission(user, 'clients', 'lecture'):
            return refus('les clients')
        clients = Client.objects.filter(raison_sociale__icontains=nom)[:10]
        if not clients:
            return {'resultats': [], 'message': f'Aucun client trouvé pour "{nom}".'}
        return {'resultats': [
            {
                'raison_sociale': c.raison_sociale, 'statut': c.statut, 'pays': c.pays or None,
                'secteur': c.secteur_activite or None, 'telephone': c.telephone or None, 'email': c.email or None,
            }
            for c in clients
        ]}

    @outil('ca_previsionnel', "CA prévisionnel par mois (affaires en cours, selon leur date de fin prévue).",
           {'nombre_de_mois': _p('integer', 'de 1 à 24, à partir du mois courant')})
    def ca_previsionnel(nombre_de_mois=6):
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return refus('les affaires')
        points = calculer_prevision_revenus(nombre_de_mois)
        return {'previsions': [{'mois': p['mois'], 'montant_prevu_eur': float(p['montant_prevu'])} for p in points]}

    @outil('montant_en_attente', "Montant total (€) encore à encaisser (affaires dont la facture n'est pas payée).")
    def montant_en_attente():
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return refus('les affaires')
        return {'montant_en_attente_eur': float(calculer_montant_en_attente())}

    @outil('affaires_a_risque',
           "UNIQUEMENT les affaires en retard ou à échéance proche (pour la liste complète : lister_affaires).",
           {'horizon_jours': _p('integer', 'fenêtre « proche », ex. 14')})
    def affaires_a_risque(horizon_jours=14):
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return refus('les affaires')
        affaires = lister_affaires_a_risque(horizon_jours=horizon_jours)
        if not affaires:
            return {'affaires': [], 'message': 'Aucune affaire en retard ou proche de son échéance.'}
        return {'affaires': [
            {
                'numero_affaire': a['numero_affaire'], 'client': a['client'],
                'date_fin_prevue': a['date_fin_prevue'].isoformat(),
                'statut': 'en retard' if a['en_retard'] else 'échéance proche',
                'avancement_pourcent': a['etat_avancement'],
            }
            for a in affaires
        ]}

    @outil('lister_affaires', 'Liste des affaires (comme la page Affaires) : objet, client, avancement, budget, échéance.',
           {'etat': _p('string', enum=['en_cours', 'terminees'])})
    def lister_affaires(etat=''):
        if not utilisateur_a_permission(user, 'affaires', 'lecture'):
            return refus('les affaires')
        queryset = Affaire.objects.select_related('client', 'charge_affaires', 'devis')
        if etat == 'en_cours':
            queryset = queryset.filter(date_fin_reelle__isnull=True)
        elif etat == 'terminees':
            queryset = queryset.filter(date_fin_reelle__isnull=False)
        return {'nombre_total': queryset.count(), 'affaires': [
            {
                'numero_affaire': a.numero_affaire, 'objet': a.devis.objet, 'client': a.client.raison_sociale,
                'charge_affaires': f'{a.charge_affaires.prenom} {a.charge_affaires.nom}',
                'avancement_pourcent': a.etat_avancement, 'budget_eur': float(a.budget),
                'heures_consommees': float(a.heures_consommees), 'heures_prevues': float(a.heures_prevues),
                'priorite': a.priorite,
                'date_fin_prevue': a.date_fin_prevue.isoformat() if a.date_fin_prevue else None,
                'terminee': a.date_fin_reelle is not None,
            }
            for a in queryset[:30]
        ]}

    @outil('lister_devis', 'Liste des devis (versions courantes), filtrable par statut.',
           {'statut': _p('string', enum=STATUTS_DEVIS)})
    def lister_devis(statut=''):
        if not utilisateur_a_permission(user, 'devis', 'lecture'):
            return refus('les devis')
        queryset = Devis.objects.filter(est_courante=True).select_related('client')
        if statut:
            queryset = queryset.filter(statut=statut)
        return {'devis': [
            {
                'numero': d.numero, 'client': d.client.raison_sociale, 'objet': d.objet,
                'statut': d.get_statut_display(), 'montant_ttc_eur': float(d.montant_ttc),
            }
            for d in queryset.order_by('-date_creation')[:15]
        ]}

    @outil('lister_documents', 'Bibliothèque documentaire comme la page Documents : fichiers importés ET PDF de devis/factures.',
           {'categorie': _p('string', enum=CATEGORIES_DOCUMENT), 'recherche': _p('string', 'mot-clé dans la désignation')})
    def lister_documents(categorie='', recherche=''):
        if not utilisateur_a_permission(user, 'documents', 'lecture'):
            return refus('les documents')
        categories = dict(DOCUMENT_CATEGORIE_CHOICES)

        # Vue combinée : les PDF de devis/factures ne sont jamais stockés dans
        # Document (voir documents.models), on les reconstitue comme le fait le
        # frontend (documents-service.ts). Chaque source n'est incluse que si
        # l'utilisateur a aussi le droit de lecture sur son module d'origine.
        entrees = [
            {'designation': d.designation, 'categorie': d.categorie, 'origine': 'fichier importé',
             'lie_a': d.lie_a or None, 'date': d.date_creation}
            for d in Document.objects.all()
        ]
        if utilisateur_a_permission(user, 'devis', 'lecture'):
            entrees += [
                {'designation': f'Devis {d.numero}', 'categorie': 'contract', 'origine': 'PDF de devis généré',
                 'lie_a': d.client.raison_sociale, 'date': d.date_creation}
                for d in Devis.objects.filter(est_courante=True).select_related('client')
            ]
        if utilisateur_a_permission(user, 'factures', 'lecture'):
            entrees += [
                {'designation': f'Facture {f.numero_facture}', 'categorie': 'financial', 'origine': 'PDF de facture généré',
                 'lie_a': f.affaire.client.raison_sociale, 'date': f.date_creation}
                for f in Facture.objects.select_related('affaire__client')
            ]
        if categorie:
            entrees = [e for e in entrees if e['categorie'] == categorie]
        if recherche:
            entrees = [e for e in entrees if recherche.lower() in e['designation'].lower()]
        entrees.sort(key=lambda e: e['date'], reverse=True)
        return {'nombre_total': len(entrees), 'documents': [
            {
                'designation': e['designation'], 'categorie': categories.get(e['categorie'], e['categorie']),
                'origine': e['origine'], 'lie_a': e['lie_a'], 'date_ajout': e['date'].date().isoformat(),
            }
            for e in entrees[:20]
        ]}

    @outil('lister_factures', 'Liste des factures, filtrable par statut.', {'statut': _p('string', enum=STATUTS_FACTURE)})
    def lister_factures(statut=''):
        if not utilisateur_a_permission(user, 'factures', 'lecture'):
            return refus('les factures')
        queryset = Facture.objects.select_related('affaire__client')
        if statut:
            queryset = queryset.filter(statut=statut)
        return {'nombre_total': queryset.count(), 'factures': [
            {
                'numero': f.numero_facture, 'client': f.affaire.client.raison_sociale,
                'statut': f.get_statut_display(), 'montant_total_eur': float(f.montant_total),
                'date_echeance': f.date_echeance.isoformat() if f.date_echeance else None,
            }
            for f in queryset.order_by('-date_facture')[:20]
        ]}

    @outil('consulter_fiche',
           "Détail complet d'un devis (lignes, montants, statuts suivants possibles, commentaires), d'une affaire ou d'une facture.",
           {'type': _p('string', requis=True, enum=['devis', 'affaire', 'facture']),
            'reference': _p('string', 'numéro, ex. DS-2026-0002, AS-26-0002, FA-2026-001', requis=True)})
    def consulter_fiche(type, reference):
        reference = (reference or '').strip()
        labels = dict(DEVIS_STATUT_CHOICES)
        if type == 'devis':
            if not utilisateur_a_permission(user, 'devis', 'lecture'):
                return refus('les devis')
            d = Devis.objects.filter(numero__iexact=reference, est_courante=True).select_related('client', 'charge_affaires').first()
            if d is None:
                return {'erreur': f'Devis « {reference} » introuvable.'}
            return {
                'numero': d.numero, 'version': d.version, 'client': d.client.raison_sociale, 'objet': d.objet,
                'statut': labels[d.statut], 'statuts_suivants_possibles': [labels[s] for s in TRANSITIONS_AUTORISEES[d.statut]],
                'charge_affaires': f'{d.charge_affaires.prenom} {d.charge_affaires.nom}',
                'montant_ht_eur': float(d.montant_ht), 'tva_pourcent': float(d.taux_tva_defaut), 'montant_ttc_eur': float(d.montant_ttc),
                'date_validite': d.date_validite.isoformat() if d.date_validite else None,
                'lignes': [
                    {'description': ligne.description,
                     'quantite': float(ligne.quantite) if ligne.quantite is not None else None,
                     'prix_unitaire_eur': float(ligne.prix_unitaire) if ligne.prix_unitaire is not None else None,
                     'montant_eur': float(ligne.montant)}
                    for ligne in d.lignes.all()
                ],
                'commentaires': [c.texte for c in CommentaireDevis.objects.filter(devis=d)[:3]],
            }
        if type == 'affaire':
            if not utilisateur_a_permission(user, 'affaires', 'lecture'):
                return refus('les affaires')
            a = Affaire.objects.filter(numero_affaire__iexact=reference).select_related('client', 'charge_affaires', 'devis').first()
            if a is None:
                return {'erreur': f'Affaire « {reference} » introuvable.'}
            return {
                'numero_affaire': a.numero_affaire, 'devis': a.devis.numero, 'objet': a.devis.objet,
                'client': a.client.raison_sociale, 'charge_affaires': f'{a.charge_affaires.prenom} {a.charge_affaires.nom}',
                'terminee': a.date_fin_reelle is not None, 'avancement_pourcent': a.etat_avancement, 'priorite': a.priorite,
                'budget_eur': float(a.budget), 'heures_prevues': float(a.heures_prevues), 'heures_consommees': float(a.heures_consommees),
                'date_debut': a.date_debut.isoformat() if a.date_debut else None,
                'date_fin_prevue': a.date_fin_prevue.isoformat() if a.date_fin_prevue else None,
                'date_fin_reelle': a.date_fin_reelle.isoformat() if a.date_fin_reelle else None,
                'facture': a.facture.numero_facture if hasattr(a, 'facture') else None,
                'commentaires': [c.texte for c in CommentaireAffaire.objects.filter(affaire=a)[:3]],
            }
        if type == 'facture':
            if not utilisateur_a_permission(user, 'factures', 'lecture'):
                return refus('les factures')
            f = Facture.objects.filter(numero_facture__iexact=reference).select_related('affaire__client').first()
            if f is None:
                return {'erreur': f'Facture « {reference} » introuvable.'}
            return {
                'numero': f.numero_facture, 'affaire': f.affaire.numero_affaire, 'client': f.affaire.client.raison_sociale,
                'statut': f.get_statut_display(), 'sous_total_eur': float(f.sous_total), 'tva_eur': float(f.montant_tva),
                'montant_total_eur': float(f.montant_total), 'mode_reglement': f.get_mode_reglement_display(),
                'conditions_paiement': f.label_echeance,
                'date_facture': f.date_facture.isoformat() if f.date_facture else None,
                'date_echeance': f.date_echeance.isoformat() if f.date_echeance else None,
                'lignes': [{'description': ligne.description, 'montant_eur': float(ligne.montant)} for ligne in f.lignes.all()],
            }
        return {'erreur': 'Type inconnu : devis, affaire ou facture.'}

    @outil('activite_recente', "Dernières actions effectuées dans l'application (qui a fait quoi).",
           {'nombre': _p('integer', '1 à 30')})
    def activite_recente(nombre=10):
        nombre = max(1, min(nombre, 30))
        return {'activites': [
            {
                'utilisateur': f'{a.utilisateur.prenom} {a.utilisateur.nom}' if a.utilisateur else None,
                'action': a.action, 'cible': a.cible, 'date': a.date_creation.date().isoformat(),
            }
            for a in Activite.objects.select_related('utilisateur')[:nombre]
        ]}

    # ------------------------------------------------------------------
    # Écriture : propositions (n'écrivent rien) + confirmation
    # ------------------------------------------------------------------

    def proposer_outil(nom, action, description, params):
        def fonction(**kwargs):
            return actions.proposer(user, action, kwargs)
        fonction.__name__ = nom
        outils.append((_schema(nom, description + ' (proposition : ne modifie rien)', params), fonction))

    proposer_outil('proposer_creer_devis', 'creer_devis', "Crée un brouillon de devis (une ligne) pour un client existant.", {
        'client_nom': _p('string', requis=True), 'objet': _p('string', requis=True),
        'montant_ht': _p('number', 'euros', requis=True), 'description_prestation': _p('string'),
    })
    proposer_outil('proposer_changer_statut_devis', 'changer_statut_devis',
                   "Change le statut d'un devis (Brouillon>En_preparation>A_valider>Envoye>Accepte/Refuse ; Annule depuis Brouillon/En_preparation).", {
        'numero': _p('string', requis=True), 'nouveau_statut': _p('string', requis=True, enum=STATUTS_DEVIS),
        'commentaire': _p('string', 'motif, obligatoire pour Refuse'),
    })
    proposer_outil('proposer_ajouter_ligne_devis', 'ajouter_ligne_devis', "Ajoute une ligne à un devis.", {
        'numero': _p('string', requis=True), 'description': _p('string', requis=True),
        'quantite': _p('number', requis=True), 'prix_unitaire': _p('number', 'euros', requis=True),
    })
    proposer_outil('proposer_modifier_devis', 'modifier_devis', "Modifie l'en-tête d'un devis.", {
        'numero': _p('string', requis=True), 'objet': _p('string'), 'taux_tva_defaut': _p('number', '%'),
        'type_marge': _p('string', enum=['pourcentage', 'valeur']), 'valeur_marge': _p('number'),
        'type_remise': _p('string', enum=['pourcentage', 'valeur']), 'valeur_remise': _p('number'),
        'commentaire_justification': _p('string'), 'date_validite': _p('string', 'AAAA-MM-JJ'),
    })
    proposer_outil('proposer_commenter', 'commenter', "Ajoute un commentaire sur un devis ou une affaire.", {
        'cible': _p('string', requis=True, enum=['devis', 'affaire']), 'reference': _p('string', 'numéro', requis=True),
        'texte': _p('string', requis=True),
    })
    proposer_outil('proposer_modifier_affaire', 'modifier_affaire',
                   "Modifie une affaire (avancement, dates, heures, budget, priorité). date_fin_reelle la marque terminée.", {
        'numero': _p('string', requis=True), 'etat_avancement': _p('integer', '0-100'),
        'priorite': _p('string', enum=PRIORITES), 'budget': _p('number'),
        'heures_prevues': _p('number'), 'heures_consommees': _p('number'),
        'date_debut': _p('string', 'AAAA-MM-JJ'), 'date_fin_prevue': _p('string', 'AAAA-MM-JJ'),
        'date_fin_reelle': _p('string', 'AAAA-MM-JJ'),
    })
    proposer_outil('proposer_creer_client', 'creer_client', "Crée un client.", {
        'raison_sociale': _p('string', requis=True), 'statut': _p('string', enum=STATUTS_CLIENT),
        'matricule_fiscal': _p('string'), 'adresse': _p('string'), 'pays': _p('string'),
        'secteur_activite': _p('string'), 'telephone': _p('string'), 'email': _p('string'),
    })
    proposer_outil('proposer_modifier_client', 'modifier_client', "Modifie un client existant (jamais supprimé : passer en Inactif).", {
        'client_nom': _p('string', requis=True), 'raison_sociale': _p('string'), 'statut': _p('string', enum=STATUTS_CLIENT),
        'matricule_fiscal': _p('string'), 'adresse': _p('string'), 'pays': _p('string'),
        'secteur_activite': _p('string'), 'telephone': _p('string'), 'email': _p('string'),
    })
    proposer_outil('proposer_creer_facture', 'creer_facture', "Crée la facture d'une affaire (une seule par affaire) avec sa modalité de paiement.", {
        'numero_affaire': _p('string', requis=True),
        'type_echeance': _p('string', 'net = X jours, fin_mois = X jours fin de mois, jour_fixe = jour du mois suivant', requis=True, enum=TYPES_ECHEANCE),
        'nombre_jours': _p('integer', 'requis pour net et fin_mois'), 'jour_fixe_mois_suivant': _p('integer', '1-31, requis pour jour_fixe'),
    })
    proposer_outil('proposer_modifier_facture', 'modifier_facture', "Modifie une facture (statut, date, règlement, TVA, échéance).", {
        'numero': _p('string', requis=True), 'statut': _p('string', enum=STATUTS_FACTURE),
        'date_facture': _p('string', 'AAAA-MM-JJ'), 'mode_reglement': _p('string', enum=MODES_REGLEMENT),
        'taux_tva': _p('number', '%'), 'commentaire': _p('string'),
        'type_echeance': _p('string', enum=TYPES_ECHEANCE), 'nombre_jours': _p('integer'), 'jour_fixe_mois_suivant': _p('integer'),
    })

    return outils
