from django.db import migrations

# Matrice de permissions officielle (cahier des charges).
# Modules : clients, devis, affaires, factures, utilisateurs, paiements, relances
# Actions : lecture, creation, modification, suppression, validation

ROLES = {
    'Administrateur': {
        module: {'lecture': True, 'creation': True, 'modification': True, 'suppression': True, 'validation': True}
        for module in ('clients', 'devis', 'affaires', 'factures', 'utilisateurs', 'paiements', 'relances')
    },
    'Direction': {
        'clients': {'lecture': True},
        'devis': {'lecture': True, 'validation': True},
        'affaires': {'lecture': True},
        'factures': {'lecture': True, 'validation': True},
    },
    "Chargé d'affaires": {
        'clients': {'lecture': True, 'creation': True, 'modification': True},
        'devis': {'lecture': True, 'creation': True, 'modification': True},
        'affaires': {'lecture': True, 'modification': True},
        'factures': {'lecture': True},
    },
    'Comptabilité': {
        'factures': {'lecture': True, 'creation': True, 'modification': True},
        'paiements': {'lecture': True, 'creation': True},
        'relances': {'lecture': True, 'creation': True},
    },
}


def seed_roles(apps, schema_editor):
    Role = apps.get_model('utilisateurs', 'Role')
    Utilisateur = apps.get_model('utilisateurs', 'Utilisateur')

    created_roles = {}
    for libelle, permissions in ROLES.items():
        role, _ = Role.objects.update_or_create(
            libelle=libelle,
            defaults={'permissions': permissions},
        )
        created_roles[libelle] = role

    # Réaligne les comptes déjà créés avec l'ancien rôle ad-hoc "Admin"
    # (créé automatiquement avant que la matrice officielle n'existe).
    old_admin_role = Role.objects.filter(libelle='Admin').first()
    if old_admin_role:
        Utilisateur.objects.filter(role=old_admin_role).update(role=created_roles['Administrateur'])
        if not Utilisateur.objects.filter(role=old_admin_role).exists():
            old_admin_role.delete()


def unseed_roles(apps, schema_editor):
    Role = apps.get_model('utilisateurs', 'Role')
    Role.objects.filter(libelle__in=ROLES.keys()).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateurs', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_roles, unseed_roles),
    ]
