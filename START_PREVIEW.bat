@echo off
cd /d "%~dp0"
start "Passenger Intel Local Server" /min cmd /k "cd /d ""%~dp0"" && npm run dev"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8765"
pause
