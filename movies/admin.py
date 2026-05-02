from django.contrib import admin
from movies.models import Actor, Director, Category, SubCategory, Movie, MovieType, Review
from .models import Episode



@admin.register(Actor)
class ActorAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "gender", "role",)
    search_fields = ("name",)
    list_filter = ("gender", "role")
    ordering = ("name",)

@admin.register(Director)
class DirectorAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "gender", "role", )
    search_fields = ("name",)
    list_filter = ("gender", "role")
    ordering = ("name",)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug",)
    search_fields = ("name", "slug")
    ordering = ("name",)

@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "category", )
    search_fields = ("name", "slug", "category__name")
    autocomplete_fields = ("category",)
    ordering = ("name",)

@admin.register(MovieType)
class MovieTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", )
    search_fields = ("name", "slug")
    ordering = ("name",)

# MovieAdmin uchun o'zgarishlar
@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "movie_type", "is_premiere", "created_at")
    search_fields = ("name", "slug", "janr", "yili", "tili")
    list_filter = ("movie_type", "is_premiere", "yili", "tili")
    ordering = ("-created_at",)
    autocomplete_fields = ("categories", "subcategories", "actors", "directors", "movie_type")
    readonly_fields = ("slug_display", "created_at", "updated_at")

    @admin.display(description="Slug")
    def slug_display(self, obj):
        return obj.slug
    fieldsets = (
        ("Asosiy", {
            "fields": ("name", "slug_display", "movie_type", "thumbnail", "is_premiere"),
        }),
        ("Bog‘lanishlar", {
            "fields": ("categories", "subcategories", "actors", "directors"),
        }),
        ("Player", {
            "fields": ("movie_url", "iframe_content"),
        }),
        ("Tavsif", {
            "fields": ("description",),
        }),
        ("Qo‘shimcha", {
            "fields": ("series", "fasl", "qism", "janr", "yili", "tili", "kompaniya", "davomiylogi", "ovozberishaktorlari", "rejesyor", "homiy", "yoshcheklovi"),
            "classes": ("collapse",),
        }),
        ("Texnik", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "movie")
    search_fields = ("name", "movie__name")
    autocomplete_fields = ("movie",)
    ordering = ("-id",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "movie", "user", "rating", "updated_at")
    list_filter = ("rating",)
    search_fields = ("movie__name", "user__username", "user__email", "message")
    autocomplete_fields = ("movie", "user")
    ordering = ("-updated_at",)
