import uuid

from django.conf import settings
from django.db import models


class Activite(models.Model):
    """Journal des actions utilisateur affiché sur le tableau de bord
    ('Activité récente') : chaque création, changement de statut,
    commentaire ou upload significatif à travers l'application enregistre
    une ligne ici, via Activite.enregistrer(). Jamais généré automatiquement
    par un signal générique (post_save) : chaque vue choisit explicitement
    l'action et la cible à afficher, au bon endroit métier — un post_save
    générique ne saurait pas distinguer "créé" de "mis à jour par une
    migration de données", ni produire un libellé lisible."""

    id_activite = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='activites',
    )
    action = models.CharField(max_length=100)
    cible = models.CharField(max_length=255)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_creation']

    def __str__(self):
        return f'{self.utilisateur} {self.action} {self.cible}'

    @classmethod
    def enregistrer(cls, utilisateur, action, cible):
        cls.objects.create(utilisateur=utilisateur, action=action, cible=cible)
