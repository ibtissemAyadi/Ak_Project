from django.urls import path

from .views import MeView, RoleListView, UtilisateurDetailView, UtilisateurListCreateView

urlpatterns = [
    path('me/', MeView.as_view(), name='utilisateur-me'),
    path('roles/', RoleListView.as_view(), name='role-list'),
    path('', UtilisateurListCreateView.as_view(), name='utilisateur-list-create'),
    path('<uuid:pk>/', UtilisateurDetailView.as_view(), name='utilisateur-detail'),
]
