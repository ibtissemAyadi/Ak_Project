from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    ajoute_par_nom = serializers.SerializerMethodField()
    taille_ko = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id_document', 'designation', 'categorie', 'fichier', 'lie_a',
            'ajoute_par', 'ajoute_par_nom', 'taille_ko', 'date_creation',
        ]
        read_only_fields = ['id_document', 'ajoute_par', 'ajoute_par_nom', 'taille_ko', 'date_creation']
        extra_kwargs = {'lie_a': {'required': False}}

    def get_ajoute_par_nom(self, obj):
        return f'{obj.ajoute_par.prenom} {obj.ajoute_par.nom}' if obj.ajoute_par else None

    def get_taille_ko(self, obj):
        try:
            return round(obj.fichier.size / 1024)
        except (ValueError, OSError):
            return 0
