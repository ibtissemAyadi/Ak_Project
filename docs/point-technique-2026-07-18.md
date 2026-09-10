# Point technique — Projet Gestion AK

**Date :** 18/07/2026
**Sujet :** État d'avancement détaillé — Frontend (maquette complète) + Backend (authentification JWT, rôles, matrice de permissions, Administration connectée)

---

## Sommaire

1. Contexte et objectif
2. Frontend — maquette applicative complète
3. Backend — modèle de données
4. **Authentification JWT — fonctionnement détaillé**
5. Les 4 rôles et la matrice de permissions
6. Vérification des droits côté serveur — le mécanisme
7. Administration — connectée au vrai backend
8. Preuve par les tests — collection Postman (176 requêtes auto-vérifiées)
9. Bugs réels trouvés et corrigés pendant le développement
10. Points d'attention / limites actuelles
11. Prochaines étapes proposées

---

## 1. Contexte et objectif

Le projet est une application interne pour un bureau d'ingénierie-conseil (gestion clients, devis, affaires, factures, paiements, documents). Il se compose de deux briques :

- **`frontend/`** — application React, interface complète construite en premier pour valider les besoins fonctionnels, alimentée par des données fictives (mock) sauf pour l'authentification et l'Administration, désormais connectées au vrai backend.
- **`backend/`** — API Django REST, construite module par module. Premier module livré et **entièrement fonctionnel** : **Utilisateurs & Droits** (authentification, rôles, permissions).

Objectif de cette phase : poser un système d'authentification et de contrôle d'accès solide, conforme au cahier des charges, prouvé par des tests indépendants de toute interface graphique — avant de brancher les modules métier un par un.

---

## 2. Frontend — maquette applicative complète

### Stack technique
React 18 · TypeScript · Vite · TailwindCSS · shadcn/ui · React Router · TanStack Table · React Hook Form + Zod · Recharts · Zustand · Lucide Icons.

### Ce qui a été construit

| Module | Contenu |
|---|---|
| **Authentification** | Login (réel), mot de passe oublié, garde de route |
| **Layout global** | Sidebar rétractable (filtrée selon le rôle), fil d'Ariane, recherche globale (Ctrl+K), notifications, menu profil |
| **Dashboard** | KPIs, graphique de revenus, répartition des devis par statut, projets en cours, factures en retard, activité récente |
| **CRM** | Liste/fiche/création/édition clients, contacts, historique |
| **Devis** | Tableau + Kanban (glisser-déposer), calcul dynamique des lignes, historique des versions |
| **Projets** | Liste en cartes, fiche détaillée (équipe, temps, chronologie, pièces jointes) |
| **Factures** | Liste, détail avec statut de paiement, création |
| **Paiements** | Liste, détail, relances automatiques, chronologie |
| **Documents** | Upload glisser-déposer, catégories, aperçu, versions |
| **Assistant IA** | Chatbot flottant (simulé) |
| **Administration** | **Réel** — Utilisateurs (CRUD + changement de rôle), Rôles (4 vrais rôles), Matrice de permissions (vraies données), Profil |

### État des données
Clients, devis, projets, factures... restent **mockés** (service simulant latence/erreurs réseau, remplaçable module par module sans changer les pages). **Authentification et Administration sont 100% réelles**, branchées sur PostgreSQL via l'API Django.

### Vérifications effectuées
- Compilation TypeScript sans erreur, build de production réussi.
- Tests réels en navigateur piloté (Playwright) à chaque étape : aucune erreur console.
- Plusieurs bugs réels détectés et corrigés pendant ces tests (détail section 9).

---

## 3. Backend — modèle de données

Conforme au cahier des charges :

**Table `ROLE`**
| Attribut | Type | Description |
|---|---|---|
| `id_role` | UUID (PK) | Identifiant |
| `libelle` | Texte | Nom du rôle |
| `permissions` | JSON | Matrice de permissions par module/action |

**Table `UTILISATEUR`**
| Attribut | Type | Description |
|---|---|---|
| `id_utilisateur` | UUID (PK) | Identifiant unique |
| `nom`, `prenom` | Texte | Identité |
| `email` | Texte (unique) | Identifiant de connexion |
| `password` | Texte | Géré nativement par Django (`AbstractBaseUser`), jamais en clair |
| `role` | FK → ROLE | Rôle attribué |
| `cout_horaire` | Décimal | Coût horaire (chiffrage automatique des devis, futur) |
| `statut` | Énuméré | Actif / Suspendu / Désactivé |
| `date_creation` | Date/heure | Horodatage de création |

---

## 4. Authentification JWT — fonctionnement détaillé

C'est le cœur technique du module, donc voici le détail complet du mécanisme.

### 4.1 Pourquoi JWT plutôt que des sessions classiques

Une session Django classique stocke l'état de connexion **côté serveur** (table `django_session` + cookie contenant juste un identifiant de session). Un **JWT (JSON Web Token)** est l'inverse : c'est un jeton **auto-porteur** — toutes les informations nécessaires pour vérifier son authenticité sont contenues dans le jeton lui-même, signé cryptographiquement. Le serveur n'a rien à stocker pour savoir qu'un jeton est valide : il lui suffit de vérifier la signature. C'est ce qui permet à une API REST consommée par un frontend séparé (React, ou plus tard une appli mobile) de rester **stateless** — chaque requête porte sa propre preuve d'identité.

### 4.2 Structure d'un token

Un JWT est composé de 3 parties encodées en Base64 et séparées par des points : `header.payload.signature`

- **Header** : l'algorithme de signature utilisé (`HS256` par défaut avec SimpleJWT).
- **Payload** : les *claims* (informations). Dans notre cas : `token_type` (`access` ou `refresh`), `exp` (date d'expiration), `iat` (date d'émission), `jti` (identifiant unique du jeton), et surtout **`user_id`** — configuré pour pointer vers `id_utilisateur` (voir section 9, bug corrigé).
- **Signature** : `HMACSHA256(header + payload, SECRET_KEY)`. Comme seul le serveur connaît `SECRET_KEY`, personne ne peut fabriquer un jeton valide ou modifier son contenu sans invalider la signature.

**Choix de conception important : le token ne contient PAS les permissions.** Seul le `user_id` y figure. Cela signifie que la matrice de permissions du rôle est **toujours relue en base de données à chaque requête** (jamais mise en cache dans le jeton). Conséquence directe : si un Administrateur change le rôle d'un utilisateur, la restriction/l'ouverture d'accès s'applique **immédiatement à la requête suivante** de cet utilisateur, sans attendre l'expiration de son token. C'est un compromis volontaire sécurité > performance (une lecture DB de plus par requête, négligeable).

### 4.3 Les deux jetons : access et refresh

| Jeton | Durée de vie | Rôle |
|---|---|---|
| `access` | 1 heure | Envoyé dans le header `Authorization: Bearer <token>` de **chaque** requête protégée |
| `refresh` | 7 jours | Utilisé une seule fois, pour obtenir un nouvel `access` token via `POST /api/auth/refresh/`, sans redemander le mot de passe |

Ce découplage limite la fenêtre d'exposition si un `access` token est intercepté (il expire vite), tout en évitant à l'utilisateur de se reconnecter toutes les heures.

### 4.4 Le flux de connexion, étape par étape

```
1. Client → POST /api/auth/login/  { "email": "...", "password": "..." }
2. Django (EmailTokenObtainPairSerializer) appelle authenticate(email, password)
3. Django récupère l'utilisateur par email (USERNAME_FIELD = 'email')
4. Vérifie le mot de passe : check_password(password_saisi, password_hash_stocke)
   → recalcule le hash PBKDF2-SHA256 du mot de passe saisi et le compare
     au hash stocké (jamais de comparaison en clair, jamais de mot de
     passe en clair stocké nulle part)
5. Vérifie is_active (câblé sur statut == 'Actif' — voir 4.6)
   → si Suspendu/Désactivé : authentification refusée, 401
6. Si tout est valide : génère access + refresh, signés avec SECRET_KEY
7. Réponse 200 : { "access": "...", "refresh": "...", "user": {profil complet} }
```

Le profil complet (nom, prénom, rôle, matrice de permissions) est renvoyé **avec** les tokens dans la même réponse — un choix pour éviter un aller-retour réseau supplémentaire juste après le login, pour que le frontend puisse afficher immédiatement "Bienvenue, {prénom}" sans requête additionnelle.

### 4.5 Comment chaque requête protégée est authentifiée ensuite

```
1. Client → GET /api/utilisateurs/   Header: Authorization: Bearer eyJhbGc...
2. JWTAuthentication (middleware DRF) intercepte la requête
3. Décode le token, vérifie :
   - la signature (le token n'a pas été modifié / n'est pas forgé)
   - la date d'expiration (exp)
   - le type de token (doit être "access", pas "refresh")
4. Si valide : extrait user_id du payload, charge l'Utilisateur correspondant
   en base → request.user est peuplé
5. Si invalide/expiré/absent : 401 immédiat, la vue n'est même pas atteinte
6. Si valide : la requête continue vers la vérification des permissions
   (HasModulePermission, voir section 6) puis vers la logique de la vue
```

### 4.6 Blocage des comptes suspendus/désactivés

Le champ `statut` existait déjà dans le modèle, mais rien ne l'exploitait. Ajout d'une propriété Python sur `Utilisateur` :

```python
@property
def is_active(self):
    return self.statut == 'Actif'
```

Django (`ModelBackend.user_can_authenticate`) lit cet attribut automatiquement à chaque tentative de connexion — donc un compte `Suspendu` ou `Désactivé` est rejeté **au niveau de l'authentification elle-même**, avant même d'atteindre la logique métier. Testé : login avec un compte `Suspendu` → `401`.

### 4.7 Hashage du mot de passe (exigence "jamais en clair")

Django utilise nativement **PBKDF2-SHA256** (visible en base : `pbkdf2_sha256$1200000$...`), avec **1,2 million d'itérations** — un algorithme à dérivation de clé lente, conçu spécifiquement pour résister au brute-force, reconnu comme équivalent sécurisé à bcrypt (tous deux recommandés par OWASP). Aucune dépendance supplémentaire n'a été nécessaire : c'est le comportement par défaut de `AbstractBaseUser.set_password()`, déjà utilisé dans `UtilisateurManager.create_user()`.

---

## 5. Les 4 rôles et la matrice de permissions

Rôles et matrice créés/mis à jour via des **migrations de données** Django (`0002_seed_roles.py`, `0003_update_permissions_matrix.py`) — reproductibles sur n'importe quel environnement via `python manage.py migrate`, versionnées comme le reste du code.

**8 modules** : `clients`, `devis`, `affaires`, `factures`, `paiements`, `relances`, `documents`, `utilisateurs`
**5 actions** : `lecture`, `creation`, `modification`, `suppression`, `validation`

| Module | Administrateur | Direction | Chargé d'affaires | Comptabilité |
|---|---|---|---|---|
| clients | toutes | lecture | lecture, création, modification | — |
| devis | toutes | lecture, validation | lecture, création, modification | — |
| affaires | toutes | lecture | lecture, modification | — |
| factures | toutes | lecture, validation | lecture | lecture, création, modification |
| paiements | toutes | lecture | — | lecture, création, modification |
| relances | toutes | lecture | — | lecture, création, modification |
| documents | toutes | lecture | lecture, création | lecture, création |
| **utilisateurs** | toutes | — | — | — |

Le module `utilisateurs` est **exclusif à l'Administrateur** — cohérent avec le fait que seul ce rôle voit et accède à la section Administration, côté frontend comme côté backend.

---

## 6. Vérification des droits côté serveur — le mécanisme

C'est le point le plus critique du cahier des charges : *"même si quelqu'un bidouille le frontend, le serveur doit refuser l'action si le rôle n'a pas le droit."*

Une classe de permission DRF personnalisée, `HasModulePermission`, est évaluée **avant** l'exécution de toute vue :

```python
def has_permission(self, request, view):
    if not request.user.is_authenticated:
        return False
    module = view.permission_module  # ex. 'utilisateurs'
    action = ACTION_MAP[request.method]  # GET→lecture, POST→creation, ...
    return bool(request.user.role.permissions.get(module, {}).get(action, False))
```

Chaque vue déclare simplement quel module elle protège (`permission_module = 'utilisateurs'`) ; le verbe HTTP détermine l'action automatiquement. Cette vérification **ne fait aucune confiance au frontend** : que le bouton soit caché ou non dans React ne change strictement rien à ce que cette fonction renvoie pour un appel direct (Postman, curl, script).

**Extension pour tester toute la matrice dès maintenant** : les modules métier (clients, devis, affaires...) n'ont pas encore leur propre application Django (ils seront construits un par un). Pour ne pas attendre pour prouver que la matrice fonctionne intégralement, un endpoint générique `GET/POST/PUT/DELETE /api/permissions/<module>/` réutilise `HasModulePermission` sans logique métier — il renvoie juste `{module, action, access: "granted"}` ou `403`. Explicitement documenté comme un harnais de test, pas une fausse fonctionnalité : il sera retiré module par module au fur et à mesure que les vraies ressources existeront.

---

## 7. Administration — connectée au vrai backend

Dernière étape réalisée : l'onglet Administration du frontend ne montre plus de données inventées.

- **Utilisateurs** : liste réelle (PostgreSQL), création d'un compte (nom/prénom/email/mot de passe/rôle), **changement de rôle ou de statut d'un utilisateur existant**, suppression — tout persiste réellement en base.
- **Rôles** : les 4 vrais rôles, avec le nombre réel d'utilisateurs par rôle et les modules réellement accordés.
- **Permissions** : la matrice complète (8 modules × 5 actions), affichée par rôle, lue directement depuis la base de données.
- **Accès restreint** : la section Administration n'apparaît dans le menu et n'est accessible que pour le rôle Administrateur — côté frontend (masquage + redirection si un autre rôle force l'URL) **et** côté backend (la vraie barrière de sécurité, section 6).

Testé en navigateur piloté : un compte Comptabilité ne voit pas "Administration" dans le menu, et une tentative de forcer l'URL `/admin/users` redirige immédiatement vers le tableau de bord.

---

## 8. Preuve par les tests — collection Postman

Une **collection Postman complète** a été générée (`backend/postman/AK-Consulting-API.postman_collection.json`, + fichier d'environnement associé) : **176 requêtes**, chacune avec une assertion automatique sur le code HTTP attendu.

```
1. Auth — Login                4 requêtes  (une par rôle, sauvegarde automatique des tokens)
2. Module Utilisateurs (réel) 12 requêtes  (liste/rôles/me/tokens invalides)
3. Matrice de permissions    160 requêtes  (8 modules × 4 rôles × 5 actions)
```

Un clic sur **"Run collection"** exécute les 176 requêtes et affiche un rapport pass/fail complet — la preuve automatisée et exhaustive que la matrice entière fonctionne, indépendamment de toute interface graphique, comme demandé par le cahier des charges.

Extrait représentatif (code HTTP attendu) :

| Requête | Résultat |
|---|---|
| `POST /api/auth/login/` (identifiants valides, 4 rôles) | `200` |
| `POST /api/auth/login/` (mauvais mot de passe / compte suspendu) | `401` |
| `GET /api/utilisateurs/` (Administrateur) | `200` |
| `GET /api/utilisateurs/` (Direction / Chargé d'affaires / Comptabilité) | `403` |
| `GET /api/permissions/factures/` (Comptabilité) | `200` |
| `POST /api/permissions/factures/` (Comptabilité) | `201` |
| `GET /api/permissions/devis/` (Comptabilité) | `403` |
| `GET /api/permissions/devis/?action=validation` (Direction) | `200` |
| Requête sans token / avec token invalide | `401` |

---

## 9. Bugs réels trouvés et corrigés pendant le développement

Cités car ils illustrent que le système a été réellement testé, pas seulement écrit :

1. **`USER_ID_FIELD` par défaut incorrect** — SimpleJWT suppose par défaut une clé primaire nommée `id`. La nôtre s'appelle `id_utilisateur` → `AttributeError` au tout premier login réel. Corrigé en configurant explicitement `SIMPLE_JWT['USER_ID_FIELD']`.
2. **Virgule manquante dans `INSTALLED_APPS`** — deux chaînes Python adjacentes sans virgule se concatènent silencieusement (`'corsheaders' 'utilisateurs'` → `'corsheadersutilisateurs'`), provoquant un `ModuleNotFoundError` trompeur.
3. **`role_id` NOT NULL au premier `createsuperuser`** — le champ `role` est obligatoire mais aucun rôle n'existait encore en base. Corrigé en faisant créer/récupérer automatiquement un rôle "Administrateur" par défaut dans `create_superuser`.
4. **Historique de migrations incohérent** — après l'introduction du modèle utilisateur personnalisé, la base contenait encore des migrations `admin`/`auth` liées à l'ancien modèle. Résolu par réinitialisation propre de la base de développement (aucune donnée de production en jeu à ce stade).
5. **`PATCH` sur le rôle d'un utilisateur silencieusement ignoré** — le serializer utilisé pour la modification avait `role` en lecture seule (copié du serializer d'affichage). Un Administrateur ne pouvait donc pas réellement changer l'accès d'un utilisateur malgré une réponse `200`. Corrigé avec un serializer dédié à la modification.
6. **Graphique camembert mal cadré (frontend)** — rayon fixé en pixels au lieu d'un pourcentage du conteneur disponible, causant un rognage visuel quand la légende réduisait l'espace.

---

## 10. Points d'attention / limites actuelles

- Seuls **Authentification** et **Administration** sont connectés au vrai backend ; les autres modules (clients, devis, projets...) restent sur des données mock en attendant leur tour.
- Pas de rafraîchissement automatique du token côté frontend (silent refresh) — au-delà d'1h, reconnexion nécessaire.
- Pas de flux d'invitation par email : la création d'utilisateur se fait avec un mot de passe défini directement par l'Administrateur.
- Pas encore de suite de tests automatisés backend (pytest) — les vérifications actuelles sont la collection Postman + des scripts de test manuels pendant le développement.
- Configuration actuelle = développement (`DEBUG=True`, `SECRET_KEY` en clair dans le repo) — à durcir avant tout déploiement.

---

## 11. Prochaines étapes proposées

1. Choisir un premier module métier réel (ex. **Clients**) : modèle Django, endpoints CRUD, brancher sur les permissions déjà prévues dans la matrice, connecter au frontend — pour valider le schéma de bout en bout avant de généraliser.
2. Répéter pour Devis (calcul automatique via `cout_horaire`), Affaires, Factures, Paiements/Relances, Documents — en supprimant au fur et à mesure les entrées correspondantes du harnais générique `/api/permissions/<module>/`.
3. Ajouter un endpoint d'auto-édition du profil utilisateur.
4. Suite de tests automatisés backend (pytest + `APITestCase`), en particulier sur la matrice de permissions.
5. Rafraîchissement automatique du token côté frontend (silent refresh).
6. Stratégie de déploiement (variables d'environnement de production, `DEBUG=False`, secret key hors dépôt).
