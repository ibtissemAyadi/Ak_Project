from rest_framework import serializers

from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id_client', 'raison_sociale', 'matricule_fiscal', 'adresse', 'pays',
            'secteur_activite', 'statut', 'telephone', 'email',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['id_client', 'date_creation', 'date_modification']
