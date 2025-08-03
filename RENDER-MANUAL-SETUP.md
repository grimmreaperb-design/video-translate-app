# 🚀 Manual de Configuração do Render

## Status Atual
✅ **Frontend**: Funcionando em https://video-translate-app.vercel.app  
⚠️ **Backend**: Precisa ser configurado manualmente no Render

## 📋 Passos para Configurar o Backend no Render

### 1. Acesse o Render Dashboard
- Vá para: https://dashboard.render.com
- Faça login com sua conta GitHub

### 2. Crie um Novo Web Service
- Clique em **"New +"** → **"Web Service"**
- Conecte seu repositório: `grimmreaperb-design/video-translate-app`
- Selecione o repositório quando aparecer na lista

### 3. Configure o Serviço
```
Name: video-translate-backend
Environment: Node
Region: Oregon (US West) ou Frankfurt (EU Central)
Branch: main
Root Directory: backend
```

### 4. Comandos de Build e Start
```
Build Command: npm install && npm run build
Start Command: npm start
```

### 5. Configurações Avançadas
```
Auto-Deploy: Yes
Health Check Path: /api/health (opcional)
```

### 6. Variáveis de Ambiente
Adicione as seguintes variáveis:
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://video-translate-app.vercel.app
```

### 7. Configurar GitHub Secrets (Opcional)
Para automatizar futuros deploys via GitHub Actions:

1. Vá para: https://github.com/grimmreaperb-design/video-translate-app/settings/secrets/actions
2. Adicione os secrets:
   - `RENDER_API_KEY`: Sua API key do Render
   - `RENDER_SERVICE_ID`: ID do serviço criado

## 🧪 Testando o Deploy

### Após a configuração:
1. Aguarde o primeiro deploy completar (5-10 minutos)
2. Teste o backend: https://video-translate-backend.onrender.com
3. Teste a aplicação: https://video-translate-app.vercel.app

### URLs de Teste:
- **Frontend**: https://video-translate-app.vercel.app
- **Backend**: https://video-translate-backend.onrender.com
- **API**: https://video-translate-backend.onrender.com/api
- **Socket.IO**: https://video-translate-backend.onrender.com/socket.io/

## 🔧 Solução de Problemas

### Se o backend não iniciar:
1. Verifique os logs no Render Dashboard
2. Confirme que as variáveis de ambiente estão corretas
3. Verifique se o `Root Directory` está definido como `backend`

### Se o Socket.IO não conectar:
1. Verifique se o CORS está configurado corretamente
2. Confirme que a URL do frontend está nas variáveis de ambiente
3. Teste a conectividade: `curl https://video-translate-backend.onrender.com/socket.io/`

## 📊 Status dos Componentes

| Componente | Status | URL |
|------------|--------|-----|
| Frontend Vercel | ✅ Funcionando | https://video-translate-app.vercel.app |
| Backend Vercel | ✅ Temporário | https://video-translate-app.vercel.app/api |
| Backend Render | ⏳ Configuração Manual | https://video-translate-backend.onrender.com |

## 🎯 Próximos Passos

1. **Configure o Render** seguindo os passos acima
2. **Teste o backend** quando estiver online
3. **Monitore os logs** para garantir que está funcionando
4. **Configure auto-deploy** com GitHub Secrets (opcional)

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Render Dashboard
2. Teste localmente primeiro: `cd backend && npm run dev`
3. Compare com a configuração local funcionando

---

**Nota**: O frontend já está configurado para usar o backend do Render quando estiver disponível. Enquanto isso, está usando o backend do Vercel como fallback.