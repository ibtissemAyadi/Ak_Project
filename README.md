# AK Consulting – Application de Gestion Interne

## Description

AK Consulting (A&K Conseil et Ingénierie) est une application web de gestion interne destinée à un bureau d'études d'ingénierie-conseil. Elle centralise l'ensemble du cycle d'activité commerciale et financière de l'entreprise :

- Clients (CRM)
- Devis (avec versionnage automatique)
- Affaires (suivi d'exécution)
- Factures (échéances, PDF, signature électronique)
- Paiements (suivi et relances)
- Documents (bibliothèque centralisée)
- Activités (journal d'audit)
- Tableau de bord (indicateurs, chiffre d'affaires réalisé)
- Utilisateurs & droits d'accès (RBAC)
- Copilot IA (assistant conversationnel branché sur les données réelles)

---

# Architecture

## Vue d'ensemble — client-serveur à 3 niveaux

L'application suit une **architecture client-serveur à 3 niveaux (3-tier)**, avec un frontend et un backend totalement découplés, communiquant exclusivement via une API REST au format JSON (aucun rendu HTML côté serveur) :

```
┌─────────────────────┐        HTTPS / JSON          ┌──────────────────────────┐
│   React (SPA, TS)    │ ────────────────────────────▶│  Django REST Framework   │
│   hébergé sur Vercel │ ◀──────────────────────────── │   hébergé sur Render     │
└─────────────────────┘        Jeton JWT en-tête       └────────────┬─────────────┘
                                                                     │
                                   ┌─────────────────────────────────┼───────────────────┐
                                   ▼                                 ▼                     ▼
                        PostgreSQL (Supabase)          Génération PDF (reportlab)   API Groq (copilot IA)
```

Ce découplage permet de déployer et faire évoluer le frontend et le backend indépendamment l'un de l'autre, chacun sur la plateforme d'hébergement la plus adaptée à sa nature (voir [Déploiement](#déploiement)).

## Ce n'est pas une architecture microservices

Il y a **un seul backend Django** (un seul processus déployé, un seul point d'entrée API) et **une seule base de données**. Des microservices impliqueraient plusieurs services indépendants déployés séparément, chacun avec sa propre base — ce n'est pas le cas ici.

Le backend est un **monolithe modulaire** : organisé en plusieurs apps Django indépendantes par domaine métier (`utilisateurs`, `crm`, `devis`, `affaires`, `factures`, `activites`, `documents`, `assistant`), chacune avec ses propres modèles / vues / serializers, mais toutes déployées dans le même service.

## Pattern interne du backend : MVT (et non MVC)

Django suit nativement le pattern **MVT (Model-View-Template)** — pas MVC (Model-View-Controller), qui est le pattern d'autres frameworks comme Laravel ou Spring. Dans ce projet :

| Couche | Rôle | Équivalent MVC |
|---|---|---|
| **Model** | Les modèles Django (`Devis`, `Affaire`, `Facture`, `Client`, `Utilisateur`...) : structure et règles des données. | Model |
| **View** | Les vues Django REST Framework (`ListCreateAPIView`, `RetrieveUpdateAPIView`...) : contiennent la logique métier. | Controller |
| **Template** | Normalement du HTML rendu côté serveur ; ici **remplacé par le Serializer** (DRF), qui transforme la donnée en JSON plutôt qu'en page HTML, puisque l'interface est un frontend React totalement séparé. | (pas d'équivalent direct) |

> Le pattern reste donc officiellement **MVT**, puisque c'est le framework Django qui l'implémente nativement — seule la couche de présentation finale change (JSON produit par un Serializer, au lieu d'une page HTML produite par un Template).

## Frontend : architecture par composants (SPA)

React ne suit pas MVC — c'est une architecture par composants avec flux de données unidirectionnel, organisée en couches :

```
pages/        → écrans (une page = une route)
components/   → composants réutilisables (UI, shadcn/ui)
services/     → couche d'accès à l'API REST (un fichier par module, mapping snake_case ↔ camelCase)
store/        → état global léger (Zustand) — session utilisateur, jetons JWT
hooks/        → logique réutilisable (ex. useAsync pour les appels API)
```

---

# Stack technique

## Frontend

- React 18, TypeScript, Vite
- TailwindCSS, shadcn/ui (Radix UI)
- React Router
- Zustand (état global)
- React Hook Form + Zod (formulaires et validation)
- TanStack Table (tableaux de données)
- Recharts (graphiques du tableau de bord)
- Sonner (notifications)

## Backend

- Python, Django 6, Django REST Framework
- djangorestframework-simplejwt (authentification JWT)
- django-cors-headers
- reportlab (génération des PDF devis/factures)
- openpyxl (export Excel)
- groq (copilot IA — function calling)
- gunicorn, whitenoise (serveur d'application et fichiers statiques en production)
- dj-database-url, python-decouple (configuration par variables d'environnement)

## Base de données & hébergement

- PostgreSQL
- Vercel (frontend), Render (backend), Supabase (base de données)

---

# Modèle de données (vue d'ensemble)

```
Utilisateur ─┬─▶ Devis ──▶ Affaire ──▶ Facture
             │     │           │            │
             │     ▼           ▼            ▼
             │  LigneDevis  PieceJointe   LigneFacture
             │  Historique  Commentaire
             │  Commentaire
             │
             └─▶ Role (permissions JSON)

Client ──▶ Devis / Affaire
Document  (bibliothèque indépendante)
Activite  (journal d'audit, référence libre)
PropositionAction  (brouillons du copilot IA)
```

Toutes les relations vers `Client`, `Devis`, `Affaire` et `Utilisateur` sont protégées (`on_delete=PROTECT`) : impossible de supprimer un enregistrement tant que des devis, affaires ou factures y font encore référence — l'historique financier ne peut jamais être perdu silencieusement.

---

# Fonctionnalités par module

## Authentification

- Connexion par email (pas de nom d'utilisateur séparé)
- JWT : access token (1h) + refresh token (7 jours)
- Comptes Actif / Suspendu / Désactivé (un compte non Actif ne peut jamais se connecter)

## Utilisateurs & rôles (RBAC)

Quatre rôles, chacun avec une matrice de permissions par module et par action (`lecture`, `creation`, `modification`, `suppression`, `validation`), stockée en JSON sur le rôle — pas de migration nécessaire pour ajuster une permission :

| Rôle | Clients | Devis | Affaires | Factures | Paiements | Relances | Documents |
|---|---|---|---|---|---|---|---|
| Administrateur | LCMSV | LCMSV | LCMSV | LCMSV | LCMSV | LCMSV | LCMSV |
| Direction | L | L, V | L | L, V | L | L | L |
| Chargé d'affaires | L, C, M | L, C, M | L, M | L | — | — | L, C |
| Comptabilité | — | — | — | L, C, M | L, C, M | L, C, M | L, C |

*L = Lecture, C = Création, M = Modification, S = Suppression, V = Validation.*

Les permissions sont vérifiées **uniquement côté serveur** (classe `HasModulePermission`), jamais seulement côté frontend.

## Devis

- Cycle de validation à états : `Brouillon → En préparation → À valider → Envoyé → Accepté / Refusé` (transitions explicitement autorisées, aucun saut d'étape possible)
- Calcul automatique des montants (sous-total, marge, remise, TVA, HT/TTC)
- **Versionnage automatique** : toute modification d'un devis crée une nouvelle version (numéro stable + `v1`, `v2`, `v3`...) ; l'ancienne version est figée en lecture seule — un devis déjà envoyé à un client ne peut jamais être modifié silencieusement
- Export PDF (charte graphique dédiée, CGV annexées) et Excel

## Affaires

- Création **automatique** via signal Django lorsqu'un devis passe au statut Accepté (jamais manuelle)
- Suivi du budget, de l'avancement (estimation manuelle en %), pièces jointes, commentaires

## Factures

- Génération depuis une affaire (reprise des lignes du devis, modifiables ensuite)
- Calcul automatique de la date d'échéance selon 3 modalités : net (N jours), N jours fin de mois, jour fixe du mois suivant
- Export PDF (CGV annexées) et Excel, signature électronique

## Paiements

- Pas de modèle de données dédié : chaque facture est directement une ligne du module Paiements (vue dérivée des factures, "l'argent dû")
- Changement manuel du statut de paiement, relance client par email pré-rempli

## Documents & Activités

- Documents : bibliothèque centralisée des pièces jointes et des PDF générés
- Activités : journal d'audit horodaté de chaque action significative

## Tableau de bord

- Indicateurs clés, chiffre d'affaires réalisé par mois (filtrable par chargé d'affaires), échéances à venir, activité récente

## Copilot IA

- Assistant conversationnel (API Groq) branché sur les données réelles (devis, affaires, factures, clients, documents) via function calling
- Toute action d'écriture suit un mécanisme **proposer → confirmer** : le modèle ne fait que proposer une action (stockée côté serveur) ; c'est le serveur qui détecte la confirmation explicite de l'utilisateur et exécute l'action — jamais le modèle directement

---

# API REST

Toutes les routes sont protégées par défaut (`IsAuthenticated`) et par la matrice de permissions du rôle.

| Module | Préfixe | Endpoints principaux |
|---|---|---|
| Authentification | `/api/auth/` | `POST login/`, `POST refresh/` |
| Utilisateurs | `/api/utilisateurs/` | `GET me/`, `GET roles/`, `GET,POST /`, `GET,PATCH <id>/` |
| Clients | `/api/clients/` | `GET,POST /`, `GET,PATCH <id>/` |
| Devis | `/api/devis/` | `GET,POST /`, `GET,PATCH <id>/`, `GET <id>/versions/`, `GET <id>/pdf/`, `GET <id>/xlsx/`, `POST <id>/transition/`, `GET,POST <id>/lignes/`, `PATCH,DELETE lignes/<id>/` |
| Affaires | `/api/affaires/` | `GET /`, `GET,PATCH <id>/`, `GET,POST <id>/commentaires/`, `GET,POST <id>/pieces-jointes/` |
| Factures | `/api/factures/` | `GET,POST /`, `GET,PATCH <id>/`, `GET <id>/pdf/`, `GET <id>/xlsx/`, `POST <id>/signature/` |
| Activités | `/api/activites/` | `GET /` |
| Documents | `/api/documents/` | `GET,POST /`, `GET,PATCH,DELETE <id>/` |
| Copilot IA | `/api/assistant/` | `POST chat/` |

Le module **Paiements** n'a volontairement pas d'endpoint dédié : il est entièrement dérivé de l'API Factures côté frontend.

---

# Sécurité

- Mots de passe jamais stockés en clair (hachage PBKDF2-SHA256 via Django)
- JWT signé, durée de vie limitée (1h access / 7j refresh)
- RBAC vérifié côté serveur à chaque requête, jamais seulement côté frontend
- CORS restreint aux origines explicitement autorisées (`CORS_ALLOWED_ORIGINS`)
- HTTPS forcé en production (`SECURE_SSL_REDIRECT`, cookies `Secure`, HSTS)
- `SECRET_KEY` obligatoire par variable d'environnement, sans valeur par défaut : l'application refuse de démarrer si elle n'est pas fournie
- Intégrité référentielle stricte (`on_delete=PROTECT`) sur les entités financières sensibles

---

# Structure du projet

```
gestion-ak/
│
├── backend/
│   ├── config/            # settings.py, urls.py, wsgi.py
│   ├── utilisateurs/       # auth, rôles, permissions (RBAC)
│   ├── crm/                # clients
│   ├── devis/               # devis, lignes, versionnage, PDF/Excel
│   ├── affaires/            # affaires, pièces jointes, commentaires
│   ├── factures/            # factures, lignes, échéances, PDF/Excel
│   ├── activites/           # journal d'audit
│   ├── documents/           # bibliothèque documentaire
│   ├── assistant/           # copilot IA (Groq)
│   ├── requirements.txt
│   ├── Procfile             # commande de démarrage (Render)
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── features/        # pages par module (devis, affaires, factures...)
│   │   ├── components/      # composants UI réutilisables
│   │   ├── services/        # couche d'accès à l'API REST
│   │   ├── store/           # état global (Zustand)
│   │   ├── hooks/
│   │   └── lib/
│   ├── vercel.json          # routage SPA (React Router) en production
│   └── package.json
│
└── README.md
```

---

# Installation (environnement local)

## Cloner le projet

```bash
git clone https://github.com/ibtissemAyadi/Ak_Project.git
cd gestion-ak
```

## Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

Copier `.env.example` en `.env` et renseigner au minimum :

```
SECRET_KEY=         # python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DATABASE_URL=        # chaîne PostgreSQL locale ou Supabase
```

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Frontend

```bash
cd frontend
npm install
```

Copier `.env.example` en `.env` :

```
VITE_API_URL=http://127.0.0.1:8000
```

```bash
npm run dev      # développement
npm run build    # build de production
```

---

# Déploiement

L'application est répartie sur **trois plateformes gratuites**, chacune spécialisée dans un rôle précis :

| Composant | Plateforme | Rôle |
|---|---|---|
| Base de données | **Supabase** | PostgreSQL managé, fournit directement `DATABASE_URL` |
| Backend (API) | **Render** | Exécute Django/gunicorn, redéployé automatiquement à chaque push |
| Frontend (SPA) | **Vercel** | Sert le build statique React sur un CDN, redéployé automatiquement à chaque push |

Chaque push sur `main` déclenche automatiquement un nouveau déploiement sur Render ET sur Vercel — aucune action manuelle nécessaire pour un changement de code. Seules les migrations de base de données restent manuelles (`python manage.py migrate`, depuis le Shell Render ou en local).

## Étape 1 — Supabase (base de données)

1. Créer un projet sur [supabase.com](https://supabase.com) (plan gratuit).
2. Récupérer la chaîne de connexion dans **Project Settings > Database > Connection string (URI)**.
3. La garder de côté pour `DATABASE_URL` (étape 2).

> Le plan gratuit met le projet en pause après ~7 jours d'inactivité : si l'app renvoie une erreur de connexion, cliquer sur **Restore project** dans le tableau de bord Supabase.

## Étape 2 — Render (backend)

1. Pousser le code sur GitHub, puis créer un **Web Service** sur [render.com](https://render.com) relié au dépôt.
2. Répertoire racine : `backend/`
3. Build Command : `pip install -r requirements.txt && python manage.py collectstatic --noinput`
4. Start Command : `gunicorn config.wsgi` (voir `Procfile`)
5. Variables d'environnement (onglet Environment) : `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS` (domaine `*.onrender.com`), `DATABASE_URL` (étape 1), `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` (à compléter à l'étape 3), `GROQ_API_KEY` / `GROQ_MODEL` (optionnel, copilot IA)
6. Déployer, puis appliquer les migrations depuis le **Shell** Render : `python manage.py migrate` et `python manage.py createsuperuser`
7. Noter l'URL du service (`https://<nom-du-service>.onrender.com`) pour l'étape 3

> Plan gratuit : mise en veille après 15 min d'inactivité (première requête suivante plus lente), disque éphémère (d'où la base externalisée sur Supabase).

## Étape 3 — Vercel (frontend)

1. Importer le même dépôt sur [vercel.com](https://vercel.com), répertoire racine `frontend/` (Vite détecté automatiquement).
2. Vérifier que `vercel.json` contient la règle de réécriture SPA :
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
   indispensable pour React Router (sans elle, un rafraîchissement sur `/devis/123` renvoie une 404).
3. Variable d'environnement `VITE_API_URL` = URL Render de l'étape 2 (sans slash final).
4. Déployer, récupérer l'URL finale (`https://<nom-du-projet>.vercel.app`).
5. Revenir sur Render et compléter `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` avec cette URL (avec `https://`), puis redéployer le backend.

> `VITE_API_URL` est injectée dans le bundle au moment du build : toute modification nécessite un nouveau déploiement Vercel, pas juste un redémarrage.

---

# État actuel

✅ Authentification JWT, utilisateurs, rôles et permissions (RBAC complet)
✅ CRM (clients)
✅ Devis — cycle de validation, versionnage automatique, PDF/Excel
✅ Affaires — création automatique depuis un devis accepté
✅ Factures — échéances, PDF/Excel, signature électronique
✅ Paiements — suivi, changement de statut, relances
✅ Documents, Activités (journal d'audit)
✅ Tableau de bord (indicateurs, chiffre d'affaires réalisé)
✅ Copilot IA (consultation + actions avec confirmation)
✅ Déploiement en production (Vercel + Render + Supabase)

## Limites connues

- Envoi d'email non automatisé côté serveur (mailto pré-rempli, PDF à joindre manuellement)
- Pas de tests automatisés formalisés
- Plans gratuits des hébergeurs : veille Render (15 min), pause Supabase (~7 jours)
- Migrations de base de données non automatisées au déploiement

## Prochaines étapes

- Envoi d'email automatique côté serveur (SMTP ou service transactionnel)
- Suite de tests automatisés (règles métier sensibles : échéances, versionnage, permissions)
- Automatisation des migrations au déploiement (release command)

---

# Auteur

Projet développé par **Ibtissem Ayadi** dans le cadre d'un stage ingénieur chez **A&K Conseil et Ingénierie**.

Frontend : React + TypeScript · Backend : Django REST Framework + PostgreSQL
