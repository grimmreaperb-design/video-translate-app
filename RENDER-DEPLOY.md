# 🚀 Deploy Completo no Render.com

## 📋 **Passos para Deploy do Backend**

### **1. Acesse o Render Dashboard**
- Vá para: https://dashboard.render.com
- Faça login com sua conta GitHub

### **2. Criar Novo Web Service**
1. **Clique**: "New +" → "Web Service"
2. **Conecte repositório**: `video-translate-app`
3. **Configure**:
   - **Name**: `video-translate-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### **3. Configurar Variáveis de Ambiente**
No painel "Environment", adicione:

```env
NODE_ENV=production
FRONTEND_URL=https://video-translate-app.vercel.app
SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA
```

### **4. Deploy**
- **Clique**: "Create Web Service"
- **Aguarde**: Deploy automático (5-10 minutos)

### **5. URL do Backend**
Após deploy, você terá uma URL como:
`https://video-translate-backend.onrender.com`

---

## 📋 **Atualizar Frontend**

### **1. Atualizar Configuração**
Edite `frontend/.env.production`:

```env
REACT_APP_API_URL=https://video-translate-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://video-translate-backend.onrender.com
```

### **2. Deploy Frontend no Vercel**
```bash
cd frontend
npm run build
vercel --prod
```

---

## ✅ **Verificação**

### **Testar Backend**
- **Health Check**: https://video-translate-backend.onrender.com/health
- **Socket.IO**: https://video-translate-backend.onrender.com/socket.io/

### **Testar Frontend**
- **App**: https://video-translate-app.vercel.app
- **Conexão**: Verificar se Socket.IO conecta

---

## 🎉 **Resultado Final**

- **Backend**: `https://video-translate-backend.onrender.com`
- **Frontend**: `https://video-translate-app.vercel.app`
- **Socket.IO**: ✅ Funcionando
- **WebRTC**: ✅ Conexões P2P
- **Custo**: ✅ 100% Gratuito

---

## 📊 **Vantagens do Render**

- **750 horas gratuitas/mês** (suficiente para uso pessoal)
- **Deploy automático** a cada push no GitHub
- **SSL/HTTPS automático**
- **Logs em tempo real**
- **Zero configuração** de servidor
- **Suporte completo** a WebSocket/Socket.IO

## 🔧 **Limitações**

- **Sleep após 15min** de inatividade (plano gratuito)
- **Cold start** de ~30 segundos no primeiro acesso
- **750 horas/mês** (≈ 25 horas/dia)

## 🚀 **Deploy Automático**

Após configuração inicial:
- **Cada push** no GitHub = deploy automático
- **Zero intervenção** manual necessária
- **Rollback automático** em caso de erro