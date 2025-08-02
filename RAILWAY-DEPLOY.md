# 🚀 Deploy Railway + Vercel

## 🎯 **Arquitetura da Solução**

- **Railway**: Backend com Socket.IO (servidor persistente)
- **Vercel**: Frontend estático (React build)

## 🔧 **Por que essa arquitetura?**

### ❌ **Problema do Vercel Serverless:**
- Functions serverless "morrem" após cada resposta
- Não mantém conexões WebSocket ativas
- Socket.IO precisa de processo contínuo (`server.listen()`)

### ✅ **Solução Railway + Vercel:**
- **Railway**: Servidor Node.js persistente para Socket.IO
- **Vercel**: Hosting estático otimizado para React

## 📋 **Passos para Deploy**

### **1. Deploy do Backend (Railway)**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Fazer deploy
./deploy-railway.sh
```

### **2. Configurar URLs do Frontend**

Após o deploy do Railway, você receberá uma URL como:
`https://your-app-name.railway.app`

Atualize o arquivo `frontend/.env.production`:

```env
REACT_APP_API_URL=https://your-app-name.railway.app/api
REACT_APP_SOCKET_URL=https://your-app-name.railway.app
```

### **3. Deploy do Frontend (Vercel)**

```bash
# Build e deploy do frontend
./deploy-vercel.sh
```

## 🔍 **Verificação**

### **Backend (Railway):**
- ✅ Socket.IO funcionando: `https://your-app-name.railway.app/socket.io/`
- ✅ API funcionando: `https://your-app-name.railway.app/api/health`
- ✅ PeerJS funcionando: `https://your-app-name.railway.app/peerjs/`

### **Frontend (Vercel):**
- ✅ App carregando: `https://video-translate-app.vercel.app`
- ✅ Conectando ao Railway backend
- ✅ WebRTC funcionando

## 🐛 **Troubleshooting**

### **Socket.IO não conecta:**
```bash
# Verificar logs do Railway
railway logs
```

### **CORS errors:**
Verificar se o Railway backend tem CORS configurado para o domínio Vercel.

### **WebRTC falha:**
Verificar se os ICE servers (STUN/TURN) estão acessíveis.

## 💰 **Custos**

- **Railway**: $5/mês (plano básico)
- **Vercel**: Gratuito (para projetos pessoais)
- **Total**: ~$5/mês para produção

## 🔄 **Desenvolvimento Local**

Para desenvolvimento, use:

```bash
# Backend local
cd backend && npm run dev

# Frontend local (com .env.local)
cd frontend && npm start
```

O arquivo `.env.local` já está configurado para usar `localhost:3001`.