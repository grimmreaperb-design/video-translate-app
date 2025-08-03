# 🚀 Configuração Manual do Backend no Render

## ✅ Código Pronto
O backend está **100% pronto** para deploy no Render com o arquivo `server.js` otimizado.

## 📋 Passos para Configurar no Render

### 1. Acesse o Render Dashboard
- Vá para [render.com](https://render.com)
- Faça login na sua conta

### 2. Criar Novo Web Service
- Clique em **"New +"** → **"Web Service"**
- Conecte seu repositório GitHub: `grimmreaperb-design/video-translate-app`

### 3. Configurações do Serviço

**Configurações Básicas:**
- **Name:** `video-translate-backend`
- **Environment:** `Node`
- **Region:** `Oregon (US West)` ou mais próximo
- **Branch:** `main`
- **Root Directory:** `backend`

**Build & Deploy:**
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Configurações Avançadas:**
- **Auto-Deploy:** `Yes` (para deploy automático)
- **Plan:** `Free` (para teste)

### 4. Variáveis de Ambiente
Adicione estas variáveis (se necessário):
- `NODE_ENV` = `production`
- `PORT` = (deixe vazio - Render define automaticamente)

### 5. Verificar Deploy
Após o deploy, teste:
- **Health Check:** `https://video-translate-backend.onrender.com/api/health`
- **Deve retornar:** `OK`

## 🔧 Arquivos Importantes

### `backend/server.js` (Pronto)
```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/health", (req, res) => {
  res.send("OK");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

// WebRTC signaling logic...

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
```

### `backend/package.json` (Atualizado)
```json
{
  "scripts": {
    "start": "node server.js",
    "postinstall": "echo 'No build needed for server.js'"
  }
}
```

## 🎯 Frontend Configurado
O frontend já está configurado com:
- ✅ Path explícito: `path: "/socket.io"`
- ✅ CORS compatível
- ✅ URL de produção: `https://video-translate-backend.onrender.com`

## 🚨 Problemas Comuns

### Se o deploy falhar:
1. Verifique se o diretório `backend` está correto
2. Confirme que `npm install` funciona
3. Teste `npm start` localmente

### Se o health check retornar 404:
1. O serviço não foi criado corretamente
2. O nome do serviço está diferente
3. O deploy ainda está em progresso

### Se o WebSocket não conectar:
1. Verifique se o servidor está rodando
2. Confirme que o CORS está configurado
3. Teste com `path: "/socket.io"` no frontend

## ✅ Teste Local
Para testar localmente:
```bash
cd backend
node server.js
curl http://localhost:3001/api/health  # Deve retornar "OK"
```

## 🔗 URLs Finais
- **Backend:** `https://video-translate-backend.onrender.com`
- **Frontend:** `https://video-translate-app.vercel.app`
- **Health Check:** `https://video-translate-backend.onrender.com/api/health`

---

**Status:** ✅ Código pronto | ⏳ Aguardando configuração manual no Render