import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { SupabaseService } from "./services/supabaseService";
import { TranslationService } from "./services/translationService";
import { TranscriptionService } from "./services/transcriptionService";
import { TTSService } from "./services/ttsService";
import { AudioChunk } from "./types";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Services
let supabaseService: SupabaseService;
try {
  supabaseService = new SupabaseService();
  console.log("✅ Supabase connected successfully");
} catch (error) {
  console.log("⚠️  Supabase connection failed, using fallback mode");
  supabaseService = null as any;
}

const translationService = new TranslationService();
const transcriptionService = new TranscriptionService();
const ttsService = new TTSService();

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Backend is running!",
    supabase: supabaseService ? "connected" : "fallback mode",
    services: {
      translation: translationService.getAvailableProviders(),
      transcription: transcriptionService.getAvailableProviders(),
      tts: ttsService.getAvailableProviders()
    }
  });
});

// Auth routes
app.post("/api/auth/magic-link", async (req, res) => {
  try {
    const { email } = req.body;
    if (supabaseService) {
      await supabaseService.sendMagicLink(email);
    }
    res.json({ message: "Magic link sent successfully" });
  } catch (error) {
    console.error("Magic link error:", error);
    res.status(500).json({ error: "Failed to send magic link" });
  }
});

app.post("/api/auth/signout", async (req, res) => {
  try {
    if (supabaseService) {
      await supabaseService.signOut();
    }
    res.json({ message: "Signed out successfully" });
  } catch (error) {
    console.error("Sign out error:", error);
    res.status(500).json({ error: "Failed to sign out" });
  }
});

// User routes
app.post("/api/users", async (req, res) => {
  try {
    const { email, name, language } = req.body;
    if (supabaseService) {
      const user = await supabaseService.createUser({ email, name, language });
      res.json({ user });
    } else {
      // Fallback: create user in memory
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = { id: userId, email, name, language, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      res.json({ user });
    }
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (supabaseService) {
      const user = await supabaseService.getUserById(id);
      res.json({ user });
    } else {
      res.status(404).json({ error: "User not found (fallback mode)" });
    }
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Room routes
app.post("/api/rooms", async (req, res) => {
  try {
    const { name, creatorId } = req.body;
    if (supabaseService) {
      const room = await supabaseService.createRoom({ name, creator_id: creatorId });
      res.json({ room });
    } else {
      // Fallback: create room in memory
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const room = { id: roomId, name, creator_id: creatorId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      res.json({ room });
    }
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

app.get("/api/rooms", async (req, res) => {
  try {
    if (supabaseService) {
      const rooms = await supabaseService.getRooms();
      res.json({ rooms });
    } else {
      res.json({ rooms: [] });
    }
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({ error: "Failed to get rooms" });
  }
});

app.get("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (supabaseService) {
      const room = await supabaseService.getRoomById(id);
      res.json({ room });
    } else {
      res.status(404).json({ error: "Room not found (fallback mode)" });
    }
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({ error: "Failed to get room" });
  }
});

app.post("/api/rooms/:id/join", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (supabaseService) {
      await supabaseService.joinRoom(id, userId);
    }
    res.json({ message: "Joined room successfully" });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({ error: "Failed to join room" });
  }
});

app.post("/api/rooms/:id/leave", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (supabaseService) {
      await supabaseService.leaveRoom(id, userId);
    }
    res.json({ message: "Left room successfully" });
  } catch (error) {
    console.error("Leave room error:", error);
    res.status(500).json({ error: "Failed to leave room" });
  }
});

// Onboarding routes
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
    if (supabaseService) {
      const user = await supabaseService.createUser({ 
        email: `${name.toLowerCase()}@demo.com`, 
        name, 
        language 
      });
      res.json({ user });
    } else {
      // Fallback: create user in memory
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = { id: userId, name, language, email: `${name.toLowerCase()}@demo.com`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      res.json({ user });
    }
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", async (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;
      
      socket.join(roomId);
      
      // Send room state to the joining user
      if (supabaseService) {
        const room = await supabaseService.getRoomById(roomId);
        const participants = await supabaseService.getRoomParticipants(roomId);
        socket.emit("room-state", { room, participants });
      } else {
        socket.emit("room-state", { room: null, participants: [] });
      }
      
      // Notify others in the room with complete user object
      const userToEmit = {
        id: userId,
        name: `User-${userId.slice(-6)}`, // Generate a name based on userId
        room: roomId,
        socketId: socket.id
      };
      socket.to(roomId).emit("user-joined", userToEmit);
      
      console.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", "Failed to join room");
    }
  });

  // Leave a room
  socket.on("leave-room", async (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;
      
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", { userId, roomId });
      
      console.log(`User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  });

  // Handle audio chunks
  socket.on("audio-chunk", async (data: AudioChunk) => {
    try {
      const { userId, roomId, audioData, timestamp } = data;
      
      // Transcribe the audio
      const transcription = await transcriptionService.transcribe(audioData);
      
      if (transcription.text.trim()) {
        // Send transcription back to sender
        socket.emit("transcription", {
          text: transcription.text,
          language: transcription.language,
          confidence: transcription.confidence,
          provider: transcription.provider
        });
        
        // For demo purposes, translate to Portuguese
        const translation = await translationService.translate(
          transcription.text,
          "en",
          "pt"
        );
        
        // Send translated text to others
        socket.to(roomId).emit("translated-text", {
          originalText: transcription.text,
          translatedText: translation.translatedText,
          sourceLanguage: "en",
          targetLanguage: "pt",
          provider: translation.provider
        });
      }
    } catch (error) {
      console.error("Error processing audio chunk:", error);
      socket.emit("error", "Failed to process audio");
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Frontend should be running on: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
