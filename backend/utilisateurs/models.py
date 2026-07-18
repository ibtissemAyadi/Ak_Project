# utilisateurs/models.py
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class Role(models.Model):
    id_role = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    libelle = models.CharField(max_length=50, unique=True)
    permissions = models.JSONField(default=dict)

    def __str__(self):
        return self.libelle


class UtilisateurManager(BaseUserManager):
    """Django a besoin d'un 'manager' personnalisé quand on remplace
    le système d'identifiants classique (username) par l'email."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)   # ← hash automatique du mot de passe (jamais stocké en clair)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if not extra_fields.get('role'):
            role, _ = Role.objects.get_or_create(
                libelle='Administrateur',
                defaults={'permissions': {'all': True}},
            )
            extra_fields['role'] = role
        return self.create_user(email, password, **extra_fields)


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    STATUT_CHOICES = [
        ('Actif', 'Actif'),
        ('Suspendu', 'Suspendu'),
        ('Desactive', 'Désactivé'),
    ]

    id_utilisateur = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name='utilisateurs')
    cout_horaire = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='Actif')
    date_creation = models.DateTimeField(auto_now_add=True)

    is_staff = models.BooleanField(default=False)   # nécessaire pour l'admin Django

    objects = UtilisateurManager()

    USERNAME_FIELD = 'email'          # ← on se connecte avec l'email, pas un "username"
    REQUIRED_FIELDS = ['nom', 'prenom']

    @property
    def is_active(self):
        """Un compte Suspendu ou Désactivé ne doit jamais pouvoir se connecter.
        Django (ModelBackend.user_can_authenticate) lit cet attribut au login,
        donc ce câblage suffit à bloquer l'authentification sans code supplémentaire."""
        return self.statut == 'Actif'

    def __str__(self):
        return f"{self.prenom} {self.nom}"