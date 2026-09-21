"""Logique de calcul réutilisable par les vues DRF (affaires/views.py) ET par
les outils du copilot IA (assistant/tools.py) — un seul endroit pour la
définition du CA prévisionnel, du montant en attente et des affaires à
risque, pour que le copilot ne puisse jamais diverger de ce qu'affiche le
tableau de bord."""

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from factures.models import STATUT_PAYEE

from .models import Affaire


def _premier_du_mois_suivant(date, nb_mois):
    mois_total = date.month - 1 + nb_mois
    return date.replace(year=date.year + mois_total // 12, month=mois_total % 12 + 1, day=1)


def calculer_prevision_revenus(nb_mois=12, charge_affaires_id=None):
    """Somme du budget des affaires pas encore terminées, regroupée par mois
    de date_fin_prevue. Voir affaires.views.AffairePrevisionRevenusView pour
    le détail du raisonnement métier."""
    nb_mois = max(1, min(nb_mois, 24))
    premier_mois = timezone.localdate().replace(day=1)

    queryset = Affaire.objects.filter(date_fin_reelle__isnull=True, date_fin_prevue__gte=premier_mois)
    if charge_affaires_id:
        queryset = queryset.filter(charge_affaires_id=charge_affaires_id)

    totaux_par_mois = defaultdict(Decimal)
    for affaire in queryset.values('date_fin_prevue', 'budget'):
        cle = affaire['date_fin_prevue'].strftime('%Y-%m')
        totaux_par_mois[cle] += affaire['budget']

    resultat = []
    for i in range(nb_mois):
        debut_mois = _premier_du_mois_suivant(premier_mois, i)
        cle = debut_mois.strftime('%Y-%m')
        resultat.append({'mois': cle, 'montant_prevu': totaux_par_mois.get(cle, Decimal('0'))})
    return resultat


def calculer_montant_en_attente(charge_affaires_id=None):
    """Somme du budget des affaires dont la facture n'est pas (encore) payée."""
    queryset = Affaire.objects.exclude(facture__statut=STATUT_PAYEE)
    if charge_affaires_id:
        queryset = queryset.filter(charge_affaires_id=charge_affaires_id)
    return queryset.aggregate(total=Sum('budget'))['total'] or Decimal('0')


def lister_affaires_a_risque(charge_affaires_id=None, horizon_jours=14):
    """Affaires non terminées dont la date de fin prévue est déjà dépassée
    (en retard) ou approche dans les `horizon_jours` prochains jours (à
    risque) — les deux catégories que "risque de dépasser l'échéance"
    recouvre en pratique. Affaires sans date_fin_prevue exclues : on ne peut
    rien évaluer sans cette date (voir revenue-chart.tsx pour le même
    constat côté CA prévisionnel)."""
    aujourdhui = timezone.localdate()
    limite = aujourdhui + timedelta(days=horizon_jours)

    queryset = (
        Affaire.objects.filter(date_fin_reelle__isnull=True, date_fin_prevue__isnull=False, date_fin_prevue__lte=limite)
        .select_related('client')
    )
    if charge_affaires_id:
        queryset = queryset.filter(charge_affaires_id=charge_affaires_id)

    resultat = []
    for affaire in queryset.order_by('date_fin_prevue'):
        resultat.append({
            'numero_affaire': affaire.numero_affaire,
            'client': affaire.client.raison_sociale,
            'date_fin_prevue': affaire.date_fin_prevue,
            'en_retard': affaire.date_fin_prevue < aujourdhui,
            'etat_avancement': affaire.etat_avancement,
        })
    return resultat
