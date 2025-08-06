# Relatório Técnico: Implementação P2P de Vídeo e Áudio

## 📋 Visão Geral

Este relatório documenta a implementação completa de um sistema de videochamada P2P (peer-to-peer) utilizando WebRTC, Socket.IO para sinalização e React no frontend. O sistema permite comunicação de vídeo e áudio em tempo real entre múltiplos usuários em salas virtuais.

## 🏗️ Arquitetura do Sistema

### Frontend (React + TypeScript)
- **Arquivo Principal**: `frontend/src/components/VideoRoom.tsx`
- **Configuração**: `frontend/src/config.ts`
- **Tecnologias**: React, WebRTC API, Socket.IO Client

### Backend (Node.js + TypeScript)
- **Arquivo Principal**: `backend/src/index.ts`
- **Tecnologias**: Express, Socket.IO Server, HTTP Server

## 🔧 Componentes Principais

### 1. Configuração de Rede e Conectividade

#### Configuração de URLs e Transporte
```typescript
// frontend/src/config.ts
const BACKEND_URLS = {
  production: [
    'https://video-translate-backend-wv9b.onrender.com', // Render (suporta WebSocket)
    'https://video-translate-backend.onrender.com',
    'https://video-translate-app-backend.railway.app',
  ],
  development: 'http://localhost:3002'
};

// Configuração de transporte baseada na URL
export const getSocketTransports = (url: string): string[] => {
  if (url.includes('vercel.app')) {
    return ['polling']; // Vercel não suporta WebSocket
  }
  return ['websocket', 'polling']; // WebSocket primeiro, polling como fallback
};
```

#### Configuração de Servidores ICE
```typescript
// frontend/src/components/VideoRoom.tsx
const iceServers = useMemo(() => [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
], []);
```

### 2. Inicialização de Mídia Local

#### Captura de Vídeo e Áudio
```typescript
// frontend/src/components/VideoRoom.tsx
const initializeLocalMedia = useCallback(async () => {
  try {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true
    });
    
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    console.log(`Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`);
    
    localStreamRef.current = stream;
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true; // Evitar feedback
      await localVideoRef.current.play();
    }
    
    return stream;
  } catch (error) {
    setError('Error accessing camera/microphone. Please check permissions.');
    throw error;
  }
}, []);
```

### 3. Criação de Conexões Peer-to-Peer

#### Função createPeerConnection
```typescript
// frontend/src/components/VideoRoom.tsx
const createPeerConnection = useCallback((targetUserId: string, targetSocketId: string) => {
  if (!targetUserId || targetUserId === userId) {
    console.warn(`Invalid targetUserId: ${targetUserId}`);
    return null;
  }
  
  // Verificar se conexão já existe
  if (peerConnectionsRef.current.has(targetUserId)) {
    return peerConnectionsRef.current.get(targetUserId)!;
  }
  
  const pc = new RTCPeerConnection({ iceServers });

  // Adicionar tracks do stream local
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach(track => {
      try {
        pc.addTrack(track, localStreamRef.current!);
        console.log(`Added ${track.kind} track to connection with ${targetUserId}`);
      } catch (error) {
        console.error(`Error adding track:`, error);
      }
    });
  }

  // Handler para candidatos ICE
  pc.onicecandidate = (event) => {
    if (event.candidate && socketRef.current && isComponentMountedRef.current) {
      socketRef.current.emit('webrtc-ice-candidate', {
        to: targetUserId,
        candidate: event.candidate
      });
    }
  };

  // Handler para stream remoto
  pc.ontrack = (event) => {
    if (!isComponentMountedRef.current) return;
    
    const remoteStream = event.streams[0];
    if (remoteStream) {
      setPeerConnections(prev => 
        prev.map(conn => 
          conn.userId === targetUserId 
            ? { ...conn, stream: remoteStream, isConnected: true }
            : conn
        )
      );
    }
  };

  // Monitoramento de estado da conexão
  pc.onconnectionstatechange = () => {
    const state = pc.connectionState;
    console.log(`Connection state with ${targetUserId}: ${state}`);
    
    setPeerConnections(prev => 
      prev.map(conn => 
        conn.userId === targetUserId 
          ? { ...conn, isConnected: state === 'connected' }
          : conn
      )
    );
  };

  // Timeout inteligente para conexão ICE (15 segundos)
  const iceTimeoutId = setTimeout(() => {
    const currentState = pc.iceConnectionState;
    if (currentState !== 'connected' && currentState !== 'completed') {
      console.warn(`ICE timeout after 15s. Restarting ICE for ${targetUserId}`);
      try {
        pc.restartIce();
      } catch (error) {
        console.error(`Error restarting ICE: ${error}`);
      }
    }
  }, 15000);

  peerConnectionsRef.current.set(targetUserId, pc);
  return pc;
}, [iceServers, userId]);
```

### 4. Processo de Sinalização WebRTC

#### Criação e Envio de Offer
```typescript
// frontend/src/components/VideoRoom.tsx
const createOffer = useCallback(async (targetUser: User) => {
  try {
    // Garantir que stream local existe
    if (!localStreamRef.current) {
      await initializeLocalMedia();
    }
    
    const pc = createPeerConnection(targetUser.id, '');
    if (!pc) return;
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    if (socketRef.current) {
      socketRef.current.emit('webrtc-offer', {
        to: targetUser.id,
        offer
      });
    }

    peerConnectionsRef.current.set(targetUser.id, pc);
    
    setPeerConnections(prev => {
      const exists = prev.some(conn => conn.userId === targetUser.id);
      if (exists) return prev;
      
      return [...prev, { 
        userId: targetUser.id, 
        socketId: '', 
        connection: pc,
        isConnected: false
      }];
    });
  } catch (error) {
    console.error('Error creating offer:', error);
  }
}, [createPeerConnection, initializeLocalMedia]);
```

#### Processamento de Offer Recebida
```typescript
// frontend/src/components/VideoRoom.tsx
const handleOffer = useCallback(async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
  try {
    if (!data || !data.offer || !data.from) {
      console.error('Invalid offer data received');
      return;
    }

    // Garantir stream local
    if (!localStreamRef.current) {
      await initializeLocalMedia();
    }

    // Verificar conexão existente e implementar "polite peer" strategy
    const existingPc = peerConnectionsRef.current.get(data.from);
    if (existingPc) {
      if (existingPc.signalingState === 'stable') {
        console.warn(`Connection already established with ${data.from}`);
        return;
      }
      
      // Glare condition handling
      if (existingPc.signalingState === 'have-local-offer') {
        const isPolite = userId < data.from;
        if (isPolite) {
          await existingPc.setLocalDescription({type: 'rollback'});
        } else {
          return;
        }
      }
    }
    
    const pc = existingPc || createPeerConnection(data.from, '');
    if (!pc) return;
    
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (socketRef.current) {
      socketRef.current.emit('webrtc-answer', {
        to: data.from,
        answer
      });
    }

    if (!existingPc) {
      peerConnectionsRef.current.set(data.from, pc);
      setPeerConnections(prev => [...prev, { 
        userId: data.from, 
        socketId: '', 
        connection: pc,
        isConnected: false
      }]);
    }
  } catch (error) {
    console.error(`Error handling offer from ${data.from}:`, error);
  }
}, [createPeerConnection, initializeLocalMedia, userId]);
```

#### Processamento de Answer
```typescript
// frontend/src/components/VideoRoom.tsx
const handleAnswer = useCallback(async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
  try {
    if (!data || !data.from || !data.answer) {
      console.error('Invalid answer data received');
      return;
    }

    // Verificar duplicatas
    if (answersReceivedRef.current.has(data.from)) {
      console.warn(`Answer already processed for ${data.from}`);
      return;
    }
    
    const pc = peerConnectionsRef.current.get(data.from);
    if (!pc) {
      console.error(`No peer connection found for answer from ${data.from}`);
      return;
    }

    // Verificar estado correto
    if (pc.signalingState !== 'have-local-offer') {
      console.warn(`Incorrect state for answer: ${pc.signalingState}`);
      return;
    }

    answersReceivedRef.current.add(data.from);
    await pc.setRemoteDescription(data.answer);
    
  } catch (error) {
    console.error(`Error handling answer from ${data.from}:`, error);
    if (data?.from) {
      answersReceivedRef.current.delete(data.from);
    }
  }
}, []);
```

#### Processamento de Candidatos ICE
```typescript
// frontend/src/components/VideoRoom.tsx
const handleIceCandidate = useCallback(async (data: { from: string; candidate: RTCIceCandidateInit }) => {
  try {
    if (!data || !data.from || !data.candidate) {
      console.error('Invalid ICE candidate data received');
      return;
    }
    
    const pc = peerConnectionsRef.current.get(data.from);
    if (pc) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(data.candidate);
        console.log(`ICE candidate processed for ${data.from}`);
      } else {
        console.warn(`Trying to add ICE candidate before setRemoteDescription for ${data.from}`);
        // Tentar adicionar mesmo assim
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (candidateError) {
          console.error(`Failed to add candidate without remoteDescription:`, candidateError);
        }
      }
    } else {
      console.warn(`No peer connection found for ICE candidate from ${data.from}`);
    }
  } catch (error) {
    console.error(`Error handling ICE candidate from ${data.from}:`, error);
  }
}, []);
```

### 5. Backend - Sinalização via Socket.IO

#### Configuração do Servidor
```typescript
// backend/src/index.ts
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Armazenamento em memória
const rooms = new Map<string, Set<string>>();
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, { id: string; name: string; roomId?: string }>();
```

#### Gerenciamento de Salas
```typescript
// backend/src/index.ts
socket.on('join-room', (data: string | { roomId: string; user: { id: string; name: string } }) => {
  let roomId: string;
  let user: { id: string; name: string };
  
  // Suporte a formatos antigo e novo
  if (typeof data === 'string') {
    roomId = data;
    user = { id: socket.id, name: `User-${socket.id.slice(0, 6)}` };
  } else {
    roomId = data.roomId;
    user = data.user;
  }
  
  // Sair da sala anterior se existir
  if (socketUsers.has(socket.id)) {
    const currentUser = socketUsers.get(socket.id)!;
    if (currentUser.roomId) {
      socket.leave(currentUser.roomId);
      // Notificar outros usuários
      socket.to(currentUser.roomId).emit('user-left', { id: currentUser.id, name: currentUser.name });
    }
  }
  
  // Entrar na nova sala
  socket.join(roomId);
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  
  const room = rooms.get(roomId)!;
  const currentUsers = Array.from(room).map(socketId => {
    const userData = socketUsers.get(socketId);
    return userData ? { id: userData.id, name: userData.name } : null;
  }).filter(Boolean);
  
  room.add(socket.id);
  userSockets.set(user.id, socket.id);
  socketUsers.set(socket.id, { ...user, roomId });
  
  // Enviar usuários atuais para o novo usuário
  socket.emit('room-users', currentUsers);
  
  // Notificar outros sobre o novo usuário
  socket.to(roomId).emit('user-joined', { id: user.id, name: user.name });
});
```

#### Sinalização WebRTC
```typescript
// backend/src/index.ts
// Encaminhamento de Offer
socket.on('webrtc-offer', (data: { offer: RTCSessionDescriptionInit; to: string }) => {
  const user = socketUsers.get(socket.id);
  if (user) {
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc-offer', {
        offer: data.offer,
        from: user.id
      });
    }
  }
});

// Encaminhamento de Answer
socket.on('webrtc-answer', (data: { answer: RTCSessionDescriptionInit; to: string }) => {
  const user = socketUsers.get(socket.id);
  if (user) {
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc-answer', {
        answer: data.answer,
        from: user.id
      });
    }
  }
});

// Encaminhamento de Candidatos ICE
socket.on('webrtc-ice-candidate', (data: { candidate: RTCIceCandidateInit; to: string }) => {
  const user = socketUsers.get(socket.id);
  if (user) {
    const targetSocketId = userSockets.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        from: user.id
      });
    }
  }
});
```

## 🔄 Fluxo de Conexão P2P

### 1. Inicialização
1. Usuário entra na sala
2. Inicialização de mídia local (câmera/microfone)
3. Conexão Socket.IO estabelecida
4. Recebimento da lista de usuários na sala

### 2. Estabelecimento de Conexão
1. **Offer**: Usuário A cria offer para Usuário B
2. **Sinalização**: Offer enviada via Socket.IO
3. **Answer**: Usuário B processa offer e cria answer
4. **Sinalização**: Answer enviada de volta
5. **ICE**: Troca de candidatos ICE para estabelecer conectividade

### 3. Comunicação P2P
1. Conexão WebRTC estabelecida diretamente entre peers
2. Streams de vídeo/áudio transmitidos P2P
3. Monitoramento contínuo do estado da conexão

## 🛡️ Recursos de Robustez

### 1. Timeout Inteligente ICE
- Timeout de 15 segundos para estabelecimento de conexão
- Restart automático de ICE em caso de falha
- Timeout secundário de 5 segundos após restart

### 2. Prevenção de Duplicatas
- Rastreamento de answers processadas
- Verificação de estados de sinalização
- Implementação de "polite peer" strategy para glare conditions

### 3. Reconexão Automática
- Sistema de fallback com múltiplas URLs
- Backoff exponencial com jitter
- Suporte a diferentes transportes (WebSocket/Polling)

### 4. Logs de Diagnóstico
- Logs detalhados para produção
- Rastreamento de estados WebRTC
- Monitoramento de performance

## 📊 Configurações de Produção

### URLs de Backend
- **Principal**: `https://video-translate-backend-wv9b.onrender.com`
- **Fallback**: Railway, outros serviços Render

### Servidores ICE/TURN
- **STUN**: Google STUN servers
- **TURN**: OpenRelay TURN servers para NAT traversal

### Transporte Socket.IO
- **WebSocket**: Preferencial para baixa latência
- **Polling**: Fallback para compatibilidade

## 🔍 Pontos de Monitoramento

### Estados WebRTC Críticos
- `signalingState`: Controle do processo de sinalização
- `iceConnectionState`: Estado da conectividade ICE
- `connectionState`: Estado geral da conexão

### Métricas de Performance
- Tempo de estabelecimento de conexão
- Taxa de sucesso de conexões ICE
- Qualidade de vídeo/áudio (resolução, bitrate)

### Logs de Diagnóstico
- Eventos de sinalização WebRTC
- Estados de conexão ICE
- Erros de mídia e permissões

---

**Data do Relatório**: 2025-01-04  
**Versão do Sistema**: 1.1.0  
**Status**: Produção Ativa