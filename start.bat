@echo off
title POS Barbershop Bot
cd /d "%~dp0"

REM === Guard: cegah start dobel ===
pm2 describe bot-kasir >nul 2>&1
if %errorlevel%==0 (
    echo [!] Bot "bot-kasir" sudah berjalan.
    echo     Gunakan restart.bat untuk memuat ulang.
    pause
    exit /b 1
)

echo [*] Memulai bot...
pm2 start server.js --name bot-kasir --time

echo.
echo [OK] Bot berjalan. Menampilkan log... (tekan Ctrl+C untuk keluar, bot tetap jalan)
pm2 logs bot-kasir
