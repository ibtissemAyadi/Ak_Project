# AK Consulting – Application de Gestion Interne

## Description

AK Consulting est une application web de gestion interne destinée à un bureau d'ingénierie-conseil.

L'objectif est de centraliser la gestion des :

- Clients
- Devis
- Affaires
- Factures
- Paiements
- Documents
- Utilisateurs
- Droits d'accès

Le projet est développé avec une architecture **Frontend React + Backend Django REST Framework**.

---

# Architecture

```
React (Frontend)
        │
        │ REST API
        ▼
Django REST Framework
        │
        ▼
PostgreSQL
```

---

# Stack technique

## Frontend

- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui
- React Router
- Zustand
- React Hook Form
- Zod
- TanStack Table
- Recharts

## Backend

- Python
- Django
- Django REST Framework
- SimpleJWT
- PostgreSQL

---

# Fonctionnalités

## Authentification

- Connexion par email
- JWT Authentication
- Access Token
- Refresh Token
- Déconnexion
- Comptes actifs/suspendus

---

## Gestion des utilisateurs

- CRUD utilisateurs
- Gestion des rôles
- Activation / Désactivation
- Modification des rôles

---

## Gestion des rôles

Quatre rôles sont disponibles :

- Administrateur
- Direction
- Chargé d'affaires
- Comptabilité

Chaque utilisateur possède exactement un rôle.

---

## Gestion des permissions

Le projet utilise un système **RBAC (Role Based Access Control)**.

Chaque rôle possède une matrice de permissions définissant les actions autorisées sur chaque module.

Actions disponibles :

- Lecture
- Création
- Modification
- Suppression
- Validation

Modules :

- Clients
- Devis
- Affaires
- Factures
- Paiements
- Relances
- Documents
- Utilisateurs

Les permissions sont vérifiées **uniquement côté serveur**.

---

# Sécurité

- JWT Authentication
- Hashage sécurisé des mots de passe (PBKDF2-SHA256 via Django)
- Vérification des permissions côté serveur
- Protection des routes API
- Contrôle des comptes suspendus
- Permissions indépendantes du frontend

---

# Structure du projet

```
project/

│
├── backend/
│   ├── utilisateurs/
│   ├── authentication/
│   ├── permissions/
│   ├── settings.py
│   └── manage.py
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.tsx
│
└── README.md
```

---

# Installation

## Cloner le projet

```bash
git clone https://github.com/username/ak-consulting.git

cd ak-consulting
```

---

# Backend

Créer un environnement virtuel

```bash
python -m venv venv
```

Activation

Windows

```bash
venv\Scripts\activate
```

Linux / macOS

```bash
source venv/bin/activate
```

Installer les dépendances

```bash
pip install -r requirements.txt
```

Configurer PostgreSQL puis lancer les migrations

```bash
python manage.py makemigrations

python manage.py migrate
```

Créer un super utilisateur

```bash
python manage.py createsuperuser
```

Lancer le serveur

```bash
python manage.py runserver
```

---

# Frontend

Installer les dépendances

```bash
npm install
```

Lancer le projet

```bash
npm run dev
```

Build de production

```bash
npm run build
```

---

# Authentification

Le backend utilise **JWT**.

Endpoints principaux

```
POST /api/auth/login/

POST /api/auth/refresh/

POST /api/auth/logout/
```

Toutes les routes protégées utilisent

```
Authorization: Bearer <access_token>
```

---

# Tests

Les permissions ont été validées avec Postman.

Tests réalisés :

- Login
- JWT
- Permissions
- Contrôle des rôles
- Vérification des accès
- Routes protégées

---

# État actuel

✅ Frontend complet

✅ Authentification

✅ Administration

✅ Gestion des utilisateurs

✅ Gestion des rôles

✅ Matrice de permissions

🔄 Modules métier en cours de connexion :

- Clients
- Devis
- Affaires
- Factures
- Paiements
- Documents

---

# Prochaines étapes

- Connexion du module Clients
- Connexion du module Devis
- Connexion du module Affaires
- Connexion du module Factures
- Connexion du module Paiements
- Tests automatisés (Pytest)
- Rafraîchissement automatique du token
- Déploiement

---

# Auteur

Projet développé dans le cadre du stage de développement Full Stack.

Frontend : React + TypeScript

Backend : Django REST Framework + PostgreSQL
