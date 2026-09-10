from django.urls import path

from .views import (
    AffaireDetailView,
    AffaireMontantEnAttenteView,
    AffairePrevisionRevenusView,
    AffaireListView,
    CommentaireAffaireListCreateView,
    PieceJointeAffaireDetailView,
    PieceJointeAffaireListCreateView,
)

urlpatterns = [
    path('', AffaireListView.as_view(), name='affaire-list'),
    path('prevision-revenus/', AffairePrevisionRevenusView.as_view(), name='affaire-prevision-revenus'),
    path('montant-en-attente/', AffaireMontantEnAttenteView.as_view(), name='affaire-montant-en-attente'),
    path('pieces-jointes/<uuid:pk>/', PieceJointeAffaireDetailView.as_view(), name='affaire-piece-jointe-detail'),
    path('<uuid:pk>/', AffaireDetailView.as_view(), name='affaire-detail'),
    path('<uuid:pk>/commentaires/', CommentaireAffaireListCreateView.as_view(), name='affaire-commentaires'),
    path('<uuid:pk>/pieces-jointes/', PieceJointeAffaireListCreateView.as_view(), name='affaire-pieces-jointes'),
]
