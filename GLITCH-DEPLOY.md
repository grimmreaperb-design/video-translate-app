# 🚀 Deploy no Render.com (100% Gratuito)

## 🎯 **Por que Render.com?**

- ✅ **100% Gratuito** (750 horas/mês)
- ✅ **Suporta WebSocket** e Socket.IO
- ✅ **Deploy automático** via GitHub
- ✅ **SSL gratuito** (HTTPS)
- ✅ **Logs em tempo real**
- ✅ **Zero configuração** manual

---

# 🚀 Deploy no Glitch.com (Alternativa)

## 🎯 **Por que Glitch.com?**

- ✅ **100% Gratuito** (sem cartão de crédito)
- ✅ **Suporta WebSocket** e Socket.IO
- ✅ **Servidor persistente** (não serverless)
- ✅ **Deploy automático** via GitHub
- ✅ **SSL gratuito** (HTTPS)

## 📋 **Passos para Deploy**

### **1. Preparar o projeto**

O backend já está pronto! Apenas precisamos de um arquivo `glitch.json`:

```json
{
  "install": "npm install",
  "start": "npm start",
  "watch": {
    "ignore": [
      "\\.git",
      "node_modules",
      "dist"
    ],
    "install": {
      "include": [
        "^package\\.json$",
        "^package-lock\\.json$"
      ]
    },
    "restart": {
      "exclude": [
        "^public/",
        "^dist/"
      ],
      "include": [
        "\\.js$",
        "\\.ts$",
        "\\.json$"
      ]
    }
  }
}
```

### **2. Deploy Manual no Glitch**

1. **Acesse**: https://glitch.com
2. **Faça login** com GitHub
3. **Crie novo projeto**: "Import from GitHub"
4. **Cole a URL**: `https://github.com/seu-usuario/video-translate-app`
5. **Configure**:
   - Root Directory: `backend`
   - Start Command: `npm start`

### **3. Configurar Variáveis de Ambiente**

No painel do Glitch, adicione:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://video-translate-app.vercel.app
SUPABASE_URL=sua-url-supabase
SUPABASE_ANON_KEY=sua-chave-supabase
```

### **4. URL do Backend**

Após deploy, você terá uma URL como:
`https://video-translate-backend.glitch.me`

### **5. Atualizar Frontend**

Atualize `frontend/.env.production`:

```env
REACT_APP_API_URL=https://video-translate-backend.glitch.me/api
REACT_APP_SOCKET_URL=https://video-translate-backend.glitch.me
```

## 🔧 **Vantagens do Glitch**

- **Sem limites de tempo** (diferente do Heroku)
- **Editor online** para debug
- **Logs em tempo real**
- **Reinicialização automática**
- **Comunidade ativa**

## 🚀 **Deploy Automático**

Para deploy automático:

1. **Conecte GitHub** ao Glitch
2. **Configure webhook** para push automático
3. **Cada commit** = deploy automático

## 📊 **Limitações**

- **4 horas de inatividade** = app hiberna
- **Primeiro acesso** pode ser lento (cold start)
- **Recursos limitados** (512MB RAM)

## ✅ **Resultado Final**

- **Backend**: `https://video-translate-backend.glitch.me`
- **Frontend**: `https://video-translate-app.vercel.app`
- **Socket.IO**: Funcionando perfeitamente!
- **WebRTC**: Conexões P2P estabelecidas!

## 🔗 **Links Úteis**

- [Glitch.com](https://glitch.com)
- [Documentação Glitch](https://help.glitch.com)
- [Glitch + Socket.IO](https://glitch.com/~socketio-chat)

---

## 🛠️ **Deploy Direto via Glitch**

### **Método Mais Rápido:**

1. **Acesse**: https://glitch.com/edit/#!/remix/glitch-hello-node
2. **Delete tudo** e cole o código do backend
3. **Configure package.json** e **npm install**
4. **Adicione variáveis** no arquivo `.env`
5. **Pronto!** URL automática gerada

### **Arquivo glitch.json para o backend:**