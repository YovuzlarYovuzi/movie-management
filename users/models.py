from django.db import models
from django.contrib.auth.models import AbstractUser
from users.managers import CustomUserManager
from enum_helper import GenderChoices

# Create your models here.


class User(AbstractUser):
    email = models.EmailField(unique=True, max_length=255)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.username


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    address = models.CharField(max_length=255, null=True, blank=True)
    gender = models.CharField(
        max_length=10, choices=GenderChoices.choices, null=True, blank=True)
    hp = models.PositiveIntegerField(default=0)
    # Battle-related fields (original):
    battle_rating = models.PositiveIntegerField(default=1000)
    boss_progress = models.PositiveIntegerField(default=0)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.CharField(max_length=255, null=True, blank=True)

    # Shop / skins (original app fields)
    owned_skins = models.JSONField(default=list, blank=True)
    active_skin = models.CharField(max_length=64, null=True, blank=True)
    damage_multiplier = models.FloatField(default=1.0)
    skill_multiplier = models.FloatField(default=1.0)
    # Added by migration 0006
    badges = models.JSONField(default=list, blank=True)
    color_accent = models.CharField(max_length=16, default='default')
    credits = models.PositiveIntegerField(default=0)
    display_nickname = models.CharField(max_length=30, null=True, blank=True)
    experience = models.PositiveIntegerField(default=0)
    language = models.CharField(max_length=5, default='uz')
    level = models.PositiveIntegerField(default=1)
    premium_until = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, default='Novice')
    theme = models.CharField(max_length=10, default='dark')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

class MovieWatch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="movie_watches")
    movie = models.ForeignKey("movies.Movie", on_delete=models.CASCADE, related_name="watched_by")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "movie"], name="uniq_user_movie_watch")
        ]

    def __str__(self):
        return f"{self.user.username} watched {self.movie}"


class EpisodeWatch(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="episode_watches")
    episode = models.ForeignKey("movies.Episode", on_delete=models.CASCADE, related_name="watched_by")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "episode"], name="uniq_user_episode_watch")
        ]

    def __str__(self):
        return f"{self.user.username} watched {self.episode}"


class Purchase(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='purchases')
    item_id = models.CharField(max_length=64)
    item_name = models.CharField(max_length=128)
    cost = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=16, default='hp')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.user.username} purchased {self.item_name} ({self.item_id})"

