from rest_framework import generics

from activites.models import Activite
from utilisateurs.permissions import HasModulePermission

from .models import Document
from .serializers import DocumentSerializer


class DocumentListCreateView(generics.ListCreateAPIView):
    """GET  /api/documents/  — liste des documents importés (bibliothèque
    documentaire globale, pas scopée à une affaire précise).
    POST /api/documents/  — import (multipart : designation, categorie,
    fichier, lie_a optionnel)."""
    permission_classes = [HasModulePermission]
    permission_module = 'documents'
    serializer_class = DocumentSerializer
    queryset = Document.objects.select_related('ajoute_par').all()

    def perform_create(self, serializer):
        document = serializer.save(ajoute_par=self.request.user)
        Activite.enregistrer(self.request.user, 'a importé le document', document.designation)


class DocumentDetailView(generics.DestroyAPIView):
    """DELETE /api/documents/<id>/"""
    permission_classes = [HasModulePermission]
    permission_module = 'documents'
    queryset = Document.objects.all()
    lookup_field = 'id_document'
    lookup_url_kwarg = 'pk'

    def perform_destroy(self, instance):
        designation = instance.designation
        super().perform_destroy(instance)
        Activite.enregistrer(self.request.user, 'a supprimé le document', designation)
