from django import template
from movies.models import Movie
from movies.utils import movie_filter
from django.db.models import Avg

register = template.Library()


@register.filter(name="type_wise_movie")
def type_wise_movie(request, movie_type):
    if not settings.DEBUG:
        return []
    filter_string = movie_filter(request)
    try:
        return (
            Movie.objects.filter(movie_type=movie_type, **filter_string)
            .annotate(avg_rating=Avg("review__rating"))
            .order_by("-created_at")[:6]
        )
    except:
        return []
