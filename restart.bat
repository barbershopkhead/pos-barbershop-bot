@echo off
title Restart Bot Kasir
cd /d "%~dp0"

echo [*] Menghentikan bot...
pm2 stop bot-kasir >nul 2>&1

REM === Matikan Chrome zombie milik sesi bot ===
REM (dijalankan SETELAH pm2 stop, jadi yang nyangkut hampir pasti milik bot)
taskkill /f /im chrome.exe >nul 2>&1

REM === Bersihkan lockfile sesi WhatsApp (cegah gagal reconnect) ===
if exist ".wwebjs_auth\session-barbershop-bot\SingletonLock" (
    del /f /q ".wwebjs_auth\session-barbershop-bot\SingletonLock" >nul 2>&1
)

echo [*] Memulai ulang bot...
pm2 describe bot-kasir >nul 2>&1
if %errorlevel%==0 (
    pm2 restart bot-kasir --update-env
) else (
    echo [!] Proses belum terdaftar di PM2, melakukan start baru...
    pm2 start server.js --name bot-kasir --time
)

echo.
echo [OK] Bot di-restart.
pause
