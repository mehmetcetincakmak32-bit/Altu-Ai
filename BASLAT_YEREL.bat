@echo off
chcp 65001 >nul
title ALTU Hukuk Buro Yonetim Sistemi - Baslatici
echo =======================================================
echo     ALTU YEREL HIZMET VE YAPAY ZEKA BASLATICI
echo =======================================================
echo.

:: 1. OLLAMA SERVISINI ATLA (DEVRE DISI)
echo [OLLAMA] Ollama devre disi birakildi.
goto python_ok

:: 2. PYTHON BULMA VE YAPILANDIRMA
set PYTHON_PATH=python
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

rem Coklu dizinlerde python.exe yi kontrol et
set PYTHON_PATH="C:\Users\acer\AppData\Local\Python\pythoncore-3.14-64\python.exe"
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

set PYTHON_PATH="%USERPROFILE%\AppData\Local\Programs\Python\Python314\python.exe"
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

set PYTHON_PATH="%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe"
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

set PYTHON_PATH="%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe"
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

set PYTHON_PATH="%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe"
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

set PYTHON_PATH="%USERPROFILE%\AppData\Local\Programs\Python\Python310\python.exe"
%PYTHON_PATH% --version >nul 2>nul
if %errorlevel% equ 0 goto python_ok

echo [HATA] Python bilgisayarinizda bulunamadi!
echo Lutfen Python in yuklu oldugundan emin olun.
goto ERROR_EXIT

:python_ok
echo [PYTHON] Kullanilacak Python yolu: %PYTHON_PATH%

:: 3. PYTHON BACKEND HAZIRLIGI
echo [PYTHON] python-backend dizinine giriliyor...
if not exist python-backend (
    echo [HATA] python-backend dizini bulunamadi!
    goto ERROR_EXIT
)

cd python-backend

if not exist .venv (
    echo [PYTHON] Sanal ortam -venv- olusturuluyor...
    %PYTHON_PATH% -m venv .venv
    if errorlevel 1 (
        echo [HATA] .venv sanal ortam olusturulamadi!
        goto ERROR_EXIT
    )
)

echo [PYTHON] Bagimliliklar yukleniyor...
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 (
    echo [UYARI] pip guncellenemedi, devam ediliyor...
)

.venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 (
    echo [UYARI] Bazi python kutuphaneleri yuklenirken hata olustu, devam ediliyor...
)

echo [PYTHON] Hazir veri setleri tohumlaniyor (Seeding)...
.venv\Scripts\python.exe seed_datasets.py
if errorlevel 1 (
    echo [UYARI] Tohumlama sirasinda hata olustu, devam ediliyor...
)

echo [MCP] MCP Yoneticisi baslatiliyor...
.venv\Scripts\python.exe mcp_manager.py start
if errorlevel 1 (
    echo [UYARI] MCP Yoneticisi baslatilirken hata olustu, devam ediliyor...
)

echo [PYTHON] Backend sunucusu yeni pencerede baslatiliyor...
start "ALTU Yapay Zeka Backend" cmd /k ".venv\Scripts\python.exe main.py"

cd ..

:: 4. NODEJS & FRONTEND HAZIRLIGI
echo [NODE] Node paketleri kontrol ediliyor...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js veya npm bulunamadi! Lutfen Node.js yukleyin.
    goto ERROR_EXIT
)

if not exist node_modules (
    echo [NODE] node_modules paketleri yukleniyor...
    call npm install
    if errorlevel 1 (
        echo [HATA] npm paketleri yuklenemedi!
        goto ERROR_EXIT
    )
)

echo [DATABASE] Prisma veritabani semasi esitleniyor...
call npx prisma db push
if errorlevel 1 (
    echo [HATA] Prisma veritabani esitlemesi basarisiz!
    goto ERROR_EXIT
)

echo.
echo =======================================================
echo   SISTEM CALISMAYA HAZIR!
echo   Tarayicinizda: http://localhost:3215
echo =======================================================
echo.

call npm run dev
if errorlevel 1 (
    echo [HATA] Next.js frontend sunucusu baslatilamadi!
    goto ERROR_EXIT
)

:ERROR_EXIT
echo.
echo Bir hata olustu veya servis durduruldu. Pencerenin kapanmamasi icin bekletiliyor.
pause
