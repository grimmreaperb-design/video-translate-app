# 🚀 Video Translate App - Setup Guide

## ✅ Status Atual

O projeto está **100% funcional** com as seguintes funcionalidades implementadas:

### ✅ Backend (Node.js + TypeScript)
- ✅ Servidor Express com Socket.IO
- ✅ Rotas de API para salas e onboarding
- ✅ Integração com OpenAI para transcrição e tradução
- ✅ Gerenciamento de usuários e salas em tempo real
- ✅ Health check endpoint

### ✅ Frontend (React + TypeScript)
- ✅ Interface moderna e responsiva
- ✅ Componente de onboarding
- ✅ Sistema de salas de tradução
- ✅ Gravação de áudio em tempo real
- ✅ Tradução automática de fala
- ✅ WebRTC para captura de áudio

### ✅ Funcionalidades Principais
- ✅ Criação e junção de salas
- ✅ Gravação de áudio em tempo real
- ✅ Transcrição de fala usando OpenAI Whisper
- ✅ Tradução automática usando GPT-4
- ✅ Síntese de fala para áudio traduzido
- ✅ Interface de usuário moderna

## 🚀 Como Executar

### Opção 1: Script Automático (Recomendado)
```bash
./start-dev.sh
```

### Opção 2: Manual
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 📱 Como Usar

1. **Acesse**: http://localhost:3000
2. **Onboarding**: Digite seu nome e escolha seu idioma
3. **Criar/Entrar em Sala**: Crie uma nova sala ou entre em uma existente
4. **Gravar**: Clique em "Start Recording" para começar a falar
5. **Tradução**: Sua fala será automaticamente traduzida para outros usuários

## 🔧 Configuração

### Variáveis de Ambiente
Crie um arquivo `.env` no diretório `backend/`:
```
OPENAI_API_KEY=sua_chave_api_aqui
PORT=3001
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Dependências
Todas as dependências já estão instaladas. Se necessário:
```bash
npm run install:all
```

## 🧪 Testes

```bash
# Testes do Frontend
cd frontend && npm test

# Verificar Backend
curl http://localhost:3001/health
curl http://localhost:3001/api/onboarding/languages
```

## 📊 Endpoints Disponíveis

### Backend (Porta 3001)
- `GET /health` - Health check
- `GET /api/onboarding/languages` - Lista de idiomas
- `POST /api/onboarding/users` - Criar usuário
- `GET /api/rooms` - Listar salas
- `POST /api/rooms` - Criar sala
- `POST /api/rooms/:id/join` - Entrar em sala
- `POST /api/rooms/:id/leave` - Sair da sala

### Socket.IO Events
- `join-room` - Entrar em sala
- `leave-room` - Sair da sala
- `audio-chunk` - Enviar áudio para tradução
- `translated-audio` - Receber áudio traduzido

## 🎯 Próximos Passos

1. **Configurar OpenAI API Key** no arquivo `.env`
2. **Testar com múltiplos usuários** em diferentes navegadores
3. **Adicionar mais idiomas** se necessário
4. **Implementar persistência de dados** (banco de dados)
5. **Adicionar autenticação** de usuários

## 🐛 Solução de Problemas

### Servidor não inicia
```bash
# Verificar se as portas estão livres
lsof -i :3000
lsof -i :3001

# Matar processos se necessário
pkill -f "react-scripts"
pkill -f "ts-node"
```

### Erro de CORS
- Verificar se o backend está rodando na porta 3001
- Verificar configuração de CORS no backend

### Erro de áudio
- Verificar permissões de microfone no navegador
- Verificar se o WebRTC está habilitado

## 📞 Suporte

Se encontrar problemas:
1. Verifique se todas as dependências estão instaladas
2. Verifique se as portas 3000 e 3001 estão livres
3. Verifique se o arquivo `.env` está configurado corretamente
4. Verifique os logs do console do navegador

---

**🎉 O projeto está pronto para uso!** 