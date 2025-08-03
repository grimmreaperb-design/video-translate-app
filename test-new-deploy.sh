#!/bin/bash

echo "🧪 TESTANDO NOVO DEPLOY DO RENDER"
echo "================================="
echo ""

# URL do novo serviço
URL="https://video-translate-backend.onrender.com"

echo "🔍 Testando conectividade básica..."
if curl -s --connect-timeout 10 "$URL" > /dev/null; then
    echo "✅ Serviço acessível"
else
    echo "❌ Serviço não acessível ainda"
    echo "⏳ Aguarde mais alguns minutos..."
    exit 1
fi

echo ""
echo "🏥 Testando health check..."
HEALTH_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" "$URL/api/health")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Status HTTP: $HTTP_STATUS"
echo "Resposta: $BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "🎉 SUCESSO! Deploy funcionando perfeitamente!"
    echo "✅ Backend acessível em: $URL"
    echo "✅ Health check OK: $URL/api/health"
    echo ""
    echo "🔗 URLs importantes:"
    echo "   • Health Check: $URL/api/health"
    echo "   • Dashboard: https://dashboard.render.com/"
    echo ""
    echo "🚀 Seu backend está pronto para uso!"
else
    echo ""
    echo "⚠️  Deploy ainda não completou ou há erro"
    echo "💡 Verifique os logs no Dashboard do Render"
    echo "🔄 Tente novamente em alguns minutos"
fi