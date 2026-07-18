from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Utilisateur
from .permissions import HasModulePermission
from .serializers import EmailTokenObtainPairSerializer, UtilisateurCreateSerializer, UtilisateurSerializer


class EmailTokenObtainPairView(TokenObtainPairView):
    """POST /api/auth/login/ — login par email + mot de passe, renvoie
    access, refresh, et le profil complet de l'utilisateur."""
    serializer_class = EmailTokenObtainPairSerializer


class MeView(generics.RetrieveAPIView):
    """GET /api/utilisateurs/me/ — chacun peut lire son propre profil,
    aucun contrôle de module nécessaire."""
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UtilisateurListCreateView(generics.ListCreateAPIView):
    """GET  /api/utilisateurs/  — liste des utilisateurs
    POST /api/utilisateurs/  — création d'un utilisateur

    Protégé par la matrice de permissions du module 'utilisateurs' :
    seul le rôle Administrateur a lecture/creation = True ici."""
    queryset = Utilisateur.objects.select_related('role').all()
    permission_classes = [HasModulePermission]
    permission_module = 'utilisateurs'

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UtilisateurCreateSerializer
        return UtilisateurSerializer


class UtilisateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE /api/utilisateurs/<id>/

    Même protection que la liste : lecture / modification / suppression
    sont vérifiées via la matrice du rôle sur le module 'utilisateurs'."""
    queryset = Utilisateur.objects.select_related('role').all()
    serializer_class = UtilisateurSerializer
    permission_classes = [HasModulePermission]
    permission_module = 'utilisateurs'
    lookup_field = 'id_utilisateur'
    lookup_url_kwarg = 'pk'
