from django.urls import path

from .views import (
    CommentaireDevisListCreateView,
    DevisDetailView,
    DevisListCreateView,
    DevisNouvelleVersionView,
    DevisPdfView,
    DevisTransitionView,
    DevisVersionsView,
    DevisXlsxView,
    IntervenantsListView,
    LigneDevisDetailView,
    LigneDevisListCreateView,
)

urlpatterns = [
    path('intervenants/', IntervenantsListView.as_view(), name='devis-intervenants'),

    path('lignes/<uuid:pk>/', LigneDevisDetailView.as_view(), name='ligne-devis-detail'),

    path('', DevisListCreateView.as_view(), name='devis-list-create'),
    path('<uuid:pk>/', DevisDetailView.as_view(), name='devis-detail'),
    path('<uuid:pk>/versions/', DevisVersionsView.as_view(), name='devis-versions'),
    path('<uuid:pk>/pdf/', DevisPdfView.as_view(), name='devis-pdf'),
    path('<uuid:pk>/xlsx/', DevisXlsxView.as_view(), name='devis-xlsx'),
    path('<uuid:pk>/nouvelle-version/', DevisNouvelleVersionView.as_view(), name='devis-nouvelle-version'),
    path('<uuid:pk>/transition/', DevisTransitionView.as_view(), name='devis-transition'),
    path('<uuid:pk>/lignes/', LigneDevisListCreateView.as_view(), name='devis-lignes'),
    path('<uuid:pk>/commentaires/', CommentaireDevisListCreateView.as_view(), name='devis-commentaires'),
]
