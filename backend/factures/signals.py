from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import LigneFacture


@receiver(post_save, sender=LigneFacture)
@receiver(post_delete, sender=LigneFacture)
def recalculer_sur_ligne(sender, instance, **kwargs):
    instance.facture.recalculer_montants()
