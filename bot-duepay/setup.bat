@echo off
REM === Setup do bot DuePay (Windows) ===
echo ========================================
echo  Setup do Bot DuePay
echo ========================================
echo.

REM Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale Python 3.11+ de python.org
    echo        Marque a opcao "Add Python to PATH" na instalacao.
    pause
    exit /b 1
)

REM Cria venv
if not exist ".venv" (
    echo Criando ambiente virtual...
    python -m venv .venv
)

REM Ativa venv
call .venv\Scripts\activate.bat

REM Instala deps
echo Instalando dependencias...
pip install --upgrade pip >nul
pip install -r requirements.txt

REM Baixa Chromium do Playwright
echo Baixando Chromium do Playwright (pode demorar)...
playwright install chromium

REM Cria .env se nao existir
if not exist ".env" (
    echo.
    echo Criando .env a partir de .env.example...
    copy .env.example .env >nul
    echo.
    echo ========================================
    echo  PROXIMO PASSO:
    echo  1. Abra o arquivo .env num editor
    echo  2. Preencha SITE_URL, BOT_TOKEN, TLN_USERNAME, TLN_PASSWORD
    echo  3. Rode run.bat
    echo ========================================
)

echo.
echo Setup concluido!
pause
