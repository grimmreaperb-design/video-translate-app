import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, FALLBACK_URLS, getSocketTransports } from '../config';
import './VideoRoom.css';

// 🔎 DIAGNÓSTICO PROFUNDO: Capturar erros silenciosos globalmente
// Função de log personalizada que funciona em produção
const forceLog = (message: string, type: 'log' | 'error' | 'warn' = 'log') => {
  // Força logs em produção usando diferentes métodos
  if (type === 'error') {
    console.error(message);
    console.warn(message); // Backup
  } else if (type === 'warn') {
    console.warn(message);
    console.log(message); // Backup
  } else {
    console.log(message);
    console.info(message); // Backup
  }
  
  // Adiciona ao DOM para garantir visibilidade
  const logDiv = document.getElementById('debug-logs') || (() => {
    const div = document.createElement('div');
    div.id = 'debug-logs';
    div.style.cssText = `
      position: fixed; 
      top: 10px; 
      right: 10px; 
      background: rgba(0,0,0,0.8); 
      color: white; 
      padding: 10px; 
      font-family: monospace; 
      font-size: 12px; 
      max-height: 300px; 
      overflow-y: auto; 
      z-index: 9999;
      border-radius: 5px;
      max-width: 400px;
    `;
    document.body.appendChild(div);
    return div;
  })();
  
  const timestamp = new Date().toLocaleTimeString();
  logDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`;
  logDiv.scrollTop = logDiv.scrollHeight;
};

forceLog('🚀 DIAGNÓSTICO ATIVO: VideoRoom carregado!');
forceLog('🔍 Logs de diagnóstico habilitados');

window.onerror = function (msg, url, lineNo, columnNo, error) {
  const errorMsg = `[UNCAUGHT] ❌ window.onerror: ${msg}`;
  forceLog(errorMsg, 'error');
  alert('ERRO CAPTURADO: ' + msg); // Alert para garantir visibilidade
};

window.onunhandledrejection = function (event) {
  const errorMsg = `[UNCAUGHT] ❌ Promise rejection: ${event.reason}`;
  forceLog(errorMsg, 'error');
  alert('PROMISE REJEITADA: ' + event.reason); // Alert para garantir visibilidade
};

interface VideoRoomProps {
  userName: string;
  roomId: string;
  onLeaveRoom: () => void;
}

interface PeerConnection {
  userId: string;
  socketId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  isConnected: boolean;
}

interface User {
  id: string;
  name: string;
}

interface ReconnectionState {
  attempts: number;
  maxAttempts: number;
  isReconnecting: boolean;
  timeoutId: NodeJS.Timeout | null;
  baseDelay: number;
  maxDelay: number;
  lastError: string | null;
}

const VideoRoom: React.FC<VideoRoomProps> = ({ userName, roomId, onLeaveRoom }) => {
  // 🚀 LOGS IMEDIATOS PARA DIAGNÓSTICO
  forceLog('🎯 VideoRoom INICIADO!');
  forceLog(`👤 Usuário: ${userName}`);
  forceLog(`🏠 Sala: ${roomId}`);
  forceLog('🔍 Diagnóstico ativo - logs habilitados');
  
  const [peerConnections, setPeerConnections] = useState<PeerConnection[]>([]);
  const [error, setError] = useState('');
  const [usersInRoom, setUsersInRoom] = useState<User[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [currentSocketUrl, setCurrentSocketUrl] = useState<string>(SOCKET_URL);
  const [fallbackIndex, setFallbackIndex] = useState<number>(-1);

  // Generate unique user ID
  const userId = useMemo(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const isComponentMountedRef = useRef<boolean>(true);
  const reconnectionRef = useRef<ReconnectionState>({
    attempts: 0,
    maxAttempts: 8,
    isReconnecting: false,
    timeoutId: null,
    baseDelay: 1000, // 1 segundo inicial
    maxDelay: 30000, // Máximo de 30 segundos
    lastError: null
  });

  // ICE servers configuration
  const iceServers = useMemo(() => [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ], []);

  // Calculate exponential backoff delay with jitter
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const { baseDelay, maxDelay } = reconnectionRef.current;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, maxDelay);
    // Add jitter (±25% randomness) to prevent thundering herd
    const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(cappedDelay + jitter, baseDelay);
  }, []);

  // Clear reconnection timeout
  const clearReconnectionTimeout = useCallback(() => {
    if (reconnectionRef.current.timeoutId) {
      clearTimeout(reconnectionRef.current.timeoutId);
      reconnectionRef.current.timeoutId = null;
    }
  }, []);

  // Reset reconnection state
  const resetReconnectionState = useCallback(() => {
    clearReconnectionTimeout();
    reconnectionRef.current.attempts = 0;
    reconnectionRef.current.isReconnecting = false;
  }, [clearReconnectionTimeout]);

  // Initialize local media
  const initializeLocalMedia = useCallback(async () => {
    try {
      forceLog('🎥 Initializing local media...');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // 🔧 5. Verificar permissões de câmera/microfone explicitamente
      forceLog('[PERMISSION] 🔍 Verificando permissões de mídia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      forceLog(`[PERMISSION] ✅ Acesso à mídia concedido: ${stream.getTracks().map(t => t.kind).join(', ')}`);
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video to avoid feedback
      }
      
      forceLog('✅ Local media initialized');
      setError('');
      return stream;
    } catch (error) {
      forceLog(`[PERMISSION] ❌ Erro ao acessar mídia: ${error}`, 'error');
      setError('Error accessing camera/microphone. Please check permissions.');
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((targetUserId: string, targetSocketId: string) => {
    // [peer] Validate inputs
    if (!targetUserId || targetUserId === userId) {
      console.warn(`[peer] ⚠️ Invalid targetUserId: ${targetUserId}`);
      return null;
    }

    console.log(`[peer] 🔗 Creating peer connection for user ${targetUserId} (socket: ${targetSocketId})`);
    
    // Check if connection already exists
    if (peerConnectionsRef.current.has(targetUserId)) {
      console.log(`[peer] ♻️ Reusing existing connection for ${targetUserId}`);
      return peerConnectionsRef.current.get(targetUserId)!;
    }
    
    const pc = new RTCPeerConnection({
      iceServers
    });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          pc.addTrack(track, localStreamRef.current!);
          console.log(`[peer] ✅ Added ${track.kind} track to connection with ${targetUserId}`);
        } catch (error) {
          console.error(`[peer] ❌ Error adding track:`, error);
        }
      });
    } else {
      console.warn(`[peer] ⚠️ No local stream available when creating connection to ${targetUserId}`);
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && isComponentMountedRef.current) {
        console.log(`[TEST-LOG] 🔥 STEP 7a: Sending ICE candidate to ${targetUserId}`);
        console.log(`[TEST-LOG] 🧊 ICE candidate being sent:`, event.candidate.candidate?.substring(0, 50) + '...');
        socketRef.current.emit('webrtc-ice-candidate', {
          to: targetUserId,
          candidate: event.candidate
        });
        console.log(`[TEST-LOG] ✅ ICE candidate sent to ${targetUserId}`);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (!isComponentMountedRef.current) return;
      
      forceLog(`[TEST-LOG] 🔥 STEP 8: ontrack event received from ${targetUserId}`);
      const remoteStream = event.streams[0];
      
      if (remoteStream) {
        forceLog(`[TEST-LOG] 📹 Stream tracks: ${remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`).join(', ')}`);
        
        setPeerConnections(prev => 
          prev.map(conn => 
            conn.userId === targetUserId 
              ? { ...conn, stream: remoteStream, isConnected: true }
              : conn
          )
        );
        forceLog(`[TEST-LOG] ✅ STEP 9: Remote stream assigned to peer connection for ${targetUserId}`);
      } else {
        forceLog(`[TEST-LOG] ❌ No remote stream in ontrack event for ${targetUserId}`, 'error');
      }

      // 🔧 4. Adicionar fallback de reconexão se ontrack não disparar
      setTimeout(() => {
        const peerConnection = peerConnectionsRef.current.get(targetUserId);
        const peerState = peerConnections.find(p => p.userId === targetUserId);
        if (peerConnection && !peerState?.stream) {
          forceLog(`[TIMEOUT] 🔄 Nenhuma stream recebida de ${targetUserId} após 5s`, 'warn');
          // Opcional: tentar recriar offer
        }
      }, 5000);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (!isComponentMountedRef.current) return;
      
      const state = pc.connectionState;
      console.log(`[peer] 🔗 Connection state with ${targetUserId}: ${state}`);
      
      setPeerConnections(prev => 
        prev.map(conn => 
          conn.userId === targetUserId 
            ? { ...conn, isConnected: state === 'connected' }
            : conn
        )
      );
      
      if (state === 'failed' || state === 'disconnected') {
        console.log(`[peer] ❌ Connection with ${targetUserId} ${state}`);
        setTimeout(() => {
          if (isComponentMountedRef.current) {
            setPeerConnections(prev => prev.filter(conn => conn.userId !== targetUserId));
            peerConnectionsRef.current.delete(targetUserId);
          }
        }, 1000); // Small delay to allow for reconnection attempts
      }
    };

    // 🔧 3. Verificar o pc.oniceconnectionstatechange para detectar falhas
    pc.oniceconnectionstatechange = () => {
      forceLog(`[ICE] Estado ICE com ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        forceLog(`[ICE] ❌ Conexão ICE falhou com ${targetUserId}`, 'error');
      }
    };

    peerConnectionsRef.current.set(targetUserId, pc);
    // 🔧 2. Confirmar se peerConnectionsRef.current.set() está realmente sendo chamado
    console.log(`[TEST-LOG] ✅ PeerConnection adicionada ao mapa para ${targetUserId}`);
    
    return pc;
  }, [iceServers, userId]);

  // Create and send offer
  const createOffer = useCallback(async (targetUser: User) => {
    // 🔧 1. Verifique se há erro de execução ao adicionar o novo usuário
    try {
      console.log(`[TEST-LOG] 🔥 STEP 2: Creating offer for ${targetUser.name} (${targetUser.id})`);
      
      const pc = createPeerConnection(targetUser.id, ''); // socketId will be resolved by backend
      if (!pc) {
        console.error(`[TEST-LOG] ❌ Failed to create peer connection for ${targetUser.id}`);
        return;
      }
      
      console.log(`[TEST-LOG] 🔗 Peer connection created for ${targetUser.id}`);
      
      const offer = await pc.createOffer();
      console.log(`[TEST-LOG] 📝 Offer created for ${targetUser.id}:`, offer.type, offer.sdp?.substring(0, 100) + '...');
      
      await pc.setLocalDescription(offer);
      console.log(`[TEST-LOG] 📌 Local description set for ${targetUser.id}`);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', {
          to: targetUser.id,
          offer
        });
        console.log(`[TEST-LOG] ✅ STEP 3: Offer sent to ${targetUser.id} via socket`);
      }

      // 🔥 CORREÇÃO CRÍTICA: Adicionar ao peerConnectionsRef para que handleAnswer possa encontrar
      peerConnectionsRef.current.set(targetUser.id, pc);
      console.log(`[TEST-LOG] ✅ Peer connection stored in ref for ${targetUser.id}`);
      // 🔧 2. Confirmar se peerConnectionsRef.current.set() está realmente sendo chamado
      console.log(`[TEST-LOG] ✅ PeerConnection adicionada ao mapa para ${targetUser.id}`);

      setPeerConnections(prev => {
        // Safety check to prevent state corruption
        if (!isComponentMountedRef.current) return prev;
        
        // Check for duplicates to prevent multiple entries
        const exists = prev.some(conn => conn.userId === targetUser.id);
        if (exists) {
          forceLog(`[TEST-LOG] ⚠️ Peer connection already exists for ${targetUser.id}, skipping`, 'warn');
          return prev;
        }
        
        return [...prev, { 
          userId: targetUser.id, 
          socketId: '', // Will be updated when we get the socket mapping
          connection: pc,
          isConnected: false
        }];
      });
    } catch (error) {
      console.error('[FATAL] ❌ Erro ao criar offer para novo usuário:', error);
    }
  }, [createPeerConnection]);

  // Handle incoming offer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleOffer = useCallback(async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
    try {
      console.log(`[TEST-LOG] 🔥 STEP 4: Received offer from ${data.from}`);
      console.log(`[TEST-LOG] 📝 Offer details:`, data.offer.type, data.offer.sdp?.substring(0, 100) + '...');
      
      if (!data.from) {
        console.error('[TEST-LOG] ❌ Received offer with undefined from field');
        return;
      }
      
      const pc = createPeerConnection(data.from, ''); // socketId will be resolved by backend
      if (!pc) {
        console.error(`[TEST-LOG] ❌ Failed to create peer connection for ${data.from}`);
        return;
      }
      
      console.log(`[TEST-LOG] 🔗 Peer connection created for incoming offer from ${data.from}`);
      
      await pc.setRemoteDescription(data.offer);
      console.log(`[TEST-LOG] 📌 Remote description set for ${data.from}`);
      
      const answer = await pc.createAnswer();
      console.log(`[TEST-LOG] 📝 Answer created for ${data.from}:`, answer.type, answer.sdp?.substring(0, 100) + '...');
      
      await pc.setLocalDescription(answer);
      console.log(`[TEST-LOG] 📌 Local description (answer) set for ${data.from}`);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc-answer', {
          to: data.from,
          answer
        });
        console.log(`[TEST-LOG] ✅ STEP 5: Answer sent to ${data.from} via socket`);
      }

      // 🔥 CORREÇÃO CRÍTICA: Adicionar ao peerConnectionsRef para que ICE candidates possam encontrar
      peerConnectionsRef.current.set(data.from, pc);
      console.log(`[TEST-LOG] ✅ Peer connection stored in ref for ${data.from}`);
      // 🔧 2. Confirmar se peerConnectionsRef.current.set() está realmente sendo chamado
      console.log(`[TEST-LOG] ✅ PeerConnection adicionada ao mapa para ${data.from}`);

      setPeerConnections(prev => {
        // Safety check to prevent state corruption
        if (!isComponentMountedRef.current) return prev;
        
        // Check for duplicates to prevent multiple entries
        const exists = prev.some(conn => conn.userId === data.from);
        if (exists) {
          forceLog(`[TEST-LOG] ⚠️ Peer connection already exists for ${data.from}, skipping`, 'warn');
          return prev;
        }
        
        return [...prev, { 
          userId: data.from, 
          socketId: '', // Will be updated when we get the socket mapping
          connection: pc,
          isConnected: false
        }];
      });
    } catch (error) {
      console.error(`[TEST-LOG] ❌ Error handling offer from ${data.from}:`, error);
    }
  }, []);

  // Handle incoming answer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleAnswer = useCallback(async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
    try {
      console.log(`[TEST-LOG] 🔥 STEP 6: Received answer from ${data?.from || 'undefined'}`);
      console.log(`[TEST-LOG] 📝 Answer details:`, data?.answer?.type, data?.answer?.sdp?.substring(0, 100) + '...');
      
      if (!data || !data.from) {
        console.error('[TEST-LOG] ❌ Received answer with invalid data:', data);
        return;
      }
      
      if (!data.answer) {
        console.error('[TEST-LOG] ❌ Received answer without answer data from', data.from);
        return;
      }
      
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        await pc.setRemoteDescription(data.answer);
        console.log(`[TEST-LOG] ✅ Answer processed and remote description set for ${data.from}`);
        console.log(`[TEST-LOG] 🔗 Connection state: ${pc.connectionState}, ICE state: ${pc.iceConnectionState}`);
      } else {
        console.error(`[TEST-LOG] ❌ CRITICAL: No peer connection found for answer from ${data.from}`);
        console.error(`[TEST-LOG] ❌ This should not happen - peer connection should exist from createOffer or handleOffer`);
        console.error(`[TEST-LOG] ❌ Available connections:`, Array.from(peerConnectionsRef.current.keys()));
        return;
      }
    } catch (error) {
      console.error(`[TEST-LOG] ❌ Error handling answer from ${data?.from || 'undefined'}:`, error);
    }
  }, [createPeerConnection]);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    try {
      console.log(`[TEST-LOG] 🔥 STEP 7: Received ICE candidate from ${data?.from || 'undefined'}`);
      console.log(`[TEST-LOG] 🧊 ICE candidate:`, data?.candidate?.candidate?.substring(0, 50) + '...');
      
      if (!data || !data.from) {
        console.error('[TEST-LOG] ❌ Received ICE candidate with invalid data:', data);
        return;
      }
      
      if (!data.candidate) {
        console.error('[TEST-LOG] ❌ Received ICE candidate without candidate data from', data.from);
        return;
      }
      
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        await pc.addIceCandidate(data.candidate);
        console.log(`[TEST-LOG] ✅ ICE candidate processed for ${data.from}`);
        console.log(`[TEST-LOG] 🔗 ICE connection state: ${pc.iceConnectionState}`);
      } else {
        console.warn(`[TEST-LOG] ⚠️ No peer connection found for ICE candidate from ${data.from}`);
      }
    } catch (error) {
      console.error(`[TEST-LOG] ❌ Error handling ICE candidate from ${data?.from || 'undefined'}:`, error);
    }
  }, []);

  // Attempt reconnection with exponential backoff and URL fallback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const attemptReconnection = useCallback(() => {
    if (!isComponentMountedRef.current || reconnectionRef.current.isReconnecting) return;

    const { attempts, maxAttempts } = reconnectionRef.current;
    
    // Se esgotamos as tentativas com a URL atual, tente a próxima URL de fallback
    if (attempts >= maxAttempts) {
      if (fallbackIndex < FALLBACK_URLS.length - 1) {
        const nextIndex = fallbackIndex + 1;
        const nextUrl = FALLBACK_URLS[nextIndex];
        
        console.log(`🔄 Tentando URL de fallback: ${nextUrl}`);
        setCurrentSocketUrl(nextUrl);
        setFallbackIndex(nextIndex);
        
        // Reset tentativas para a nova URL
        reconnectionRef.current.attempts = 0;
        reconnectionRef.current.isReconnecting = false;
        
        // Tente conectar imediatamente com a nova URL
        setTimeout(() => initializeSocketInternal(), 1000);
        return;
      }
      
      console.error('❌ Todas as tentativas de reconexão falharam');
      setError(`Não foi possível conectar ao servidor. URLs tentadas: ${[SOCKET_URL, ...FALLBACK_URLS.slice(0, fallbackIndex + 1)].join(', ')}`);
      setConnectionStatus('disconnected');
      return;
    }

    reconnectionRef.current.isReconnecting = true;
    reconnectionRef.current.attempts += 1;
    setConnectionStatus('reconnecting');

    const delay = calculateBackoffDelay(attempts);
    const currentUrl = currentSocketUrl;
    
    console.log(`🔄 Tentativa ${attempts + 1}/${maxAttempts} para ${currentUrl} em ${Math.round(delay/1000)}s...`);
    
    if (reconnectionRef.current.lastError) {
      console.log(`   Último erro: ${reconnectionRef.current.lastError}`);
    }

    reconnectionRef.current.timeoutId = setTimeout(() => {
      if (!isComponentMountedRef.current) return;
      
      reconnectionRef.current.isReconnecting = false;
      initializeSocketInternal();
    }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateBackoffDelay, currentSocketUrl, fallbackIndex]);

  // Internal socket initialization function
  const initializeSocketInternal = useCallback(() => {
    if (!isComponentMountedRef.current) return;

    try {
      const socketUrl = currentSocketUrl;
      const transports = getSocketTransports(socketUrl);
      
      console.log('Initializing socket connection...');
      setConnectionStatus('connecting');
      
      // Disconnect existing socket if any
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }

      const socket = io(socketUrl, {
        transports,
        timeout: 15000, // Aumentado para 15s
        forceNew: true,
        reconnection: false, // We handle reconnection manually
        upgrade: true, // Allow transport upgrades
        rememberUpgrade: false, // Don't remember upgrades between sessions
        path: "/socket.io" // obrigatório para evitar erro
      });
      
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!isComponentMountedRef.current) return;
        
        console.log('Socket connected successfully');
        setConnectionStatus('connected');
        setError('');
        resetReconnectionState();
        
        // Reset reconnection state on successful connection
        reconnectionRef.current.attempts = 0;
        reconnectionRef.current.isReconnecting = false;
        reconnectionRef.current.lastError = null;
        
        // Small delay to ensure socket is fully ready
        setTimeout(() => {
          if (isComponentMountedRef.current && socketRef.current?.connected) {
            console.log('Joining room:', roomId);
            // Join room with correct format
            socket.emit('join-room', { 
              roomId, 
              user: { 
                id: userId, 
                name: userName 
              } 
            });
          }
        }, 100);
      });

      socket.on('disconnect', (reason) => {
        if (!isComponentMountedRef.current) return;
        
        console.log(`Socket disconnected: ${reason}`);
        setConnectionStatus('disconnected');
        
        // Store the disconnect reason for debugging
        reconnectionRef.current.lastError = `Disconnect: ${reason}`;
        
        // Only attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
          attemptReconnection();
        }
      });

      socket.on('connect_error', (error) => {
        if (!isComponentMountedRef.current) return;
        
        const errorMsg = error.message || error.toString();
        console.error('Socket connection error:', errorMsg);
        
        setConnectionStatus('disconnected');
        setError(`Erro de conexão: ${errorMsg}`);
        reconnectionRef.current.lastError = errorMsg;
        attemptReconnection();
      });

      // Handle room events
      socket.on('room-users', (users: User[]) => {
        if (!isComponentMountedRef.current) return;
        
        try {
          forceLog(`[ROOM-DEBUG] 👥 Room users received for room ${roomId}:`, 'warn');
          forceLog(`[ROOM-DEBUG] 📊 Number of users: ${users?.length || 0}`, 'warn');
          forceLog(`[ROOM-DEBUG] 👤 Current user: ${userName} (${userId})`, 'warn');
          forceLog(`[ROOM-DEBUG] 📋 Users list: ${JSON.stringify(users?.map(u => ({id: u.id, name: u.name})) || [])}`, 'warn');
          
          // Validate users array
          const validUsers = Array.isArray(users) ? users.filter(user => user && user.id && user.name) : [];
          setUsersInRoom(validUsers);
          
          forceLog(`[ROOM-DEBUG] ✅ Valid users set: ${validUsers.length}`, 'warn');
          
          // Create offers for existing users (excluding self)
          validUsers.forEach(async (user) => {
            if (user.id !== userId && !peerConnectionsRef.current.has(user.id)) {
              forceLog(`[ROOM-DEBUG] 📞 Creating offer for existing user: ${user.name} (${user.id})`, 'warn');
              try {
                await createOffer(user);
              } catch (error) {
                forceLog(`[FATAL] ❌ Erro ao criar offer para usuário existente: ${error}`, 'error');
              }
            } else if (user.id === userId) {
              forceLog(`[ROOM-DEBUG] 🚫 Skipping self: ${user.name} (${user.id})`, 'warn');
            } else {
              forceLog(`[ROOM-DEBUG] 🔄 Connection already exists for: ${user.name} (${user.id})`, 'warn');
            }
          });
        } catch (error) {
          forceLog(`[FATAL] ❌ Erro no handler room-users: ${error}`, 'error');
        }
      });

      socket.on('user-joined', async (user: User) => {
        if (!isComponentMountedRef.current) return;
        
        try {
          forceLog(`[USER-JOIN] 🔥 STEP 1: User joined event received in room ${roomId}`, 'warn');
          forceLog(`[USER-JOIN] 👤 New user: ${user?.name || 'Unknown'} (${user?.id || 'No ID'})`, 'warn');
          forceLog(`[USER-JOIN] 🏠 Current room: ${roomId}`, 'warn');
          forceLog(`[USER-JOIN] 👤 Current user: ${userName} (${userId})`, 'warn');
          
          // Validate user data
          if (!user || !user.id || !user.name) {
            forceLog(`[USER-JOIN] ❌ Invalid user data in user-joined event: ${JSON.stringify(user)}`, 'error');
            return;
          }
          
          // Avoid duplicates
          setUsersInRoom(prev => {
            // Extra safety check to prevent state corruption
            if (!isComponentMountedRef.current) return prev;
            
            const exists = prev.some(existingUser => existingUser.id === user.id);
            if (exists) {
              forceLog(`[USER-JOIN] ⚠️ User ${user.id} already in room, skipping`, 'warn');
              return prev;
            }
            forceLog(`[USER-JOIN] ✅ Adding user ${user.name} to room. Total will be: ${prev.length + 1}`, 'warn');
            return [...prev, user];
          });
          
          // 🔥 CORREÇÃO CRÍTICA: Criar oferta WebRTC para o novo usuário
          if (user.id !== userId && !peerConnectionsRef.current.has(user.id)) {
            forceLog(`[USER-JOIN] 🔥 STEP 1a: Will create offer for new user: ${user.name} (${user.id})`, 'warn');
            try {
              await createOffer(user);
            } catch (error) {
              forceLog(`[FATAL] ❌ Erro ao criar offer para novo usuário: ${error}`, 'error');
            }
          } else {
            forceLog(`[USER-JOIN] ⚠️ Skipping offer creation - same user or connection exists`, 'warn');
          }
        } catch (error) {
          forceLog(`[FATAL] ❌ Erro no handler user-joined: ${error}`, 'error');
        }
      });

      socket.on('user-left', (userIdLeft: string) => {
        if (!isComponentMountedRef.current) return;
        
        console.log('[socket-event] 👋 User left:', userIdLeft);
        
        if (!userIdLeft) {
          console.error('[socket-error] ❌ Invalid userIdLeft in user-left event');
          return;
        }
        
        setUsersInRoom(prev => prev.filter(user => user.id !== userIdLeft));
        
        // Close and cleanup peer connection
        const pc = peerConnectionsRef.current.get(userIdLeft);
        if (pc) {
          console.log(`[peer] 🧹 Closing connection to ${userIdLeft}`);
          pc.close();
          peerConnectionsRef.current.delete(userIdLeft);
        }
        setPeerConnections(prev => prev.filter(conn => conn.userId !== userIdLeft));
      });

      // WebRTC signaling events
      socket.on('webrtc-offer', handleOffer);
      socket.on('webrtc-answer', handleAnswer);
      socket.on('webrtc-ice-candidate', handleIceCandidate);

      socket.on('error', (error: string) => {
        if (!isComponentMountedRef.current) return;
        
        console.error('❌ Socket error:', error);
        setError(`Erro do servidor: ${error}`);
      });

    } catch (error) {
      console.error('Error initializing socket:', error);
      setConnectionStatus('disconnected');
      setError('Erro ao inicializar conexão');
      reconnectionRef.current.lastError = error instanceof Error ? error.message : String(error);
      attemptReconnection();
    }
  }, [roomId, userName, userId, resetReconnectionState, createOffer, handleOffer, handleAnswer, handleIceCandidate, attemptReconnection, currentSocketUrl]);

  // Initialize socket with reconnection logic
  const initializeSocket = useCallback(() => {
    initializeSocketInternal();
  }, [initializeSocketInternal]);

  // Initialize room
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        // Initialize media first
        await initializeLocalMedia();
        
        // Initialize socket
        initializeSocket();

      } catch (error) {
        console.error('❌ Error initializing room:', error);
        setError('Falha ao inicializar a videochamada');
      }
    };

    initializeRoom();

    // Cleanup
    return () => {
      forceLog('🧹 Cleaning up VideoRoom component...');
      isComponentMountedRef.current = false;
      
      // Clear any pending timeouts first
      clearReconnectionTimeout();
      
      // Disconnect socket safely
      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        } catch (error) {
          console.warn('Error during socket cleanup:', error);
        }
      }
      
      // Stop local media tracks
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (error) {
              console.warn('Error stopping track:', error);
            }
          });
          localStreamRef.current = null;
        } catch (error) {
          console.warn('Error during media cleanup:', error);
        }
      }
      
      // Close peer connections safely
      try {
        const currentPeerConnections = peerConnectionsRef.current;
        currentPeerConnections.forEach((pc, userId) => {
          try {
            pc.close();
          } catch (error) {
            console.warn(`Error closing peer connection for ${userId}:`, error);
          }
        });
        currentPeerConnections.clear();
      } catch (error) {
        console.warn('Error during peer connections cleanup:', error);
      }
      
      // Clear state safely
      try {
        setPeerConnections([]);
        setUsersInRoom([]);
      } catch (error) {
        console.warn('Error during state cleanup:', error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName, initializeLocalMedia, initializeSocket, clearReconnectionTimeout]);

  const handleLeaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
      socketRef.current.disconnect();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
    onLeaveRoom();
  };

  const handleCopyRoomLink = async () => {
    // Prevent multiple simultaneous copy attempts
    if (isSharing) {
      console.log('Copy already in progress, ignoring request');
      return;
    }

    setIsSharing(true);
    const shareUrl = `${window.location.origin}?roomId=${roomId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Show temporary success feedback
      const linkElement = document.querySelector('.room-link');
      if (linkElement) {
        linkElement.textContent = '✅ Link copiado!';
        setTimeout(() => {
          linkElement.textContent = shareUrl;
        }, 2000);
      }
      console.log('Room link copied to clipboard');
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError);
      // Fallback - show URL in alert
      alert(`Link da sala: ${shareUrl}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="video-room">
      <div className="video-room-header">
        <h2>Sala: {roomId}</h2>
        <div className="room-info">
          <span>👤 {userName}</span>
          <span className={`status ${connectionStatus}`}>
            {connectionStatus === 'connected' && '🟢 Conectado'}
            {connectionStatus === 'connecting' && '🔄 Conectando...'}
            {connectionStatus === 'reconnecting' && '🔄 Reconectando...'}
            {connectionStatus === 'disconnected' && '🔴 Desconectado'}
          </span>
          <span>👥 Participantes: {usersInRoom.length}</span>
        </div>
        <div className="room-actions">
          <div className="room-link-container">
            <span className="room-link-label">🔗 Link da sala:</span>
            <span 
              className="room-link" 
              onClick={handleCopyRoomLink}
              title="Clique para copiar o link"
            >
              {`${window.location.origin}?roomId=${roomId}`}
            </span>
          </div>
          <button onClick={handleLeaveRoom} className="leave-btn">
            🚪 Sair da Sala
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="videos-container">
        {/* Local video */}
        <div className="video-wrapper local">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="video-element"
          />
          <div className="video-label">Você ({userName})</div>
        </div>

        {/* Remote videos */}
        {peerConnections
          .filter(peer => peer && peer.userId && typeof peer.userId === 'string') // More strict filtering
          .map((peer) => {
            // [stream] Safe user info lookup
            const userInfo = usersInRoom.find(user => user?.id === peer.userId);
            
            // [stream] Safe display name generation with multiple fallbacks
            let displayName = 'Usuário Desconhecido';
            if (userInfo?.name) {
              displayName = userInfo.name;
            } else if (peer.userId && typeof peer.userId === 'string' && peer.userId.length > 4) {
              displayName = `Usuário ${peer.userId.slice(-4)}`;
            } else if (peer.userId) {
              displayName = `Usuário ${peer.userId}`;
            }
            
            // [stream] Add connection status indicator
            const connectionStatus = peer.isConnected ? '🟢' : '🔄';
            
            // Create stable key to prevent React DOM issues
            const stableKey = `video-${peer.userId}`;
            
            return (
              <div key={stableKey} className={`video-wrapper remote ${peer.isConnected ? 'connected' : 'connecting'}`}>
                <video
                  autoPlay
                  playsInline
                  className="video-element"
                  ref={(videoElement) => {
                    // Add safety checks to prevent DOM manipulation errors
                    if (!videoElement || !isComponentMountedRef.current) return;
                    
                    if (peer.stream) {
                      try {
                        forceLog(`[TEST-LOG] 🔥 STEP 10: Assigning stream to video element for ${peer.userId}`);
                        forceLog(`[TEST-LOG] 📹 Stream ID: ${peer.stream.id}`);
                        forceLog(`[TEST-LOG] 📹 Stream tracks: ${peer.stream.getTracks().map(t => `${t.kind}: ${t.enabled}`).join(', ')}`);
                        
                        // Only set if different to avoid unnecessary DOM updates
                        if (videoElement.srcObject !== peer.stream) {
                          videoElement.srcObject = peer.stream;
                          forceLog(`[TEST-LOG] ✅ STEP 11: Video element srcObject assigned for ${peer.userId}`);
                        }
                      } catch (error) {
                        forceLog(`[TEST-LOG] ❌ Error setting video source for ${peer.userId}: ${error}`, 'error');
                      }
                    } else {
                      // Clear srcObject if no stream to prevent stale references
                      if (videoElement.srcObject) {
                        videoElement.srcObject = null;
                        forceLog(`[TEST-LOG] 🧹 Cleared video srcObject for ${peer.userId}`);
                      }
                    }
                  }}
                />
                <div className="video-label">
                  {connectionStatus} {displayName}
                  {!peer.isConnected && <span className="connecting-indicator"> (conectando...)</span>}
                </div>
                {!peer.stream && (
                  <div className="no-stream-overlay">
                    <div className="no-stream-message">
                      📹 Aguardando vídeo...
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        
        {/* Show message when waiting for others */}
        {peerConnections.length === 0 && (
          <div className="waiting-message">
            <h3>🔗 Aguardando outros participantes...</h3>
            <p>Clique no link acima para copiá-lo e compartilhar com outras pessoas!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoRoom;