import re

from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe


register = template.Library()

_YOUTUBE_ID_RE = re.compile(
    r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/))([A-Za-z0-9_-]{6,})",
    re.IGNORECASE,
)


def _extract_youtube_id(value: str) -> str | None:
    if not value:
        return None
    match = _YOUTUBE_ID_RE.search(value)
    return match.group(1) if match else None


@register.simple_tag
def player_embed(value, width="100%", height="100%"):
    """
    Usage:
      {% load player_embed %}
      {% player_embed movie.iframe_content %}
      {% player_embed movie.movie_url %}
      {% player_embed movie %}
    """
    if value is None:
        return ""

    iframe_html = None
    movie_url = None

    if hasattr(value, "iframe_content"):
        iframe_html = getattr(value, "iframe_content", None)
        movie_url = getattr(value, "movie_url", None)
    elif isinstance(value, str):
        if "<iframe" in value.lower():
            iframe_html = value
        else:
            movie_url = value

    if iframe_html:
        return mark_safe(iframe_html)

    if movie_url:
        yt_id = _extract_youtube_id(movie_url)
        src = (
            f"https://www.youtube-nocookie.com/embed/{yt_id}"
            if yt_id
            else escape(movie_url)
        )
        html = (
            f'<iframe src="{src}" width="{escape(str(width))}" height="{escape(str(height))}" '
            'frameborder="0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" '
            'allowfullscreen></iframe>'
        )
        return mark_safe(html)

    return ""

