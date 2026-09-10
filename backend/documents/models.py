import uuid

from django.conf import settings
from django.db import models

CATEGORIE_CHOICES = [
    ('contract', 'Contrat'),
    ('technical', 'Technique'),
    ('financial', 'Financier'),
    ('legal', 'Juridique'),
    ('report', 'Rapport'),
    ('other', 'Autre'),
]


def chemin_document(instance, nom_fichier):
    return f'documents/{instance.id_document}/{nom_fichier}'


class Document(models.Model):
    """Fichier importé dans la bibliothèque documentaire globale (module
    Documents) — distinct des pièces jointes d'une affaire précise
    (PieceJointeAffaire) : celui-ci n'est rattaché à rien de particulier,
    juste une désignation libre + catégorie. Les devis/factures générés
    (PDF à la volée, voir devis.pdf/factures.pdf) apparaissent dans le même
    module côté frontend mais ne sont jamais stockés ici — c'est une vue
    combinée, pas une duplication de stockage."""

    id_document = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    designation = models.CharField(max_length=255)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES, default='other')
    fichier = models.FileField(upload_to=chemin_document)
    lie_a = models.CharField(max_length=255, blank=True)
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='documents_ajoutes',
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return self.designation
