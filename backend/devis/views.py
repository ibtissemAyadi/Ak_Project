from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .pdf import generer_devis_pdf
from .xlsx_export import generer_devis_xlsx

from activites.models import Activite
from utilisateurs.models import Utilisateur
from utilisateurs.permissions import HasModulePermission

from .models import (
    STATUT_A_VALIDER,
    STATUT_ACCEPTE,
    STATUT_ANNULE,
    STATUT_BROUILLON,
    STATUT_EN_PREPARATION,
    STATUT_ENVOYE,
    STATUT_REFUSE,
    CommentaireDevis,
    Devis,
    LigneDevis,
)
from .serializers import (
    CommentaireDevisSerializer,
    DevisCreateSerializer,
    DevisDetailSerializer,
    DevisListSerializer,
    DevisTransitionSerializer,
    DevisUpdateSerializer,
    LigneDevisSerializer,
    UtilisateurMiniSerializer,
)


class DevisFigeError(APIException):
    """Le devis parent est figé (statut Envoyé et au-delà, ou version déjà
    remplacée) : ce n'est pas un problème de permission mais un conflit
    d'état — une ligne d'une version figée ne peut plus être éditée après
    coup."""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Ce devis est figé : créez d'abord une nouvelle version pour modifier une ligne existante."
    default_code = 'devis_fige'


# Action de la matrice de permissions requise pour chaque transition. Les
# transitions de progression interne du brouillon (jusqu'à "À valider") sont
# de simples modifications faites par le rédacteur (Chargé d'affaires) ; les
# décisions qui engagent l'entreprise (passage effectif à "Envoyé", puis
# "Accepté"/"Refusé") demandent la permission 'validation' — c'est justement
# ce qui distingue Direction (lecture+validation) de Chargé d'affaires
# (lecture+creation+modification, mais pas validation) dans la matrice.
ACTION_PAR_TRANSITION = {
    (STATUT_BROUILLON, STATUT_EN_PREPARATION): 'modification',
    (STATUT_BROUILLON, STATUT_ANNULE): 'modification',
    (STATUT_EN_PREPARATION, STATUT_A_VALIDER): 'modification',
    (STATUT_EN_PREPARATION, STATUT_ANNULE): 'modification',
    (STATUT_A_VALIDER, STATUT_ENVOYE): 'validation',
    (STATUT_ENVOYE, STATUT_ACCEPTE): 'validation',
    (STATUT_ENVOYE, STATUT_REFUSE): 'validation',
}


def _verifier_permission(user, action):
    role = getattr(user, 'role', None)
    if role is None or not bool(role.permissions.get('devis', {}).get(action, False)):
        raise PermissionDenied(f"Permission '{action}' manquante sur le module 'devis'.")


def _creer_nouvelle_version_ou_409(devis):
    try:
        return devis.creer_nouvelle_version()
    except DjangoValidationError as exc:
        raise DevisFigeError(str(exc.message) if hasattr(exc, 'message') else str(exc))


class DevisListCreateView(generics.ListCreateAPIView):
    """GET  /api/devis/  — liste des devis (uniquement les versions courantes)
    POST /api/devis/  — création d'un devis (statut Brouillon, version 1)"""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    queryset = Devis.objects.filter(est_courante=True).select_related('client', 'charge_affaires')

    def get_serializer_class(self):
        return DevisCreateSerializer if self.request.method == 'POST' else DevisListSerializer

    def perform_create(self, serializer):
        devis = serializer.save()
        Activite.enregistrer(self.request.user, 'a créé le devis', devis.numero)


class DevisDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/devis/<id>/

    PATCH sur un devis figé (Envoyé et au-delà) crée automatiquement une
    nouvelle version et y applique les changements, plutôt que d'écraser la
    version existante — voir Devis.necessite_nouvelle_version()."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    queryset = Devis.objects.all().select_related('client', 'charge_affaires')
    lookup_field = 'id_devis'
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        return DevisUpdateSerializer if self.request.method in ('PUT', 'PATCH') else DevisDetailSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.necessite_nouvelle_version():
            instance = _creer_nouvelle_version_ou_409(instance)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Le taux de TVA, la marge et la remise vivent sur l'en-tête : un
        # changement ici doit se répercuter sur les montants stockés, alors
        # que les signals (post_save sur les lignes) ne se déclenchent pas
        # pour une modification de l'en-tête seul.
        instance.recalculer_montants()
        return Response(self.get_serializer(instance).data)


class DevisPdfView(APIView):
    """GET /api/devis/<id>/pdf/ — génère à la volée le PDF de cette version
    précise du devis (jamais stocké côté serveur : reconstruit depuis les
    montants déjà calculés à chaque téléchargement)."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'

    def get(self, request, pk):
        devis = get_object_or_404(
            Devis.objects.select_related('client', 'charge_affaires'), id_devis=pk,
        )
        contenu = generer_devis_pdf(devis)
        reponse = HttpResponse(contenu, content_type='application/pdf')
        nom_fichier = f'{devis.numero}-v{devis.version}.pdf'
        reponse['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
        return reponse


class DevisXlsxView(APIView):
    """GET /api/devis/<id>/xlsx/ — export Excel des lignes et montants de
    cette version précise du devis, avec la même mise en forme (couleurs,
    tableau) que le PDF."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'

    def get(self, request, pk):
        devis = get_object_or_404(
            Devis.objects.select_related('client', 'charge_affaires'), id_devis=pk,
        )
        contenu = generer_devis_xlsx(devis)
        reponse = HttpResponse(
            contenu, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        nom_fichier = f'{devis.numero}-v{devis.version}.xlsx'
        reponse['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
        return reponse


class DevisVersionsView(generics.ListAPIView):
    """GET /api/devis/<id>/versions/ — historique complet des versions d'un
    devis (même `numero`), y compris les versions figées en lecture seule."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    serializer_class = DevisListSerializer

    def get_queryset(self):
        devis = get_object_or_404(Devis, id_devis=self.kwargs['pk'])
        return Devis.objects.filter(numero=devis.numero).order_by('version')


class DevisNouvelleVersionView(APIView):
    """POST /api/devis/<id>/nouvelle-version/ — force la création d'une
    nouvelle version (utile pour préparer plusieurs modifications d'affilée
    sans attendre qu'une transition de statut ou un PATCH ne le déclenche)."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    permission_action = 'modification'

    def post(self, request, pk):
        devis = get_object_or_404(Devis, id_devis=pk)
        nouvelle_version = _creer_nouvelle_version_ou_409(devis)
        return Response(DevisDetailSerializer(nouvelle_version).data, status=status.HTTP_201_CREATED)


class DevisTransitionView(APIView):
    """POST /api/devis/<id>/transition/ — {nouveau_statut, commentaire}

    L'action de permission requise dépend de la transition demandée (voir
    ACTION_PAR_TRANSITION), pas seulement du verbe HTTP : c'est pourquoi ce
    n'est pas HasModulePermission qui protège cette vue, mais une
    vérification explicite ci-dessous."""
    permission_classes = []

    def post(self, request, pk):
        if not request.user or not request.user.is_authenticated:
            raise PermissionDenied('Authentification requise.')

        devis = get_object_or_404(Devis, id_devis=pk)
        serializer = DevisTransitionSerializer(data=request.data, context={'devis': devis})
        serializer.is_valid(raise_exception=True)

        action_requise = ACTION_PAR_TRANSITION.get(
            (devis.statut, serializer.validated_data['nouveau_statut']), 'modification',
        )
        _verifier_permission(request.user, action_requise)

        nouveau_statut = serializer.validated_data['nouveau_statut']
        try:
            devis.changer_statut(
                nouveau_statut,
                request.user,
                serializer.validated_data.get('commentaire', ''),
            )
        except DjangoValidationError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        Activite.enregistrer(
            request.user, 'a fait passer le devis à', f'{devis.numero} ({nouveau_statut})',
        )
        return Response(DevisDetailSerializer(devis).data)


class LigneDevisListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/devis/<devis_id>/lignes/

    L'ajout d'une ligne sur un devis figé crée d'abord automatiquement une
    nouvelle version, puis y ajoute la ligne — la réponse renvoie donc
    éventuellement un `devis` différent de celui de l'URL (voir champ
    `devis` dans le payload retourné)."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    serializer_class = LigneDevisSerializer

    def get_queryset(self):
        return LigneDevis.objects.filter(devis_id=self.kwargs['pk'])

    def create(self, request, *args, **kwargs):
        devis = get_object_or_404(Devis, id_devis=self.kwargs['pk'])
        if devis.necessite_nouvelle_version():
            devis = _creer_nouvelle_version_ou_409(devis)
        serializer = self.get_serializer(data={**request.data, 'devis': devis.id_devis})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LigneDevisDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH/DELETE /api/devis/lignes/<ligne_id>/

    Refuse (409) toute modification/suppression si le devis parent est figé :
    une ligne d'une version figée ne peut pas être éditée après coup — il
    faut créer une nouvelle version (POST .../nouvelle-version/) puis modifier
    la ligne équivalente sur celle-ci."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    serializer_class = LigneDevisSerializer
    queryset = LigneDevis.objects.all()
    lookup_field = 'id_ligne'
    lookup_url_kwarg = 'pk'

    def _bloquer_si_fige(self, instance):
        if instance.devis.necessite_nouvelle_version():
            raise DevisFigeError(
                "Ce devis est figé (statut '%s') : créez d'abord une nouvelle version pour modifier une ligne existante."
                % instance.devis.statut,
            )

    def update(self, request, *args, **kwargs):
        self._bloquer_si_fige(self.get_object())
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._bloquer_si_fige(self.get_object())
        return super().destroy(request, *args, **kwargs)


class CommentaireDevisListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/devis/<devis_id>/commentaires/

    Fil de discussion libre, ajoutable à tout moment quel que soit le statut
    du devis (contrairement aux lignes, jamais bloqué par un devis figé).
    L'ajout utilise l'action 'modification' (pas 'creation'), même logique
    que pour les commentaires d'affaire : commenter est une annotation du
    devis, pas la création d'un nouveau devis."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    serializer_class = CommentaireDevisSerializer

    @property
    def permission_action(self):
        return 'lecture' if self.request.method == 'GET' else 'modification'

    def get_queryset(self):
        return CommentaireDevis.objects.filter(devis_id=self.kwargs['pk']).select_related('auteur')

    def create(self, request, *args, **kwargs):
        devis = get_object_or_404(Devis, id_devis=self.kwargs['pk'])
        serializer = self.get_serializer(data={**request.data, 'devis': devis.id_devis})
        serializer.is_valid(raise_exception=True)
        serializer.save(auteur=request.user)
        Activite.enregistrer(request.user, 'a commenté le devis', devis.numero)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class IntervenantsListView(generics.ListAPIView):
    """GET /api/devis/intervenants/ — liste légère des Chargés d'affaires
    (nom + coût horaire), utilisée par le picker "Chargé d'affaires" à la
    création d'un devis. Volontairement gatée sur le module 'devis' (pas
    'utilisateurs', réservé à l'Administrateur) : un Chargé d'affaires doit
    pouvoir choisir un pilote sans avoir les droits de gestion des comptes
    utilisateurs."""
    permission_classes = [HasModulePermission]
    permission_module = 'devis'
    serializer_class = UtilisateurMiniSerializer

    def get_queryset(self):
        return Utilisateur.objects.filter(
            role__libelle="Chargé d'affaires", statut='Actif',
        ).order_by('nom', 'prenom')
