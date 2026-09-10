import logging

from django.dispatch import receiver

from devis.signals import devis_accepted

from .models import Affaire

logger = logging.getLogger(__name__)


@receiver(devis_accepted)
def creer_affaire_sur_devis_accepte(sender, devis, **kwargs):
    """Implémentation réelle du point d'extension stubbé dans
    devis.signals.on_devis_accepted : un devis Accepté déclenche la création
    automatique de son Affaire d'exécution. Idempotent (OneToOneField devis
    empêche un doublon si le signal était renvoyé deux fois pour le même devis)."""
    if Affaire.objects.filter(devis=devis).exists():
        return
    affaire = Affaire.creer_depuis_devis(devis)
    logger.info('Affaire %s créée automatiquement depuis le devis %s.', affaire.numero_affaire, devis.numero)
