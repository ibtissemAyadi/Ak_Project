import logging

from django.conf import settings
from google import genai
from google.genai import types
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tools import construire_outils

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """Tu es le copilot IA de l'application de gestion d'A&K Conseil et Ingénierie \
(bureau d'études/conseil). Tu aides les utilisateurs à consulter les données de la plateforme \
(clients, devis, affaires) et à effectuer certaines actions.

Règles impératives :
- Réponds toujours en français, de façon concise et professionnelle.
- Base-toi exclusivement sur les données renvoyées par les outils disponibles ; n'invente jamais de \
chiffres, de noms de clients ou de numéros de devis.
- Si un outil renvoie une erreur (ex. permission refusée, client introuvable), explique-le clairement \
à l'utilisateur au lieu d'essayer autre chose.
- Pour toute action qui modifie les données (ex. créer un devis) : appelle d'abord l'outil \
"proposer_*" correspondant, présente clairement son résumé à l'utilisateur, puis ARRÊTE-TOI et \
attends sa confirmation explicite dans un message séparé. N'appelle l'outil "confirmer_*" que si le \
message le plus récent de l'utilisateur confirme explicitement (ex. "oui", "confirme", "vas-y"). \
Ne propose et ne confirme jamais dans le même tour."""


class AssistantChatView(APIView):
    """POST /api/assistant/chat/ — {message, historique} -> {reponse, historique}.

    Stateless côté serveur : le frontend renvoie l'historique complet
    (texte uniquement, pas les détails d'appels d'outils) à chaque requête.
    Chaque appel exécute la boucle d'outils Gemini jusqu'à obtenir une
    réponse finale (function calling automatique du SDK)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.GEMINI_API_KEY:
            return Response(
                {'detail': "Le copilot IA n'est pas configuré (clé API manquante)."},
                status=503,
            )

        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'detail': 'Message vide.'}, status=400)

        historique = request.data.get('historique') or []
        contenus = [
            types.Content(
                role='user' if tour.get('role') == 'user' else 'model',
                parts=[types.Part(text=tour.get('content', ''))],
            )
            for tour in historique
        ]
        contenus.append(types.Content(role='user', parts=[types.Part(text=message)]))

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contenus,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=construire_outils(request.user),
                ),
            )
        except Exception:
            logger.exception('Erreur lors de l\'appel au copilot IA (Gemini)')
            return Response({'detail': 'Le copilot IA est momentanément indisponible. Réessayez.'}, status=502)

        texte = (response.text or '').strip() or "Désolé, je n'ai pas pu formuler de réponse."

        nouvel_historique = [
            *historique,
            {'role': 'user', 'content': message},
            {'role': 'assistant', 'content': texte},
        ]
        return Response({'reponse': texte, 'historique': nouvel_historique})
