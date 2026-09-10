import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError

from crm.models import Client


# ---------------------------------------------------------------------------
# Cycle de statuts
# ---------------------------------------------------------------------------
# Brouillon -> En_preparation -> A_valider -> Envoye -> Accepte / Refuse
# Annulation possible uniquement depuis Brouillon ou En_preparation.
# Toute autre transition (ex: Brouillon -> Accepte) est invalide.
STATUT_BROUILLON = 'Brouillon'
STATUT_EN_PREPARATION = 'En_preparation'
STATUT_A_VALIDER = 'A_valider'
STATUT_ENVOYE = 'Envoye'
STATUT_ACCEPTE = 'Accepte'
STATUT_REFUSE = 'Refuse'
STATUT_ANNULE = 'Annule'

STATUT_CHOICES = [
    (STATUT_BROUILLON, 'Brouillon'),
    (STATUT_EN_PREPARATION, 'En préparation'),
    (STATUT_A_VALIDER, 'À valider'),
    (STATUT_ENVOYE, 'Envoyé'),
    (STATUT_ACCEPTE, 'Accepté'),
    (STATUT_REFUSE, 'Refusé'),
    (STATUT_ANNULE, 'Annulé'),
]

# Statuts terminaux : plus aucune transition possible.
STATUTS_TERMINAUX = {STATUT_ACCEPTE, STATUT_REFUSE, STATUT_ANNULE}

# Statuts à partir desquels une modification de lignes/montants/intervenants
# déclenche une nouvelle version plutôt qu'une édition en place.
STATUTS_GELES_POUR_EDITION = {STATUT_ENVOYE, STATUT_ACCEPTE, STATUT_REFUSE, STATUT_ANNULE}

TRANSITIONS_AUTORISEES = {
    STATUT_BROUILLON: {STATUT_EN_PREPARATION, STATUT_ANNULE},
    STATUT_EN_PREPARATION: {STATUT_A_VALIDER, STATUT_ANNULE},
    STATUT_A_VALIDER: {STATUT_ENVOYE},
    STATUT_ENVOYE: {STATUT_ACCEPTE, STATUT_REFUSE},
    STATUT_ACCEPTE: set(),
    STATUT_REFUSE: set(),
    STATUT_ANNULE: set(),
}

TYPE_VALEUR_CHOICES = [('pourcentage', 'Pourcentage'), ('valeur', 'Valeur')]


def generer_numero():
    """DS-{année}-{séquence sur 4 chiffres}, séquence par année basée sur le
    plus grand numéro déjà attribué (et non un COUNT() des numéros distincts :
    un COUNT() se décale et produit une collision dès qu'un numéro intermédiaire
    a été supprimé — ex. 5 numéros restants après suppression d'un 6e ne
    signifie pas que 'DS-...-0006' est libre s'il en existe un plus loin)."""
    from django.utils import timezone

    annee = timezone.now().year
    prefixe = f'DS-{annee}-'
    dernier_numero = (
        Devis.objects.filter(numero__startswith=prefixe)
        .order_by('-numero')
        .values_list('numero', flat=True)
        .first()
    )
    derniere_sequence = int(dernier_numero[len(prefixe):]) if dernier_numero else 0
    return f'{prefixe}{derniere_sequence + 1:04d}'


class Devis(models.Model):
    """En-tête de devis. Une "version" = une ligne Devis à part entière (avec
    ses propres lignes figées), partageant le même `numero`
    qu'une éventuelle version précédente. Seule la version dont
    `est_courante=True` est modifiable ; les précédentes sont conservées
    telles quelles (lecture seule) — c'est ce qui garantit le freeze des
    montants/lignes historiques sans avoir besoin d'une table de snapshot
    séparée."""

    id_devis = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    numero = models.CharField(max_length=30, editable=False)
    version = models.PositiveIntegerField(default=1, editable=False)
    est_courante = models.BooleanField(default=True, editable=False)

    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='devis')
    charge_affaires = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='devis_geres',
    )

    objet = models.CharField(max_length=255, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_BROUILLON)

    # Taux global appliqué au sous-total (pas de taux par ligne) — 0 par
    # défaut, à ajuster manuellement si besoin.
    taux_tva_defaut = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Marge et remise : simple montant global (% ou valeur absolue) appliqué
    # sur le sous-total des lignes — pas de variante "ligne par ligne", les
    # lignes n'ayant plus de notion de marge/remise individuelle. Ni l'un ni
    # l'autre n'est obligatoire (0 par défaut = sans effet).
    type_marge = models.CharField(max_length=12, choices=TYPE_VALEUR_CHOICES, default='pourcentage')
    valeur_marge = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    type_remise = models.CharField(max_length=12, choices=TYPE_VALEUR_CHOICES, default='pourcentage')
    valeur_remise = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    commentaire_justification = models.TextField(blank=True)

    # --- Montants calculés, stockés (jamais recalculés à la volée sans être
    # persistés) : voir Devis.recalculer_montants(). ---
    sous_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_marge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_remise = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_ht = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_tva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_ttc = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    date_validite = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-date_creation']
        constraints = [
            models.UniqueConstraint(fields=['numero', 'version'], name='unique_numero_version'),
        ]

    def __str__(self):
        return f'{self.numero} v{self.version}'

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = generer_numero()
        super().save(*args, **kwargs)

    # ------------------------------------------------------------------
    # Moteur de calcul
    # ------------------------------------------------------------------
    def recalculer_montants(self, save=True):
        """Recalcule tous les montants stockés à partir des lignes actuelles.
        Appelé automatiquement (signal post_save/post_delete sur LigneDevis)
        à chaque ajout/modification/suppression d'une ligne, et explicitement
        après une modification de l'en-tête (TVA/marge/remise) qui ne
        déclenche aucun signal de ligne (voir DevisDetailView.update()).

        sous_total = somme des lignes (quantité × prix unitaire).
        Marge et remise s'appliquent une fois sur ce sous-total, puis la TVA
        (taux unique du devis) s'applique sur le total HT qui en résulte.
        """
        self.sous_total = sum((l.montant for l in self.lignes.all()), Decimal('0'))

        def ajustement(type_, valeur, base):
            if not valeur:
                return Decimal('0')
            if type_ == 'pourcentage':
                return (base * valeur / Decimal('100')).quantize(Decimal('0.01'))
            return valeur

        self.montant_marge = ajustement(self.type_marge, self.valeur_marge, self.sous_total)
        self.montant_remise = ajustement(self.type_remise, self.valeur_remise, self.sous_total)
        self.montant_ht = self.sous_total + self.montant_marge - self.montant_remise
        self.montant_tva = (self.montant_ht * self.taux_tva_defaut / Decimal('100')).quantize(Decimal('0.01'))
        self.montant_ttc = self.montant_ht + self.montant_tva

        if save:
            super(Devis, self).save(
                update_fields=[
                    'sous_total', 'montant_marge', 'montant_remise',
                    'montant_ht', 'montant_tva', 'montant_ttc', 'date_modification',
                ],
            )

    # ------------------------------------------------------------------
    # Machine à états
    # ------------------------------------------------------------------
    def transition_est_valide(self, nouveau_statut):
        return nouveau_statut in TRANSITIONS_AUTORISEES.get(self.statut, set())

    def changer_statut(self, nouveau_statut, utilisateur, commentaire=''):
        if not self.transition_est_valide(nouveau_statut):
            raise ValidationError(
                f"Transition invalide : {self.get_statut_display()} -> {nouveau_statut}",
            )
        if nouveau_statut == STATUT_REFUSE and not commentaire:
            raise ValidationError("Un motif est obligatoire pour refuser un devis.")

        ancien_statut = self.statut
        self.statut = nouveau_statut
        self.save(update_fields=['statut', 'date_modification'])

        HistoriqueStatut.objects.create(
            devis=self,
            ancien_statut=ancien_statut,
            nouveau_statut=nouveau_statut,
            utilisateur=utilisateur,
            commentaire=commentaire,
        )

        if nouveau_statut == STATUT_ACCEPTE:
            from .signals import devis_accepted
            devis_accepted.send(sender=Devis, devis=self)

    def verifier_editable(self):
        """Lève une erreur si cette version précise est obsolète (une version
        plus récente existe déjà) — une version remplacée ne se modifie
        jamais, même via le mécanisme d'auto-versioning."""
        if not self.est_courante:
            courante = Devis.objects.filter(numero=self.numero, est_courante=True).first()
            raise ValidationError(
                "Cette version (%s v%s) est obsolète et non modifiable directement. "
                "La version courante est v%s (id %s)."
                % (self.numero, self.version, courante.version if courante else '?', courante.id_devis if courante else '?'),
            )

    def necessite_nouvelle_version(self):
        """Une fois le devis Envoyé (ou au-delà), toute modification
        significative (lignes, montants, intervenants) doit passer par une
        nouvelle version plutôt que d'écraser celle-ci. Ne s'applique qu'à la
        version courante (verifier_editable() couvre le cas d'une version
        déjà remplacée)."""
        return self.statut in STATUTS_GELES_POUR_EDITION

    def creer_nouvelle_version(self):
        """Duplique l'en-tête (statut remis à Brouillon, nouvelle version,
        même numéro) ainsi que toutes les lignes actuelles. L'ancienne version
        est marquée non-courante et reste inchangée (lecture seule)."""
        from django.db import transaction
        from django.db.models import Max

        self.verifier_editable()

        with transaction.atomic():
            self.est_courante = False
            self.save(update_fields=['est_courante'])

            derniere_version = Devis.objects.filter(numero=self.numero).aggregate(Max('version'))['version__max']

            nouveau = Devis.objects.create(
                numero=self.numero,
                version=derniere_version + 1,
                est_courante=True,
                client=self.client,
                charge_affaires=self.charge_affaires,
                objet=self.objet,
                statut=STATUT_BROUILLON,
                taux_tva_defaut=self.taux_tva_defaut,
                type_marge=self.type_marge,
                valeur_marge=self.valeur_marge,
                type_remise=self.type_remise,
                valeur_remise=self.valeur_remise,
                commentaire_justification=self.commentaire_justification,
                date_validite=self.date_validite,
            )

            for l in self.lignes.all():
                LigneDevis.objects.create(
                    devis=nouveau,
                    description=l.description,
                    quantite=l.quantite,
                    prix_unitaire=l.prix_unitaire,
                )

            nouveau.recalculer_montants()
            return nouveau


class LigneDevis(models.Model):
    """Ligne générique d'un devis : description libre + soit quantité/prix
    unitaire (montant calculé), soit un montant saisi directement (utile pour
    un forfait global, sans détailler quantité/prix), soit ni l'un ni
    l'autre (ligne purement descriptive, montant à 0 — ex. un intitulé de
    section)."""

    id_ligne = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='lignes')
    description = models.CharField(max_length=500)
    quantite = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    montant = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date_creation']

    def save(self, *args, **kwargs):
        # Si quantité et/ou prix unitaire sont renseignés, le montant est
        # toujours recalculé à partir d'eux (source de vérité prioritaire).
        # Sinon, le montant saisi directement (ex. forfait) est conservé tel quel.
        if self.quantite is not None or self.prix_unitaire is not None:
            self.montant = (self.quantite or Decimal('0')) * (self.prix_unitaire or Decimal('0'))
        super().save(*args, **kwargs)


class HistoriqueStatut(models.Model):
    id_historique = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='historique_statuts')
    ancien_statut = models.CharField(max_length=20, blank=True)
    nouveau_statut = models.CharField(max_length=20)
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    date = models.DateTimeField(auto_now_add=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        ordering = ['-date']


class CommentaireDevis(models.Model):
    """Fil de discussion libre sur un devis — distinct de
    HistoriqueStatut.commentaire (motif d'une transition de statut) et de
    Devis.commentaire_justification (justification de la marge/remise) :
    ici, n'importe quelle note échangée à tout moment sur le devis."""

    id_commentaire = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='commentaires')
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='commentaires_devis')
    texte = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']
