#!/bin/bash

echo "🚀 Deploying Backend to Railway..."

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI não encontrado. Instalando..."
    npm install -g @railway/cli
fi

# Navegar para o diretório do backend
cd backend

# Fazer login no Railway (se necessário)
echo "🔐 Fazendo login no Railway..."
railway login

# Fazer deploy
echo "📦 Fazendo deploy do backend..."
railway up

echo "✅ Deploy do backend concluído!"
echo "🔗 Acesse: https://railway.app/dashboard para ver o status"

cd ..