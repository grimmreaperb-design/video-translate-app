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
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Socket.IO configuration
const io = new socket_io_1.Server(server, {
    cors: corsOptions
});
// In-memory storage for rooms and users
const rooms = new Map();
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> user
// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    // Handle joining a room
    socket.on('join-room', (data) => {
        const { roomId, user } = data;
        console.log(`🔵 User ${user.name} (${user.id}) joining room ${roomId} with socket ${socket.id}`);
        console.log(`🔍 Current rooms:`, Array.from(rooms.keys()));
        console.log(`🔍 Current users in target room:`, rooms.has(roomId) ? Array.from(rooms.get(roomId)) : 'Room does not exist yet');
        // Leave any previous room
        if (socketUsers.has(socket.id)) {
            const currentUser = socketUsers.get(socket.id);
            if (currentUser.roomId) {
                console.log(`🔄 User was in room ${currentUser.roomId}, leaving it first`);
                socket.leave(currentUser.roomId);
                const currentRoom = rooms.get(currentUser.roomId);
                if (currentRoom) {
                    currentRoom.delete(socket.id);
                    if (currentRoom.size === 0) {
                        rooms.delete(currentUser.roomId);
                        console.log(`🗑️ Room ${currentUser.roomId} deleted (empty)`);
                    }
                    else {
                        // Notify others in the previous room
                        socket.to(currentUser.roomId).emit('user-left', currentUser.id);
                        console.log(`📢 Notified users in ${currentUser.roomId} that ${currentUser.id} left`);
                    }
                }
            }
        }
        // Join the new room
        socket.join(roomId);
        console.log(`✅ Socket ${socket.id} joined room ${roomId}`);
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
            console.log(`🆕 Created new room ${roomId}`);
        }
        const room = rooms.get(roomId);
        // Get current users in the room
        const currentUsers = Array.from(room).map(socketId => {
            const userData = socketUsers.get(socketId);
            return userData ? { id: userData.id, name: userData.name } : null;
        }).filter(Boolean);
        console.log(`👥 Current users in room before adding new user:`, currentUsers);
        // Add user to room and update mappings
        room.add(socket.id);
        userSockets.set(user.id, socket.id);
        socketUsers.set(socket.id, { ...user, roomId });
        console.log(`📝 Updated mappings - userSockets:`, Object.fromEntries(userSockets));
        console.log(`📝 Updated mappings - socketUsers:`, Object.fromEntries(socketUsers));
        // Send current users to the new user
        socket.emit('room-users', currentUsers);
        console.log(`📤 Sent current users to new user:`, currentUsers);
        // Notify others about the new user
        socket.to(roomId).emit('user-joined', user);
        console.log(`📢 Notified other users in room ${roomId} about new user ${user.name}`);
        console.log(`🎯 Room ${roomId} now has ${room.size} users: ${Array.from(room)}`);
        console.log(`📊 Total rooms: ${rooms.size}, Total users: ${socketUsers.size}`);
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
                    socket.to(user.roomId).emit('user-left', user.id);
                }
            }
            // Clean up mappings
            userSockets.delete(user.id);
            socketUsers.delete(socket.id);
        }
    });
    // WebRTC signaling - offer
    socket.on('offer', (data) => {
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
    socket.on('answer', (data) => {
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
    socket.on('ice-candidate', (data) => {
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
                    }
                    else {
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
//# sourceMappingURL=index.js.map