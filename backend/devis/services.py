"""Logique de calcul réutilisable — point de vérité séparé des vues DRF,
même organisation que affaires/services.py."""

from collections import defaultdict
from decimal import Decimal

from django.utils import timezone

from .models import STATUT_ACCEPTE, Devis, HistoriqueStatut


def calculer_ca_realise(nb_annees=3, charge_affaires_id=None):
    """CA réalisé (somme des montants HT) des devis actuellement acceptés,
    cumulé par mois, pour les `nb_annees` dernières années (année courante
    incluse). Basé sur la date à laquelle chaque devis est passé au statut
    Accepte (HistoriqueStatut) — la date de réalisation du chiffre
    d'affaires — pas sa date de création. Seule la version courante de
    chaque devis compte : une version remplacée n'est plus la source de
    vérité du montant (voir Devis.creer_nouvelle_version)."""
    nb_annees = max(1, min(nb_annees, 5))
    annee_courante = timezone.localdate().year
    annees = list(range(annee_courante - nb_annees + 1, annee_courante + 1))

    devis_acceptes = Devis.objects.filter(est_courante=True, statut=STATUT_ACCEPTE)
    if charge_affaires_id:
        devis_acceptes = devis_acceptes.filter(charge_affaires_id=charge_affaires_id)
    devis_acceptes = list(devis_acceptes.values('id_devis', 'montant_ht'))
    if not devis_acceptes:
        return [{'annee': a, 'points': [{'mois': m, 'cumul_eur': Decimal('0')} for m in range(1, 13)]} for a in annees]

    # Dernière transition vers "Accepte" de chaque devis (en théorie unique,
    # un devis n'est accepté qu'une fois — par sécurité on garde la plus
    # récente si plusieurs lignes existaient).
    transitions = (
        HistoriqueStatut.objects
        .filter(devis_id__in=[d['id_devis'] for d in devis_acceptes], nouveau_statut=STATUT_ACCEPTE)
        .order_by('devis_id', '-date')
        .values('devis_id', 'date')
    )
    date_acceptation_par_devis = {}
    for t in transitions:
        date_acceptation_par_devis.setdefault(t['devis_id'], t['date'])

    totaux_par_mois = defaultdict(Decimal)
    for devis in devis_acceptes:
        date_acceptation = date_acceptation_par_devis.get(devis['id_devis'])
        if date_acceptation is None:
            continue
        date_locale = timezone.localtime(date_acceptation).date()
        if date_locale.year in annees:
            totaux_par_mois[(date_locale.year, date_locale.month)] += devis['montant_ht']

    resultat = []
    for annee in annees:
        points = []
        cumul = Decimal('0')
        for mois in range(1, 13):
            cumul += totaux_par_mois.get((annee, mois), Decimal('0'))
            points.append({'mois': mois, 'cumul_eur': cumul})
        resultat.append({'annee': annee, 'points': points})
    return resultat
