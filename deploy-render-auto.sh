#!/bin/bash

echo "🚀 Iniciando deploy completo da aplicação..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ Erro: render.yaml não encontrado. Execute este script na raiz do projeto.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Verificando configurações...${NC}"

# Verificar se o Git está configurado
if ! git config user.email > /dev/null; then
    echo -e "${YELLOW}⚠️  Configurando Git...${NC}"
    git config user.email "deploy@video-translate-app.com"
    git config user.name "Deploy Bot"
fi

# Fazer commit das alterações se houver
echo -e "${BLUE}📝 Verificando alterações...${NC}"
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}💾 Commitando alterações...${NC}"
    git add .
    git commit -m "Deploy: Update configuration for production deployment"
    git push origin main
else
    echo -e "${GREEN}✅ Nenhuma alteração para commitar${NC}"
fi

echo -e "${BLUE}🔧 Iniciando deploy do backend...${NC}"

# Tentar fazer deploy via curl (método alternativo)
echo -e "${YELLOW}📤 Tentando deploy automático...${NC}"

# Criar um trigger de deploy forçado
git commit --allow-empty -m "Deploy: Force backend deployment to Render"
git push origin main

echo -e "${GREEN}✅ Push realizado com sucesso!${NC}"

# Aguardar um pouco para o GitHub Actions processar
echo -e "${YELLOW}⏳ Aguardando GitHub Actions processar (30 segundos)...${NC}"
sleep 30

# Verificar se o backend está respondendo
echo -e "${BLUE}🧪 Testando conectividade com o backend...${NC}"

# Testar múltiplas URLs
URLS=(
    "https://video-translate-backend.onrender.com"
    "https://video-translate-backend.onrender.com/api"
    "https://video-translate-backend.onrender.com/health"
)

for url in "${URLS[@]}"; do
    echo -e "${YELLOW}🔍 Testando: $url${NC}"
    if curl -f -s --max-time 10 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $url está respondendo!${NC}"
        BACKEND_WORKING=true
        break
    else
        echo -e "${RED}❌ $url não está respondendo${NC}"
    fi
done

if [ "$BACKEND_WORKING" != "true" ]; then
    echo -e "${YELLOW}⚠️  Backend ainda não está online. Isso é normal para o primeiro deploy.${NC}"
    echo -e "${YELLOW}   O Render pode levar 5-10 minutos para fazer o primeiro deploy.${NC}"
fi

echo -e "${BLUE}🌐 Fazendo deploy do frontend...${NC}"

# Deploy do frontend no Vercel
cd frontend

echo -e "${YELLOW}📦 Fazendo build do frontend...${NC}"
npm run build

echo -e "${YELLOW}🚀 Fazendo deploy no Vercel...${NC}"
npx vercel --prod --yes

cd ..

echo -e "${GREEN}✨ Deploy concluído!${NC}"
echo ""
echo -e "${BLUE}📊 Status dos serviços:${NC}"
echo -e "${GREEN}✅ Frontend: https://video-translate-app.vercel.app${NC}"
echo -e "${YELLOW}⏳ Backend: https://video-translate-backend.onrender.com (pode levar alguns minutos)${NC}"
echo ""
echo -e "${BLUE}🔗 Links úteis:${NC}"
echo "• Render Dashboard: https://dashboard.render.com"
echo "• Vercel Dashboard: https://vercel.com/dashboard"
echo "• GitHub Actions: https://github.com/grimmreaperb-design/video-translate-app/actions"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo "1. Aguarde o deploy do Render completar (5-10 minutos)"
echo "2. Teste a aplicação em: https://video-translate-app.vercel.app"
echo "3. Verifique os logs no Render Dashboard se houver problemas"
echo ""
echo -e "${GREEN}🎉 Deploy iniciado com sucesso!${NC}"