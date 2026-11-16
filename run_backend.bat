@echo off
title ReelRecall AI - Backend Server
echo ========================================================
echo   ReelRecall AI - Local Search & Suggestion Engine
echo ========================================================
echo Starting server on http://127.0.0.1:8000 ...
cd /d "%~dp0backend"
python server.py
pause
