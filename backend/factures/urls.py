from django.urls import path

from .views import (
    FactureDetailView,
    FactureListCreateView,
    FacturePdfView,
    FactureSignatureUploadView,
    FactureXlsxView,
    LigneFactureDetailView,
    LigneFactureListCreateView,
)

urlpatterns = [
    path('', FactureListCreateView.as_view(), name='facture-list-create'),
    path('lignes/<uuid:pk>/', LigneFactureDetailView.as_view(), name='ligne-facture-detail'),
    path('<uuid:pk>/', FactureDetailView.as_view(), name='facture-detail'),
    path('<uuid:pk>/pdf/', FacturePdfView.as_view(), name='facture-pdf'),
    path('<uuid:pk>/xlsx/', FactureXlsxView.as_view(), name='facture-xlsx'),
    path('<uuid:pk>/lignes/', LigneFactureListCreateView.as_view(), name='facture-lignes'),
    path('<uuid:pk>/signature/', FactureSignatureUploadView.as_view(), name='facture-signature'),
]
