#!/bin/bash

# 🧹 Script de Limpeza de Arquivos Legados
# Versão: 1.0.0
# Descrição: Remove arquivos e dependências não utilizadas na versão atual

echo "🧹 Iniciando limpeza de arquivos legados..."

# Criar diretório scripts se não existir
mkdir -p scripts

# Função para remover arquivos se existirem
remove_if_exists() {
    if [ -e "$1" ]; then
        echo "🗑️  Removendo: $1"
        rm -rf "$1"
    else
        echo "✅ Já removido: $1"
    fi
}

# Função para remover linhas específicas de arquivos
remove_lines_from_file() {
    local file="$1"
    local pattern="$2"
    if [ -f "$file" ]; then
        echo "🔧 Limpando $file..."
        grep -v "$pattern" "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
}

echo ""
echo "📂 Removendo pastas legadas..."

# Remover pastas de plataformas não utilizadas
remove_if_exists "api-backend"
remove_if_exists "simple-api"
remove_if_exists ".netlify"
remove_if_exists "netlify"
remove_if_exists "glitch"
remove_if_exists "railway"

echo ""
echo "📄 Removendo arquivos de documentação legados..."

# Remover arquivos de deploy de plataformas não utilizadas
remove_if_exists "GLITCH-DEPLOY.md"
remove_if_exists "netlify.toml"
remove_if_exists "railway.json"
remove_if_exists "glitch.json"

echo ""
echo "🔧 Limpando arquivos de configuração..."

# Limpar referências no .gitignore
if [ -f ".gitignore" ]; then
    echo "🔧 Limpando .gitignore..."
    remove_lines_from_file ".gitignore" "netlify"
    remove_lines_from_file ".gitignore" "glitch"
    remove_lines_from_file ".gitignore" "railway"
fi

echo ""
echo "📦 Verificando dependências desnecessárias..."

# Lista de dependências que devem ser removidas se encontradas
LEGACY_DEPS=(
    "@mediapipe/face_mesh"
    "@supabase/supabase-js"
    "@tensorflow-models/face-landmarks-detection"
    "@tensorflow/tfjs-backend-webgl"
    "@tensorflow/tfjs-core"
    "peerjs"
    "openai"
    "assemblyai"
    "deepgram-sdk"
)

# Verificar e avisar sobre dependências legadas no frontend
if [ -f "frontend/package.json" ]; then
    echo "🔍 Verificando frontend/package.json..."
    for dep in "${LEGACY_DEPS[@]}"; do
        if grep -q "\"$dep\"" frontend/package.json; then
            echo "⚠️  Dependência legada encontrada: $dep"
            echo "   Execute: cd frontend && npm uninstall $dep"
        fi
    done
fi

# Verificar e avisar sobre dependências legadas no backend
if [ -f "backend/package.json" ]; then
    echo "🔍 Verificando backend/package.json..."
    for dep in "${LEGACY_DEPS[@]}"; do
        if grep -q "\"$dep\"" backend/package.json; then
            echo "⚠️  Dependência legada encontrada: $dep"
            echo "   Execute: cd backend && npm uninstall $dep"
        fi
    done
fi

echo ""
echo "🔍 Verificando variáveis de ambiente legadas..."

# Lista de variáveis de ambiente legadas
LEGACY_ENV_VARS=(
    "DEEPGRAM_API_KEY"
    "ASSEMBLYAI_API_KEY"
    "WHISPER_API_KEY"
    "OPENAI_API_KEY"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "RAILWAY_"
    "NETLIFY_"
    "GLITCH_"
)

# Verificar arquivos .env
for env_file in ".env" "backend/.env" "frontend/.env" "frontend/.env.production" "api/.env"; do
    if [ -f "$env_file" ]; then
        echo "🔍 Verificando $env_file..."
        for var in "${LEGACY_ENV_VARS[@]}"; do
            if grep -q "$var" "$env_file"; then
                echo "⚠️  Variável legada encontrada em $env_file: $var"
            fi
        done
    fi
done

echo ""
echo "🧹 Limpeza concluída!"
echo ""
echo "📋 Próximos passos manuais (se necessário):"
echo "1. Reinstalar dependências limpas:"
echo "   cd frontend && rm -rf node_modules package-lock.json && npm install"
echo "   cd backend && rm -rf node_modules package-lock.json && npm install"
echo ""
echo "2. Verificar se a aplicação ainda funciona:"
echo "   npm run dev"
echo ""
echo "3. Atualizar documentação se necessário"
echo ""
echo "✅ Script de limpeza finalizado!"