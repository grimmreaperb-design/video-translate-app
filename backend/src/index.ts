import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

// WebRTC types
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer';
  sdp: string;
}

interface RTCIceCandidateInit {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

const app = express();
const server = createServer(app);

// CORS configuration - liberado para produção
const corsOptions = {
  origin: "*", // Permite qualquer origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO configuration - otimizado para produção
const io = new Server(server, {
  cors: {
    origin: "*", // Permite qualquer origem para Socket.IO
    methods: ["GET", "POST"]
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// In-memory storage for rooms and users
const rooms = new Map<string, Set<string>>();
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, { id: string; name: string; roomId?: string }>(); // socketId -> user

// Health check endpoint para Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'Video Translate Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001
  });
});

// Endpoint raiz para verificação básica
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Video Translate Backend API',
    status: 'OK',
    endpoints: {
      health: '/api/health',
      socket: '/socket.io/'
    }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', (data: string | { roomId: string; user: { id: string; name: string } }) => {
    let roomId: string;
    let user: { id: string; name: string };
    
    // Handle both old format (just roomId string) and new format (object with roomId and user)
    if (typeof data === 'string') {
      roomId = data;
      user = { id: socket.id, name: `User-${socket.id.slice(0, 6)}` };
      console.log(`User ${user.name} joining room ${roomId}`);
    } else {
      roomId = data.roomId;
      user = data.user;
      console.log(`User ${user.name} (${user.id}) joining room ${roomId}`);
    }
    
    // Leave any previous room
    if (socketUsers.has(socket.id)) {
      const currentUser = socketUsers.get(socket.id)!;
      if (currentUser.roomId) {
        socket.leave(currentUser.roomId);
        const currentRoom = rooms.get(currentUser.roomId);
        if (currentRoom) {
          currentRoom.delete(socket.id);
          if (currentRoom.size === 0) {
            rooms.delete(currentUser.roomId);
          } else {
            // Notify others in the previous room
            socket.to(currentUser.roomId).emit('user-left', currentUser.id);
          }
        }
      }
    }
    
    // Join the new room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId)!;
    
    // Get current users in the room
    const currentUsers = Array.from(room).map(socketId => {
      const userData = socketUsers.get(socketId);
      return userData ? { id: userData.id, name: userData.name } : null;
    }).filter(Boolean);
    
    // Add user to room and update mappings
    room.add(socket.id);
    userSockets.set(user.id, socket.id);
    socketUsers.set(socket.id, { ...user, roomId });
    
    // Send current users to the new user
    socket.emit('room-users', currentUsers);
    
    // Notify others about the new user
    socket.to(roomId).emit('user-joined', user);
    
    console.log(`Room ${roomId} now has ${room.size} users`);
  });

  // Handle leaving a room
  socket.on('leave-room', () => {
    const user = socketUsers.get(socket.id);
    if (user && user.roomId) {
      console.log(`User ${user.name} leaving room ${user.roomId}`);
      
      socket.leave(user.roomId);
      const room = rooms.get(user.roomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          rooms.delete(user.roomId);
        } else {
          // Notify others in the room
          socket.to(user.roomId).emit('user-left', user.id);
        }
      }
      
      // Clean up mappings
      userSockets.delete(user.id);
      socketUsers.delete(socket.id);
    }
  });

  // WebRTC signaling - offer
  socket.on('webrtc-offer', (data: { offer: RTCSessionDescriptionInit; to: string }) => {
    const user = socketUsers.get(socket.id);
    if (user) {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-offer', {
          offer: data.offer,
          from: user.id
        });
        console.log(`WebRTC Offer sent from ${user.id} to ${data.to}`);
      }
    }
  });

  // WebRTC signaling - answer
  socket.on('webrtc-answer', (data: { answer: RTCSessionDescriptionInit; to: string }) => {
    const user = socketUsers.get(socket.id);
    if (user) {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-answer', {
          answer: data.answer,
          from: user.id
        });
        console.log(`WebRTC Answer sent from ${user.id} to ${data.to}`);
      }
    }
  });

  // WebRTC signaling - ICE candidate
  socket.on('webrtc-ice-candidate', (data: { candidate: RTCIceCandidateInit; to: string }) => {
    const user = socketUsers.get(socket.id);
    if (user) {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc-ice-candidate', {
          candidate: data.candidate,
          from: user.id
        });
        console.log(`WebRTC ICE candidate sent from ${user.id} to ${data.to}`);
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = socketUsers.get(socket.id);
    if (user) {
      // Remove from room
      if (user.roomId) {
        const room = rooms.get(user.roomId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            rooms.delete(user.roomId);
          } else {
            // Notify others in the room
            socket.to(user.roomId).emit('user-left', user.id);
          }
        }
      }
      
      // Clean up mappings
      userSockets.delete(user.id);
      socketUsers.delete(socket.id);
    }
  });
});

// Configuração da porta - Render fornece automaticamente
const PORT = parseInt(process.env.PORT || '3001', 10);

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Video Translate Backend running on 0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Socket.IO ready for WebRTC signaling`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
