@echo off
title Push to GitHub - Churn Prediction
cd /d "%~dp0"
echo ===============================================================================
echo            PUSHING ENTERPRISE CHURN FORENSICS TO GITHUB
echo ===============================================================================
echo.
echo Executing: git push -u origin main
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ===============================================================================
    echo SUCCESS: Repository successfully updated on GitHub!
    echo Remote: https://github.com/Dhruv000000/Churn-Prediction
    echo ===============================================================================
) else (
    echo ===============================================================================
    echo If prompted, please enter your GitHub Personal Access Token (PAT) or sign in.
    echo ===============================================================================
)
pause
