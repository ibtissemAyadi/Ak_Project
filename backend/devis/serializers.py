from rest_framework import serializers

from crm.models import Client
from utilisateurs.models import Utilisateur

from .models import (
    CommentaireDevis,
    Devis,
    HistoriqueStatut,
    LigneDevis,
    STATUT_CHOICES,
    STATUT_REFUSE,
    TRANSITIONS_AUTORISEES,
)


class ClientMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id_client', 'raison_sociale', 'email']


class UtilisateurMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id_utilisateur', 'nom', 'prenom', 'cout_horaire']


class LigneDevisSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneDevis
        fields = ['id_ligne', 'devis', 'description', 'quantite', 'prix_unitaire', 'montant']
        read_only_fields = ['id_ligne']
        extra_kwargs = {'devis': {'required': False}, 'montant': {'required': False}}


class HistoriqueStatutSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()

    class Meta:
        model = HistoriqueStatut
        fields = ['id_historique', 'ancien_statut', 'nouveau_statut', 'utilisateur', 'utilisateur_nom', 'date', 'commentaire']

    def get_utilisateur_nom(self, obj):
        return f'{obj.utilisateur.prenom} {obj.utilisateur.nom}' if obj.utilisateur else None


class CommentaireDevisSerializer(serializers.ModelSerializer):
    auteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = CommentaireDevis
        fields = ['id_commentaire', 'devis', 'auteur', 'auteur_nom', 'texte', 'date_creation']
        read_only_fields = ['id_commentaire', 'auteur', 'auteur_nom', 'date_creation']
        extra_kwargs = {'devis': {'required': False}}

    def get_auteur_nom(self, obj):
        return f'{obj.auteur.prenom} {obj.auteur.nom}'


class DevisListSerializer(serializers.ModelSerializer):
    client = ClientMiniSerializer(read_only=True)
    charge_affaires = UtilisateurMiniSerializer(read_only=True)

    class Meta:
        model = Devis
        fields = [
            'id_devis', 'numero', 'version', 'est_courante', 'client', 'charge_affaires',
            'objet', 'statut', 'montant_ht', 'montant_tva', 'montant_ttc',
            'date_creation', 'date_validite',
        ]


class DevisDetailSerializer(serializers.ModelSerializer):
    client = ClientMiniSerializer(read_only=True)
    charge_affaires = UtilisateurMiniSerializer(read_only=True)
    lignes = LigneDevisSerializer(many=True, read_only=True)
    historique_statuts = HistoriqueStatutSerializer(many=True, read_only=True)
    commentaires = CommentaireDevisSerializer(many=True, read_only=True)
    transitions_possibles = serializers.SerializerMethodField()
    affaire_id = serializers.SerializerMethodField()

    class Meta:
        model = Devis
        fields = [
            'id_devis', 'numero', 'version', 'est_courante', 'client', 'charge_affaires',
            'objet', 'statut', 'transitions_possibles', 'affaire_id',
            'taux_tva_defaut',
            'type_marge', 'valeur_marge',
            'type_remise', 'valeur_remise',
            'commentaire_justification',
            'sous_total', 'montant_marge', 'montant_remise',
            'montant_ht', 'montant_tva', 'montant_ttc',
            'date_creation', 'date_modification', 'date_validite',
            'lignes', 'historique_statuts', 'commentaires',
        ]

    def get_transitions_possibles(self, obj):
        return sorted(TRANSITIONS_AUTORISEES.get(obj.statut, set()))

    def get_affaire_id(self, obj):
        # Accès à l'attribut inverse OneToOne défini par Affaire.devis
        # (related_name='affaire') — renvoie None sans lever d'exception
        # grâce à RelatedObjectDoesNotExist qui hérite d'AttributeError.
        affaire = getattr(obj, 'affaire', None)
        return affaire.id_affaire if affaire else None


class DevisCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Devis
        fields = [
            'client', 'charge_affaires', 'objet', 'taux_tva_defaut',
            'type_marge', 'valeur_marge',
            'type_remise', 'valeur_remise',
            'commentaire_justification', 'date_validite',
        ]
        extra_kwargs = {field: {'required': False} for field in fields if field not in ('client', 'charge_affaires')}

    def to_representation(self, instance):
        return DevisDetailSerializer(instance).data


class DevisUpdateSerializer(serializers.ModelSerializer):
    """En-tête modifiable — pas les lignes (endpoint dédié), ni le statut
    (endpoint /transition/), ni numero/version/est_courante (gérés par le
    versioning)."""

    class Meta:
        model = Devis
        fields = [
            'objet', 'taux_tva_defaut',
            'type_marge', 'valeur_marge',
            'type_remise', 'valeur_remise',
            'commentaire_justification', 'date_validite',
        ]
        extra_kwargs = {field: {'required': False} for field in fields}

    def to_representation(self, instance):
        return DevisDetailSerializer(instance).data


class DevisTransitionSerializer(serializers.Serializer):
    nouveau_statut = serializers.ChoiceField(choices=[c[0] for c in STATUT_CHOICES])
    commentaire = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        devis: Devis = self.context['devis']
        if not devis.transition_est_valide(attrs['nouveau_statut']):
            raise serializers.ValidationError(
                f"Transition invalide : {devis.statut} -> {attrs['nouveau_statut']}",
            )
        if attrs['nouveau_statut'] == STATUT_REFUSE and not attrs.get('commentaire'):
            raise serializers.ValidationError({'commentaire': 'Un motif est obligatoire pour refuser un devis.'})
        return attrs
