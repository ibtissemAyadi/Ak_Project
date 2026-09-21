from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from activites.models import Activite
from utilisateurs.permissions import HasModulePermission

from .models import Affaire, CommentaireAffaire, PieceJointeAffaire
from .serializers import (
    AffaireDetailSerializer,
    AffaireListSerializer,
    AffaireUpdateSerializer,
    CommentaireAffaireSerializer,
    PieceJointeAffaireSerializer,
)
from .services import calculer_montant_en_attente, calculer_prevision_revenus


class AffaireListView(generics.ListAPIView):
    """GET /api/affaires/ — toutes les affaires (gouverné par la matrice de
    permissions standard du module 'affaires', comme AffaireDetailView : donc
    Administrateur/Direction/Chargé d'affaires, pas seulement le pilote de
    chacune — voir 'je dois voir tous les affaires'). Les affaires ne se
    créent jamais depuis cet endpoint (voir
    affaires.signals.creer_affaire_sur_devis_accepte)."""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'
    serializer_class = AffaireListSerializer

    def get_queryset(self):
        return Affaire.objects.all().select_related('client', 'charge_affaires', 'devis')


class AffairePrevisionRevenusView(APIView):
    """GET /api/affaires/prevision-revenus/?mois=12&charge_affaires=<id> —
    chiffre d'affaires prévisionnel par mois : somme du budget des affaires
    pas encore terminées (date_fin_reelle vide), regroupée par mois de
    date_fin_prevue (le moment où l'affaire est censée être livrée/facturée
    au client). Remplace l'ancien graphique du tableau de bord (données
    fictives) par un calcul réel sur les affaires en cours — pas de
    facture/paiement encore émis à ce stade, donc le budget de l'affaire est
    la meilleure estimation du montant à recevoir. charge_affaires (optionnel)
    restreint le calcul aux affaires pilotées par cet utilisateur — utilisé
    par le filtre croisé du tableau de bord."""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'

    def get(self, request):
        try:
            nb_mois = int(request.query_params.get('mois', 12))
        except (TypeError, ValueError):
            nb_mois = 12

        resultat = calculer_prevision_revenus(nb_mois, request.query_params.get('charge_affaires'))
        return Response(resultat)


class AffaireMontantEnAttenteView(APIView):
    """GET /api/affaires/montant-en-attente/?charge_affaires=<id> — somme du
    budget des affaires dont la facture n'est pas (encore) payée : pas de
    facture émise, ou facture brouillon/envoyée/partiellement payée/en
    retard/annulée. C'est le montant que l'entreprise reste à encaisser sur
    l'ensemble de ses affaires. charge_affaires (optionnel) restreint le
    calcul aux affaires pilotées par cet utilisateur."""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'

    def get(self, request):
        total = calculer_montant_en_attente(request.query_params.get('charge_affaires'))
        return Response({'montant_en_attente': total})


class AffaireDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/affaires/<id>/ — consultation/modification d'une
    affaire précise, gouvernée par la matrice de permissions standard du
    module 'affaires' (donc accessible en lecture à Direction/Administrateur
    même si le tableau de bord global leur est fermé)."""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'
    queryset = (
        Affaire.objects.all()
        .select_related('client', 'charge_affaires', 'devis', 'devis__client', 'devis__charge_affaires', 'facture')
        .prefetch_related(
            'commentaires__auteur', 'pieces_jointes__ajoute_par',
            'devis__lignes', 'devis__historique_statuts__utilisateur',
        )
    )
    lookup_field = 'id_affaire'
    lookup_url_kwarg = 'pk'

    def get_serializer_class(self):
        return AffaireUpdateSerializer if self.request.method in ('PUT', 'PATCH') else AffaireDetailSerializer

    def perform_update(self, serializer):
        etait_terminee = serializer.instance.date_fin_reelle is not None
        affaire = serializer.save()
        if not etait_terminee and affaire.date_fin_reelle is not None:
            Activite.enregistrer(self.request.user, 'a marqué comme terminée l\'affaire', affaire.numero_affaire)
        else:
            Activite.enregistrer(self.request.user, 'a mis à jour l\'affaire', affaire.numero_affaire)


class CommentaireAffaireListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/affaires/<affaire_id>/commentaires/

    L'ajout d'un commentaire utilise l'action 'modification' (pas
    'creation') : c'est ce que possède le Chargé d'affaires sur le module
    'affaires' dans la matrice, puisqu'il ne "crée" jamais d'affaire lui-même
    — commenter est une forme d'annotation/modification de l'affaire."""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'
    serializer_class = CommentaireAffaireSerializer

    @property
    def permission_action(self):
        return 'lecture' if self.request.method == 'GET' else 'modification'

    def get_queryset(self):
        return CommentaireAffaire.objects.filter(affaire_id=self.kwargs['pk']).select_related('auteur')

    def create(self, request, *args, **kwargs):
        affaire = get_object_or_404(Affaire, id_affaire=self.kwargs['pk'])
        serializer = self.get_serializer(data={**request.data, 'affaire': affaire.id_affaire})
        serializer.is_valid(raise_exception=True)
        serializer.save(auteur=request.user)
        Activite.enregistrer(request.user, "a commenté l'affaire", affaire.numero_affaire)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PieceJointeAffaireListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/affaires/<affaire_id>/pieces-jointes/ — même logique de
    permission que les commentaires (ajouter un document est une forme de
    modification de l'affaire)."""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'
    serializer_class = PieceJointeAffaireSerializer

    @property
    def permission_action(self):
        return 'lecture' if self.request.method == 'GET' else 'modification'

    def get_queryset(self):
        return PieceJointeAffaire.objects.filter(affaire_id=self.kwargs['pk']).select_related('ajoute_par')

    def create(self, request, *args, **kwargs):
        # request.data est un QueryDict pour les requêtes multipart (upload de
        # fichier) : {**request.data, ...} le déroule en listes de valeurs
        # (ex. désignation -> ['x'], fichier -> [<InMemoryUploadedFile>]), ce
        # que le serializer rejette. .copy() + assignation par clé conserve
        # le comportement scalaire propre à QueryDict.
        affaire = get_object_or_404(Affaire, id_affaire=self.kwargs['pk'])
        data = request.data.copy()
        data['affaire'] = str(affaire.id_affaire)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ajoute_par=request.user)
        Activite.enregistrer(request.user, "a ajouté un document à l'affaire", affaire.numero_affaire)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PieceJointeAffaireDetailView(generics.DestroyAPIView):
    """DELETE /api/affaires/pieces-jointes/<id>/"""
    permission_classes = [HasModulePermission]
    permission_module = 'affaires'
    permission_action = 'modification'
    queryset = PieceJointeAffaire.objects.all()
    lookup_field = 'id_piece'
    lookup_url_kwarg = 'pk'
