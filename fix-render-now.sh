#!/bin/bash

echo "🔧 CORREÇÃO DEFINITIVA DO RENDER"
echo "================================"
echo ""

# 1. Limpar render.yaml e recriar do zero
echo "📝 Recriando render.yaml limpo..."
cat > render.yaml << 'EOF'
services:
  - type: web
    name: video-translate-backend
    env: node
    plan: free
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: FRONTEND_URL
        value: https://video-translate-app.vercel.app
    healthCheckPath: /api/health
EOF

echo "✅ render.yaml recriado"

# 2. Verificar se o backend compila localmente
echo ""
echo "🔍 Verificando build local..."
cd backend
if npm run build; then
    echo "✅ Build local funcionando"
else
    echo "❌ Erro no build local - corrigindo..."
    npm install
    npm run build
fi
cd ..

# 3. Commit e push
echo ""
echo "📤 Fazendo commit da correção..."
git add .
git commit -m "fix: clean render.yaml and force deploy $(date +%s)"
git push origin main

echo ""
echo "🎯 PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo "1. Acesse: https://dashboard.render.com/"
echo "2. DELETAR o serviço atual 'video-translate-backend'"
echo "3. Criar NOVO serviço:"
echo "   - Clique 'New +' → 'Blueprint'"
echo "   - Conecte repositório: grimmreaperb-design/video-translate-app"
echo "   - O Render detectará o render.yaml automaticamente"
echo ""
echo "⚠️  IMPORTANTE: Você DEVE deletar e recriar o serviço!"
echo "    O serviço atual tem configurações conflitantes."
echo ""
echo "🔗 Após recriar, teste: https://video-translate-backend.onrender.com/api/health"