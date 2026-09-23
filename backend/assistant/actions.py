"""Actions d'écriture du copilot IA, toutes soumises à confirmation.

Chaque action est une paire (préparer, exécuter) enregistrée dans ACTIONS :
- préparer(user, params) valide tout (permission, existence des objets,
  règles métier via les mêmes serializers que l'API REST) SANS rien écrire,
  et renvoie (payload figé, résumé lisible) ;
- exécuter(user, payload) revalide puis écrit, en reproduisant ce que font les
  vues REST correspondantes (versioning des devis figés, recalcul des
  montants, journal d'activité).

proposer() enregistre le brouillon (PropositionAction) ; confirmer() exécute
la dernière proposition en attente de l'utilisateur, jamais ce que le modèle
pourrait reformuler. Une seule proposition en attente par utilisateur.
Seul le serveur appelle confirmer() (voir views.py) : le modèle n'en a pas la main."""

from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from activites.models import Activite
from affaires.models import Affaire, CommentaireAffaire
from affaires.serializers import AffaireUpdateSerializer
from crm.models import Client
from crm.serializers import ClientSerializer
from devis.models import STATUT_CHOICES as DEVIS_STATUTS
from devis.models import CommentaireDevis, Devis, LigneDevis
from devis.pdf_theme import formater_montant
from devis.serializers import DevisTransitionSerializer, DevisUpdateSerializer, LigneDevisSerializer
from devis.views import ACTION_PAR_TRANSITION
from factures.models import Facture
from factures.serializers import FactureCreateSerializer, FactureUpdateSerializer
from utilisateurs.permissions import utilisateur_a_permission

from .models import PropositionAction

DUREE_VALIDITE_PROPOSITION = timedelta(minutes=30)


class ErreurAction(Exception):
    """Erreur destinée à l'utilisateur (refus de permission, donnée invalide...), jamais un bug."""


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------

def _texte_erreurs(erreurs):
    if isinstance(erreurs, dict):
        morceaux = []
        for champ, messages in erreurs.items():
            messages = messages if isinstance(messages, (list, tuple)) else [messages]
            morceaux.append(f"{champ} : {' '.join(str(m) for m in messages)}")
        return '; '.join(morceaux)
    if isinstance(erreurs, (list, tuple)):
        return '; '.join(str(m) for m in erreurs)
    return str(erreurs)


def _valider(serializer):
    if not serializer.is_valid():
        raise ErreurAction(_texte_erreurs(serializer.errors))
    return serializer


def _exiger(user, module, action):
    if not utilisateur_a_permission(user, module, action):
        raise ErreurAction(f"Vous n'avez pas la permission « {action} » sur le module « {module} ».")


def _client(nom):
    nom = (nom or '').strip()
    if not nom:
        raise ErreurAction('Nom du client manquant.')
    exact = list(Client.objects.filter(raison_sociale__iexact=nom)[:2])
    if len(exact) == 1:
        return exact[0]
    candidats = list(Client.objects.filter(raison_sociale__icontains=nom)[:5])
    if not candidats:
        raise ErreurAction(f'Aucun client trouvé pour « {nom} ».')
    if len(candidats) > 1:
        noms = ', '.join(c.raison_sociale for c in candidats)
        raise ErreurAction(f'Plusieurs clients correspondent à « {nom} » : {noms}. Précisez le nom exact.')
    return candidats[0]


def _devis(numero):
    devis = Devis.objects.filter(numero__iexact=(numero or '').strip(), est_courante=True).select_related('client').first()
    if devis is None:
        raise ErreurAction(f'Devis « {numero} » introuvable.')
    return devis


def _affaire(numero):
    affaire = Affaire.objects.filter(numero_affaire__iexact=(numero or '').strip()).select_related('client', 'devis').first()
    if affaire is None:
        raise ErreurAction(f'Affaire « {numero} » introuvable.')
    return affaire


def _facture(numero):
    facture = Facture.objects.filter(numero_facture__iexact=(numero or '').strip()).select_related('affaire__client').first()
    if facture is None:
        raise ErreurAction(f'Facture « {numero} » introuvable.')
    return facture


def _champs(params, autorises):
    """Sous-ensemble des paramètres correspondant à des champs modifiables."""
    champs = {cle: valeur for cle, valeur in params.items() if cle in autorises and valeur is not None}
    if not champs:
        raise ErreurAction("Aucune modification indiquée.")
    return champs


def _resume_champs(champs):
    return ', '.join(f'{cle} = {valeur}' for cle, valeur in champs.items())


def _nouvelle_version_si_fige(devis):
    """Même règle que les vues REST : un devis figé (Envoyé et au-delà) n'est
    jamais modifié en place, une nouvelle version est créée d'abord."""
    if not devis.est_courante:
        raise ErreurAction("Cette version du devis est obsolète.")
    if devis.necessite_nouvelle_version():
        try:
            return devis.creer_nouvelle_version()
        except DjangoValidationError as exc:
            raise ErreurAction(str(exc.message) if hasattr(exc, 'message') else str(exc))
    return devis


def _devis_par_id(id_devis):
    devis = Devis.objects.filter(id_devis=id_devis).select_related('client').first()
    if devis is None:
        raise ErreurAction('Le devis concerné n\'existe plus.')
    return devis


# ---------------------------------------------------------------------------
# Devis
# ---------------------------------------------------------------------------

def _prep_creer_devis(user, p):
    _exiger(user, 'devis', 'creation')
    client = _client(p.get('client_nom'))
    try:
        montant = Decimal(str(p.get('montant_ht')))
    except InvalidOperation:
        raise ErreurAction('Montant invalide.')
    if montant <= 0:
        raise ErreurAction('Le montant doit être positif.')
    objet = (p.get('objet') or '').strip()
    if not objet:
        raise ErreurAction("L'objet du devis est obligatoire.")
    payload = {
        'id_client': str(client.id_client), 'objet': objet, 'montant_ht': str(montant),
        'description_prestation': (p.get('description_prestation') or objet),
    }
    return payload, f'Créer un brouillon de devis de {formater_montant(montant)} HT pour {client.raison_sociale} — « {objet} ».'


def _exec_creer_devis(user, payload):
    _exiger(user, 'devis', 'creation')
    client = Client.objects.filter(id_client=payload['id_client']).first()
    if client is None:
        raise ErreurAction("Le client associé n'existe plus.")
    devis = Devis.objects.create(client=client, charge_affaires=user, objet=payload['objet'])
    LigneDevis.objects.create(
        devis=devis, description=payload['description_prestation'],
        quantite=Decimal('1'), prix_unitaire=Decimal(payload['montant_ht']),
    )
    devis.recalculer_montants()
    Activite.enregistrer(user, 'a créé le devis', devis.numero)
    return f'Devis {devis.numero} créé en Brouillon pour {client.raison_sociale}.'


def _prep_changer_statut_devis(user, p):
    devis = _devis(p.get('numero'))
    nouveau = p.get('nouveau_statut')
    commentaire = p.get('commentaire') or ''
    _valider(DevisTransitionSerializer(
        data={'nouveau_statut': nouveau, 'commentaire': commentaire}, context={'devis': devis},
    ))
    _exiger(user, 'devis', ACTION_PAR_TRANSITION.get((devis.statut, nouveau), 'modification'))
    labels = dict(DEVIS_STATUTS)
    resume = f'Faire passer le devis {devis.numero} de « {labels[devis.statut]} » à « {labels[nouveau]} »'
    if commentaire:
        resume += f' (motif : {commentaire})'
    if nouveau == 'Accepte':
        resume += ". L'acceptation crée automatiquement l'affaire correspondante"
    return {'id_devis': str(devis.id_devis), 'nouveau_statut': nouveau, 'commentaire': commentaire}, resume + '.'


def _exec_changer_statut_devis(user, payload):
    devis = _devis_par_id(payload['id_devis'])
    _valider(DevisTransitionSerializer(
        data={'nouveau_statut': payload['nouveau_statut'], 'commentaire': payload['commentaire']}, context={'devis': devis},
    ))
    _exiger(user, 'devis', ACTION_PAR_TRANSITION.get((devis.statut, payload['nouveau_statut']), 'modification'))
    try:
        devis.changer_statut(payload['nouveau_statut'], user, payload['commentaire'])
    except DjangoValidationError as exc:
        raise ErreurAction(str(exc.message) if hasattr(exc, 'message') else str(exc))
    Activite.enregistrer(user, 'a fait passer le devis à', f"{devis.numero} ({payload['nouveau_statut']})")
    return f"Devis {devis.numero} passé au statut « {dict(DEVIS_STATUTS)[payload['nouveau_statut']]} »."


def _prep_ajouter_ligne_devis(user, p):
    _exiger(user, 'devis', 'modification')
    devis = _devis(p.get('numero'))
    donnees = {k: p.get(k) for k in ('description', 'quantite', 'prix_unitaire')}
    _valider(LigneDevisSerializer(data={**donnees, 'devis': devis.id_devis}))
    resume = (
        f"Ajouter au devis {devis.numero} la ligne « {donnees['description']} » "
        f"({donnees['quantite']} × {formater_montant(donnees['prix_unitaire'])})"
    )
    if devis.necessite_nouvelle_version():
        resume += ". Le devis est figé : une nouvelle version sera créée"
    return {'id_devis': str(devis.id_devis), **donnees}, resume + '.'


def _exec_ajouter_ligne_devis(user, payload):
    _exiger(user, 'devis', 'modification')
    devis = _nouvelle_version_si_fige(_devis_par_id(payload['id_devis']))
    donnees = {k: payload[k] for k in ('description', 'quantite', 'prix_unitaire')}
    _valider(LigneDevisSerializer(data={**donnees, 'devis': devis.id_devis})).save()
    return f'Ligne ajoutée au devis {devis.numero} (v{devis.version}).'


def _prep_modifier_devis(user, p):
    _exiger(user, 'devis', 'modification')
    devis = _devis(p.get('numero'))
    champs = _champs(p, DevisUpdateSerializer.Meta.fields)
    _valider(DevisUpdateSerializer(devis, data=champs, partial=True))
    resume = f'Modifier le devis {devis.numero} : {_resume_champs(champs)}'
    if devis.necessite_nouvelle_version():
        resume += ". Le devis est figé : une nouvelle version sera créée"
    return {'id_devis': str(devis.id_devis), 'champs': champs}, resume + '.'


def _exec_modifier_devis(user, payload):
    _exiger(user, 'devis', 'modification')
    devis = _nouvelle_version_si_fige(_devis_par_id(payload['id_devis']))
    _valider(DevisUpdateSerializer(devis, data=payload['champs'], partial=True)).save()
    devis.recalculer_montants()
    return f'Devis {devis.numero} (v{devis.version}) modifié.'


def _prep_commenter(user, p):
    texte = (p.get('texte') or '').strip()
    if not texte:
        raise ErreurAction('Le commentaire est vide.')
    if p.get('cible') == 'devis':
        _exiger(user, 'devis', 'modification')
        objet = _devis(p.get('reference'))
        reference = objet.numero
        id_objet = str(objet.id_devis)
    elif p.get('cible') == 'affaire':
        _exiger(user, 'affaires', 'modification')
        objet = _affaire(p.get('reference'))
        reference = objet.numero_affaire
        id_objet = str(objet.id_affaire)
    else:
        raise ErreurAction("La cible doit être « devis » ou « affaire ».")
    return {'cible': p['cible'], 'id_objet': id_objet, 'texte': texte}, f'Ajouter à {p["cible"]} {reference} le commentaire : « {texte} ».'


def _exec_commenter(user, payload):
    if payload['cible'] == 'devis':
        _exiger(user, 'devis', 'modification')
        devis = _devis_par_id(payload['id_objet'])
        CommentaireDevis.objects.create(devis=devis, auteur=user, texte=payload['texte'])
        Activite.enregistrer(user, 'a commenté le devis', devis.numero)
        return f'Commentaire ajouté au devis {devis.numero}.'
    _exiger(user, 'affaires', 'modification')
    affaire = Affaire.objects.filter(id_affaire=payload['id_objet']).first()
    if affaire is None:
        raise ErreurAction("L'affaire concernée n'existe plus.")
    CommentaireAffaire.objects.create(affaire=affaire, auteur=user, texte=payload['texte'])
    Activite.enregistrer(user, "a commenté l'affaire", affaire.numero_affaire)
    return f'Commentaire ajouté à l\'affaire {affaire.numero_affaire}.'


# ---------------------------------------------------------------------------
# Affaires
# ---------------------------------------------------------------------------

def _prep_modifier_affaire(user, p):
    _exiger(user, 'affaires', 'modification')
    affaire = _affaire(p.get('numero'))
    champs = _champs(p, AffaireUpdateSerializer.Meta.fields)
    _valider(AffaireUpdateSerializer(affaire, data=champs, partial=True))
    resume = f'Modifier l\'affaire {affaire.numero_affaire} : {_resume_champs(champs)}'
    if champs.get('date_fin_reelle'):
        resume += '. Cela marque l\'affaire comme terminée'
    return {'id_affaire': str(affaire.id_affaire), 'champs': champs}, resume + '.'


def _exec_modifier_affaire(user, payload):
    _exiger(user, 'affaires', 'modification')
    affaire = Affaire.objects.filter(id_affaire=payload['id_affaire']).first()
    if affaire is None:
        raise ErreurAction("L'affaire concernée n'existe plus.")
    etait_terminee = affaire.date_fin_reelle is not None
    _valider(AffaireUpdateSerializer(affaire, data=payload['champs'], partial=True)).save()
    if not etait_terminee and affaire.date_fin_reelle is not None:
        Activite.enregistrer(user, "a marqué comme terminée l'affaire", affaire.numero_affaire)
    else:
        Activite.enregistrer(user, "a mis à jour l'affaire", affaire.numero_affaire)
    return f'Affaire {affaire.numero_affaire} mise à jour.'


# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------

CHAMPS_CLIENT = ['raison_sociale', 'matricule_fiscal', 'adresse', 'pays', 'secteur_activite', 'statut', 'telephone', 'email']


def _prep_creer_client(user, p):
    _exiger(user, 'clients', 'creation')
    champs = _champs(p, CHAMPS_CLIENT)
    _valider(ClientSerializer(data=champs))
    return {'champs': champs}, f'Créer le client « {champs.get("raison_sociale")} » ({_resume_champs({k: v for k, v in champs.items() if k != "raison_sociale"}) or "sans autre détail"}).'


def _exec_creer_client(user, payload):
    _exiger(user, 'clients', 'creation')
    client = _valider(ClientSerializer(data=payload['champs'])).save()
    Activite.enregistrer(user, 'a créé le client', client.raison_sociale)
    return f'Client « {client.raison_sociale} » créé.'


def _prep_modifier_client(user, p):
    _exiger(user, 'clients', 'modification')
    client = _client(p.get('client_nom'))
    champs = _champs(p, CHAMPS_CLIENT)
    _valider(ClientSerializer(client, data=champs, partial=True))
    return {'id_client': str(client.id_client), 'champs': champs}, f'Modifier le client « {client.raison_sociale} » : {_resume_champs(champs)}.'


def _exec_modifier_client(user, payload):
    _exiger(user, 'clients', 'modification')
    client = Client.objects.filter(id_client=payload['id_client']).first()
    if client is None:
        raise ErreurAction("Le client n'existe plus.")
    _valider(ClientSerializer(client, data=payload['champs'], partial=True)).save()
    return f'Client « {client.raison_sociale} » modifié.'


# ---------------------------------------------------------------------------
# Factures
# ---------------------------------------------------------------------------

def _prep_creer_facture(user, p):
    _exiger(user, 'factures', 'creation')
    affaire = _affaire(p.get('numero_affaire'))
    donnees = {k: p.get(k) for k in ('type_echeance', 'nombre_jours', 'jour_fixe_mois_suivant') if p.get(k) is not None}
    _valider(FactureCreateSerializer(data={'affaire': affaire.id_affaire, **donnees}))
    return (
        {'id_affaire': str(affaire.id_affaire), **donnees},
        f'Créer la facture de l\'affaire {affaire.numero_affaire} ({affaire.client.raison_sociale}), modalité de paiement : {_resume_champs(donnees)}.',
    )


def _exec_creer_facture(user, payload):
    _exiger(user, 'factures', 'creation')
    donnees = {k: v for k, v in payload.items() if k != 'id_affaire'}
    s = _valider(FactureCreateSerializer(data={'affaire': payload['id_affaire'], **donnees}))
    facture = Facture.creer_depuis_affaire(
        s.validated_data['affaire'],
        type_echeance=s.validated_data['type_echeance'],
        nombre_jours=s.validated_data.get('nombre_jours'),
        jour_fixe_mois_suivant=s.validated_data.get('jour_fixe_mois_suivant'),
    )
    Activite.enregistrer(user, 'a créé la facture', facture.numero_facture)
    return f'Facture {facture.numero_facture} créée.'


def _prep_modifier_facture(user, p):
    _exiger(user, 'factures', 'modification')
    facture = _facture(p.get('numero'))
    champs = _champs(p, FactureUpdateSerializer.Meta.fields)
    _valider(FactureUpdateSerializer(facture, data=champs, partial=True))
    return {'id_facture': str(facture.id_facture), 'champs': champs}, f'Modifier la facture {facture.numero_facture} : {_resume_champs(champs)}.'


def _exec_modifier_facture(user, payload):
    _exiger(user, 'factures', 'modification')
    facture = Facture.objects.filter(id_facture=payload['id_facture']).first()
    if facture is None:
        raise ErreurAction("La facture n'existe plus.")
    ancien_statut = facture.statut
    _valider(FactureUpdateSerializer(facture, data=payload['champs'], partial=True)).save()
    facture.recalculer_montants()
    if facture.statut != ancien_statut:
        Activite.enregistrer(user, 'a fait passer la facture à', f'{facture.numero_facture} ({facture.statut})')
    else:
        Activite.enregistrer(user, 'a modifié la facture', facture.numero_facture)
    return f'Facture {facture.numero_facture} modifiée.'


ACTIONS = {
    'creer_devis': (_prep_creer_devis, _exec_creer_devis),
    'changer_statut_devis': (_prep_changer_statut_devis, _exec_changer_statut_devis),
    'ajouter_ligne_devis': (_prep_ajouter_ligne_devis, _exec_ajouter_ligne_devis),
    'modifier_devis': (_prep_modifier_devis, _exec_modifier_devis),
    'commenter': (_prep_commenter, _exec_commenter),
    'modifier_affaire': (_prep_modifier_affaire, _exec_modifier_affaire),
    'creer_client': (_prep_creer_client, _exec_creer_client),
    'modifier_client': (_prep_modifier_client, _exec_modifier_client),
    'creer_facture': (_prep_creer_facture, _exec_creer_facture),
    'modifier_facture': (_prep_modifier_facture, _exec_modifier_facture),
}


# ---------------------------------------------------------------------------
# Cycle proposer / confirmer / annuler
# ---------------------------------------------------------------------------

def proposer(user, type_action, params):
    preparer, _ = ACTIONS[type_action]
    try:
        payload, description = preparer(user, params)
    except ErreurAction as exc:
        return {'erreur': str(exc)}

    PropositionAction.objects.filter(utilisateur=user, executee=False).delete()
    PropositionAction.objects.create(utilisateur=user, type_action=type_action, payload=payload, description=description)
    return {'proposition': description}


def confirmer(user):
    proposition = PropositionAction.objects.filter(utilisateur=user, executee=False).order_by('-date_creation').first()
    if proposition is None:
        return {'erreur': "Aucune proposition en attente. Décrivez d'abord ce que vous souhaitez faire."}
    if timezone.now() - proposition.date_creation > DUREE_VALIDITE_PROPOSITION:
        return {'erreur': 'La dernière proposition a expiré (plus de 30 minutes). Refaites une proposition.'}

    _, executer = ACTIONS[proposition.type_action]
    try:
        message = executer(user, proposition.payload)
    except ErreurAction as exc:
        return {'erreur': str(exc)}

    proposition.executee = True
    proposition.save(update_fields=['executee'])
    return {'succes': True, 'message': message}


def annuler(user):
    supprimees, _ = PropositionAction.objects.filter(utilisateur=user, executee=False).delete()
    return {'message': 'Proposition annulée.' if supprimees else 'Aucune proposition en attente.'}
