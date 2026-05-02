from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth.views import LoginView
from django.contrib.auth import logout
from django.views.generic import CreateView
from users.models import User
from users.forms import RegistrationForm, LoginForm
from django.db.models import Count
from users.models import Profile
from users.models import EpisodeWatch, MovieWatch
from django.contrib.auth.decorators import login_required



# Create your views here.


class UserLoginView(LoginView):
    template_name = 'accounts/login.html'
    form_class = LoginForm


class RegistrationView(CreateView):
    template_name = 'accounts/register.html'
    form_class = RegistrationForm
    success_url = '/accounts/login'


def logout_view(request):
    logout(request)
    return redirect(reverse('login'))


def profile(request):
    return render(request, 'accounts/profile.html')


def leaderboard(request):
    profiles = (
        Profile.objects.select_related("user")
        .annotate(
            reviews_count=Count("user__review", distinct=True),
            movies_watched=Count("user__movie_watches", distinct=True),
        )
        .order_by("-battle_rating", "-hp", "-boss_progress", "user__username")[:100]
    )

    return render(request, "pages/leaderboard.html", {"profiles": profiles})


@login_required(login_url="/accounts/login/")
def hp_dashboard(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    recent_episodes = (
        EpisodeWatch.objects.filter(user=request.user).select_related("episode")
        .order_by("-created_at")[:20]
    )
    recent_movies = (
        MovieWatch.objects.filter(user=request.user).select_related("movie")
        .order_by("-created_at")[:20]
    )
    return render(
        request,
        "pages/hp.html",
        {
            "profile": profile,
            "recent_episodes": recent_episodes,
            "recent_movies": recent_movies,
        },
    )


@login_required(login_url="/accounts/login/")
def customize_page(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    return render(request, "accounts/customize.html", {"profile": profile})
