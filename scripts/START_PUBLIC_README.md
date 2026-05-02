Quick: expose this dev site publicly (Windows)

1) Prepare
- Ensure your virtualenv is created at `.venv` (see project README). If not, create one and `pip install -r requirements.txt`.
- If you want a public URL, download `ngrok` from https://ngrok.com/download and place `ngrok.exe` in the project root (same folder as `manage.py`).

2) Run (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
.\.venv\Scripts\Activate.ps1   # if you use the repo venv
.\scripts\start-public.ps1
```

3) After running
- The script starts the Django dev server on `0.0.0.0:8000`.
- If `ngrok.exe` is present it will start `ngrok http 8000` in a new process — check the ngrok console for the public URL.

Notes & safety
- Dev server is not hardened for public exposure. Use this only for short testing sessions.
- Temporarily set `ALLOWED_HOSTS` in `mlw/settings.py` to include the ngrok domain or `['*']` for testing, then revert.
- For long-term public hosting, deploy behind Nginx/Gunicorn with TLS.
