import json

import movies
from movies.models import *
from django.views.generic import ListView, View, DetailView
from movies.utils import movie_filter
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, F
from .models import Movie, Episode
from django.shortcuts import render, get_object_or_404
from hitcount.views import HitCountDetailView
from hitcount.views import get_hitcount_model
from hitcount.views import HitCountMixin

from .tasks  import slow_func

def index(request):
    slow_func.delay(123438)
    return HttpResponse("Site working !!")






def watch_movie(request, movie_id):
    movie = Movie.objects.get(id=movie_id)
    hit_count = get_hitcount_model().objects.get_for_object(movie)
    hits = hit_count.hits
    hit_count_response = HitCountMixin.hit_count(request, hit_count)
    if hit_count_response.hit_counted:
        hits += 1
    movie.increment_view_count()
    context = {
        'movie': movie,
        'hits': hits
    }
    return render(request, 'pages/movie-details.html', context)



def movie_episode(request, movie_slug, episode_id):

    movie = get_object_or_404(Movie, slug=movie_slug)
    episode = get_object_or_404(Episode, id=episode_id)

    if request.user.is_authenticated:
        from users.models import EpisodeWatch, Profile

        watch, created = EpisodeWatch.objects.get_or_create(user=request.user, episode=episode)
        if created:
            Profile.objects.get_or_create(user=request.user)
            Profile.objects.filter(user=request.user).update(hp=F("hp") + 1)

    return render(request, 'movie_episode.html', {'movie': movie, 'episode': episode})

def home_view(request):

    return render(request, 'pages/index.html')
def type_wise_movie_view(request, slug):
    filter_string = movie_filter(request)
    # hit_count = get_hitcount_model().objects.ge_for_object(filter_string)
    # hits = hit_count.hits
    # hit_count_response = HitCountMixin.hit_count(request,hit_count)
    # if hit_count_response.hit_counted:
    #     hits =+ 1
    movie_type = MovieType.objects.get(slug=slug)
    movies = (
        Movie.objects.filter(movie_type=movie_type, **filter_string)
        .annotate(avg_rating=Avg("review__rating"))
        .order_by("-created_at")
    )
    context = {
        'movies': movies,
        'movie_type': movie_type,
        # 'hits': hits
    }
    return render(request, 'pages/type-wise-movies.html', context)


def actor_details(request, actor_id):
    role = request.GET.get('role')
    if role == 'actor':
        actor = get_object_or_404(Actor, id=actor_id)
    elif role == 'director':
        actor = get_object_or_404(Director, id=actor_id)
    else:
        print("Invalid role")

    context = {
        'actor': actor
    }
    return render(request, 'pages/actor-details.html', context)

class MovieDetailsView(HitCountDetailView):
    template_name = 'pages/movie-details.html'
    count_hit = True
    queryset = Movie.objects.all()
    # Bu yerda '-id' maydoni bo'yicha teskari tartibda saralash amalga oshiriladi
    context_object_name = "movie"

    def get_context_data(self, *args, **kwargs):
        context = super(MovieDetailsView, self).get_context_data(*args, **kwargs)

        if self.request.user.is_authenticated:
            from users.models import MovieWatch, Profile

            watch, created = MovieWatch.objects.get_or_create(user=self.request.user, movie=kwargs["object"])
            if created:
                Profile.objects.get_or_create(user=self.request.user)
                Profile.objects.filter(user=self.request.user).update(hp=F("hp") + 5)

        context['reviews'] = Review.objects.filter(movie=kwargs['object']).order_by('-id')
        context['avg_rating'] = context['reviews'].aggregate(Avg('rating'))['rating__avg']
        return context

@login_required(login_url='/accounts/login')
def create_review(request):
    if request.method == 'POST':
        data = json.loads(request.body)

        movie_id = data.get('movie_id')
        movie = get_object_or_404(Movie, id=movie_id)
        user = request.user
        rating = data.get('rating', 1)
        message = data.get('message', '')

        review, created = Review.objects.update_or_create(
            user=user,
            movie=movie,
            defaults={
                'rating': rating,
                'message': message
            }
        )

        if created:
            from users.models import Profile

            Profile.objects.get_or_create(user=user)
            Profile.objects.filter(user=user).update(hp=F("hp") + 3)

        return HttpResponseRedirect(request.META.get('HTTP_REFERER'))

    return JsonResponse({'success': False})
