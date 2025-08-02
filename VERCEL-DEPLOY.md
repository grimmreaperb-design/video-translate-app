# Deploy do MVP no Vercel

Este guia fornece instruções detalhadas para fazer o deploy do MVP do Video Translate App no Vercel, utilizando serviços gratuitos.

## Serviços Utilizados

- **Frontend e Backend**: Vercel (plano gratuito)
- **Banco de Dados**: Supabase (plano gratuito)
- **Autenticação**: Supabase Auth (plano gratuito)
- **Tradução**: LibreTranslate (endpoint público gratuito)
- **Transcrição**: Web Speech API (gratuito)
- **Síntese de Voz**: Web Speech API TTS (gratuito)
- **Comunicação em Tempo Real**: Socket.IO e PeerJS (hospedados no Vercel)

## Pré-requisitos

- Node.js 16+ instalado
- npm instalado
- Git instalado
- Conta no Vercel (https://vercel.com)
- Conta no Supabase (https://supabase.com)

## Passo a Passo para Deploy

### 1. Preparação do Projeto

```bash
# Instalar dependências
npm run install:all

# Construir o frontend
cd frontend && npm run build && cd ..
```

### 2. Deploy no Vercel

#### Opção 1: Deploy via CLI

```bash
# Instalar Vercel CLI (se ainda não estiver instalado)
npm install -g vercel

# Fazer login no Vercel
vercel login

# Deploy do projeto
vercel --prod
```

#### Opção 2: Deploy via Dashboard

1. Acesse https://vercel.com
2. Conecte sua conta do GitHub
3. Importe o repositório
4. Configure as variáveis de ambiente:
   - `SUPABASE_URL`: https://qjzxmndbigqbjlgomlyt.supabase.co
   - `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA
   - `FRONTEND_URL`: https://video-translate-app.vercel.app
5. Clique em "Deploy"

### 3. Verificação do Deploy

1. Acesse a URL do seu projeto no Vercel (ex: https://video-translate-app.vercel.app)
2. Verifique se a API está funcionando: `curl https://video-translate-app.vercel.app/api/health`
3. Teste o login e as funcionalidades básicas

## Arquivos de Configuração

### vercel.json

Este arquivo configura como o Vercel deve fazer o build e o deploy do projeto.

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
      "src": "/peerjs/(.*)",
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

### frontend/.env.production

Este arquivo configura as variáveis de ambiente para o frontend em produção.

```
REACT_APP_API_URL=https://video-translate-app.vercel.app/api
REACT_APP_SOCKET_URL=https://video-translate-app.vercel.app
REACT_APP_SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA
```

### api/.env

Este arquivo configura as variáveis de ambiente para o backend em produção.

```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://qjzxmndbigqbjlgomlyt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqenhtbmRiaWdxYmpsZ29tbHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzAyMDcsImV4cCI6MjA2OTY0NjIwN30.kPajcm1JBR0m9T5p5chX9M1PUxJWu5oGjnWJQDptpeA
FRONTEND_URL=https://video-translate-app.vercel.app
```

## Modificações Realizadas

### 1. Configuração do Socket.IO e PeerJS

O arquivo `frontend/src/components/VideoRoom.tsx` foi modificado para usar as URLs do Socket.IO e PeerJS do arquivo de configuração, em vez de hardcoded, para que funcione corretamente no ambiente de produção.

```typescript
// Inicializar Socket.IO
useEffect(() => {
  const newSocket = io(config.SOCKET_URL);
  setSocket(newSocket);
  // ...
}, []);

// Inicializar PeerJS
useEffect(() => {
  if (currentRoom && !peerRef.current) {
    // Configuração do PeerJS baseada no ambiente
    const peerOptions = config.ENVIRONMENT === 'production'
      ? {
          // Em produção, usamos o servidor PeerJS hospedado no Vercel
          host: new URL(config.SOCKET_URL).hostname,
          secure: true,
          path: '/peerjs'
        }
      : {
          // Em desenvolvimento, usamos o servidor local
          host: 'localhost',
          port: 9000,
          path: '/myapp'
        };
    
    const peer = new Peer(`${user.id}_${Date.now()}`, peerOptions);
    // ...
  }
}, [currentRoom]);
```

### 2. Configuração do PeerServer no Backend

O arquivo `api/index.ts` foi modificado para adicionar suporte ao PeerJS no servidor Vercel.

```typescript
import { PeerServer } from "peer";

// ...

// PeerJS Server setup
const peerServer = PeerServer({ 
  server, 
  path: '/peerjs',
  proxied: true
});

peerServer.on('connection', (client) => {
  console.log(`PeerJS client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`PeerJS client disconnected: ${client.getId()}`);
});
```

## Limitações dos Planos Gratuitos

### Vercel
- 100 GB de largura de banda por mês
- Máximo de 12 serverless functions por projeto
- Tempo de execução limitado para serverless functions (10-60 segundos)
- Sem suporte para WebSockets persistentes (usando polling como fallback)

### Supabase
- 500 MB de armazenamento
- 2 GB de transferência por mês
- 50 MB de armazenamento de banco de dados
- 500.000 linhas de banco de dados

### LibreTranslate (Endpoint Público)
- Limite de requisições por IP
- Pode ter instabilidades

### Web Speech API
- Suporte variável entre navegadores
- Requer conexão com a internet
- Qualidade de reconhecimento variável

## Troubleshooting

### Problemas de CORS

Se encontrar problemas de CORS, verifique:

1. A configuração de CORS no arquivo `api/index.ts`
2. A URL do frontend configurada nas variáveis de ambiente

### Problemas com Socket.IO

Se o Socket.IO não estiver funcionando:

1. Verifique se a URL do socket está correta no frontend
2. Verifique se o path do Socket.IO está configurado corretamente
3. Lembre-se que o Vercel não suporta WebSockets persistentes, então o Socket.IO usará polling como fallback

### Problemas com PeerJS

Se o PeerJS não estiver funcionando:

1. Verifique se o caminho do PeerJS está configurado corretamente no frontend e no backend
2. Verifique se o PeerServer está sendo inicializado corretamente no backend

## Próximos Passos

1. Implementar testes automatizados
2. Melhorar a UI/UX
3. Adicionar mais idiomas para tradução
4. Implementar clonagem de voz
5. Adicionar lipsync básico

## Recursos Adicionais

- [Documentação do Vercel](https://vercel.com/docs)
- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação do Socket.IO](https://socket.io/docs/v4/)
- [Documentação do PeerJS](https://peerjs.com/docs.html)
- [Documentação do LibreTranslate](https://libretranslate.com/docs/)
- [Documentação da Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)