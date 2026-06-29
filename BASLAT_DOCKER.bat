@echo off
chcp 65001 >nul
title ALTU Hukuk Buro Yonetim Sistemi - Docker Baslatici
echo =======================================================
echo     ALTU DOCKER HIZMET VE YAPAY ZEKA BASLATICI
echo =======================================================
echo.

:: 1. DOCKER KONTROLU
echo [DOCKER] Docker servisi kontrol ediliyor...
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Docker calismiyor veya bulunamadi!
    echo Lutfen Docker Desktop uygulamasinin acik oldugundan emin olun.
    goto ERROR_EXIT
)
echo [DOCKER] Docker calisiyor.

:: 2. DOCKER COMPOSE UYGULAMASINI BASLAT
echo [DOCKER] Servisler insa ediliyor ve baslatiliyor (docker-compose)...
docker compose up --build
if errorlevel 1 (
    echo [HATA] Docker konteynerleri baslatilamadi!
    goto ERROR_EXIT
)

goto EXIT

:ERROR_EXIT
echo.
echo Bir hata olustu veya servis durduruldu. Pencerenin kapanmamasi icin bekletiliyor.
pause

:EXIT
