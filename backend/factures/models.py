import calendar
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.db import models

from affaires.models import Affaire

# ---------------------------------------------------------------------------
# Statut
# ---------------------------------------------------------------------------
STATUT_BROUILLON = 'Brouillon'
STATUT_ENVOYEE = 'Envoyee'
STATUT_PAYEE = 'Payee'
STATUT_PARTIELLEMENT_PAYEE = 'Partiellement_payee'
STATUT_EN_RETARD = 'En_retard'
STATUT_ANNULEE = 'Annulee'

STATUT_CHOICES = [
    (STATUT_BROUILLON, 'Brouillon'),
    (STATUT_ENVOYEE, 'Envoyée'),
    (STATUT_PAYEE, 'Payée'),
    (STATUT_PARTIELLEMENT_PAYEE, 'Partiellement payée'),
    (STATUT_EN_RETARD, 'En retard'),
    (STATUT_ANNULEE, 'Annulée'),
]

# ---------------------------------------------------------------------------
# Mode de règlement
# ---------------------------------------------------------------------------
MODE_REGLEMENT_CHOICES = [
    ('virement', 'Virement bancaire'),
    ('cheque', 'Chèque'),
    ('especes', 'Espèces'),
    ('carte', 'Carte bancaire'),
    ('prelevement', 'Prélèvement automatique'),
]

# ---------------------------------------------------------------------------
# Conditions de paiement — détermine le calcul de la date d'échéance.
# Trois méthodes mutuellement exclusives (voir calculer_date_echeance) :
#   - 'net'       : date de facture + N jours calendaires.
#   - 'fin_mois'  : fin du mois de facturation, PUIS + N jours (jamais
#                   l'inverse — les jours s'ajoutent après la fin de mois).
#   - 'jour_fixe' : N-ième jour du mois suivant celui de la facture.
# ---------------------------------------------------------------------------
TYPE_ECHEANCE_NET = 'net'
TYPE_ECHEANCE_FIN_MOIS = 'fin_mois'
TYPE_ECHEANCE_JOUR_FIXE = 'jour_fixe'

TYPE_ECHEANCE_CHOICES = [
    (TYPE_ECHEANCE_NET, 'Paiement net (nombre de jours)'),
    (TYPE_ECHEANCE_FIN_MOIS, 'X jours fin de mois'),
    (TYPE_ECHEANCE_JOUR_FIXE, 'Jour fixe du mois suivant'),
]


def _fin_de_mois(d):
    dernier_jour = calendar.monthrange(d.year, d.month)[1]
    return d.replace(day=dernier_jour)


def _mois_suivant(d):
    return (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)


def calculer_date_echeance(date_facture, type_echeance, nombre_jours=None, jour_fixe_mois_suivant=None):
    """Date d'échéance à partir de la date de facture et de la modalité de
    paiement choisie :
    - TYPE_ECHEANCE_NET : date_facture + nombre_jours jours calendaires.
    - TYPE_ECHEANCE_FIN_MOIS : dernier jour du mois de facturation, PUIS
      + nombre_jours (jamais la méthode inverse : ajouter les jours d'abord
      puis aller à la fin du mois donnerait un résultat différent et faux).
    - TYPE_ECHEANCE_JOUR_FIXE : le jour_fixe_mois_suivant-ième jour du mois
      suivant celui de la facture ; borné au dernier jour existant de ce
      mois si jour_fixe_mois_suivant le dépasse (ex. 31 dans un mois de 30
      jours -> 30)."""
    if type_echeance == TYPE_ECHEANCE_NET:
        return date_facture + timedelta(days=nombre_jours or 0)

    if type_echeance == TYPE_ECHEANCE_FIN_MOIS:
        return _fin_de_mois(date_facture) + timedelta(days=nombre_jours or 0)

    if type_echeance == TYPE_ECHEANCE_JOUR_FIXE:
        annee, mois = _mois_suivant(date_facture)
        dernier_jour_mois_suivant = calendar.monthrange(annee, mois)[1]
        jour = min(jour_fixe_mois_suivant or 1, dernier_jour_mois_suivant)
        return date(annee, mois, jour)

    raise ValueError(f"Type d'échéance inconnu : {type_echeance!r}")


def formater_conditions_paiement(type_echeance, nombre_jours=None, jour_fixe_mois_suivant=None):
    """Libellé humain des conditions de paiement — utilisé dans l'API
    (aperçu liste/détail) et dans les documents PDF/Excel."""
    if type_echeance == TYPE_ECHEANCE_NET:
        return f'{nombre_jours} jours nets' if nombre_jours else 'Comptant (à réception)'
    if type_echeance == TYPE_ECHEANCE_FIN_MOIS:
        return f'{nombre_jours} jours fin de mois'
    if type_echeance == TYPE_ECHEANCE_JOUR_FIXE:
        return f'Le {jour_fixe_mois_suivant} du mois suivant'
    return type_echeance


def generer_numero_facture():
    """FA-{année}-{séquence sur 3 chiffres}, basée sur le plus grand numéro
    déjà attribué (voir devis.models.generer_numero pour le pourquoi du
    MAX plutôt qu'un COUNT())."""
    from django.utils import timezone

    annee = timezone.now().year
    prefixe = f'FA-{annee}-'
    dernier_numero = (
        Facture.objects.filter(numero_facture__startswith=prefixe)
        .order_by('-numero_facture')
        .values_list('numero_facture', flat=True)
        .first()
    )
    derniere_sequence = int(dernier_numero[len(prefixe):]) if dernier_numero else 0
    return f'{prefixe}{derniere_sequence + 1:03d}'


def chemin_signature(instance, nom_fichier):
    return f'factures/{instance.id_facture}/signature_{nom_fichier}'


class Facture(models.Model):
    """Une facture est créée manuellement (par la Comptabilité) à partir
    d'une affaire — jamais automatiquement, contrairement à l'affaire
    elle-même. Une affaire n'a jamais plus d'une facture (OneToOne) ; les
    lignes sont initialisées à partir de celles du devis d'origine puis
    modifiables indépendamment (une facture peut différer légèrement du
    devis final : ajustements, avoir, etc.)."""

    id_facture = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numero_facture = models.CharField(max_length=30, unique=True, editable=False)

    affaire = models.OneToOneField(Affaire, on_delete=models.PROTECT, related_name='facture')

    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_BROUILLON)

    date_facture = models.DateField(null=True, blank=True)
    mode_reglement = models.CharField(max_length=20, choices=MODE_REGLEMENT_CHOICES, default='virement')

    type_echeance = models.CharField(max_length=20, choices=TYPE_ECHEANCE_CHOICES, default=TYPE_ECHEANCE_NET)
    # Nombre de jours — utilisé pour TYPE_ECHEANCE_NET et TYPE_ECHEANCE_FIN_MOIS uniquement.
    nombre_jours = models.PositiveSmallIntegerField(null=True, blank=True)
    # Jour du mois (1-31) — utilisé pour TYPE_ECHEANCE_JOUR_FIXE uniquement.
    jour_fixe_mois_suivant = models.PositiveSmallIntegerField(null=True, blank=True)

    date_echeance = models.DateField(null=True, blank=True, editable=False)

    # Taux unique (pas de marge/remise sur une facture) — 0 par défaut.
    taux_tva = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    sous_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_tva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    commentaire = models.TextField(blank=True)

    # Image de la signature électronique (déjà convertie en image par
    # l'utilisateur) à insérer dans le PDF généré — optionnelle, ajoutable à
    # tout moment avant de télécharger la facture.
    signature = models.ImageField(upload_to=chemin_signature, null=True, blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return self.numero_facture

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            self.numero_facture = generer_numero_facture()
        if not self.date_facture:
            self.date_facture = date.today()
        self.date_echeance = calculer_date_echeance(
            self.date_facture, self.type_echeance, self.nombre_jours, self.jour_fixe_mois_suivant,
        )
        super().save(*args, **kwargs)

    @property
    def label_echeance(self):
        return formater_conditions_paiement(self.type_echeance, self.nombre_jours, self.jour_fixe_mois_suivant)

    @property
    def montant_a_payer(self):
        # Pas de suivi de règlements partiels dans ce module pour l'instant
        # (voir module Paiements) : le montant à payer est le total TTC.
        return self.montant_total

    @property
    def est_en_retard(self):
        return (
            self.date_echeance is not None
            and self.date_echeance < date.today()
            and self.statut not in (STATUT_PAYEE, STATUT_ANNULEE)
        )

    def recalculer_montants(self, save=True):
        self.sous_total = sum((l.montant for l in self.lignes.all()), Decimal('0'))
        self.montant_tva = (self.sous_total * self.taux_tva / Decimal('100')).quantize(Decimal('0.01'))
        self.montant_total = self.sous_total + self.montant_tva

        if save:
            super(Facture, self).save(
                update_fields=['sous_total', 'montant_tva', 'montant_total', 'date_modification'],
            )

    @classmethod
    def creer_depuis_affaire(cls, affaire, type_echeance, nombre_jours=None, jour_fixe_mois_suivant=None):
        """Copie les lignes du devis d'origine de l'affaire comme point de
        départ de la facture (modifiables ensuite indépendamment). La
        modalité de paiement est choisie par l'utilisateur avant la
        création (voir FactureCreateSerializer) — jamais de valeur par
        défaut silencieuse."""
        facture = cls.objects.create(
            affaire=affaire,
            type_echeance=type_echeance,
            nombre_jours=nombre_jours,
            jour_fixe_mois_suivant=jour_fixe_mois_suivant,
        )
        for l in affaire.devis.lignes.all():
            LigneFacture.objects.create(
                facture=facture, description=l.description,
                quantite=l.quantite, prix_unitaire=l.prix_unitaire,
                # Nécessaire pour les lignes "forfait" du devis (montant saisi
                # directement, sans quantité/prix unitaire) : LigneFacture.save()
                # ne recalcule montant que si quantite ou prix_unitaire est
                # renseigné, donc sans ce champ ici le montant forfaitaire
                # d'origine serait silencieusement perdu (remis à 0).
                montant=l.montant,
            )
        facture.recalculer_montants()
        return facture


class LigneFacture(models.Model):
    """Même sémantique que devis.LigneDevis : description + soit quantité/
    prix unitaire (montant calculé), soit un montant saisi directement
    (forfait), soit ni l'un ni l'autre (ligne descriptive, montant à 0)."""

    id_ligne = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='lignes')
    description = models.CharField(max_length=500)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    montant = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_creation']

    def save(self, *args, **kwargs):
        if self.quantite is not None or self.prix_unitaire is not None:
            self.montant = (self.quantite or Decimal('0')) * (self.prix_unitaire or Decimal('0'))
        super().save(*args, **kwargs)
