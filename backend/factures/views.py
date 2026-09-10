from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from activites.models import Activite
from utilisateurs.permissions import HasModulePermission

from .models import Facture, LigneFacture
from .pdf import generer_facture_pdf
from .serializers import (
    FactureCreateSerializer,
    FactureDetailSerializer,
    FactureListSerializer,
    FactureSignatureSerializer,
    FactureUpdateSerializer,
    LigneFactureSerializer,
)
from .xlsx_export import generer_facture_xlsx


class FactureListCreateView(generics.ListCreateAPIView):
    """GET  /api/factures/  — liste de toutes les factures.
    POST /api/factures/  — {"affaire": "<id>"} crée la facture de cette
    affaire (une seule par affaire), avec ses lignes copiées du devis."""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'
    queryset = Facture.objects.all().select_related('affaire__client', 'affaire__devis')

    def get_serializer_class(self):
        return FactureCreateSerializer if self.request.method == 'POST' else FactureListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        facture = Facture.creer_depuis_affaire(
            serializer.validated_data['affaire'],
            type_echeance=serializer.validated_data['type_echeance'],
            nombre_jours=serializer.validated_data.get('nombre_jours'),
            jour_fixe_mois_suivant=serializer.validated_data.get('jour_fixe_mois_suivant'),
        )
        Activite.enregistrer(request.user, 'a créé la facture', facture.numero_facture)
        return Response(FactureDetailSerializer(facture).data, status=status.HTTP_201_CREATED)


class FactureDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/factures/<id>/"""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'
    queryset = Facture.objects.all().select_related('affaire__client', 'affaire__devis').prefetch_related('lignes')
    lookup_field = 'id_facture'
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        return FactureUpdateSerializer if self.request.method in ('PUT', 'PATCH') else FactureDetailSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        ancien_statut = instance.statut
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Le taux de TVA vit sur l'en-tête : un changement ici doit se
        # répercuter sur les montants stockés (les signals sur les lignes
        # ne se déclenchent pas pour une modification de l'en-tête seul).
        instance.recalculer_montants()
        if instance.statut != ancien_statut:
            Activite.enregistrer(
                request.user, 'a fait passer la facture à', f'{instance.numero_facture} ({instance.statut})',
            )
        else:
            Activite.enregistrer(request.user, 'a modifié la facture', instance.numero_facture)
        return Response(self.get_serializer(instance).data)


class FactureSignatureUploadView(APIView):
    """POST /api/factures/<id>/signature/ — upload (multipart) de la
    signature électronique (image) à insérer dans le PDF généré."""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'
    permission_action = 'modification'

    def post(self, request, pk):
        facture = get_object_or_404(Facture, id_facture=pk)
        serializer = FactureSignatureSerializer(facture, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class FacturePdfView(APIView):
    """GET /api/factures/<id>/pdf/"""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'

    def get(self, request, pk):
        facture = get_object_or_404(
            Facture.objects.select_related('affaire__client', 'affaire__devis'), id_facture=pk,
        )
        contenu = generer_facture_pdf(facture)
        reponse = HttpResponse(contenu, content_type='application/pdf')
        reponse['Content-Disposition'] = f'attachment; filename="{facture.numero_facture}.pdf"'
        return reponse


class FactureXlsxView(APIView):
    """GET /api/factures/<id>/xlsx/"""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'

    def get(self, request, pk):
        facture = get_object_or_404(
            Facture.objects.select_related('affaire__client', 'affaire__devis'), id_facture=pk,
        )
        contenu = generer_facture_xlsx(facture)
        reponse = HttpResponse(
            contenu, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        reponse['Content-Disposition'] = f'attachment; filename="{facture.numero_facture}.xlsx"'
        return reponse


class LigneFactureListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/factures/<facture_id>/lignes/"""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'
    serializer_class = LigneFactureSerializer

    def get_queryset(self):
        return LigneFacture.objects.filter(facture_id=self.kwargs['pk'])

    def create(self, request, *args, **kwargs):
        facture = get_object_or_404(Facture, id_facture=self.kwargs['pk'])
        serializer = self.get_serializer(data={**request.data, 'facture': facture.id_facture})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LigneFactureDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /api/factures/lignes/<ligne_id>/"""
    permission_classes = [HasModulePermission]
    permission_module = 'factures'
    serializer_class = LigneFactureSerializer
    queryset = LigneFacture.objects.all()
    lookup_field = 'id_ligne'
    lookup_url_kwarg = 'pk'
