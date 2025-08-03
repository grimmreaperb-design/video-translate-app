#!/bin/bash

echo "🚀 Iniciando deploy automático no Render..."

# Verificar se estamos no diretório correto
if [ ! -f "render.yaml" ]; then
    echo "❌ Erro: render.yaml não encontrado. Execute este script na raiz do projeto."
    exit 1
fi

# Verificar se o Git está configurado
if ! git config user.email > /dev/null; then
    echo "⚠️  Configurando Git..."
    git config user.email "deploy@video-translate-app.com"
    git config user.name "Deploy Bot"
fi

# Fazer commit das alterações se houver
echo "📝 Verificando alterações..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "💾 Commitando alterações..."
    git add .
    git commit -m "Deploy: Update configuration for Render deployment"
else
    echo "✅ Nenhuma alteração para commitar"
fi

# Push para o repositório
echo "📤 Fazendo push para o repositório..."
git push origin main

echo "🎯 Deploy iniciado! Próximos passos:"
echo ""
echo "1. Acesse: https://dashboard.render.com"
echo "2. Clique em 'New +' > 'Web Service'"
echo "3. Conecte seu repositório GitHub"
echo "4. Configure o serviço:"
echo "   - Name: video-translate-backend"
echo "   - Environment: Node"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm start"
echo "   - Auto-Deploy: Yes"
echo ""
echo "5. Adicione as variáveis de ambiente:"
echo "   - NODE_ENV=production"
echo "   - PORT=10000"
echo "   - FRONTEND_URL=https://video-translate-app.vercel.app"
echo ""
echo "6. Aguarde o deploy completar"
echo ""
echo "🔗 URL esperada: https://video-translate-backend.onrender.com"

# Verificar se o backend está respondendo (após alguns minutos)
echo ""
echo "⏳ Aguardando 30 segundos antes de testar..."
sleep 30

echo "🧪 Testando backend do Render..."
if curl -f -s "https://video-translate-backend.onrender.com" > /dev/null; then
    echo "✅ Backend do Render está respondendo!"
else
    echo "⚠️  Backend ainda não está respondendo. Pode levar alguns minutos para ficar online."
fi

echo ""
echo "✨ Deploy concluído! Verifique o status em: https://dashboard.render.com"