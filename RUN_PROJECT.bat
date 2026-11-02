@echo off
title Enterprise Churn Forensics - Launcher
color 0b

echo ===============================================================================
echo      ENTERPRISE CHURN FORENSICS ^& PREDICTIVE RETENTION WAREHOUSE
echo ===============================================================================
echo.

set "PY_EXEC=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_EXEC=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0backend\venv\Scripts\python.exe" (
    set "PY_EXEC=%~dp0backend\venv\Scripts\python.exe"
)

echo [1/3] Starting FastAPI Analytical Backend on Port 8000...
start "Churn Forensics - Backend API (Port 8000)" cmd /k "cd /d "%~dp0backend" && "%PY_EXEC%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting React Executive Dashboard on Port 5173...
start "Churn Forensics - Frontend Dashboard (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 4 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ===============================================================================
echo All services launched successfully!
echo   * Frontend Dashboard: http://localhost:5173
echo   * Backend REST API:   http://127.0.0.1:8000
echo   * Interactive Docs:   http://127.0.0.1:8000/docs
echo ===============================================================================
echo Keep the backend and frontend terminal windows open while using the application.
pause
