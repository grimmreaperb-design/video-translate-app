#!/bin/bash

# Cores para mensagens
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${YELLOW}Iniciando deploy do MVP Video Translate App no Vercel...${NC}\n"

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null
then
    echo -e "${YELLOW}Vercel CLI não encontrado. Instalando...${NC}"
    npm install -g vercel
fi

# Verificar se o usuário está logado no Vercel
echo -e "${YELLOW}Verificando login no Vercel...${NC}"
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Fazendo login no Vercel...${NC}"
    vercel login
fi

# Instalar dependências
echo -e "${YELLOW}Instalando dependências...${NC}"
npm run install:all

# Construir o frontend
echo -e "${YELLOW}Construindo o frontend...${NC}"
cd frontend && npm run build && cd ..

# Deploy no Vercel
echo -e "${YELLOW}Fazendo deploy no Vercel...${NC}"
vercel --prod

# Verificar se o deploy foi bem-sucedido
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Deploy concluído com sucesso!${NC}"
    echo -e "${GREEN}Seu MVP está disponível em: https://video-translate-app.vercel.app${NC}"
    echo -e "\n${YELLOW}Próximos passos:${NC}"
    echo -e "1. Acesse o painel do Vercel para verificar o status do deploy"
    echo -e "2. Configure as variáveis de ambiente no painel do Vercel se necessário"
    echo -e "3. Teste o aplicativo acessando a URL do deploy"
    echo -e "\n${YELLOW}Observações:${NC}"
    echo -e "- O backend está rodando como serverless functions no Vercel"
    echo -e "- O frontend está hospedado como site estático no Vercel"
    echo -e "- Os dados estão armazenados no Supabase (plano gratuito)"
    echo -e "- A tradução está utilizando LibreTranslate (endpoint público gratuito)"
    echo -e "- A transcrição está utilizando Web Speech API (gratuito)"
    echo -e "- A síntese de voz está utilizando Web Speech API TTS (gratuito)"
    echo -e "- A comunicação em tempo real está utilizando Socket.IO e PeerJS (hospedados no Vercel)"
    echo -e "\n${YELLOW}Suporte:${NC}"
    echo -e "Se encontrar problemas, verifique os logs no painel do Vercel"
    echo -e "Para mais informações, consulte o arquivo VERCEL-DEPLOY.md"
else
    echo -e "\n${RED}Erro no deploy. Verifique os logs acima para mais informações.${NC}"
fi