from django.apps import AppConfig


class DevisConfig(AppConfig):
    name = 'devis'

    def ready(self):
        from . import signals  # noqa: F401
