import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, FALLBACK_URLS, getSocketTransports } from '../config';
import { logger, setupGlobalErrorHandler } from '../utils/logger';
import './VideoRoom.css';

// 🚀 SISTEMA DE LOG INTELIGENTE: Ativo apenas em desenvolvimento
logger.log('🚀 VideoRoom carregado!');
logger.log('🔍 Sistema de logs inteligente ativo');

// Configurar handlers globais de erro (seguros para produção)
setupGlobalErrorHandler();

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
  logger.log('🎯 VideoRoom INICIADO!');
  logger.log(`👤 Usuário: ${userName}`);
  logger.log(`🏠 Sala: ${roomId}`);
  logger.log('🔍 Diagnóstico ativo - logs habilitados');
  
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
  const answersReceivedRef = useRef<Set<string>>(new Set()); // 🚨 NOVO: Rastrear answers processadas
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
      logger.log('🎥 Initializing local media...');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // 🔧 5. Verificar permissões de câmera/microfone explicitamente
      logger.log('[PERMISSION] 🔍 Verificando permissões de mídia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      logger.log(`[PERMISSION] ✅ Acesso à mídia concedido: ${stream.getTracks().map(t => t.kind).join(', ')}`);
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video to avoid feedback
      }
      
      logger.log('✅ Local media initialized');
      setError('');
      return stream;
    } catch (error) {
      logger.error(`[PERMISSION] ❌ Erro ao acessar mídia: ${error}`);
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
      
      logger.log(`[TEST-LOG] 🔥 STEP 8: ontrack event received from ${targetUserId}`);
      const remoteStream = event.streams[0];
      
      if (remoteStream) {
        logger.log(`[TEST-LOG] 📹 Stream tracks: ${remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`).join(', ')}`);
        
        setPeerConnections(prev => 
          prev.map(conn => 
            conn.userId === targetUserId 
              ? { ...conn, stream: remoteStream, isConnected: true }
              : conn
          )
        );
        logger.log(`[TEST-LOG] ✅ STEP 9: Remote stream assigned to peer connection for ${targetUserId}`);
      } else {
        logger.error(`[TEST-LOG] ❌ No remote stream in ontrack event for ${targetUserId}`);
      }

      // 🔧 4. Adicionar fallback de reconexão se ontrack não disparar
      setTimeout(() => {
        const peerConnection = peerConnectionsRef.current.get(targetUserId);
        const peerState = peerConnections.find(p => p.userId === targetUserId);
        if (peerConnection && !peerState?.stream) {
          logger.warn(`[TIMEOUT] 🔄 Nenhuma stream recebida de ${targetUserId} após 5s`);
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
            // Try to reconnect
            console.log(`[peer] 🔄 Attempting to reconnect to ${targetUserId}`);
          }
        }, 2000);
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      if (!isComponentMountedRef.current) return;
      
      logger.log(`[ICE] Estado ICE com ${targetUserId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        logger.error(`[ICE] ❌ Conexão ICE falhou com ${targetUserId}`);
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
          logger.warn(`[TEST-LOG] ⚠️ Peer connection already exists for ${targetUser.id}, skipping`);
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
      console.log(`[TEST-LOG] 🔥 STEP 4: Received offer from ${data?.from || 'undefined'}`);
      console.log(`[TEST-LOG] 📝 Offer details:`, data?.offer?.type, data?.offer?.sdp?.substring(0, 100) + '...');
      
      if (!data || !data.offer) {
        console.error('[TEST-LOG] ❌ Received offer with invalid data:', data);
        return;
      }
      
      if (!data.from) {
        console.error('[TEST-LOG] ❌ Received offer with undefined from field');
        return;
      }

      // 🚨 CORREÇÃO: Verificar se já existe uma conexão para evitar duplicatas
      const existingPc = peerConnectionsRef.current.get(data.from);
      if (existingPc) {
        console.log(`[RTC-STATE] Existing connection state: ${existingPc.signalingState}`);
        
        // Se já estamos em stable, ignorar nova offer
        if (existingPc.signalingState === 'stable') {
          console.warn(`[TEST-LOG] ⚠️ Conexão já estabelecida com ${data.from}, ignorando nova offer`);
          return;
        }
        
        // Se já estamos processando uma offer, implementar "polite peer" strategy
        if (existingPc.signalingState === 'have-remote-offer') {
          console.warn(`[TEST-LOG] ⚠️ Já processando offer de ${data.from}, ignorando duplicata`);
          return;
        }
        
        // Se temos local offer e recebemos remote offer (glare condition)
        if (existingPc.signalingState === 'have-local-offer') {
          // Implementar polite peer: quem tem ID menor "ganha"
          const isPolite = userId < data.from;
          if (isPolite) {
            console.log(`[TEST-LOG] 🤝 Glare detectado, sendo polite peer - rollback local offer`);
            // Rollback nossa offer e aceitar a deles
            await existingPc.setLocalDescription({type: 'rollback'});
          } else {
            console.log(`[TEST-LOG] 🤝 Glare detectado, sendo impolite peer - ignorando remote offer`);
            return;
          }
        }
      }
      
      const pc = existingPc || createPeerConnection(data.from, ''); // socketId will be resolved by backend
      if (!pc) {
        console.error(`[TEST-LOG] ❌ Failed to create peer connection for ${data.from}`);
        return;
      }
      
      console.log(`[TEST-LOG] 🔗 Peer connection ready for incoming offer from ${data.from}`);
      console.log(`[RTC-STATE] Before setRemoteDescription(offer): ${pc.signalingState}`);
      
      await pc.setRemoteDescription(data.offer);
      console.log(`[TEST-LOG] 📌 Remote description set for ${data.from}`);
      console.log(`[RTC-STATE] After setRemoteDescription(offer): ${pc.signalingState}`);
      
      const answer = await pc.createAnswer();
      console.log(`[TEST-LOG] 📝 Answer created for ${data.from}:`, answer.type, answer.sdp?.substring(0, 100) + '...');
      
      await pc.setLocalDescription(answer);
      console.log(`[TEST-LOG] 📌 Local description (answer) set for ${data.from}`);
      console.log(`[RTC-STATE] After setLocalDescription(answer): ${pc.signalingState}`);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc-answer', {
          to: data.from,
          answer
        });
        console.log(`[TEST-LOG] ✅ STEP 5: Answer sent to ${data.from} via socket`);
      }

      // 🔥 CORREÇÃO CRÍTICA: Adicionar ao peerConnectionsRef para que ICE candidates possam encontrar
      if (!existingPc) {
        peerConnectionsRef.current.set(data.from, pc);
        console.log(`[TEST-LOG] ✅ Peer connection stored in ref for ${data.from}`);
        
        setPeerConnections(prev => {
          // Safety check to prevent state corruption
          if (!isComponentMountedRef.current) return prev;
          
          // Check for duplicates to prevent multiple entries
          const exists = prev.some(conn => conn.userId === data.from);
          if (exists) {
            logger.log(`[TEST-LOG] ⚠️ Peer connection already exists for ${data.from}, skipping`, 'warn');
            return prev;
          }
          
          return [...prev, { 
            userId: data.from, 
            socketId: '', // Will be updated when we get the socket mapping
            connection: pc,
            isConnected: false
          }];
        });
      }
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

      // 🚨 CORREÇÃO: Verificar se já processamos answer deste peer
      if (answersReceivedRef.current.has(data.from)) {
        console.warn(`[TEST-LOG] ⚠️ Answer já processada para ${data.from}, ignorando duplicata`);
        return;
      }
      
      const pc = peerConnectionsRef.current.get(data.from);
      if (!pc) {
        console.error(`[TEST-LOG] ❌ CRITICAL: No peer connection found for answer from ${data.from}`);
        console.error(`[TEST-LOG] ❌ This should not happen - peer connection should exist from createOffer or handleOffer`);
        console.error(`[TEST-LOG] ❌ Available connections:`, Array.from(peerConnectionsRef.current.keys()));
        return;
      }

      // 🚨 CORREÇÃO CRÍTICA: Verificar estado antes de setRemoteDescription
      console.log(`[RTC-STATE] Before setRemoteDescription: ${pc.signalingState}`);
      
      // Proteger contra múltiplas chamadas de setRemoteDescription(answer)
      if (pc.signalingState === 'stable') {
        console.warn(`[TEST-LOG] ⚠️ Já em estado stable, ignorando nova answer de ${data.from}`);
        return;
      }
      
      // Verificar se já temos uma remote description
      if (pc.remoteDescription && pc.remoteDescription.type === 'answer') {
        console.warn(`[TEST-LOG] ⚠️ Remote answer já definida para ${data.from}, ignorando duplicata`);
        return;
      }
      
      // Verificar se estamos no estado correto para receber answer
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`[TEST-LOG] ⚠️ Estado incorreto para answer: ${pc.signalingState}, esperado: have-local-offer`);
        return;
      }

      // 🚨 MARCAR como processada ANTES de processar para evitar race conditions
      answersReceivedRef.current.add(data.from);

      await pc.setRemoteDescription(data.answer);
      console.log(`[TEST-LOG] ✅ Answer processed and remote description set for ${data.from}`);
      console.log(`[TEST-LOG] 🔗 Connection state: ${pc.connectionState}, ICE state: ${pc.iceConnectionState}`);
      console.log(`[RTC-STATE] After setRemoteDescription: ${pc.signalingState}`);
      
    } catch (error) {
      console.error(`[TEST-LOG] ❌ Error handling answer from ${data?.from || 'undefined'}:`, error);
      // 🚨 REMOVER da lista se houve erro para permitir retry
      if (data?.from) {
        answersReceivedRef.current.delete(data.from);
      }
    }
  }, []);

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
          logger.warn(`[ROOM-DEBUG] 👥 Room users received for room ${roomId}:`);
          logger.warn(`[ROOM-DEBUG] 📊 Number of users: ${users?.length || 0}`);
          logger.warn(`[ROOM-DEBUG] 👤 Current user: ${userName} (${userId})`);
          logger.log(`[ROOM-DEBUG] 📋 Users list: ${JSON.stringify(users?.map(u => ({id: u.id, name: u.name})) || [])}`, 'warn');
          
          // Validate users array
          const validUsers = Array.isArray(users) ? users.filter(user => user && user.id && user.name) : [];
          setUsersInRoom(validUsers);
          
          logger.warn(`[ROOM-DEBUG] ✅ Valid users set: ${validUsers.length}`);
          
          // Create offers for existing users (excluding self)
          validUsers.forEach(async (user) => {
            if (user.id !== userId && !peerConnectionsRef.current.has(user.id)) {
              logger.warn(`[ROOM-DEBUG] 📞 Creating offer for existing user: ${user.name} (${user.id})`);
              try {
                await createOffer(user);
              } catch (error) {
                logger.error(`[FATAL] ❌ Erro ao criar offer para usuário existente: ${error}`);
              }
            } else if (user.id === userId) {
              logger.warn(`[ROOM-DEBUG] 🚫 Skipping self: ${user.name} (${user.id})`);
            } else {
              logger.warn(`[ROOM-DEBUG] 🔄 Connection already exists for: ${user.name} (${user.id})`);
            }
          });
        } catch (error) {
          logger.error(`[FATAL] ❌ Erro no handler room-users: ${error}`);
        }
      });

      socket.on('user-joined', async (newUser: any) => {
        if (!isComponentMountedRef.current) return;
        
        try {
          // 🧪 Teste defensivo conforme sugerido pelo usuário
          if (typeof newUser === "string") {
            console.error("❌ Erro: user-joined veio como string:", newUser);
            return;
          } else {
            console.log("✅ user-joined OK:", newUser);
          }
          
          console.log('[USER-JOIN] Novo usuário recebido:', newUser);
          console.log("✅ Novo usuário:", newUser?.name || 'Nome não disponível');
          
          if (!newUser || !newUser.id || !newUser.name) {
            console.error('[USER-JOIN] ❌ Invalid user data in user-joined event:', JSON.stringify(newUser));
            return; // não processa dados inválidos
          }
          
          logger.warn(`[USER-JOIN] 🔥 STEP 1: User joined event received in room ${roomId}`);
          logger.warn(`[USER-JOIN] 📦 Raw data received: ${JSON.stringify(newUser)}`);
          logger.warn(`[USER-JOIN] 🔍 Data type: ${typeof newUser}`);
          
          // Robust validation for user data
          let user: User | null = null;
          
          // Case 1: newUser is already a proper User object
          if (newUser && typeof newUser === 'object' && newUser.id && newUser.name) {
            user = { id: newUser.id, name: newUser.name };
            logger.warn(`[USER-JOIN] ✅ Valid user object received: ${user.name} (${user.id})`);
          }
          // Case 2: newUser is just a string (legacy format - user ID only)
          else if (typeof newUser === 'string' && newUser.trim()) {
            user = { id: newUser, name: `User-${newUser.slice(0, 6)}` };
            logger.log(`[USER-JOIN] 🔄 Legacy format detected, created user: ${user.name} (${user.id})`, 'warn');
          }
          // Case 3: newUser is an object but missing required fields
          else if (newUser && typeof newUser === 'object') {
            if (newUser.id && !newUser.name) {
              user = { id: newUser.id, name: `User-${newUser.id.slice(0, 6)}` };
              logger.log(`[USER-JOIN] 🔧 Missing name, generated: ${user.name} (${user.id})`, 'warn');
            } else if (newUser.name && !newUser.id) {
              // Generate ID from name or timestamp
              const generatedId = `${newUser.name.replace(/\s+/g, '_')}_${Date.now()}`;
              user = { id: generatedId, name: newUser.name };
              logger.log(`[USER-JOIN] 🔧 Missing ID, generated: ${user.name} (${user.id})`, 'warn');
            } else {
              logger.error(`[USER-JOIN] ❌ Object missing both id and name: ${JSON.stringify(newUser)}`);
            }
          }
          // Case 4: Invalid data - log and ignore
          else {
            logger.error(`[USER-JOIN] ❌ Invalid user data type or empty: ${JSON.stringify(newUser)} (type: ${typeof newUser})`);
            return;
          }
          
          // Final validation
          if (!user || !user.id || !user.name) {
            logger.error(`[USER-JOIN] ❌ Failed to create valid user object from: ${JSON.stringify(newUser)}`);
            return;
          }
          
          logger.warn(`[USER-JOIN] 👤 Processed user: ${user.name} (${user.id})`);
          logger.warn(`[USER-JOIN] 🏠 Current room: ${roomId}`);
          logger.warn(`[USER-JOIN] 👤 Current user: ${userName} (${userId})`);
          
          // Avoid duplicates
          setUsersInRoom(prev => {
            // Extra safety check to prevent state corruption
            if (!isComponentMountedRef.current) return prev;
            
            const exists = prev.some(existingUser => existingUser.id === user!.id);
            if (exists) {
              logger.log(`[USER-JOIN] ⚠️ User ${user!.id} already in room, skipping`, 'warn');
              return prev;
            }
            logger.warn(`[USER-JOIN] ✅ Adding user ${user!.name} to room. Total will be: ${prev.length + 1}`);
            return [...prev, user!];
          });
          
          // 🔥 CORREÇÃO CRÍTICA: Criar oferta WebRTC para o novo usuário
          if (user.id !== userId && !peerConnectionsRef.current.has(user.id)) {
            logger.warn(`[USER-JOIN] 🔥 STEP 1a: Will create offer for new user: ${user.name} (${user.id})`);
            try {
              await createOffer(user);
            } catch (error) {
              logger.error(`[FATAL] ❌ Erro ao criar offer para novo usuário: ${error}`);
            }
          } else {
            logger.warn(`[USER-JOIN] ⚠️ Skipping offer creation - same user or connection exists`);
          }
        } catch (error) {
          logger.error(`[FATAL] ❌ Erro no handler user-joined: ${error}`);
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
      logger.log('🧹 Cleaning up VideoRoom component...');
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
        // 🚨 LIMPEZA: Reset controle de answers processadas
        answersReceivedRef.current.clear();
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
    
    // 🚨 LIMPEZA: Reset controle de answers processadas
    answersReceivedRef.current.clear();
    
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
                        logger.log(`[TEST-LOG] 🔥 STEP 10: Assigning stream to video element for ${peer.userId}`);
                        logger.log(`[TEST-LOG] 📹 Stream ID: ${peer.stream.id}`);
                        logger.log(`[TEST-LOG] 📹 Stream tracks: ${peer.stream.getTracks().map(t => `${t.kind}: ${t.enabled}`).join(', ')}`);
                        
                        // Only set if different to avoid unnecessary DOM updates
                        if (videoElement.srcObject !== peer.stream) {
                          videoElement.srcObject = peer.stream;
                          logger.log(`[TEST-LOG] ✅ STEP 11: Video element srcObject assigned for ${peer.userId}`);
                        }
                      } catch (error) {
                        logger.error(`[TEST-LOG] ❌ Error setting video source for ${peer.userId}: ${error}`);
                      }
                    } else {
                      // Clear srcObject if no stream to prevent stale references
                      if (videoElement.srcObject) {
                        videoElement.srcObject = null;
                        logger.log(`[TEST-LOG] 🧹 Cleared video srcObject for ${peer.userId}`);
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
