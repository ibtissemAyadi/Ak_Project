from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Role, Utilisateur


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id_role', 'libelle', 'permissions']


class UtilisateurSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id_utilisateur', 'nom', 'prenom', 'email',
            'role', 'cout_horaire', 'statut', 'date_creation',
        ]


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Utilisateur
        fields = ['nom', 'prenom', 'email', 'password', 'role', 'cout_horaire', 'statut']

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Passe par le manager (create_user) pour garantir le hash du mot de
        # passe — jamais Utilisateur.objects.create() en direct.
        return Utilisateur.objects.create_user(password=password, **validated_data)

    def to_representation(self, instance):
        # Après création, on répond avec la représentation complète (rôle inclus).
        return UtilisateurSerializer(instance).data


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Identique au login JWT standard, mais renvoie aussi le profil de
    l'utilisateur (avec son rôle et sa matrice de permissions) en plus des
    tokens, pour éviter un second appel réseau juste après le login.

    Important : ces permissions ne sont PAS encodées dans le JWT lui-même —
    elles sont recalculées à chaque requête protégée depuis la base de
    données (voir HasModulePermission). Si le rôle d'un utilisateur change,
    la restriction s'applique dès la requête suivante, sans attendre
    l'expiration du token."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UtilisateurSerializer(self.user).data
        return data
