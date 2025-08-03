#!/bin/bash

echo "🔍 Diagnóstico do Deploy no Render"
echo "=================================="
echo ""

echo "📋 Testando conectividade..."
echo "1. Endpoint principal:"
curl -s -w "Status: %{http_code}\n" "https://video-translate-backend.onrender.com" -o /dev/null

echo "2. Health check:"
curl -s -w "Status: %{http_code}\n" "https://video-translate-backend.onrender.com/api/health" -o /dev/null

echo "3. Health alternativo:"
curl -s -w "Status: %{http_code}\n" "https://video-translate-backend.onrender.com/health" -o /dev/null

echo ""
echo "🔧 Verificações necessárias no Dashboard:"
echo "1. Acesse: https://dashboard.render.com/"
echo "2. Procure por: video-translate-backend"
echo "3. Verifique:"
echo "   - Status: deve estar 'Live' (verde)"
echo "   - Logs: procure por erros de build ou runtime"
echo "   - Settings: confirme as configurações"
echo ""

echo "⚙️ Configurações esperadas:"
echo "- Environment: Node"
echo "- Root Directory: backend"
echo "- Build Command: npm install && npm run build"
echo "- Start Command: npm start"
echo "- Health Check Path: /api/health"
echo ""

echo "🌍 Variáveis de ambiente necessárias:"
echo "- NODE_ENV = production"
echo "- PORT = 10000"
echo "- FRONTEND_URL = https://video-translate-app.vercel.app"
echo ""

echo "💡 Se o problema persistir:"
echo "1. Tente 'Clear build cache & deploy'"
echo "2. Verifique se o repositório está conectado"
echo "3. Confirme se o branch 'main' está selecionado"