import json
import logging

import groq
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .tools import TOOL_SCHEMAS, construire_outils

logger = logging.getLogger(__name__)

MAX_ITERATIONS_OUTILS = 6

SYSTEM_INSTRUCTION = """Tu es le copilot IA de l'application de gestion d'A&K Conseil et Ingénierie \
(bureau d'études/conseil). Tu aides les utilisateurs à consulter les données de la plateforme \
(clients, devis, affaires) et à effectuer certaines actions.

Règles impératives :
- Réponds toujours en français, de façon concise et professionnelle.
- Écris en texte brut : pas de tableaux, pas de gras ni de markdown. Pour une liste, une ligne par \
élément commençant par un tiret.
- Base-toi exclusivement sur les données renvoyées par les outils disponibles ; n'invente jamais de \
chiffres, de noms de clients ou de numéros de devis.
- Si un outil renvoie une erreur (ex. permission refusée, client introuvable), explique-le clairement \
à l'utilisateur au lieu d'essayer autre chose.
- Pour toute action qui modifie les données (ex. créer un devis) : appelle d'abord l'outil \
"proposer_*" correspondant, présente clairement son résumé à l'utilisateur, puis ARRÊTE-TOI et \
attends sa confirmation explicite dans un message séparé. N'appelle l'outil "confirmer_*" que si le \
message le plus récent de l'utilisateur confirme explicitement (ex. "oui", "confirme", "vas-y"). \
Ne propose et ne confirme jamais dans le même tour."""


def _appeler_modele(client, messages):
    return client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        tools=TOOL_SCHEMAS,
        tool_choice='auto',
    )


def _executer_outil(outils, nom, arguments_json, etat_tour):
    """Exécute un appel d'outil demandé par le modèle et renvoie un dict
    sérialisable. Ne lève jamais : toute erreur devient un résultat
    {'erreur': ...} que le modèle relaie à l'utilisateur."""
    fonction = outils.get(nom)
    if fonction is None:
        return {'erreur': f'Outil inconnu : {nom}.'}

    try:
        arguments = json.loads(arguments_json or '{}')
        if not isinstance(arguments, dict):
            raise ValueError('arguments non-objet')
    except ValueError:
        return {'erreur': "Arguments d'outil invalides."}
    # null = paramètre optionnel non renseigné : on laisse jouer la valeur par défaut.
    arguments = {cle: valeur for cle, valeur in arguments.items() if valeur is not None}

    # Garde-fou côté code (en plus de la consigne au modèle) : une action
    # sensible ne peut jamais être proposée ET confirmée dans le même tour —
    # la confirmation doit venir d'un message utilisateur distinct.
    if nom == 'confirmer_creation_devis' and etat_tour['proposition_faite']:
        return {
            'erreur': "Confirmation refusée : l'utilisateur doit confirmer explicitement dans un "
                      "message séparé après avoir vu la proposition.",
        }

    try:
        resultat = fonction(**arguments)
    except TypeError:
        return {'erreur': "Arguments d'outil invalides."}
    except Exception:
        logger.exception("Erreur dans l'outil du copilot : %s", nom)
        return {'erreur': "Erreur interne lors de l'exécution de l'outil."}

    if nom == 'proposer_creation_devis' and isinstance(resultat, dict) and 'proposition_id' in resultat:
        etat_tour['proposition_faite'] = True
    return resultat


class AssistantChatView(APIView):
    """POST /api/assistant/chat/ — {message, historique} -> {reponse, historique}.

    Stateless côté serveur : le frontend renvoie l'historique complet
    (texte uniquement, pas les détails d'appels d'outils) à chaque requête.
    Chaque appel exécute la boucle d'outils jusqu'à obtenir une réponse
    finale (plafonnée à MAX_ITERATIONS_OUTILS allers-retours)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.GROQ_API_KEY:
            return Response(
                {'detail': "Le copilot IA n'est pas configuré (clé API manquante)."},
                status=503,
            )

        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'detail': 'Message vide.'}, status=400)

        historique = request.data.get('historique') or []
        messages = [
            {'role': 'system', 'content': SYSTEM_INSTRUCTION},
            *(
                {
                    'role': 'user' if tour.get('role') == 'user' else 'assistant',
                    'content': tour.get('content', ''),
                }
                for tour in historique
            ),
            {'role': 'user', 'content': message},
        ]

        client = groq.Groq(api_key=settings.GROQ_API_KEY, timeout=30.0)
        outils = {f.__name__: f for f in construire_outils(request.user)}
        etat_tour = {'proposition_faite': False}
        texte = None

        try:
            for _ in range(MAX_ITERATIONS_OUTILS):
                try:
                    reponse = _appeler_modele(client, messages)
                except groq.BadRequestError:
                    # Le modèle a produit un appel d'outil que Groq refuse de
                    # valider (sortie non déterministe) : une 2e génération
                    # suffit presque toujours.
                    logger.warning("Appel d'outil rejeté par Groq, nouvelle tentative", exc_info=True)
                    reponse = _appeler_modele(client, messages)
                tour_modele = reponse.choices[0].message

                if not tour_modele.tool_calls:
                    texte = (tour_modele.content or '').strip()
                    break

                messages.append({
                    'role': 'assistant',
                    'content': tour_modele.content or '',
                    'tool_calls': [
                        {
                            'id': appel.id,
                            'type': 'function',
                            'function': {'name': appel.function.name, 'arguments': appel.function.arguments},
                        }
                        for appel in tour_modele.tool_calls
                    ],
                })
                for appel in tour_modele.tool_calls:
                    resultat = _executer_outil(outils, appel.function.name, appel.function.arguments, etat_tour)
                    messages.append({
                        'role': 'tool',
                        'tool_call_id': appel.id,
                        'content': json.dumps(resultat, ensure_ascii=False, default=str),
                    })
        except groq.RateLimitError:
            logger.warning('Limite de débit Groq atteinte')
            return Response(
                {'detail': 'Le copilot IA a atteint sa limite d\'utilisation gratuite. Réessayez dans quelques instants.'},
                status=429,
            )
        except Exception:
            logger.exception("Erreur lors de l'appel au copilot IA (Groq)")
            return Response({'detail': 'Le copilot IA est momentanément indisponible. Réessayez.'}, status=502)

        texte = texte or "Désolé, je n'ai pas pu formuler de réponse."

        nouvel_historique = [
            *historique,
            {'role': 'user', 'content': message},
            {'role': 'assistant', 'content': texte},
        ]
        return Response({'reponse': texte, 'historique': nouvel_historique})
