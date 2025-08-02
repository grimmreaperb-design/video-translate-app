# 🆓 Video Translate App - Setup Gratuito

## 🎯 Objetivo
MVP totalmente funcional e gratuito para validar tradução em tempo real.

## 📋 Serviços Gratuitos Utilizados

### 🔐 **Autenticação & Banco de Dados**
- **Supabase** (Gratuito)
  - 500MB de banco
  - 50,000 usuários
  - Magic link auth
  - Row Level Security

### 🧠 **Tradução**
- **LibreTranslate** (Gratuito)
  - API pública: https://libretranslate.de/
  - Sem limites de uso
- **Google Translate** (Fallback)
  - Scraping da API pública
  - Sem chaves necessárias

### 📹 **Transcrição**
- **Web Speech API** (Gratuito)
  - Navegador nativo
  - Sem limites
- **OpenAI Whisper** (Opcional)
  - $0.006/minuto
  - Fallback se necessário

### 🗣️ **TTS (Text-to-Speech)**
- **Web Speech API TTS** (Gratuito)
  - Navegador nativo
  - Vozes em múltiplos idiomas
- **ElevenLabs** (Opcional)
  - 10,000 caracteres/mês grátis
  - Vozes mais naturais

### 🖥️ **Hosting**
- **Vercel** (Frontend) - Gratuito
- **Render** (Backend) - $7/mês

## 🚀 Setup Step-by-Step

### Passo 1: Supabase (Gratuito)

#### 1.1 Criar Conta
1. Acesse: https://supabase.com/
2. Clique em "Start your project"
3. Conecte com GitHub
4. Crie novo projeto

#### 1.2 Configurar Banco
1. Vá em "SQL Editor"
2. Execute o script `supabase-schema.sql`
3. Vá em "Settings" → "API"
4. Copie:
   - Project URL
   - anon public key

#### 1.3 Configurar Auth
1. Vá em "Authentication" → "Settings"
2. Configure Site URL: `http://localhost:3000`
3. Adicione redirect URL: `http://localhost:3000/auth/callback`

### Passo 2: Render (Backend)

#### 2.1 Criar Conta
1. Acesse: https://render.com/
2. Conecte GitHub
3. Crie novo Web Service

#### 2.2 Deploy Backend
1. Selecione o repositório
2. Configure variáveis:
```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_supabase
FRONTEND_URL=https://seu-frontend.vercel.app
```

### Passo 3: Vercel (Frontend)

#### 3.1 Criar Conta
1. Acesse: https://vercel.com/
2. Conecte GitHub
3. Importe repositório

#### 3.2 Configurar Variáveis
```bash
REACT_APP_SUPABASE_URL=sua_url_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_supabase
REACT_APP_API_URL=https://video-translate-app.onrender.com/api
REACT_APP_SOCKET_URL=https://video-translate-app.onrender.com
```

## 💰 Custos Totais

| Serviço | Custo | Limite |
|---------|-------|--------|
| Supabase | $0 | 500MB DB, 50K users |
| Render | $7/mês | Web Service |
| Vercel | $0 | 100GB/mês |
| LibreTranslate | $0 | Ilimitado |
| Web Speech API | $0 | Ilimitado |
| **Total** | **$7/mês** | MVP funcional |

## 🔧 Configuração Local

### 1. Instalar Dependências
```bash
npm run install:all
```

### 2. Configurar .env
```bash
# backend/.env
SUPABASE_URL=sua_url
SUPABASE_ANON_KEY=sua_chave
FRONTEND_URL=http://localhost:3000

# frontend/.env
REACT_APP_SUPABASE_URL=sua_url
REACT_APP_SUPABASE_ANON_KEY=sua_chave
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SOCKET_URL=http://localhost:3001
```

### 3. Executar
```bash
npm run dev
```

## 🧪 Testes

### 1. Testar Autenticação
- Acesse: http://localhost:3000
- Digite email
- Verifique magic link

### 2. Testar Tradução
- Entre em sala
- Fale em português
- Verifique tradução para inglês

### 3. Testar Transcrição
- Grave áudio
- Verifique transcrição
- Teste diferentes idiomas

## 🔄 Migração para Versão Paga

### Quando Migrar
- 50,000+ usuários
- 500MB+ de dados
- Necessidade de voz mais natural

### Como Migrar
1. **Tradução**: OpenAI GPT-4
2. **Transcrição**: OpenAI Whisper
3. **TTS**: ElevenLabs Pro
4. **Hosting**: AWS/GCP
5. **Banco**: PostgreSQL dedicado

## 📊 Monitoramento

### Supabase Dashboard
- Usuários ativos
- Uso do banco
- Logs de auth

### Render Dashboard
- Logs do backend
- Uso de recursos
- Status do deploy

### Vercel Analytics
- Visitas
- Performance
- Erros

## 🐛 Troubleshooting

### Erro de CORS
```bash
# Verificar FRONTEND_URL no backend
# Verificar CORS_ORIGIN no Render
```

### Erro de Supabase
```bash
# Verificar URL e chave
# Verificar RLS policies
# Verificar auth settings
```

### Erro de Tradução
```bash
# LibreTranslate pode estar offline
# Usar Google Translate como fallback
# Verificar logs do backend
```

## 🎯 Próximos Passos

1. **Deploy inicial** com configuração básica
2. **Testes com usuários reais**
3. **Monitoramento de uso**
4. **Otimizações baseadas em feedback**
5. **Migração para serviços pagos** (se necessário)

---

**🎉 MVP gratuito e funcional!**