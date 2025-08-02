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

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://video-translate-app.vercel.app',
    'https://video-translate-app-git-main-brunomagalhaes-projects.vercel.app',
    'https://video-translate-app-brunomagalhaes-projects.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.IO configuration
const io = new Server(server, {
  cors: corsOptions
});

// In-memory storage for rooms and users
const rooms = new Map<string, Set<string>>();
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, { id: string; name: string; roomId?: string }>(); // socketId -> user

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', (data: { roomId: string; user: { id: string; name: string } }) => {
    const { roomId, user } = data;
    
    console.log(`User ${user.name} (${user.id}) joining room ${roomId}`);
    
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
  socket.on('offer', (data: { offer: RTCSessionDescriptionInit; to: string }) => {
    const user = socketUsers.get(socket.id);
    if (user) {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('offer', {
          offer: data.offer,
          from: user.id
        });
        console.log(`Offer sent from ${user.id} to ${data.to}`);
      }
    }
  });

  // WebRTC signaling - answer
  socket.on('answer', (data: { answer: RTCSessionDescriptionInit; to: string }) => {
    const user = socketUsers.get(socket.id);
    if (user) {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('answer', {
          answer: data.answer,
          from: user.id
        });
        console.log(`Answer sent from ${user.id} to ${data.to}`);
      }
    }
  });

  // WebRTC signaling - ICE candidate
  socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit; to: string }) => {
    const user = socketUsers.get(socket.id);
    if (user) {
      const targetSocketId = userSockets.get(data.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
          from: user.id
        });
        console.log(`ICE candidate sent from ${user.id} to ${data.to}`);
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

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
