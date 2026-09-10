from django.db.models.signals import post_delete, post_save
from django.dispatch import Signal, receiver

from .models import LigneDevis

# Envoyé quand un devis passe au statut 'Accepte' (voir Devis.changer_statut).
# Écouté par affaires.signals.creer_affaire_sur_devis_accepte, qui crée
# automatiquement l'Affaire d'exécution correspondante — délibérément
# découplé ainsi pour que l'app devis n'ait pas à connaître l'app affaires.
devis_accepted = Signal()


@receiver(post_save, sender=LigneDevis)
@receiver(post_delete, sender=LigneDevis)
def recalculer_sur_ligne(sender, instance, **kwargs):
    instance.devis.recalculer_montants()
