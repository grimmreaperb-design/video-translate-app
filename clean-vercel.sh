#!/bin/bash

echo "🧹 Limpando deployment do Vercel..."

# Verificar se vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

# Fazer login no Vercel (se necessário)
echo "🔐 Fazendo login no Vercel..."
vercel login

# Listar projetos
echo "📋 Listando projetos no Vercel..."
vercel list

# Remover projeto específico (você pode ajustar o nome)
echo "🗑️  Para remover um projeto específico, use:"
echo "vercel remove [project-name]"

echo "✅ Script de limpeza do Vercel concluído!"
echo "💡 Execute 'vercel remove [nome-do-projeto]' para remover um projeto específico"