import json
import logging
import re
import unicodedata

import groq
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import actions
from .tools import construire_outils

logger = logging.getLogger(__name__)

MAX_ITERATIONS_OUTILS = 6

SYSTEM_INSTRUCTION = """Tu es le copilot IA de l'application de gestion d'A&K Conseil et Ingénierie \
(bureau d'études/conseil). Tu aides les utilisateurs à consulter les données de la plateforme \
(clients, devis, affaires, factures, documents) et à effectuer certaines actions.

Règles impératives :
- Réponds toujours en français, de façon concise et professionnelle.
- Écris en texte brut : pas de tableaux, pas de gras ni de markdown. Pour une liste, une ligne par \
élément commençant par un tiret.
- Base-toi exclusivement sur les données renvoyées par les outils disponibles ; n'invente jamais de \
chiffres, de noms de clients ou de numéros de devis.
- Recopie les dates et les montants exactement comme les outils les renvoient (écris les dates au \
format jj/mm/aaaa) ; ne corrige jamais une année de toi-même.
- Si un outil renvoie une erreur (ex. permission refusée, client introuvable), explique-le clairement \
à l'utilisateur au lieu d'essayer autre chose.
- Toute modification de données (créer, modifier, changer un statut, commenter...) passe par les outils "proposer_*" : ils ne modifient RIEN, ils préparent une proposition que l'application soumet elle-même à la confirmation de l'utilisateur. Appelle le "proposer_*" adapté dès que tu as toutes les informations, sans demander toi-même de confirmation, et ne dis jamais qu'une action est effectuée.
- Si une information nécessaire à une action manque (client, numéro, montant...), demande-la d'abord."""


# Phrase qui clôt toute proposition affichée à l'utilisateur. Sa présence à la
# fin du dernier message de l'assistant, dans l'historique, est ce qui autorise
# le serveur à interpréter un « oui » comme la confirmation de la proposition en
# attente : un « oui » répondant à autre chose ne déclenche jamais d'écriture.
MARQUEUR_CONFIRMATION = 'Confirmez-vous ? (oui / non)'

_MOTS_OUI = {'oui', 'ouais', 'ok', 'okay', 'yes', 'confirme', 'confirmer', 'valide', 'valider', 'go', 'parfait',
             'dac', 'accord', 'bon', 'exact'}
_FILLER_OUI = _MOTS_OUI | {'d', 'vas', 'y', 'c', 'est', 'merci', 'je', 'svp', 'stp', 's', 'il', 'te', 'vous',
                           'plait', 'tout', 'a', 'fait', 'bien', 'sur'}
_MOTS_NON = {'non', 'annule', 'annuler', 'stop', 'abandonne', 'oublie', 'tomber'}
_FILLER_NON = _MOTS_NON | {'laisse', 'pas', 'maintenant', 'merci', 'finalement', 'ne', 'fais', 'rien', 'svp',
                           'stp', 's', 'il', 'te', 'vous', 'plait'}


def _intention(message):
    """'oui', 'non' ou None. Volontairement strict : « oui mais avec 2000 € »
    contient des mots hors liste et est donc renvoyé au modèle."""
    texte = unicodedata.normalize('NFD', message.lower())
    texte = ''.join(c for c in texte if unicodedata.category(c) != 'Mn')
    if re.search(r'\d', texte):
        return None  # un chiffre = probablement une correction (« oui à 12000 »)
    mots = re.sub(r'[^a-z]+', ' ', texte).split()
    if not mots or len(mots) > 6:
        return None
    if set(mots) <= _FILLER_OUI and set(mots) & _MOTS_OUI:
        return 'oui'
    if set(mots) <= _FILLER_NON and set(mots) & _MOTS_NON:
        return 'non'
    return None


def _appeler_modele(client, messages, schemas):
    options = {}
    if settings.GROQ_MODEL.startswith('openai/gpt-oss'):
        # Raisonnement court : moins de tokens de sortie (le plan gratuit
        # limite les tokens par minute) et des réponses plus rapides.
        options['reasoning_effort'] = 'low'
    reponse = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        tools=schemas,
        tool_choice='auto',
        **options,
    )
    logger.info('Copilot : %s tokens (prompt %s)', reponse.usage.total_tokens, reponse.usage.prompt_tokens)
    return reponse


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

    try:
        resultat = fonction(**arguments)
    except TypeError:
        return {'erreur': "Arguments d'outil invalides."}
    except Exception:
        logger.exception("Erreur dans l'outil du copilot : %s", nom)
        return {'erreur': "Erreur interne lors de l'exécution de l'outil."}

    if nom.startswith('proposer_') and isinstance(resultat, dict) and 'proposition' in resultat:
        etat_tour['proposition'] = resultat['proposition']
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

        # Confirmation gérée par le serveur, jamais par le modèle : si le dernier
        # message de l'assistant est une proposition (marqueur), « oui » exécute
        # la proposition en attente et « non » l'annule.
        dernier_assistant = next(
            (tour.get('content', '') for tour in reversed(historique) if tour.get('role') != 'user'), '',
        )
        if dernier_assistant.rstrip().endswith(MARQUEUR_CONFIRMATION):
            intention = _intention(message)
            if intention == 'oui':
                resultat = actions.confirmer(request.user)
                texte = (
                    f"C'est fait : {resultat['message']}" if resultat.get('succes')
                    else f"Impossible d'exécuter l'action : {resultat['erreur']}"
                )
                return self._reponse(historique, message, texte)
            if intention == 'non':
                actions.annuler(request.user)
                return self._reponse(historique, message, "D'accord, j'annule cette action.")

        messages = [
            {
                'role': 'system',
                'content': f"{SYSTEM_INSTRUCTION}\n\nDate du jour : {timezone.localdate():%d/%m/%Y}.",
            },
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
        outils_construits = construire_outils(request.user)
        schemas = [schema for schema, _ in outils_construits]
        outils = {schema['function']['name']: fonction for schema, fonction in outils_construits}
        etat_tour = {'proposition': None}
        texte = None

        try:
            for _ in range(MAX_ITERATIONS_OUTILS):
                try:
                    reponse = _appeler_modele(client, messages, schemas)
                except groq.BadRequestError:
                    # Le modèle a produit un appel d'outil que Groq refuse de
                    # valider (sortie non déterministe) : une 2e génération
                    # suffit presque toujours.
                    logger.warning("Appel d'outil rejeté par Groq, nouvelle tentative", exc_info=True)
                    reponse = _appeler_modele(client, messages, schemas)
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
                if etat_tour['proposition']:
                    # Le texte de confirmation est celui du serveur (résumé exact de
                    # ce qui sera écrit), pas une reformulation du modèle.
                    texte = f"{etat_tour['proposition']}\n{MARQUEUR_CONFIRMATION}"
                    break
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
        return self._reponse(historique, message, texte)

    @staticmethod
    def _reponse(historique, message, texte):
        nouvel_historique = [
            *historique,
            {'role': 'user', 'content': message},
            {'role': 'assistant', 'content': texte},
        ]
        return Response({'reponse': texte, 'historique': nouvel_historique})
