# Copilot Instructions for Movie Management Project

## Project Overview
Django-based movie management system with user authentication, gamification features, and asynchronous task processing. Two main apps: `movies` (content) and `users` (authentication & gamification).

## Architecture & Key Components

### Custom User Model
- Custom `User` model in `users/models.py` extends `AbstractUser` with email-based authentication
- Set as `AUTH_USER_MODEL = 'users.User'` in settings
- Use `CustomUserManager` for user creation with email primary field
- Always import from `users.models` when referencing User

### Database Models Pattern
- **Base Model**: All models inherit `BaseModel` (abstract) providing `created_at`, `updated_at` timestamps
- **Person Inheritance**: `Actor` and `Director` inherit from `Person` (abstract person info)
- **Movie Core**: Central `Movie` model with M2M relations to `Actor`, `Director`, `Category`
- **Episode System**: Episodes link to Movies via FK; used for series/episodes tracking
- **Movie Properties**: Store metadata (genre, year, language, company, duration) as individual CharField fields with defaults

### Gamification System
- `Profile` model tracks user progression: `hp`, `battle_rating`, `boss_progress`, `damage_multiplier`, `skill_multiplier`
- `EpisodeWatch` tracks watched episodes and increments user hp on first watch
- Implement gamification in views via `Profile.objects.filter(...).update(field=F(field)+increment)`

### Slug Fields
- Use `AutoSlugField` (django-autoslug) for URL-friendly slugs: `slug = AutoSlugField(populate_from='name', editable=True)`
- Make slugs editable to allow manual overrides

## Development Workflow

### Setup
```shell
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
# Create .env with SECRET_KEY and DEBUG=True
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
# Or: .\runserver.cmd
```

### Database Migrations
- If `no such table: movies_movie_actors` error occurs: `python manage.py migrate movies`
- Always run `python manage.py makemigrations` after model changes, then `migrate`

### Testing & Performance
- Use `test.py` for scripting tests (VK API integration example)
- Load testing: `locust -f locustfile.py` with predefined user behaviors
- Celery tasks in `movies/tasks.py` for async operations (e.g., `slow_func.delay()`)

## Key Conventions

### Admin Registration
- Use `@admin.register()` decorator for ModelAdmin classes
- Standard pattern: `list_display`, `search_fields`, `list_filter`, `ordering`
- Use `autocomplete_fields` for large relation fields
- Add `readonly_fields` for auto-generated fields

### Context Processors
- App-level processors in `movies/context_processor.py` and `users/context_processor.py`
- Registered in settings TEMPLATES > context_processors
- Used for template-wide data (user context, movie categories)

### Filters & Queries
- Filter utility: `movies/utils.py` provides `movie_filter()` for query string processing
- Annotate queries with `Avg("review__rating")` for aggregations
- Always order by `-created_at` for recency, use `db_index=True` on datetime fields

### Enum Definitions
- Centralized in `enum_helper.py` using `models.TextChoices`
- Import into models: `from enum_helper import GenderChoices, MovieTypeChoices`
- Example: `gender = models.CharField(max_length=10, choices=GenderChoices.choices)`

## Integration Points

### Media Handling
- Images stored in `media/avatar/` (persons) and `media/thumbnail/` (movies)
- Use `Pillow` for image processing
- Configure in settings with `MEDIA_URL` and `MEDIA_ROOT` + static routes

### View Patterns
- Mix function-based views (home, movie detail) with class-based views (ListView, DetailView)
- Use `HitCountMixin` for view count tracking (django-hitcount)
- Include `login_required` decorator for authenticated actions
- Pass context dict: `render(request, template, {'model_name': obj})`

### URL Routing
- Movies app: `movies.urls` (movie listings, episodes, details)
- Users app: `users.urls` (authentication, profile)
- Root configured in `mlw.urls` with media static routes

## Database Notes
- Default: SQLite (`db.sqlite3`)
- Settings commented out PostgreSQL config with psycopg2
- Use `psycopg2-binary` for Windows, `psycopg2` for others

## Dependencies Highlight
- **Django 4.1.7** core framework
- **django-autoslug**: Automatic slug generation
- **django-hitcount**: View count tracking
- **django-environ**: `.env` file support
- **Celery**: Async task queue (configured in `mlw/celery.py`)
- **Locust**: Load testing with HTTP user simulations
