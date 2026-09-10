from rest_framework import serializers

from devis.serializers import ClientMiniSerializer

from .models import (
    Facture,
    LigneFacture,
    TYPE_ECHEANCE_FIN_MOIS,
    TYPE_ECHEANCE_JOUR_FIXE,
    TYPE_ECHEANCE_NET,
)


class LigneFactureSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneFacture
        fields = ['id_ligne', 'facture', 'description', 'quantite', 'prix_unitaire', 'montant']
        read_only_fields = ['id_ligne']
        extra_kwargs = {'facture': {'required': False}, 'montant': {'required': False}}


class FactureListSerializer(serializers.ModelSerializer):
    client = ClientMiniSerializer(source='affaire.client', read_only=True)
    numero_affaire = serializers.CharField(source='affaire.numero_affaire', read_only=True)
    numero_devis = serializers.CharField(source='affaire.devis.numero', read_only=True)
    objet = serializers.CharField(source='affaire.devis.objet', read_only=True)
    montant_a_payer = serializers.SerializerMethodField()
    label_echeance = serializers.CharField(read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id_facture', 'numero_facture', 'affaire', 'numero_affaire', 'numero_devis', 'objet', 'client',
            'statut', 'date_facture', 'date_echeance', 'mode_reglement',
            'type_echeance', 'nombre_jours', 'jour_fixe_mois_suivant', 'label_echeance',
            'sous_total', 'montant_tva', 'montant_total', 'montant_a_payer',
            'date_creation', 'date_modification',
        ]

    def get_montant_a_payer(self, obj):
        return str(obj.montant_a_payer)


class FactureDetailSerializer(FactureListSerializer):
    lignes = LigneFactureSerializer(many=True, read_only=True)
    taux_tva = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta(FactureListSerializer.Meta):
        fields = FactureListSerializer.Meta.fields + [
            'taux_tva', 'commentaire', 'signature', 'lignes',
        ]


class FactureSignatureSerializer(serializers.ModelSerializer):
    """Upload de la signature électronique (image) — endpoint multipart dédié,
    séparé de FactureUpdateSerializer (qui reste un simple PATCH JSON)."""

    class Meta:
        model = Facture
        fields = ['signature']
        extra_kwargs = {'signature': {'required': True}}

    def to_representation(self, instance):
        return FactureDetailSerializer(instance, context=self.context).data


def _valider_champs_echeance(type_echeance, nombre_jours, jour_fixe_mois_suivant):
    """Cohérence entre le type d'échéance choisi et le champ qui lui est
    associé — voir Facture.calculer_date_echeance (models.py) pour le détail
    des 3 méthodes de calcul."""
    if type_echeance in (TYPE_ECHEANCE_NET, TYPE_ECHEANCE_FIN_MOIS):
        if nombre_jours is None:
            raise serializers.ValidationError(
                {'nombre_jours': 'Le nombre de jours est requis pour cette modalité de paiement.'},
            )
    elif type_echeance == TYPE_ECHEANCE_JOUR_FIXE:
        if jour_fixe_mois_suivant is None:
            raise serializers.ValidationError(
                {'jour_fixe_mois_suivant': 'Le jour du mois suivant est requis pour cette modalité de paiement.'},
            )
        if not (1 <= jour_fixe_mois_suivant <= 31):
            raise serializers.ValidationError(
                {'jour_fixe_mois_suivant': 'Le jour doit être compris entre 1 et 31.'},
            )


class FactureCreateSerializer(serializers.ModelSerializer):
    """Création uniquement depuis une affaire — voir
    Facture.creer_depuis_affaire(), appelé par la vue plutôt que .save()
    pour copier les lignes du devis d'origine en une transaction.

    La modalité de paiement (type_echeance + sa valeur) est obligatoire à la
    création : c'est à l'utilisateur de la choisir explicitement avant de
    générer la facture, jamais une valeur par défaut silencieuse (voir
    l'écran « Créer la facture » côté frontend)."""

    class Meta:
        model = Facture
        fields = ['affaire', 'type_echeance', 'nombre_jours', 'jour_fixe_mois_suivant']
        extra_kwargs = {
            'type_echeance': {'required': True},
            'nombre_jours': {'required': False},
            'jour_fixe_mois_suivant': {'required': False},
        }

    def validate_affaire(self, affaire):
        if hasattr(affaire, 'facture'):
            raise serializers.ValidationError('Cette affaire a déjà une facture.')
        return affaire

    def validate(self, attrs):
        _valider_champs_echeance(
            attrs.get('type_echeance'), attrs.get('nombre_jours'), attrs.get('jour_fixe_mois_suivant'),
        )
        return attrs

    def to_representation(self, instance):
        return FactureDetailSerializer(instance).data


class FactureUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Facture
        fields = [
            'statut', 'date_facture', 'mode_reglement',
            'type_echeance', 'nombre_jours', 'jour_fixe_mois_suivant',
            'taux_tva', 'commentaire',
        ]
        extra_kwargs = {field: {'required': False} for field in fields}

    def validate(self, attrs):
        instance = self.instance
        type_echeance = attrs.get('type_echeance', getattr(instance, 'type_echeance', None))
        nombre_jours = attrs.get('nombre_jours', getattr(instance, 'nombre_jours', None))
        jour_fixe_mois_suivant = attrs.get('jour_fixe_mois_suivant', getattr(instance, 'jour_fixe_mois_suivant', None))
        _valider_champs_echeance(type_echeance, nombre_jours, jour_fixe_mois_suivant)
        return attrs

    def to_representation(self, instance):
        return FactureDetailSerializer(instance).data
