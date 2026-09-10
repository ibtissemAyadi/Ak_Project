"""Peuple l'environnement de développement avec des clients, utilisateurs et
devis fictifs supplémentaires — utile pour avoir des tableaux de bord,
Kanban et listes réalistes plutôt qu'une base quasi vide.

Usage : python manage.py seed_demo_data [--clients N] [--users N] [--devis N]
"""

import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from crm.models import Client
from devis.models import (
    STATUT_A_VALIDER,
    STATUT_ACCEPTE,
    STATUT_ANNULE,
    STATUT_BROUILLON,
    STATUT_EN_PREPARATION,
    STATUT_ENVOYE,
    STATUT_REFUSE,
    Devis,
    LigneDevis,
)
from utilisateurs.models import Role, Utilisateur

MOT_DE_PASSE_DEMO = 'Demo1234!'

CLIENTS = [
    dict(raison_sociale='Atlas Construction Group', matricule_fiscal='TN10023456', adresse='Zone Industrielle Charguia, Tunis', pays='Tunisie', secteur_activite='BTP', telephone='+216 71 234 567', email='contact@atlasconstruction.tn', statut='Actif'),
    dict(raison_sociale='Zenith Data Centers', matricule_fiscal='TN10087654', adresse='Technopole El Ghazala, Ariana', pays='Tunisie', secteur_activite='Data Centers', telephone='+216 70 345 678', email='ops@zenithdc.com', statut='Actif'),
    dict(raison_sociale='Sahara Energie Solaire', matricule_fiscal='TN10099887', adresse='Route de Gabès, Sfax', pays='Tunisie', secteur_activite='Énergie renouvelable', telephone='+216 74 456 789', email='projets@sahara-energie.tn', statut='Actif'),
    dict(raison_sociale='Hydra Traitement des Eaux', matricule_fiscal='TN10011223', adresse='Zone Industrielle Sidi Bernard, Nabeul', pays='Tunisie', secteur_activite='Eau & Environnement', telephone='+216 72 567 890', email='contact@hydra-eau.tn', statut='Prospect'),
    dict(raison_sociale='Groupe Manufacturier Delta', matricule_fiscal='TN10055443', adresse='Zone Industrielle Bir El Kassaa, Ben Arous', pays='Tunisie', secteur_activite='Industrie manufacturière', telephone='+216 79 678 901', email='achats@delta-groupe.tn', statut='Actif'),
    dict(raison_sociale='Lumière Immobilier Promotion', matricule_fiscal='TN10066554', adresse='Les Berges du Lac, Tunis', pays='Tunisie', secteur_activite='Promotion immobilière', telephone='+216 71 789 012', email='projets@lumiere-immo.tn', statut='Prospect'),
    dict(raison_sociale='Nord Logistique & Transport', matricule_fiscal='TN10077665', adresse='Port de Radès, Ben Arous', pays='Tunisie', secteur_activite='Logistique', telephone='+216 71 890 123', email='contact@nord-logistique.tn', statut='Actif'),
    dict(raison_sociale='Bâtir Ingénierie France', matricule_fiscal='FR38293847500012', adresse='12 Rue de la République, Lyon', pays='France', secteur_activite='BTP', telephone='+33 4 78 12 34 56', email='contact@batir-ingenierie.fr', statut='Actif'),
    dict(raison_sociale='PharmaTech Industries', matricule_fiscal='TN10033221', adresse='Zone Industrielle Mghira, Ben Arous', pays='Tunisie', secteur_activite='Pharmaceutique', telephone='+216 71 901 234', email='qualite@pharmatech.tn', statut='Inactif'),
    dict(raison_sociale='Oasis Agroalimentaire', matricule_fiscal='TN10044332', adresse='Route de Kairouan, Sousse', pays='Tunisie', secteur_activite='Agroalimentaire', telephone='+216 73 012 345', email='direction@oasis-agro.tn', statut='Actif'),
]

UTILISATEURS = [
    dict(nom='Ben Salah', prenom='Yassine', email='y.bensalah@ak-consulting.com', role='Chargé d\'affaires', cout_horaire=Decimal('45')),
    dict(nom='Trabelsi', prenom='Nour', email='n.trabelsi@ak-consulting.com', role='Chargé d\'affaires', cout_horaire=Decimal('42')),
    dict(nom='Gharbi', prenom='Mehdi', email='m.gharbi@ak-consulting.com', role='Chargé d\'affaires', cout_horaire=Decimal('50')),
    dict(nom='Cherif', prenom='Salma', email='s.cherif@ak-consulting.com', role='Direction', cout_horaire=Decimal('65')),
    dict(nom='Jlassi', prenom='Karim', email='k.jlassi@ak-consulting.com', role='Comptabilité', cout_horaire=Decimal('38')),
]

OBJETS_DEVIS = [
    "Étude géotechnique - Fondations bâtiment principal",
    "Diagnostic structurel - Extension usine",
    "Contrôle qualité béton - Phase 2",
    "Assistance maîtrise d'ouvrage - Rénovation réseau électrique",
    "Étude sismique - Centre de données",
    "Audit énergétique - Site industriel",
    "Supervision travaux - Station de traitement des eaux",
    "Étude de faisabilité - Extension ligne de production",
    "Dimensionnement structure métallique - Hangar logistique",
    "Suivi chantier - Pont routier",
    "Étude thermique - Bâtiment tertiaire",
    "Contrôle technique - Silo de stockage",
    "Étude d'impact environnemental - Nouvelle unité",
    "Diagnostic amiante et plomb - Bâtiment ancien",
    "Ingénierie VRD - Lotissement industriel",
]

LIGNES_POSSIBLES = [
    ("Étude géotechnique préliminaire", '1', '3500'),
    ("Rapport de diagnostic structurel", '1', '2800'),
    ("Journée d'ingénieur sur site", '5', '450'),
    ("Journée de technicien sur site", '8', '250'),
    ("Contrôle qualité béton (par prélèvement)", '10', '85'),
    ("Déplacement et frais de mission", '3', '180'),
    ("Sous-traitance laboratoire d'essais", '1', '1200'),
    ("Rédaction dossier technique", '1', '900'),
    ("Réunion de suivi de chantier", '4', '300'),
    ("Note de calcul structurelle", '2', '1100'),
    ("Frais de dossier administratif", None, None),
]

# Distribution de statuts réaliste : surtout des devis "vivants", quelques
# clôturés dans chaque sens.
STATUTS_CIBLES = (
    [STATUT_BROUILLON] * 3
    + [STATUT_EN_PREPARATION] * 3
    + [STATUT_A_VALIDER] * 2
    + [STATUT_ENVOYE] * 3
    + [STATUT_ACCEPTE] * 3
    + [STATUT_REFUSE] * 2
    + [STATUT_ANNULE] * 1
)

ORDRE_PROGRESSION = [STATUT_BROUILLON, STATUT_EN_PREPARATION, STATUT_A_VALIDER, STATUT_ENVOYE]


def avancer_vers(devis, statut_cible, utilisateur):
    if statut_cible == STATUT_ANNULE:
        etape_annulation = random.choice([STATUT_BROUILLON, STATUT_EN_PREPARATION])
        for statut in ORDRE_PROGRESSION[1:ORDRE_PROGRESSION.index(etape_annulation) + 1]:
            devis.changer_statut(statut, utilisateur)
        devis.changer_statut(STATUT_ANNULE, utilisateur, commentaire='Projet abandonné par le client.')
        return

    if statut_cible in ORDRE_PROGRESSION:
        for statut in ORDRE_PROGRESSION[1:ORDRE_PROGRESSION.index(statut_cible) + 1]:
            devis.changer_statut(statut, utilisateur)
        return

    # ACCEPTE ou REFUSE : passe par la chaîne complète jusqu'à Envoyé d'abord.
    for statut in ORDRE_PROGRESSION[1:]:
        devis.changer_statut(statut, utilisateur)
    commentaire = 'Prix non compétitif face à la concurrence.' if statut_cible == STATUT_REFUSE else ''
    devis.changer_statut(statut_cible, utilisateur, commentaire=commentaire)


class Command(BaseCommand):
    help = "Ajoute des clients, utilisateurs et devis de démonstration (données fictives)."

    def add_arguments(self, parser):
        parser.add_argument('--clients', type=int, default=len(CLIENTS))
        parser.add_argument('--users', type=int, default=len(UTILISATEURS))
        parser.add_argument('--devis', type=int, default=18)

    @transaction.atomic
    def handle(self, *args, **options):
        clients_crees = self._creer_clients(options['clients'])
        utilisateurs_crees = self._creer_utilisateurs(options['users'])

        tous_clients = list(Client.objects.all())
        chefs_affaires = list(Utilisateur.objects.filter(role__libelle="Chargé d'affaires", statut='Actif'))

        if not tous_clients or not chefs_affaires:
            self.stdout.write(self.style.WARNING("Aucun client ou aucun chargé d'affaires disponible : devis non générés."))
            return

        nb_devis = self._creer_devis(options['devis'], tous_clients, chefs_affaires)

        self.stdout.write(self.style.SUCCESS(
            f'\nTerminé : {clients_crees} client(s), {utilisateurs_crees} utilisateur(s), {nb_devis} devis créés.'
        ))
        if utilisateurs_crees:
            self.stdout.write(f"Mot de passe des nouveaux utilisateurs de démo : {MOT_DE_PASSE_DEMO}")

    def _creer_clients(self, limite):
        count = 0
        for data in CLIENTS[:limite]:
            _, created = Client.objects.get_or_create(
                matricule_fiscal=data['matricule_fiscal'], defaults=data,
            )
            if created:
                count += 1
        self.stdout.write(f'{count} nouveau(x) client(s).')
        return count

    def _creer_utilisateurs(self, limite):
        count = 0
        for data in UTILISATEURS[:limite]:
            role = Role.objects.filter(libelle=data['role']).first()
            if role is None:
                self.stdout.write(self.style.WARNING(f"Rôle introuvable : {data['role']} — utilisateur {data['email']} ignoré."))
                continue
            if Utilisateur.objects.filter(email=data['email']).exists():
                continue
            Utilisateur.objects.create_user(
                email=data['email'], password=MOT_DE_PASSE_DEMO,
                nom=data['nom'], prenom=data['prenom'], role=role,
                cout_horaire=data['cout_horaire'], statut='Actif',
            )
            count += 1
        self.stdout.write(f'{count} nouvel(aux) utilisateur(s).')
        return count

    def _creer_devis(self, nb, clients, chefs_affaires):
        count = 0
        for i in range(nb):
            client = random.choice(clients)
            charge_affaires = random.choice(chefs_affaires)
            statut_cible = STATUTS_CIBLES[i % len(STATUTS_CIBLES)]

            devis = Devis.objects.create(
                client=client, charge_affaires=charge_affaires,
                objet=random.choice(OBJETS_DEVIS),
                taux_tva_defaut=Decimal(random.choice(['0', '19', '20'])),
                type_marge='pourcentage',
                valeur_marge=Decimal(random.choice(['0', '0', '5', '10', '15'])),
                type_remise='pourcentage',
                valeur_remise=Decimal(random.choice(['0', '0', '0', '5', '10'])),
                date_validite=None,
            )

            for description, quantite, prix_unitaire in random.sample(LIGNES_POSSIBLES, random.randint(2, 5)):
                LigneDevis.objects.create(
                    devis=devis, description=description,
                    quantite=Decimal(quantite) if quantite else None,
                    prix_unitaire=Decimal(prix_unitaire) if prix_unitaire else None,
                )

            devis.recalculer_montants()
            devis.refresh_from_db()

            avancer_vers(devis, statut_cible, charge_affaires)
            count += 1

        self.stdout.write(f'{count} nouveau(x) devis.')
        return count
