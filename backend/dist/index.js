"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// CORS configuration - liberado para produção
const corsOptions = {
    origin: "*", // Permite qualquer origem
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Socket.IO configuration - otimizado para produção
const io = new socket_io_1.Server(server, {
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
const rooms = new Map();
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> user
// Health check endpoint para Render - Deploy trigger
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
    socket.on('join-room', (data) => {
        let roomId;
        let user;
        console.log(`Received join-room event from socket ${socket.id}`);
        // Handle both old format (just roomId string) and new format (object with roomId and user)
        if (typeof data === 'string') {
            roomId = data;
            user = { id: socket.id, name: `User-${socket.id.slice(0, 6)}` };
            console.log(`Old format - User ${user.name} joining room ${roomId}`);
        }
        else {
            roomId = data.roomId;
            user = data.user;
            // Garantir user válido
            if (!user || !user.id || !user.name) {
                user = { id: socket.id, name: `User-${socket.id.slice(0, 6)}` };
                console.log(`Invalid user data received, using fallback: ${user.name} (${user.id})`);
            }
            console.log(`New format - User ${user.name} (${user.id}) joining room ${roomId}`);
        }
        // Leave any previous room
        if (socketUsers.has(socket.id)) {
            const currentUser = socketUsers.get(socket.id);
            if (currentUser.roomId) {
                socket.leave(currentUser.roomId);
                const currentRoom = rooms.get(currentUser.roomId);
                if (currentRoom) {
                    currentRoom.delete(socket.id);
                    if (currentRoom.size === 0) {
                        rooms.delete(currentUser.roomId);
                    }
                    else {
                        // Notify others in the previous room
                        socket.to(currentUser.roomId).emit('user-left', { id: currentUser.id, name: currentUser.name });
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
        const room = rooms.get(roomId);
        // Get current users in room (excluding the new user)
        const currentUsers = Array.from(room).filter(socketId => socketId !== socket.id).map(socketId => {
            const userSocket = io.sockets.sockets.get(socketId);
            return userSocket?.data?.user || { id: socketId, name: `User-${socketId.slice(0, 6)}` };
        });
        console.log(`Current users in room ${roomId} BEFORE adding new user:`, currentUsers);
        console.log(`Room ${roomId} size BEFORE: ${room.size - 1}, AFTER: ${room.size}`);
        // Send current users to the new user
        socket.emit('room-users', currentUsers);
        console.log(`Sent room-users event to new user ${user.name} with ${currentUsers.length} existing users`);
        // Notify existing users about the new user
        const userToEmit = { id: user.id, name: user.name };
        socket.to(roomId).emit('user-joined', userToEmit);
        console.log(`Notified ${room.size - 1} users in room ${roomId} about new user: ${userToEmit.name} (${userToEmit.id})`);
        // Log final room state
        console.log(`Room ${roomId} now has ${room.size} users total`);
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
                }
                else {
                    // Notify others in the room
                    socket.to(user.roomId).emit('user-left', { id: user.id, name: user.name });
                }
            }
            // Clean up mappings
            userSockets.delete(user.id);
            socketUsers.delete(socket.id);
        }
    });
    // WebRTC signaling - offer
    socket.on('webrtc-offer', (data) => {
        const user = socketUsers.get(socket.id);
        if (user) {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                console.log(`Offer from ${socket.id} to ${data.to}`);
                io.to(targetSocketId).emit('webrtc-offer', {
                    offer: data.offer,
                    from: user.id
                });
                console.log(`Offer forwarded to ${data.to}`);
            }
        }
    });
    // WebRTC signaling - answer
    socket.on('webrtc-answer', (data) => {
        const user = socketUsers.get(socket.id);
        if (user) {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                console.log(`Answer from ${socket.id} to ${data.to}`);
                io.to(targetSocketId).emit('webrtc-answer', {
                    answer: data.answer,
                    from: user.id
                });
                console.log(`Answer forwarded to ${data.to}`);
            }
        }
    });
    // WebRTC signaling - ICE candidate
    socket.on('webrtc-ice-candidate', (data) => {
        const user = socketUsers.get(socket.id);
        if (user) {
            const targetSocketId = userSockets.get(data.to);
            if (targetSocketId) {
                console.log(`ICE candidate from ${socket.id} to ${data.to}`);
                io.to(targetSocketId).emit('webrtc-ice-candidate', {
                    candidate: data.candidate,
                    from: user.id
                });
                console.log(`ICE candidate forwarded to ${data.to}`);
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
                    }
                    else {
                        // Notify others in the room
                        socket.to(user.roomId).emit('user-left', { id: user.id, name: user.name });
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
