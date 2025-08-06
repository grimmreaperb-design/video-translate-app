# Video Chat App - WebRTC (v1.0.0)

Uma aplicação simples de videochamada entre duas pessoas usando WebRTC puro e Socket.IO.

## 🚀 Funcionalidades da v1.0.0

- ✅ Videochamada ponto a ponto entre duas pessoas
- ✅ Acesso à câmera e microfone
- ✅ Sistema de salas com Room ID
- ✅ Sinalização WebRTC via Socket.IO
- ✅ Troca automática de ofertas, respostas e ICE candidates
- ✅ Interface React responsiva e moderna
- ✅ Logs de debugging detalhados

## 🛠️ Tecnologias

### Frontend
- React 19 + TypeScript
- Socket.IO Client 4.8.1
- WebRTC API nativo
- Simple-peer para WebRTC
- CSS3 com design responsivo

### Backend
- Node.js + Express 5.1.0
- Socket.IO Server 4.8.1
- TypeScript 5.9.2
- CORS configurado

## 📦 Instalação e Execução

### Backend
```bash
cd backend
npm install
npm run dev
```
O backend rodará em `http://localhost:3001`

### Frontend
```bash
cd frontend
npm install
npm start
```
O frontend rodará em `http://localhost:3000`

## 🎯 Como Usar

1. Acesse `http://localhost:3000`
2. Digite seu nome
3. Digite um Room ID (ex: "sala123")
4. Clique em "Entrar na Sala"
5. Compartilhe o mesmo Room ID com outra pessoa
6. Quando a segunda pessoa entrar, a videochamada iniciará automaticamente

## 🌐 Deploy

### Frontend (Vercel)
- Hospedado em: `https://video-translate-app.vercel.app`
- Variável de ambiente: `REACT_APP_SOCKET_URL`

### Backend (Render)
- Hospedado em: `https://video-translate-app.onrender.com`
- CORS configurado para aceitar o domínio do Vercel

## 🔧 Configuração

### Variáveis de Ambiente

**Frontend (.env)**
```
REACT_APP_SOCKET_URL=https://video-translate-app.onrender.com
```

**Backend (.env)**
```
NODE_ENV=development
PORT=3001
```

## 🏗️ Estrutura do Projeto

```
video-translate-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoRoom.tsx
│   │   │   └── VideoRoom.css
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── config.ts
│   └── package.json
├── backend/
│   ├── src/
│   │   └── index.ts
│   └── package.json
└── README.md
```

## 🔍 Eventos Socket.IO

### Cliente → Servidor
- `join-room`: Entrar em uma sala
- `leave-room`: Sair da sala
- `offer`: Enviar oferta WebRTC
- `answer`: Enviar resposta WebRTC
- `ice-candidate`: Enviar candidato ICE

### Servidor → Cliente
- `room-users`: Lista de usuários na sala
- `user-joined`: Novo usuário entrou
- `user-left`: Usuário saiu
- `offer`: Receber oferta WebRTC
- `answer`: Receber resposta WebRTC
- `ice-candidate`: Receber candidato ICE

## 🎥 Servidores STUN

O projeto usa servidores STUN públicos do Google:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

## 📝 Versão Atual (1.0.0)

Esta é uma versão estável e funcional com:
- WebRTC puro sem dependências externas de transcrição
- Sistema de salas simples e eficiente
- Interface limpa e responsiva
- Código base sólido para futuras expansões

## 🐛 Troubleshooting

### Problemas Comuns

1. **Câmera/microfone não funcionam**
   - Verifique as permissões do navegador
   - Use HTTPS em produção

2. **Conexão WebRTC falha**
   - Verifique se ambos os usuários estão na mesma sala
   - Confirme se o backend está rodando

3. **Socket.IO não conecta**
   - Verifique a URL do backend
   - Confirme se o CORS está configurado corretamente# Deploy trigger Sun Aug  3 15:10:28 -03 2025
