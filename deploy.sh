#!/bin/bash

echo "🚀 Video Translate App - Deploy Script"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "📋 Checklist de Pré-requisitos:"
echo "================================"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "Node.js encontrado: $NODE_VERSION"
else
    print_error "Node.js não encontrado. Instale Node.js 16+ primeiro."
    exit 1
fi

# Check npm
if command_exists npm; then
    print_status "npm encontrado"
else
    print_error "npm não encontrado"
    exit 1
fi

# Check Git
if command_exists git; then
    print_status "Git encontrado"
else
    print_error "Git não encontrado"
    exit 1
fi

echo ""
echo "🔧 Preparando o projeto..."
echo "=========================="

# Install dependencies
print_status "Instalando dependências..."
npm run install:all

# Build backend
print_status "Buildando backend..."
cd backend
npm run build
cd ..

# Build frontend
print_status "Buildando frontend..."
cd frontend
npm run build
cd ..

echo ""
echo "🚀 Opções de Deploy:"
echo "===================="
echo "1. Deploy Manual (Render + Vercel)"
echo "2. Deploy com Render"
echo "3. Deploy com Vercel CLI"
echo "4. Apenas verificar configurações"
echo ""

read -p "Escolha uma opção (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📋 Deploy Manual - Instruções:"
        echo "=============================="
        echo ""
        echo "1. Backend (Render):"
        echo "   - Acesse: https://render.com/"
        echo "   - Conecte seu GitHub"
        echo "   - Deploy do repositório"
        echo "   - Configure variáveis de ambiente:"
        echo "     NODE_ENV=production"
        echo "     PORT=3001"
        echo "     SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co"
        echo "     SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA"
        echo "     FRONTEND_URL=https://video-translate-app.vercel.app"
        echo ""
        echo "2. Frontend (Vercel):"
        echo "   - Acesse: https://vercel.com/"
        echo "   - Conecte seu GitHub"
        echo "   - Deploy do repositório"
        echo "   - Configure variáveis de ambiente:"
        echo "     REACT_APP_API_URL=https://video-translate-app.vercel.app/api"
        echo "     REACT_APP_SOCKET_URL=https://video-translate-app.vercel.app"
        echo "     REACT_APP_SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co"
        echo "     REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA"
        echo ""
        echo "3. Teste após deploy:"
        echo "   - curl https://video-translate-app.vercel.app/api/health"
        echo "   - Acesse: https://video-translate-app.vercel.app"
        ;;
    2)
        echo ""
        echo "🚀 Deploy com Render..."
        echo "Acesse https://render.com/ e faça o deploy manual"
        echo "Configure as variáveis de ambiente conforme documentação"
        ;;
    3)
        echo ""
        echo "🚀 Deploy com Vercel CLI..."
        if command_exists vercel; then
            print_status "Vercel CLI encontrado"
            vercel login
            vercel --prod
        else
            print_warning "Vercel CLI não encontrado"
            echo "Instalando Vercel CLI..."
            npm install -g vercel
            vercel login
            vercel --prod
        fi
        ;;
    4)
        echo ""
        echo "🔍 Verificando configurações..."
        echo "=============================="
        
        # Check backend build
        if [ -d "backend/dist" ]; then
            print_status "Backend build encontrado"
        else
            print_error "Backend build não encontrado"
        fi
        
        # Check frontend build
        if [ -d "frontend/build" ]; then
            print_status "Frontend build encontrado"
        else
            print_error "Frontend build não encontrado"
        fi
        
        # Check environment files
        if [ -f "backend/.env" ]; then
            print_status "Backend .env encontrado"
        else
            print_warning "Backend .env não encontrado"
        fi
        
        echo ""
        echo "📋 Próximos passos:"
        echo "1. Configure sua OpenAI API Key"
        echo "2. Deploy no Render (backend)"
        echo "3. Deploy no Vercel (frontend)"
        echo "4. Configure variáveis de ambiente"
        echo "5. Teste a aplicação"
        ;;
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deploy concluído!"
echo ""
echo "📚 Documentação:"
echo "- DEPLOY.md - Guia completo de deploy"
echo "- SETUP.md - Configuração local"
echo "- README.md - Documentação geral"
echo ""
echo "🔗 Links úteis:"
echo "- Vercel: https://vercel.com/"
echo "- Supabase: https://supabase.com/"
echo "- LibreTranslate: https://libretranslate.com/"
echo "- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API"