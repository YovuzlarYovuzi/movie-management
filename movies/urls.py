from django.urls import path
from movies import views
from movies.views import MovieDetailsView
from users import battle_views

urlpatterns = [
    path('movie/<int:movie_id>/', views.watch_movie, name='watch_movie'),
    path('movie/<slug:slug>/', MovieDetailsView.as_view(), name='movie-details'),

    path('', views.home_view, name='index'),
    path('movie/<slug:slug>/', views.MovieDetailsView.as_view(), name="movie_details"),
    path('movie/<slug:movie_slug>/episode/<int:episode_id>/', views.movie_episode, name='movie_episode'),
    path('movie-type/<slug:slug>/', views.type_wise_movie_view, name='type_wise_movie'),
    path('actor/<int:actor_id>/', views.actor_details, name='actor_details'),
    path('create-review/', views.create_review, name='create_review'),

    # Battle game
    path('battle/', battle_views.battle_arena, name='battle_arena'),
    path('battle/mk/', battle_views.mortal_kombat_arena, name='mortal_kombat_arena'),
    path('player/data/', battle_views.player_data, name='player_data'),
    path('battle/result/', battle_views.battle_result, name='battle_result'),
    path('battle/mk/result/', battle_views.mortal_kombat_result, name='mortal_kombat_result'),
    path('battle/shop/', battle_views.battle_shop, name='battle_shop'),
    path('battle/buy/', battle_views.battle_buy, name='battle_buy'),
    path('battle/equip/', battle_views.battle_equip, name='battle_equip'),
    path('battle/leaderboard/', battle_views.battle_leaderboard, name='battle_leaderboard'),
    path('battle/multiplayer/', battle_views.battle_multiplayer_demo, name='battle_multiplayer_demo'),
]
