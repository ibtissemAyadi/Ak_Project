from django.urls import path

from .views import ClientDetailView, ClientListCreateView

urlpatterns = [
    path('', ClientListCreateView.as_view(), name='client-list-create'),
    path('<uuid:pk>/', ClientDetailView.as_view(), name='client-detail'),
]
