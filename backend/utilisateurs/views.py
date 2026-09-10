from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from activites.models import Activite

from .models import Role, Utilisateur
from .permissions import HasModulePermission
from .serializers import (
    EmailTokenObtainPairSerializer,
    RoleSerializer,
    UtilisateurCreateSerializer,
    UtilisateurSerializer,
    UtilisateurUpdateSerializer,
)


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

    def perform_create(self, serializer):
        utilisateur = serializer.save()
        Activite.enregistrer(self.request.user, 'a créé le compte utilisateur', f'{utilisateur.prenom} {utilisateur.nom}')


class UtilisateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE /api/utilisateurs/<id>/

    Même protection que la liste : lecture / modification / suppression
    sont vérifiées via la matrice du rôle sur le module 'utilisateurs'.
    PUT/PATCH utilisent un serializer dédié (rôle modifiable) — c'est ce qui
    permet à l'Administrateur de changer l'accès (role_id) ou le statut
    d'un utilisateur existant."""
    queryset = Utilisateur.objects.select_related('role').all()
    permission_classes = [HasModulePermission]
    permission_module = 'utilisateurs'
    lookup_field = 'id_utilisateur'
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UtilisateurUpdateSerializer
        return UtilisateurSerializer


class RoleListView(generics.ListAPIView):
    """GET /api/utilisateurs/roles/ — liste des 4 rôles et leur matrice de
    permissions complète. Réservé à l'Administrateur (même protection que
    le reste du module 'utilisateurs') : c'est une vue de gestion des accès,
    pas une donnée que tout utilisateur connecté doit pouvoir consulter."""
    queryset = Role.objects.all().order_by('libelle')
    serializer_class = RoleSerializer
    permission_classes = [HasModulePermission]
    permission_module = 'utilisateurs'


class ModuleAccessCheckView(APIView):
    """GET/POST/PUT/DELETE /api/permissions/<module>/

    Endpoint générique de test — AUCUNE logique métier. Les modules
    (clients, devis, affaires, factures, paiements, relances, documents)
    n'ont pas encore leur propre app Django ; ce harnais permet de vérifier
    dès maintenant que la matrice de permissions complète fonctionne
    (via Postman/curl), module par module, en attendant que chacun soit
    remplacé par une vraie ressource. Il ne fait que confirmer si l'accès
    est accordé ou non — HasModulePermission fait tout le travail réel.

    L'action testée suit le verbe HTTP (GET→lecture, POST→creation,
    PUT→modification, DELETE→suppression) ; ajouter ?action=validation
    à n'importe quelle requête pour tester l'action 'validation'."""
    permission_classes = [HasModulePermission]

    def _respond(self, request, module, status_code=200):
        action = request.query_params.get('action') or HasModulePermission.ACTION_MAP.get(request.method)
        return Response({'module': module, 'action': action, 'access': 'granted'}, status=status_code)

    def get(self, request, module):
        return self._respond(request, module)

    def post(self, request, module):
        return self._respond(request, module, status_code=201)

    def put(self, request, module):
        return self._respond(request, module)

    def delete(self, request, module):
        return self._respond(request, module, status_code=204)
