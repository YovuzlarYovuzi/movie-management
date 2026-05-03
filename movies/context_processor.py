from .models import Category, Movie, MovieType


from django.conf import settings

def movie_context(request):
    if settings.DEBUG:
        try:
            categories = Category.objects.all().prefetch_related("subcategory")
            movie_types = MovieType.objects.all()
            premiere_movies = (
                Movie.objects.filter(is_premiere=True)
                .order_by("-created_at")[:8]
            )
        except Exception:
            categories = []
            movie_types = []
            premiere_movies = []
    else:
        categories = []
        movie_types = []
        premiere_movies = []

    return {
        "categories": categories,
        "movie_types": movie_types,
        "premiere_movies": premiere_movies,
    }
