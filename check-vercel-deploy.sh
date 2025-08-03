#!/bin/bash

echo "🔍 VERIFICANDO DEPLOY DO VERCEL"
echo "==============================="
echo ""

FRONTEND_URL="https://video-translate-app.vercel.app"
EXPECTED_BACKEND="video-translate-backend-wv9b.onrender.com"

echo "🌐 Testando frontend..."
HEADERS=$(curl -sI "$FRONTEND_URL")

if echo "$HEADERS" | grep -q "HTTP/2 200"; then
    echo "✅ Frontend acessível"
    
    echo ""
    echo "🔍 Verificando configuração do backend..."
    CSP=$(echo "$HEADERS" | grep -i "content-security-policy" || echo "")
    
    if echo "$CSP" | grep -q "$EXPECTED_BACKEND"; then
        echo "✅ SUCESSO! Vercel atualizou com a URL correta do backend"
        echo "🎉 Deploy completo e funcionando!"
        echo ""
        echo "🔗 URLs finais:"
        echo "   • Frontend: $FRONTEND_URL"
        echo "   • Backend: https://$EXPECTED_BACKEND"
        echo ""
        echo "🧪 Teste a aplicação completa agora!"
    else
        echo "⏳ Vercel ainda não atualizou..."
        echo "💡 A URL antiga ainda está no cache"
        echo "🔄 Aguarde mais 1-2 minutos e tente novamente"
        echo ""
        echo "📋 Para verificar manualmente:"
        echo "   curl -I $FRONTEND_URL | grep content-security-policy"
    fi
else
    echo "❌ Frontend não acessível"
    echo "🔄 Aguarde o deploy completar"
fi