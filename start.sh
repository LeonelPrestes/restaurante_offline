#!/bin/bash

# Script de inicialização do Sistema Restaurante Offline
# Para Linux/macOS

echo "🍽️  Iniciando Sistema Restaurante Offline..."
echo "=========================================="

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale o Node.js primeiro."
    echo "   Visite: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Navegar para o diretório do backend
cd "$(dirname "$0")/backend" || {
    echo "❌ Erro: Diretório backend não encontrado"
    exit 1
}

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
fi

# Verificar se a porta 3000 está livre
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Porta 3000 já está em uso"
    echo "   Tentando encerrar processo existente..."
    pkill -f "node server.js" 2>/dev/null
    sleep 2
fi

# Obter IP local
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

echo ""
echo "🚀 Iniciando servidor..."
echo "   Local: http://localhost:3000"
if [ ! -z "$LOCAL_IP" ]; then
    echo "   Rede:  http://$LOCAL_IP:3000"
fi
echo ""
echo "📱 Para acessar de dispositivos móveis:"
echo "   Conecte à mesma rede Wi-Fi e acesse:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "🖨️  Para configurar a impressora:"
echo "   npm run setup-printer"
echo ""
echo "⏹️  Para parar o servidor: Ctrl+C"
echo "=========================================="
echo ""

# Iniciar o servidor
node server.js

