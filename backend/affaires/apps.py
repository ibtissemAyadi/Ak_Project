from django.apps import AppConfig


class AffairesConfig(AppConfig):
    name = 'affaires'

    def ready(self):
        from . import signals  # noqa: F401
