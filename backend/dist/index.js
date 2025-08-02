"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const supabaseService_1 = require("./services/supabaseService");
const translationService_1 = require("./services/translationService");
const transcriptionService_1 = require("./services/transcriptionService");
const ttsService_1 = require("./services/ttsService");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["https://video-translate-app.vercel.app", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
    },
});
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: ["https://video-translate-app.vercel.app", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// Services
let supabaseService;
try {
    supabaseService = new supabaseService_1.SupabaseService();
    logger_1.logger.info("Supabase connected successfully");
}
catch (error) {
    logger_1.logger.warn("Supabase connection failed, using fallback mode");
    supabaseService = null;
}
const translationService = new translationService_1.TranslationService();
const transcriptionService = new transcriptionService_1.TranscriptionService();
const ttsService = new ttsService_1.TTSService();
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
    }
    catch (error) {
        logger_1.logger.error("Magic link error:", error);
        res.status(500).json({ error: "Failed to send magic link" });
    }
});
app.post("/api/auth/signout", async (req, res) => {
    try {
        if (supabaseService) {
            await supabaseService.signOut();
        }
        res.json({ message: "Signed out successfully" });
    }
    catch (error) {
        logger_1.logger.error("Sign out error:", error);
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
        }
        else {
            // Fallback: create user in memory
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const user = { id: userId, email, name, language, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            res.json({ user });
        }
    }
    catch (error) {
        logger_1.logger.error("Create user error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
app.get("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (supabaseService) {
            const user = await supabaseService.getUserById(id);
            res.json({ user });
        }
        else {
            res.status(404).json({ error: "User not found (fallback mode)" });
        }
    }
    catch (error) {
        logger_1.logger.error("Get user error:", error);
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
        }
        else {
            // Fallback: create room in memory
            const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const room = { id: roomId, name, creator_id: creatorId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            res.json({ room });
        }
    }
    catch (error) {
        logger_1.logger.error("Create room error:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
});
app.get("/api/rooms", async (req, res) => {
    try {
        if (supabaseService) {
            const rooms = await supabaseService.getRooms();
            res.json({ rooms });
        }
        else {
            res.json({ rooms: [] });
        }
    }
    catch (error) {
        logger_1.logger.error("Get rooms error:", error);
        res.status(500).json({ error: "Failed to get rooms" });
    }
});
app.get("/api/rooms/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (supabaseService) {
            const room = await supabaseService.getRoomById(id);
            res.json({ room });
        }
        else {
            res.status(404).json({ error: "Room not found (fallback mode)" });
        }
    }
    catch (error) {
        logger_1.logger.error("Get room error:", error);
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
    }
    catch (error) {
        logger_1.logger.error("Join room error:", error);
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
    }
    catch (error) {
        logger_1.logger.error("Leave room error:", error);
        res.status(500).json({ error: "Failed to leave room" });
    }
});
// Onboarding routes removed - no longer needed
// Map to store room users: roomId -> Set of socketIds
const roomUsers = new Map();
// Socket.IO connection handling
io.on("connection", (socket) => {
    logger_1.logger.info(`🔌 User connected: ${socket.id}`);
    // Join a room
    socket.on("join-room", async (data) => {
        try {
            const { roomId, userId } = data;
            socket.join(roomId);
            // Initialize room if it doesn't exist
            if (!roomUsers.has(roomId)) {
                roomUsers.set(roomId, new Set());
            }
            // Get existing users in the room
            const existingUsers = Array.from(roomUsers.get(roomId) || []);
            // Add current user to room
            roomUsers.get(roomId).add(socket.id);
            logger_1.logger.info(`👥 User ${socket.id} joined room ${roomId}. Existing users: [${existingUsers.join(', ')}]`);
            // Send existing users to the new user
            socket.emit("room-users", { users: existingUsers });
            // Notify existing users about the new user
            socket.to(roomId).emit("user-joined", { socketId: socket.id, userId, roomId });
            // Send room state to the joining user
            if (supabaseService) {
                const room = await supabaseService.getRoomById(roomId);
                const participants = await supabaseService.getRoomParticipants(roomId);
                socket.emit("room-state", { room, participants });
            }
            else {
                socket.emit("room-state", { room: null, participants: [] });
            }
            logger_1.logger.info(`📊 Room ${roomId} now has ${roomUsers.get(roomId).size} users`);
        }
        catch (error) {
            logger_1.logger.error("❌ Error joining room:", error);
            socket.emit("error", "Failed to join room");
        }
    });
    // Leave a room
    socket.on("leave-room", async (data) => {
        try {
            const { roomId, userId } = data;
            socket.leave(roomId);
            // Remove user from room map
            if (roomUsers.has(roomId)) {
                roomUsers.get(roomId).delete(socket.id);
                if (roomUsers.get(roomId).size === 0) {
                    roomUsers.delete(roomId);
                }
            }
            socket.to(roomId).emit("user-left", { socketId: socket.id, userId, roomId });
            logger_1.logger.info(`👋 User ${socket.id} left room ${roomId}`);
        }
        catch (error) {
            logger_1.logger.error("❌ Error leaving room:", error);
        }
    });
    // WebRTC Signaling Events
    socket.on("offer", ({ to, from, offer }) => {
        logger_1.logger.info(`📤 Offer from ${from} to ${to}`);
        socket.to(to).emit("offer", { from, offer });
    });
    socket.on("answer", ({ to, from, answer }) => {
        logger_1.logger.info(`📤 Answer from ${from} to ${to}`);
        socket.to(to).emit("answer", { from, answer });
    });
    socket.on("ice-candidate", ({ to, from, candidate }) => {
        logger_1.logger.info(`📤 ICE candidate from ${from} to ${to}`);
        socket.to(to).emit("ice-candidate", { from, candidate });
    });
    // Handle audio chunks
    socket.on("audio-chunk", async (data) => {
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
                const translation = await translationService.translate(transcription.text, "en", "pt");
                // Send translated text to others
                socket.to(roomId).emit("translated-text", {
                    originalText: transcription.text,
                    translatedText: translation.translatedText,
                    sourceLanguage: "en",
                    targetLanguage: "pt",
                    provider: translation.provider
                });
            }
        }
        catch (error) {
            logger_1.logger.error("Error processing audio chunk:", error);
            socket.emit("error", "Failed to process audio");
        }
    });
    // Handle disconnection
    socket.on("disconnect", () => {
        logger_1.logger.info(`🔌 User disconnected: ${socket.id}`);
        // Remove user from all rooms
        for (const [roomId, users] of roomUsers.entries()) {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                socket.to(roomId).emit("user-left", { socketId: socket.id, roomId });
                logger_1.logger.info(`👋 User ${socket.id} removed from room ${roomId} on disconnect`);
                // Clean up empty rooms
                if (users.size === 0) {
                    roomUsers.delete(roomId);
                    logger_1.logger.info(`🗑️ Room ${roomId} deleted (empty)`);
                }
            }
        }
    });
});
const port = process.env.PORT || 3001;
server.listen(port, () => {
    logger_1.logger.info(`🚀 Server listening on port ${port}`);
    logger_1.logger.info(`Health check: http://localhost:${port}/health`);
    logger_1.logger.info(`Frontend should be running on: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    logger_1.logger.info(`PeerJS server running on port 9000`);
});
//# sourceMappingURL=index.js.map