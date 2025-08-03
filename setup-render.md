# Configuração Manual do Render

## Problema Identificado
O backend do Render não está funcionando porque o serviço não foi criado corretamente. O GitHub Actions está executando, mas o serviço `video-translate-backend` não existe no Render.

## Solução: Configuração Manual

### 1. Criar Serviço no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub: `grimmreaperb-design/video-translate-app`
4. Configure o serviço:

**Configurações Básicas:**
- **Name**: `video-translate-backend`
- **Region**: `Oregon (US West)`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Variáveis de Ambiente:**
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://video-translate-app.vercel.app
```

**Configurações Avançadas:**
- **Plan**: `Free`
- **Health Check Path**: `/api/health`

### 2. Configurar Secrets do GitHub

Para o GitHub Actions funcionar, configure os secrets:

1. Vá para o repositório no GitHub
2. Settings → Secrets and variables → Actions
3. Adicione os secrets:
   - `RENDER_SERVICE_ID`: (obtido após criar o serviço)
   - `RENDER_API_KEY`: (obtido no dashboard do Render)

### 3. URL Esperada

Após a configuração, o backend estará disponível em:
`https://video-translate-backend.onrender.com`

### 4. Testar o Backend

```bash
curl https://video-translate-backend.onrender.com/api/health
```

## Status Atual

✅ **Frontend (Vercel)**: Funcionando em https://video-translate-app.vercel.app
✅ **Backend Local**: Funcionando em http://localhost:3002
❌ **Backend (Render)**: Precisa ser configurado manualmente
✅ **Socket.IO Local**: Funcionando sem erros
⚠️ **Socket.IO Produção**: Usando Vercel (polling apenas) temporariamente

## Próximos Passos

1. Configurar o serviço no Render manualmente
2. Atualizar a configuração do frontend para usar o Render
3. Testar a funcionalidade completa com WebSocket