from rest_framework.permissions import BasePermission


class HasModulePermission(BasePermission):
    """Vérifie la matrice de permissions du rôle de l'utilisateur connecté.

    Chaque vue déclare :
      - permission_module : le module concerné (ex. 'utilisateurs')
      - permission_action  : (optionnel) l'action explicite (ex. 'validation'),
        sinon elle est déduite automatiquement du verbe HTTP.

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

        module = getattr(view, 'permission_module', None)
        action = getattr(view, 'permission_action', None) or self.ACTION_MAP.get(request.method)
        if not module or not action:
            return False

        role = getattr(user, 'role', None)
        if role is None:
            return False

        return bool(role.permissions.get(module, {}).get(action, False))
