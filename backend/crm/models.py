import uuid

from django.db import models


class Client(models.Model):
    """Fiche client CRM légère : identité légale + un contact (téléphone/email).

    Pas de suppression prévue au niveau métier — un client qui n'est plus
    actif passe au statut 'Inactif' plutôt que d'être supprimé."""

    STATUT_CHOICES = [
        ('Prospect', 'Prospect'),
        ('Actif', 'Actif'),
        ('Inactif', 'Inactif'),
    ]

    id_client = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    raison_sociale = models.CharField(max_length=255)
    # unique=True + null=True (pas blank='') : plusieurs clients sans matricule
    # renseigné doivent pouvoir coexister — NULL est ignoré par la contrainte
    # unique, contrairement à '' qui entrerait en collision dès le 2e client.
    matricule_fiscal = models.CharField(max_length=50, unique=True, blank=True, null=True)
    adresse = models.CharField(max_length=255, blank=True)
    pays = models.CharField(max_length=100, blank=True)
    secteur_activite = models.CharField(max_length=100, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='Prospect')
    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return self.raison_sociale

    def save(self, *args, **kwargs):
        # Normalise '' -> None pour matricule_fiscal (voir commentaire du champ).
        if self.matricule_fiscal == '':
            self.matricule_fiscal = None
        super().save(*args, **kwargs)
