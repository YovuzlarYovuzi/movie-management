## How to run

<br />

> Step 1: Clone the repository
```shell
$ git clone https://github.com/mominur774/movie-management.git # https
# or
$ git clone git@github.com:mominur774/movie-management.git # ssh
```
> Step 2: Change directory
```shell
$ cd movie-management
```
> Step 3: Create and activate virtual environment
```shell
# Create (recommended name)
$ python -m venv .venv

# Activate (Windows PowerShell)
$ .\\.venv\\Scripts\\Activate.ps1

# Activate (macOS/Linux)
$ source .venv/bin/activate
```
> Step 4: Install the dependencies
```shell
$ pip install -r requirements.txt
```
> Step 5: Create `.env` in the root directory
```shell
SECRET_KEY=djkfdgfjgj
DEBUG=True
```
> Step 6: Migrate the database and create superuser
```shell
$ python manage.py migrate
$ python manage.py createsuperuser
```

If you see an error like `no such table: movies_movie_actors` on an existing `db.sqlite3`, run:
```shell
$ python manage.py migrate movies
```
> Step 7: Run the server
```shell
# If `python` command doesn't work on Windows, use one of these:
$ .\\.venv\\Scripts\\python.exe manage.py runserver
# or (no PowerShell execution policy issues):
$ .\\runserver.cmd

# Default (when python is available):
$ python manage.py runserver
```

The server will run http://127.0.0.1:8000/
