@echo off
REM === Roda o bot DuePay ===
cd /d "%~dp0"

if not exist ".venv\Scripts\activate.bat" (
    echo Ambiente virtual nao encontrado. Rode setup.bat primeiro.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
python main.py
