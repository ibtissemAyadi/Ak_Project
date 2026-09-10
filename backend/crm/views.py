from rest_framework import generics

from activites.models import Activite
from utilisateurs.permissions import HasModulePermission

from .models import Client
from .serializers import ClientSerializer


class ClientListCreateView(generics.ListCreateAPIView):
    """GET  /api/clients/  — liste des clients
    POST /api/clients/  — création d'un client

    Protégé par la matrice de permissions du module 'clients' : seuls les
    rôles ayant lecture/creation = True sur ce module peuvent lister/créer
    (Administrateur, et Chargé d'affaires en création — voir migration
    0003_update_permissions_matrix côté utilisateurs)."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [HasModulePermission]
    permission_module = 'clients'

    def perform_create(self, serializer):
        client = serializer.save()
        Activite.enregistrer(self.request.user, 'a créé le client', client.raison_sociale)


class ClientDetailView(generics.RetrieveUpdateAPIView):
    """GET/PUT/PATCH /api/clients/<id>/

    Pas de DELETE volontairement : un client ne se supprime jamais, il passe
    au statut 'Inactif' via une modification classique (PATCH statut)."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [HasModulePermission]
    permission_module = 'clients'
    lookup_field = 'id_client'
    lookup_url_kwarg = 'pk'
