@echo off
chcp 65001 >nul

REM Script de inicialização do Sistema Restaurante Offline
REM Para Windows

echo 🍽️  Iniciando Sistema Restaurante Offline...
echo ==========================================

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Por favor, instale o Node.js primeiro.
    echo    Visite: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
node --version

REM Navegar para o diretório do backend
cd /d "%~dp0backend"
if %errorlevel% neq 0 (
    echo ❌ Erro: Diretório backend não encontrado
    pause
    exit /b 1
)

REM Verificar se as dependências estão instaladas
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
)

REM Verificar se a porta 3000 está livre
netstat -an | find ":3000" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Porta 3000 já está em uso
    echo    Tentando encerrar processo existente...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 >nul
)

REM Obter IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set LOCAL_IP=%%b
)

echo.
echo 🚀 Iniciando servidor...
echo    Local: http://localhost:3000
if defined LOCAL_IP echo    Rede:  http://%LOCAL_IP%:3000
echo.
echo 📱 Para acessar de dispositivos móveis:
echo    Conecte à mesma rede Wi-Fi e acesse:
if defined LOCAL_IP echo    http://%LOCAL_IP%:3000
echo.
echo 🖨️  Para configurar a impressora:
echo    npm run setup-printer
echo.
echo ⏹️  Para parar o servidor: Ctrl+C
echo ==========================================
echo.

REM Iniciar o servidor
node server.js

pause

