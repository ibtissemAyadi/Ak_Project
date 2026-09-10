import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from crm.models import Client
from devis.models import Devis

PRIORITE_BASSE = 'Basse'
PRIORITE_NORMALE = 'Normale'
PRIORITE_HAUTE = 'Haute'
PRIORITE_CRITIQUE = 'Critique'

PRIORITE_CHOICES = [
    (PRIORITE_BASSE, 'Basse'),
    (PRIORITE_NORMALE, 'Normale'),
    (PRIORITE_HAUTE, 'Haute'),
    (PRIORITE_CRITIQUE, 'Critique'),
]


def generer_numero_affaire(devis):
    """AS-{2 derniers chiffres de l'année}-{séquence}, dérivé directement du
    numéro du devis d'origine (ex. devis DS-2026-0013 -> affaire AS-26-0013) :
    relation numéro-à-numéro explicite avec le devis, et unicité garantie
    sans scan de séquence puisque le OneToOneField sur devis interdit deux
    affaires pour le même devis (donc jamais deux fois la même séquence)."""
    segments = devis.numero.split('-')
    annee, sequence = segments[-2], segments[-1]
    return f'AS-{annee[-2:]}-{sequence}'


class Affaire(models.Model):
    """Une affaire est créée automatiquement quand un devis passe au statut
    'Accepte' (voir devis.signals.devis_accepted / affaires.signals) : c'est
    le passage du commercial (devis) à l'exécution (suivi budget/heures/
    avancement) d'un projet gagné. Jamais créée manuellement."""

    id_affaire = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numero_affaire = models.CharField(max_length=30, unique=True, editable=False)

    devis = models.OneToOneField(Devis, on_delete=models.PROTECT, related_name='affaire')
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='affaires')
    charge_affaires = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='affaires_pilotees',
    )

    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    heures_prevues = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    heures_consommees = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    etat_avancement = models.PositiveSmallIntegerField(default=0)  # 0-100 (%)

    date_debut = models.DateField(null=True, blank=True)
    date_fin_prevue = models.DateField(null=True, blank=True)
    date_fin_reelle = models.DateField(null=True, blank=True)

    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default=PRIORITE_NORMALE)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return self.numero_affaire

    def save(self, *args, **kwargs):
        if not self.numero_affaire:
            self.numero_affaire = generer_numero_affaire(self.devis)
        super().save(*args, **kwargs)

    @property
    def heures_restantes(self) -> Decimal:
        return self.heures_prevues - self.heures_consommees

    @classmethod
    def creer_depuis_devis(cls, devis):
        """Construit l'affaire à partir du devis accepté : budget = montant HT
        du devis (base de travail hors taxes), pilote = chargé d'affaires du
        devis par défaut. Le devis n'a plus de notion d'heures (lignes
        génériques quantité/prix unitaire) : heures_prevues démarre à 0, à
        renseigner manuellement par le pilote sur l'affaire."""
        return cls.objects.create(
            devis=devis,
            client=devis.client,
            charge_affaires=devis.charge_affaires,
            budget=devis.montant_ht,
        )


class CommentaireAffaire(models.Model):
    id_commentaire = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    affaire = models.ForeignKey(Affaire, on_delete=models.CASCADE, related_name='commentaires')
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='commentaires_affaires')
    texte = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']


def chemin_piece_jointe(instance, nom_fichier):
    return f'affaires/{instance.affaire_id}/{nom_fichier}'


class PieceJointeAffaire(models.Model):
    """Document rattaché à une affaire — ex. bon de commande signé par le
    client, courrier, plan... Type libre (pas de liste fermée : le besoin
    documentaire d'une affaire est trop variable pour une énumération)."""

    id_piece = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    affaire = models.ForeignKey(Affaire, on_delete=models.CASCADE, related_name='pieces_jointes')
    designation = models.CharField(max_length=255)
    fichier = models.FileField(upload_to=chemin_piece_jointe)
    ajoute_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='pieces_jointes_ajoutees')
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_ajout']
