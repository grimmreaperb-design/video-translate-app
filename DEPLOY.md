# 🚀 Guia de Deploy - Video Translate App (MVP Gratuito)

## 📋 Checklist de Serviços Necessários

### 🔑 Serviços Gratuitos
- [ ] **Supabase** - Para autenticação e banco de dados - https://supabase.com/
- [ ] **Vercel** - Para hosting do frontend e backend - https://vercel.com/
- [ ] **LibreTranslate** - Para tradução (endpoint público) - https://libretranslate.com/
- [ ] **Web Speech API** - Para transcrição e síntese de voz (nativo do navegador)

## 🚀 Deploy Step-by-Step

### Passo 1: Configurar Supabase
1. Acesse: https://supabase.com/
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Obtenha a URL e a Anon Key do projeto
5. **Custo estimado**: $0 (plano gratuito)

### Passo 2: Preparar o Projeto para Deploy

#### 2.1 Instalar Dependências
```bash
npm run install:all
```

#### 2.2 Construir o Frontend
```bash
cd frontend && npm run build && cd ..
```

#### 2.3 Verificar Arquivos de Configuração

Certifique-se de que os seguintes arquivos estão configurados corretamente:

- **vercel.json** - Configuração do Vercel
- **api/.env** - Variáveis de ambiente para o backend
- **frontend/.env.production** - Variáveis de ambiente para o frontend

Exemplo de configuração do vercel.json:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.ts"
    },
    {
      "src": "/socket.io/(.*)",
      "dest": "api/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/build/$1"
    }
  ],
  "env": {
    "FRONTEND_URL": "https://video-translate-app.vercel.app"
  }
}
```

### Passo 3: Deploy no Vercel

#### 3.1 Deploy via CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### 3.2 Deploy via Dashboard
1. Acesse: https://vercel.com/
2. Conecte seu GitHub
3. Clique em "New Project"
4. Selecione o repositório
5. Configure as variáveis de ambiente:

```bash
# Vercel Environment Variables
SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA
FRONTEND_URL=https://video-translate-app.vercel.app
REACT_APP_API_URL=https://video-translate-app.vercel.app/api
REACT_APP_SOCKET_URL=https://video-translate-app.vercel.app
REACT_APP_SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA
```

### Passo 4: Verificar o Deploy

#### 4.1 Verificar API
```bash
curl https://video-translate-app.vercel.app/api/health
```

#### 4.2 Verificar Frontend
1. Acesse: https://video-translate-app.vercel.app
2. Teste o login e as funcionalidades básicas

#### 4.3 Verificar Logs
1. Acesse o dashboard do Vercel
2. Vá para a seção "Deployments"
3. Clique no deployment mais recente
4. Vá para a aba "Functions" para verificar os logs das serverless functions

## 💰 Custos Estimados

### APIs
- **OpenAI API**: $10-50/mês (dependendo do uso)
- **Google Cloud** (alternativa): $5-30/mês

### Hosting
- **Render**: $7/mês (Web Service)
- **Vercel**: Gratuito (até 100GB/mês)
- **MongoDB Atlas**: Gratuito (até 512MB)

### Total Estimado: $15-70/mês

## 🔧 Configurações de Produção

### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=sk-your-key-here
CORS_ORIGIN=https://your-frontend.vercel.app
MONGODB_URI=mongodb+srv://...
```

### Frontend (.env)
```bash
REACT_APP_API_URL=https://video-translate-app.onrender.com/api
REACT_APP_SOCKET_URL=https://video-translate-app.onrender.com
```

## 🧪 Testes Pós-Deploy

### 1. Testar Backend
```bash
curl https://video-translate-app.onrender.com/health
curl https://video-translate-app.onrender.com/api/onboarding/languages
```

### 2. Testar Frontend
- Acesse: https://your-frontend.vercel.app
- Complete o onboarding
- Teste a criação de salas
- Teste a gravação de áudio

### 3. Testar Integração
- Abra em 2 navegadores diferentes
- Entre na mesma sala
- Teste a tradução em tempo real

## 🐛 Troubleshooting

### Backend não responde
```bash
# Verificar logs no Render
# Acesse o dashboard do Render para ver os logs

# Verificar variáveis de ambiente no Render dashboard
```

### Frontend não conecta
```bash
# Verificar URLs no console do navegador
# Verificar CORS no backend
# Verificar variáveis de ambiente no Vercel
```

### Erro de OpenAI
```bash
# Verificar API key
# Verificar créditos na conta OpenAI
# Verificar limites de rate
```

## 📊 Monitoramento

### Render Dashboard
- Logs em tempo real
- Métricas de uso
- Status do serviço

### Vercel Dashboard
- Analytics de visitantes
- Performance
- Deploy status

### OpenAI Dashboard
- Uso de tokens
- Custos
- Rate limits

## 🔒 Segurança

### Variáveis de Ambiente
- Nunca commite API keys
- Use variáveis de ambiente do Render/Vercel
- Rotacione keys regularmente

### CORS
- Configure apenas domínios necessários
- Use HTTPS em produção

### Rate Limiting
- Implemente rate limiting no backend
- Monitore uso da OpenAI API

## 🚀 Próximos Passos

1. **Deploy inicial** com configuração básica
2. **Testes funcionais** com múltiplos usuários
3. **Monitoramento** de performance e custos
4. **Otimizações** baseadas no uso real
5. **Escalabilidade** conforme necessário

---

**🎉 Seu app estará online e funcional!**