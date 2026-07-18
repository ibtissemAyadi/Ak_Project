from django.urls import path

from .views import MeView, UtilisateurDetailView, UtilisateurListCreateView

urlpatterns = [
    path('me/', MeView.as_view(), name='utilisateur-me'),
    path('', UtilisateurListCreateView.as_view(), name='utilisateur-list-create'),
    path('<uuid:pk>/', UtilisateurDetailView.as_view(), name='utilisateur-detail'),
]
