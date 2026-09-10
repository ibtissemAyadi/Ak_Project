from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Activite
from .serializers import ActiviteSerializer


class ActiviteListView(generics.ListAPIView):
    """GET /api/activites/?limit=15 — les dernières actions effectuées dans
    l'application (création, changement de statut, commentaire, upload...),
    tous modules confondus. Accessible à tout utilisateur authentifié : c'est
    un flux d'activité globale pour le tableau de bord, pas une ressource
    d'un module précis — donc pas de gating par HasModulePermission.

    GET /api/activites/?cible=FA-2026-009 — filtre sur les activités dont la
    cible contient ce texte (ex. la chronologie réelle d'une facture précise,
    utilisée par la page de détail d'un paiement).

    GET /api/activites/?utilisateur=<id>&depuis=2026-01-01&jusqua=2026-03-31
    — filtre croisé du tableau de bord : activités d'un utilisateur précis
    et/ou sur une période donnée (date_creation, bornes incluses)."""
    permission_classes = [IsAuthenticated]
    serializer_class = ActiviteSerializer

    def get_queryset(self):
        try:
            limite = int(self.request.query_params.get('limit', 15))
        except (TypeError, ValueError):
            limite = 15
        limite = max(1, min(limite, 50))

        queryset = Activite.objects.select_related('utilisateur')

        cible = self.request.query_params.get('cible')
        if cible:
            queryset = queryset.filter(cible__icontains=cible)

        utilisateur_id = self.request.query_params.get('utilisateur')
        if utilisateur_id:
            queryset = queryset.filter(utilisateur_id=utilisateur_id)

        depuis = self.request.query_params.get('depuis')
        if depuis:
            queryset = queryset.filter(date_creation__date__gte=depuis)

        jusqua = self.request.query_params.get('jusqua')
        if jusqua:
            queryset = queryset.filter(date_creation__date__lte=jusqua)

        return queryset[:limite]
