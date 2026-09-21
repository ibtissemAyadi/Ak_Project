from rest_framework.permissions import BasePermission


def utilisateur_a_permission(user, module, action) -> bool:
    """Même règle que HasModulePermission, réutilisable hors contexte DRF
    (ex. outils du copilot IA) : un utilisateur ne peut jamais obtenir, via
    un outil, un accès qu'il n'aurait pas via l'interface normale."""
    if not user or not user.is_authenticated:
        return False
    role = getattr(user, 'role', None)
    if role is None:
        return False
    return bool(role.permissions.get(module, {}).get(action, False))


class HasModulePermission(BasePermission):
    """Vérifie la matrice de permissions du rôle de l'utilisateur connecté.

    Le module concerné est déterminé, dans l'ordre :
      1. view.permission_module (vues "réelles", ex. UtilisateurListCreateView)
      2. view.kwargs['module']  (endpoint générique /api/permissions/<module>/)

    L'action est déterminée, dans l'ordre :
      1. ?action=... en query param (permet de tester "validation", qui ne
         correspond à aucun verbe HTTP standard)
      2. view.permission_action (surcharge explicite côté vue)
      3. déduite automatiquement du verbe HTTP (GET→lecture, POST→creation...)

    C'est ici — et uniquement ici, côté serveur — que la décision d'autoriser
    ou non une requête est prise. Le frontend n'a aucune influence sur ce
    résultat : cacher un bouton dans React ne change rien à ce que renvoie
    cette classe pour un appel direct (Postman, curl, etc.).
    """

    ACTION_MAP = {
        'GET': 'lecture',
        'HEAD': 'lecture',
        'OPTIONS': 'lecture',
        'POST': 'creation',
        'PUT': 'modification',
        'PATCH': 'modification',
        'DELETE': 'suppression',
    }

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        module = getattr(view, 'permission_module', None) or view.kwargs.get('module')
        action = (
            request.query_params.get('action')
            or getattr(view, 'permission_action', None)
            or self.ACTION_MAP.get(request.method)
        )
        if not module or not action:
            return False

        return utilisateur_a_permission(user, module, action)
