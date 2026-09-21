import uuid

from django.conf import settings
from django.db import models


class PropositionAction(models.Model):
    """Brouillon d'action sensible proposée par le copilot IA, en attente de
    confirmation explicite de l'utilisateur avant toute écriture en base.

    Le modèle en 2 outils (proposer_* puis confirmer_*) s'appuie sur cette
    table plutôt que de faire reformuler les montants/le client par le LLM au
    tour suivant : confirmer_* relit exactement ce qui a été montré à
    l'utilisateur (payload figé ici), impossible pour le modèle de confirmer
    autre chose que ce qui a réellement été proposé."""

    id_proposition = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='propositions_copilot')
    type_action = models.CharField(max_length=50)
    payload = models.JSONField()
    description = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)
    executee = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date_creation']
