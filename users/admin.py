from django.contrib import admin
from django.contrib.auth import admin as auth_admin
from users.models import User, Profile, MovieWatch, EpisodeWatch


@admin.register(User)
class UserAdmin(auth_admin.UserAdmin):
    ordering = ("-date_joined",)
    list_display = ("id", "email", "username", "is_staff", "is_active", "date_joined")
    search_fields = ("email", "username")
    list_filter = ("is_staff", "is_active", "date_joined")

    fieldsets = (
        ("Asosiy", {"fields": ("email", "username", "password")}),
        ("Ruxsatlar", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Muhim sanalar", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        ("Yangi user", {
            "classes": ("wide",),
            "fields": ("email", "username", "password1", "password2", "is_staff", "is_active"),
        }),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "hp", "battle_rating", "boss_progress", "gender", "updated_at")
    search_fields = ("user__email", "user__username")
    list_filter = ("gender",)
    ordering = ("-hp", "-battle_rating", "-updated_at")
    autocomplete_fields = ("user",)
    actions = ("grant_mega_boost",)
    fieldsets = (
        ("Asosiy", {"fields": ("user", "hp", "battle_rating", "boss_progress")}),
        ("Battle Shop", {"fields": ("active_skin", "owned_skins", "damage_multiplier", "skill_multiplier")}),
        # Ban controls removed from admin to disable manual banning for games
        ("Qo'shimcha", {"fields": ("address", "gender")}),
        ("Texnik", {"fields": ("created_at", "updated_at")}),
    )
    readonly_fields = ("created_at", "updated_at")

    @admin.action(description="Mega boost (HP+5000, rating+3000, boss+3)")
    def grant_mega_boost(self, request, queryset):
        for profile in queryset:
            profile.hp = int(profile.hp) + 5000
            profile.battle_rating = int(profile.battle_rating) + 3000
            profile.boss_progress = int(profile.boss_progress) + 3
            profile.save(update_fields=["hp", "battle_rating", "boss_progress", "updated_at"])


@admin.register(MovieWatch)
class MovieWatchAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "movie", "created_at")
    search_fields = ("user__email", "user__username", "movie__name")
    list_filter = ("created_at",)
    ordering = ("-created_at",)
    autocomplete_fields = ("user", "movie")
    readonly_fields = ("created_at",)


@admin.register(EpisodeWatch)
class EpisodeWatchAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "episode", "created_at")
    search_fields = ("user__email", "user__username", "episode__name", "episode__movie__name")
    list_filter = ("created_at",)
    ordering = ("-created_at",)
    autocomplete_fields = ("user", "episode")
    readonly_fields = ("created_at",)

