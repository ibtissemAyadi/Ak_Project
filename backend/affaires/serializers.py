from rest_framework import serializers

from devis.serializers import ClientMiniSerializer, DevisDetailSerializer, UtilisateurMiniSerializer

from .models import Affaire, CommentaireAffaire, PieceJointeAffaire


class CommentaireAffaireSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = CommentaireAffaire
        fields = ['id_commentaire', 'affaire', 'auteur', 'auteur_nom', 'texte', 'date_creation']
        read_only_fields = ['id_commentaire', 'auteur', 'auteur_nom', 'date_creation']
        extra_kwargs = {'affaire': {'required': False}}

    def get_auteur_nom(self, obj):
        return f'{obj.auteur.prenom} {obj.auteur.nom}'


class PieceJointeAffaireSerializer(serializers.ModelSerializer):
    ajoute_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = PieceJointeAffaire
        fields = ['id_piece', 'affaire', 'designation', 'fichier', 'ajoute_par', 'ajoute_par_nom', 'date_ajout']
        read_only_fields = ['id_piece', 'ajoute_par', 'ajoute_par_nom', 'date_ajout']
        extra_kwargs = {'affaire': {'required': False}}

    def get_ajoute_par_nom(self, obj):
        return f'{obj.ajoute_par.prenom} {obj.ajoute_par.nom}' if obj.ajoute_par else None


class AffaireListSerializer(serializers.ModelSerializer):
    client = ClientMiniSerializer(read_only=True)
    charge_affaires = UtilisateurMiniSerializer(read_only=True)
    heures_restantes = serializers.SerializerMethodField()
    devis_numero = serializers.CharField(source='devis.numero', read_only=True)
    objet = serializers.CharField(source='devis.objet', read_only=True)

    class Meta:
        model = Affaire
        fields = [
            'id_affaire', 'numero_affaire', 'devis', 'devis_numero', 'objet',
            'client', 'charge_affaires',
            'budget', 'heures_prevues', 'heures_consommees', 'heures_restantes',
            'etat_avancement', 'priorite',
            'date_debut', 'date_fin_prevue', 'date_fin_reelle', 'date_creation',
        ]

    def get_heures_restantes(self, obj):
        return str(obj.heures_restantes)


class AffaireDetailSerializer(AffaireListSerializer):
    # Le devis d'origine complet (lignes, montants, marge/remise, historique
    # des statuts...) — une affaire doit contenir toutes les informations du
    # devis dont elle est issue, pas seulement son numéro/objet.
    devis_detail = DevisDetailSerializer(source='devis', read_only=True)
    commentaires = CommentaireAffaireSerializer(many=True, read_only=True)
    pieces_jointes = PieceJointeAffaireSerializer(many=True, read_only=True)
    facture_id = serializers.SerializerMethodField()

    class Meta(AffaireListSerializer.Meta):
        fields = AffaireListSerializer.Meta.fields + [
            'devis_detail', 'date_modification', 'commentaires', 'pieces_jointes', 'facture_id',
        ]

    def get_facture_id(self, obj):
        # Accès à l'attribut inverse OneToOne défini par Facture.affaire
        # (related_name='facture') — renvoie None sans exception grâce à
        # RelatedObjectDoesNotExist qui hérite d'AttributeError.
        facture = getattr(obj, 'facture', None)
        return facture.id_facture if facture else None


class AffaireUpdateSerializer(serializers.ModelSerializer):
    """En-tête modifiable par le Chargé d'affaires pilote (ou un
    Administrateur) — pas le devis/client/numero d'origine, ni les
    commentaires (endpoint dédié)."""

    class Meta:
        model = Affaire
        fields = [
            'budget', 'heures_prevues', 'heures_consommees', 'etat_avancement', 'priorite',
            'date_debut', 'date_fin_prevue', 'date_fin_reelle',
        ]
        extra_kwargs = {field: {'required': False} for field in fields}

    def validate_etat_avancement(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError("L'état d'avancement doit être compris entre 0 et 100.")
        return value

    def to_representation(self, instance):
        return AffaireDetailSerializer(instance).data
