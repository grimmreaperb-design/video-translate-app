#!/bin/bash

echo "🔍 Verificando status do deploy no Render..."
echo ""

# Verificar se o GitHub Action foi executado
echo "📋 Últimos commits:"
git log --oneline -5

echo ""
echo "🌐 Testando conectividade com o Render:"

# Testar diferentes endpoints
endpoints=(
    "https://video-translate-backend.onrender.com"
    "https://video-translate-backend.onrender.com/api/health"
    "https://video-translate-backend.onrender.com/health"
)

for endpoint in "${endpoints[@]}"; do
    echo "Testing: $endpoint"
    response=$(curl -s -w "HTTP_CODE:%{http_code}" "$endpoint")
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    echo "  Status: $http_code"
    echo "  Response: $body"
    echo ""
done

echo "🔧 Para resolver o problema:"
echo "1. Verifique se os secrets RENDER_SERVICE_ID e RENDER_API_KEY estão configurados no GitHub"
echo "2. Acesse: https://github.com/grimmreaperb-design/video-translate-app/settings/secrets/actions"
echo "3. Verifique o status do GitHub Action em: https://github.com/grimmreaperb-design/video-translate-app/actions"
echo "4. Se necessário, acesse o dashboard do Render: https://dashboard.render.com/"