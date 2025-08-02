import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Para o MVP, vamos usar apenas funcionalidades básicas sem serviços externos
console.log("🚀 Iniciando servidor em modo MVP simplificado");

// In-memory storage for rooms and users (moved up for HTTP endpoints)
const rooms = new Map();
const httpRoomUsers = new Map();

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Backend MVP is running!",
    mode: "simplified"
  });
});

// HTTP endpoints for room management
app.post("/api/rooms/:roomId/join", (req, res) => {
  try {
    const { roomId } = req.params;
    const { user } = req.body;
    
    console.log(`🚪 HTTP JOIN-ROOM request:`, { roomId, user });
    
    // Add user to room
    if (!httpRoomUsers.has(roomId)) {
      httpRoomUsers.set(roomId, []);
      console.log(`🆕 Created new room via HTTP: ${roomId}`);
    }
    
    const currentUsers = httpRoomUsers.get(roomId);
    const existingUser = currentUsers.find((u: any) => u.id === user.id);
    
    if (!existingUser) {
      currentUsers.push(user);
      httpRoomUsers.set(roomId, currentUsers);
      console.log(`➕ Added new user to room via HTTP:`, user);
    }
    
    const roomState = { 
      room: { id: roomId, name: `Room ${roomId}` }, 
      users: currentUsers 
    };
    
    console.log(`📤 Sending room state via HTTP:`, roomState);
    res.json(roomState);
  } catch (error) {
    console.error("❌ Error joining room via HTTP:", error);
    res.status(500).json({ error: "Failed to join room" });
  }
});

app.post("/api/rooms/:roomId/leave", (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    console.log(`🚪 HTTP LEAVE-ROOM request:`, { roomId, userId });
    
    // Remove user from room
    if (httpRoomUsers.has(roomId)) {
      const currentUsers = httpRoomUsers.get(roomId);
      const updatedUsers = currentUsers.filter((u: any) => u.id !== userId);
      httpRoomUsers.set(roomId, updatedUsers);
      
      console.log(`User ${userId} left room ${roomId} via HTTP. Remaining users: ${updatedUsers.length}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error leaving room via HTTP:", error);
    res.status(500).json({ error: "Failed to leave room" });
  }
});

app.get("/api/rooms/:roomId/users", (req, res) => {
  try {
    const { roomId } = req.params;
    
    const currentUsers = httpRoomUsers.get(roomId) || [];
    const roomState = { 
      room: { id: roomId, name: `Room ${roomId}` }, 
      users: currentUsers 
    };
    
    res.json(roomState);
  } catch (error) {
    console.error("❌ Error getting room users via HTTP:", error);
    res.status(500).json({ error: "Failed to get room users" });
  }
});

// Simplified routes for MVP
app.get("/api/onboarding/languages", (req, res) => {
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "pt", name: "Portuguese" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
    { code: "ru", name: "Russian" },
    { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" },
  ];
  res.json({ languages });
});

app.post("/api/onboarding/users", async (req, res) => {
  try {
    const { name, language } = req.body;
    // Fallback: create user in memory
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = { 
      id: userId, 
      name, 
      language, 
      email: `${name.toLowerCase()}@demo.com`, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    };
    res.json({ user });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Socket.IO setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  path: "/socket.io/",
});

// PeerJS will be handled client-side for Vercel deployment

// In-memory storage for rooms and users (Socket.IO)
const roomUsers = new Map();

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", async (data: { roomId: string; user: any }) => {
    try {
      console.log(`🚪 JOIN-ROOM event received:`, data);
      const { roomId, user } = data;
      
      socket.join(roomId);
      console.log(`✅ Socket ${socket.id} joined room ${roomId}`);
      
      // Add user to room
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, []);
        console.log(`🆕 Created new room: ${roomId}`);
      }
      
      const currentUsers = roomUsers.get(roomId);
      console.log(`👥 Current users in room before join:`, currentUsers);
      
      const existingUser = currentUsers.find((u: any) => u.id === user.id);
      
      if (!existingUser) {
        // Add socketId to user for tracking
        const userWithSocket = { ...user, socketId: socket.id };
        currentUsers.push(userWithSocket);
        roomUsers.set(roomId, currentUsers);
        console.log(`➕ Added new user to room:`, userWithSocket);
      } else {
        console.log(`⚠️ User already exists in room:`, existingUser);
      }
      
      console.log(`👥 Final users in room:`, currentUsers);
      
      // Send room state to the joining user (matching frontend expectation)
      const roomState = { 
        room: { id: roomId, name: `Room ${roomId}` }, 
        users: currentUsers 
      };
      console.log(`📤 Sending room-state to joining user:`, roomState);
      socket.emit("room-state", roomState);
      
      // Notify others in the room about new user
      console.log(`📢 Notifying others in room about new user:`, user);
      socket.to(roomId).emit("user-joined", user);
      
      console.log(`✅ User ${user.name} (${user.id}) joined room ${roomId}. Total users: ${currentUsers.length}`);
    } catch (error) {
      console.error("❌ Error joining room:", error);
      socket.emit("error", "Failed to join room");
    }
  });

  // Leave a room
  socket.on("leave-room", async (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;
      
      socket.leave(roomId);
      
      // Remove user from room
      if (roomUsers.has(roomId)) {
        const currentUsers = roomUsers.get(roomId);
        const updatedUsers = currentUsers.filter((u: any) => u.id !== userId);
        roomUsers.set(roomId, updatedUsers);
        
        // Notify others in the room that user left
        socket.to(roomId).emit("user-left", userId);
        
        console.log(`User ${userId} left room ${roomId}. Remaining users: ${updatedUsers.length}`);
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  });

  // WebRTC Signaling Events
  socket.on("webrtc-offer", (data: { roomId: string; targetUserId: string; offer: any; fromUserId: string }) => {
    console.log(`📞 WebRTC offer from ${data.fromUserId} to ${data.targetUserId} in room ${data.roomId}`);
    socket.to(data.roomId).emit("webrtc-offer", {
      offer: data.offer,
      fromUserId: data.fromUserId,
      targetUserId: data.targetUserId
    });
  });

  socket.on("webrtc-answer", (data: { roomId: string; targetUserId: string; answer: any; fromUserId: string }) => {
    console.log(`📞 WebRTC answer from ${data.fromUserId} to ${data.targetUserId} in room ${data.roomId}`);
    socket.to(data.roomId).emit("webrtc-answer", {
      answer: data.answer,
      fromUserId: data.fromUserId,
      targetUserId: data.targetUserId
    });
  });

  socket.on("webrtc-ice-candidate", (data: { roomId: string; targetUserId: string; candidate: any; fromUserId: string }) => {
    console.log(`🧊 ICE candidate from ${data.fromUserId} to ${data.targetUserId} in room ${data.roomId}`);
    socket.to(data.roomId).emit("webrtc-ice-candidate", {
      candidate: data.candidate,
      fromUserId: data.fromUserId,
      targetUserId: data.targetUserId
    });
  });

  // Handle audio chunks (simplified for MVP)
  socket.on("audio-chunk", async (data: any) => {
    try {
      const { userId, roomId, audioData, timestamp } = data;
      
      // For MVP, just echo back that audio was received
      socket.emit("transcription", {
        text: "Audio received (transcription disabled in MVP)",
        language: "en",
        confidence: 1.0
      });
      
      console.log(`Audio chunk received from user ${userId} in room ${roomId}`);
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      socket.emit("error", "Failed to process audio");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from all rooms
    roomUsers.forEach((users, roomId) => {
      const disconnectedUser = users.find((u: any) => u.socketId === socket.id);
      const updatedUsers = users.filter((u: any) => u.socketId !== socket.id);
      
      if (updatedUsers.length !== users.length && disconnectedUser) {
        roomUsers.set(roomId, updatedUsers);
        // Notify others in the room that user left
        socket.to(roomId).emit("user-left", disconnectedUser.id);
        console.log(`User ${disconnectedUser.name} (${disconnectedUser.id}) disconnected from room ${roomId}`);
      }
    });
  });
});

// Export for Vercel
export default app;