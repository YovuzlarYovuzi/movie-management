@echo off
setlocal

set "REPO_ROOT=%~dp0"
set "PYTHON_EXE=%REPO_ROOT%.venv\Scripts\python.exe"
set "MANAGE_PY=%REPO_ROOT%manage.py"

if /i "%RUNSERVER_DEBUG%"=="1" (
  echo REPO_ROOT="%REPO_ROOT%"
  echo PYTHON_EXE="%PYTHON_EXE%"
  echo MANAGE_PY="%MANAGE_PY%"
)

if not exist "%PYTHON_EXE%" (
  echo Virtualenv topilmadi: "%PYTHON_EXE%"
  echo Avval venv yarating: py -m venv .venv (yoki python -m venv .venv)
  exit /b 1
)

if not exist "%MANAGE_PY%" (
  echo manage.py topilmadi: "%MANAGE_PY%"
  exit /b 1
)

pushd "%REPO_ROOT%" >nul

if "%~1"=="" (
  "%PYTHON_EXE%" "%MANAGE_PY%" runserver 127.0.0.1:8000
) else (
  "%PYTHON_EXE%" "%MANAGE_PY%" runserver %*
)

popd >nul
exit /b %ERRORLEVEL%
