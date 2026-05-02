from django.urls import path
from users import views


urlpatterns = [
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('register/', views.RegistrationView.as_view(), name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile, name='profile'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    
    path('hp/', views.hp_dashboard, name='hp_dashboard'),
    
    path('customize/', views.customize_page, name='customize_page'),
    
]
