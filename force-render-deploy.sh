#!/bin/bash

echo "🚀 Forçando deploy no Render..."
echo ""

# Verificar se render.yaml existe
if [ ! -f "render.yaml" ]; then
    echo "❌ Arquivo render.yaml não encontrado!"
    exit 1
fi

echo "✅ Arquivo render.yaml encontrado"
echo ""

# Mostrar configuração atual
echo "📋 Configuração atual do render.yaml:"
cat render.yaml
echo ""

# Fazer uma pequena alteração para forçar o deploy
echo "🔄 Adicionando timestamp para forçar deploy..."
echo "# Deploy triggered at $(date)" >> render.yaml

# Commit e push
echo "📤 Fazendo commit e push..."
git add render.yaml
git commit -m "force: trigger Render deploy with timestamp $(date +%s)"
git push origin main

echo ""
echo "✅ Deploy forçado! Aguarde alguns minutos e verifique:"
echo "🔗 GitHub Actions: https://github.com/grimmreaperb-design/video-translate-app/actions"
echo "🔗 Render Dashboard: https://dashboard.render.com/"
echo "🔗 Backend URL: https://video-translate-backend.onrender.com/api/health"

echo ""
echo "⏳ Aguardando 2 minutos antes de testar..."
sleep 120

echo "🧪 Testando endpoint..."
curl -v "https://video-translate-backend.onrender.com/api/health"