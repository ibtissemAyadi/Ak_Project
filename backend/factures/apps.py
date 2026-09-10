from django.apps import AppConfig


class FacturesConfig(AppConfig):
    name = 'factures'

    def ready(self):
        from . import signals  # noqa: F401
