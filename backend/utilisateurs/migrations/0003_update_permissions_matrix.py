from django.db import migrations

# Matrice de permissions corrigée : ajout du module "documents", et
# permissions "Direction"/"Comptabilité" élargies suite aux précisions
# métier données après la migration 0002.
# Modules : clients, devis, affaires, factures, utilisateurs, paiements,
#           relances, documents
# Actions : lecture, creation, modification, suppression, validation

NEW_PERMISSIONS = {
    'Administrateur': {
        module: {'lecture': True, 'creation': True, 'modification': True, 'suppression': True, 'validation': True}
        for module in (
            'clients', 'devis', 'affaires', 'factures', 'utilisateurs',
            'paiements', 'relances', 'documents',
        )
    },
    'Direction': {
        'clients': {'lecture': True},
        'devis': {'lecture': True, 'validation': True},
        'affaires': {'lecture': True},
        'factures': {'lecture': True, 'validation': True},
        'paiements': {'lecture': True},
        'relances': {'lecture': True},
        'documents': {'lecture': True},
    },
    "Chargé d'affaires": {
        'clients': {'lecture': True, 'creation': True, 'modification': True},
        'devis': {'lecture': True, 'creation': True, 'modification': True},
        'affaires': {'lecture': True, 'modification': True},
        'factures': {'lecture': True},
        'documents': {'lecture': True, 'creation': True},
    },
    'Comptabilité': {
        'factures': {'lecture': True, 'creation': True, 'modification': True},
        'paiements': {'lecture': True, 'creation': True, 'modification': True},
        'relances': {'lecture': True, 'creation': True, 'modification': True},
        'documents': {'lecture': True, 'creation': True},
    },
}

# Matrice précédente (migration 0002), pour permettre un rollback propre.
OLD_PERMISSIONS = {
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


def apply_matrix(apps, matrix):
    Role = apps.get_model('utilisateurs', 'Role')
    for libelle, permissions in matrix.items():
        Role.objects.filter(libelle=libelle).update(permissions=permissions)


def update_permissions(apps, schema_editor):
    apply_matrix(apps, NEW_PERMISSIONS)


def revert_permissions(apps, schema_editor):
    apply_matrix(apps, OLD_PERMISSIONS)


class Migration(migrations.Migration):

    dependencies = [
        ('utilisateurs', '0002_seed_roles'),
    ]

    operations = [
        migrations.RunPython(update_permissions, revert_permissions),
    ]
