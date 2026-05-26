@echo off
TITLE E.M.M.A. Single-Click Launcher
echo ==================================================
echo   E.M.M.A. SYSTEM DASHBOARD - INITIALIZATION
echo ==================================================
echo.
echo [1/2] Installing Node.js Dependencies...
call npm install
echo.
echo [2/2] Booting Desktop Framework and Server...
call npm run dev
pause
