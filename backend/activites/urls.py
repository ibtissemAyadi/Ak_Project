from django.urls import path

from .views import ActiviteListView

urlpatterns = [
    path('', ActiviteListView.as_view(), name='activite-list'),
]
