from rest_framework import serializers

from .models import Activite


class ActiviteSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Activite
        fields = ['id_activite', 'utilisateur_nom', 'action', 'cible', 'date_creation']

    def get_utilisateur_nom(self, obj):
        if obj.utilisateur is None:
            return 'Système'
        return f'{obj.utilisateur.prenom} {obj.utilisateur.nom}'
