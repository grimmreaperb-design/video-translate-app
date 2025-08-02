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
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// Services
const supabaseService = new supabaseService_1.SupabaseService();
const translationService = new translationService_1.TranslationService();
const transcriptionService = new transcriptionService_1.TranscriptionService();
const ttsService = new ttsService_1.TTSService();
// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Backend is running!",
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
        await supabaseService.sendMagicLink(email);
        res.json({ message: "Magic link sent successfully" });
    }
    catch (error) {
        console.error("Magic link error:", error);
        res.status(500).json({ error: "Failed to send magic link" });
    }
});
app.post("/api/auth/signout", async (req, res) => {
    try {
        await supabaseService.signOut();
        res.json({ message: "Signed out successfully" });
    }
    catch (error) {
        console.error("Sign out error:", error);
        res.status(500).json({ error: "Failed to sign out" });
    }
});
// User routes
app.post("/api/users", async (req, res) => {
    try {
        const { email, name, language } = req.body;
        const user = await supabaseService.createUser({ email, name, language });
        res.json({ user });
    }
    catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
app.get("/api/users/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await supabaseService.getUserById(id);
        res.json({ user });
    }
    catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});
// Room routes
app.post("/api/rooms", async (req, res) => {
    try {
        const { name, creatorId } = req.body;
        const room = await supabaseService.createRoom({ name, creator_id: creatorId });
        res.json({ room });
    }
    catch (error) {
        console.error("Create room error:", error);
        res.status(500).json({ error: "Failed to create room" });
    }
});
app.get("/api/rooms", async (req, res) => {
    try {
        const rooms = await supabaseService.getRooms();
        res.json({ rooms });
    }
    catch (error) {
        console.error("Get rooms error:", error);
        res.status(500).json({ error: "Failed to get rooms" });
    }
});
app.get("/api/rooms/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const room = await supabaseService.getRoomById(id);
        res.json({ room });
    }
    catch (error) {
        console.error("Get room error:", error);
        res.status(500).json({ error: "Failed to get room" });
    }
});
app.post("/api/rooms/:id/join", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        await supabaseService.joinRoom(id, userId);
        res.json({ message: "Joined room successfully" });
    }
    catch (error) {
        console.error("Join room error:", error);
        res.status(500).json({ error: "Failed to join room" });
    }
});
app.post("/api/rooms/:id/leave", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        await supabaseService.leaveRoom(id, userId);
        res.json({ message: "Left room successfully" });
    }
    catch (error) {
        console.error("Leave room error:", error);
        res.status(500).json({ error: "Failed to leave room" });
    }
});
// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    // Join a room
    socket.on("join-room", async (data) => {
        try {
            const { roomId, userId } = data;
            // Get room and participants
            const room = await supabaseService.getRoomById(roomId);
            const participants = await supabaseService.getRoomParticipants(roomId);
            socket.join(roomId);
            // Send room state to the joining user
            socket.emit("room-state", { room, participants });
            // Notify others in the room
            socket.to(roomId).emit("user-joined", { userId, roomId });
            console.log(`User ${userId} joined room ${roomId}`);
        }
        catch (error) {
            console.error("Error joining room:", error);
            socket.emit("error", "Failed to join room");
        }
    });
    // Leave a room
    socket.on("leave-room", async (data) => {
        try {
            const { roomId, userId } = data;
            socket.leave(roomId);
            socket.to(roomId).emit("user-left", { userId, roomId });
            console.log(`User ${userId} left room ${roomId}`);
        }
        catch (error) {
            console.error("Error leaving room:", error);
        }
    });
    // Handle audio chunks
    socket.on("audio-chunk", async (data) => {
        try {
            const { userId, roomId, audioData, timestamp } = data;
            // Transcribe the audio
            const transcription = await transcriptionService.transcribe(audioData);
            if (transcription.text.trim()) {
                // Get room participants
                const participants = await supabaseService.getRoomParticipants(roomId);
                const currentUser = participants.find((p) => p.user_id === userId);
                if (currentUser) {
                    // Translate for each participant with different language
                    for (const participant of participants) {
                        if (participant.user_id !== userId &&
                            participant.user.language !== currentUser.user.language) {
                            const translation = await translationService.translate(transcription.text, currentUser.user.language, participant.user.language);
                            // Generate audio for the translated text
                            const audioResult = await ttsService.synthesize(translation.translatedText, "default");
                            // Send translated audio to the specific user
                            socket.to(roomId).emit("translated-audio", {
                                audioBuffer: audioResult.audioBuffer,
                                userId: participant.user_id,
                                roomId,
                                originalText: transcription.text,
                                translatedText: translation.translatedText,
                                sourceLanguage: currentUser.user.language,
                                targetLanguage: participant.user.language,
                                provider: translation.provider
                            });
                        }
                    }
                    // Send transcription back to sender
                    socket.emit("transcription", {
                        text: transcription.text,
                        language: transcription.language,
                        confidence: transcription.confidence,
                        provider: transcription.provider
                    });
                }
            }
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map