import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, FALLBACK_URLS, getSocketTransports } from '../config';
import './VideoRoom.css';

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
      console.log('🎥 Initializing local media...');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video to avoid feedback
      }
      
      console.log('✅ Local media initialized');
      setError('');
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media:', error);
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
        console.log(`[peer] 🧊 Sending ICE candidate to ${targetUserId}`);
        socketRef.current.emit('webrtc-ice-candidate', {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      if (!isComponentMountedRef.current) return;
      
      console.log(`[stream] 📹 Received stream from ${targetUserId}`);
      const [remoteStream] = event.streams;
      
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

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      if (!isComponentMountedRef.current) return;
      console.log(`[peer] 🧊 ICE connection state with ${targetUserId}: ${pc.iceConnectionState}`);
    };

    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  }, [iceServers, userId]);

  // Create and send offer
  const createOffer = useCallback(async (targetUser: User) => {
    try {
      console.log(`[socket-event] 📞 Creating offer for ${targetUser.name} (${targetUser.id})`);
      
      const pc = createPeerConnection(targetUser.id, ''); // socketId will be resolved by backend
      if (!pc) {
        console.error(`[socket-error] ❌ Failed to create peer connection for ${targetUser.id}`);
        return;
      }
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc-offer', {
          to: targetUser.id,
          offer
        });
        console.log(`[socket-event] ✅ Offer sent to ${targetUser.id}`);
      }

      setPeerConnections(prev => [...prev, { 
        userId: targetUser.id, 
        socketId: '', // Will be updated when we get the socket mapping
        connection: pc,
        isConnected: false
      }]);
    } catch (error) {
      console.error(`[socket-error] ❌ Error creating offer for ${targetUser.id}:`, error);
    }
  }, [createPeerConnection]);

  // Handle incoming offer
  const handleOffer = useCallback(async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
    try {
      console.log(`[socket-event] 📞 Received offer from ${data.from}`);
      
      if (!data.from) {
        console.error('[socket-error] ❌ Received offer with undefined from field');
        return;
      }
      
      const pc = createPeerConnection(data.from, ''); // socketId will be resolved by backend
      if (!pc) {
        console.error(`[socket-error] ❌ Failed to create peer connection for ${data.from}`);
        return;
      }
      
      await pc.setRemoteDescription(data.offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if (socketRef.current) {
        socketRef.current.emit('webrtc-answer', {
          to: data.from,
          answer
        });
        console.log(`[socket-event] ✅ Answer sent to ${data.from}`);
      }

      setPeerConnections(prev => [...prev, { 
        userId: data.from, 
        socketId: '', // Will be updated when we get the socket mapping
        connection: pc,
        isConnected: false
      }]);
    } catch (error) {
      console.error(`[socket-error] ❌ Error handling offer from ${data.from}:`, error);
    }
  }, [createPeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
    try {
      console.log(`[socket-event] 📞 Received answer from ${data?.from || 'undefined'}`);
      
      if (!data || !data.from) {
        console.error('[socket-error] ❌ Received answer with invalid data:', data);
        return;
      }
      
      if (!data.answer) {
        console.error('[socket-error] ❌ Received answer without answer data from', data.from);
        return;
      }
      
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        await pc.setRemoteDescription(data.answer);
        console.log(`[peer] ✅ Answer processed for ${data.from}`);
      } else {
        console.warn(`[peer] ⚠️ No peer connection found for user ${data.from} - creating new one`);
        // Try to create a new connection if we don't have one
        const newPc = createPeerConnection(data.from, '');
        if (newPc) {
          await newPc.setRemoteDescription(data.answer);
          setPeerConnections(prev => [...prev, { 
            userId: data.from, 
            socketId: '', 
            connection: newPc,
            isConnected: false
          }]);
        }
      }
    } catch (error) {
      console.error(`[socket-error] ❌ Error handling answer from ${data?.from || 'undefined'}:`, error);
    }
  }, [createPeerConnection]);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    try {
      console.log(`[socket-event] 🧊 Received ICE candidate from ${data?.from || 'undefined'}`);
      
      if (!data || !data.from) {
        console.error('[socket-error] ❌ Received ICE candidate with invalid data:', data);
        return;
      }
      
      if (!data.candidate) {
        console.error('[socket-error] ❌ Received ICE candidate without candidate data from', data.from);
        return;
      }
      
      const pc = peerConnectionsRef.current.get(data.from);
      if (pc) {
        await pc.addIceCandidate(data.candidate);
        console.log(`[peer] ✅ ICE candidate processed for ${data.from}`);
      } else {
        console.warn(`[peer] ⚠️ No peer connection found for ICE candidate from ${data.from}`);
      }
    } catch (error) {
      console.error(`[socket-error] ❌ Error handling ICE candidate from ${data?.from || 'undefined'}:`, error);
    }
  }, []);

  // Attempt reconnection with exponential backoff and URL fallback
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
        
        console.log('[socket-event] 👥 Room users received:', users?.length || 0, 'users');
        
        // Validate users array
        const validUsers = Array.isArray(users) ? users.filter(user => user && user.id && user.name) : [];
        setUsersInRoom(validUsers);
        
        // Create offers for existing users (excluding self)
        validUsers.forEach(user => {
          if (user.id !== userId && !peerConnectionsRef.current.has(user.id)) {
            console.log(`[socket-event] 📞 Creating offer for existing user: ${user.name} (${user.id})`);
            createOffer(user);
          }
        });
      });

      socket.on('user-joined', (user: User) => {
        if (!isComponentMountedRef.current) return;
        
        console.log('[socket-event] 👤 User joined:', user?.name || 'Unknown', user?.id || 'No ID');
        
        // Validate user data
        if (!user || !user.id || !user.name) {
          console.error('[socket-error] ❌ Invalid user data in user-joined event:', user);
          return;
        }
        
        // Avoid duplicates
        setUsersInRoom(prev => {
          const exists = prev.some(existingUser => existingUser.id === user.id);
          if (exists) {
            console.log(`[socket-event] ⚠️ User ${user.id} already in room, skipping`);
            return prev;
          }
          return [...prev, user];
        });
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
      console.log('🧹 Cleaning up...');
      isComponentMountedRef.current = false;
      
      clearReconnectionTimeout();
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const peerConnections = peerConnectionsRef.current;
      peerConnections.forEach(pc => pc.close());
      peerConnections.clear();
    };
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
          .filter(peer => peer && peer.userId) // Filter out invalid peers
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
            
            return (
              <div key={peer.userId || `peer-${Math.random()}`} className={`video-wrapper remote ${peer.isConnected ? 'connected' : 'connecting'}`}>
                <video
                  autoPlay
                  playsInline
                  className="video-element"
                  ref={(videoElement) => {
                    if (videoElement && peer.stream) {
                      try {
                        videoElement.srcObject = peer.stream;
                        console.log(`[stream] ✅ Video element updated for ${peer.userId}`);
                      } catch (error) {
                        console.error(`[stream] ❌ Error setting video source for ${peer.userId}:`, error);
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