from django import template
from django.db.models import Count

from users.models import Profile

register = template.Library()


@register.inclusion_tag("includes/top-leaderboard.html")
def top_leaderboard(limit=5):
    profiles = (
        Profile.objects.select_related("user")
        .annotate(
            reviews_count=Count("user__review", distinct=True),
            movies_watched=Count("user__movie_watches", distinct=True),
        )
        .order_by("-battle_rating", "-hp", "-boss_progress", "user__username")[: int(limit)]
    )
    return {"profiles": profiles}
