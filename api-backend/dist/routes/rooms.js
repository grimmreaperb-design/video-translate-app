"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// In-memory storage (in production, use a database)
const rooms = new Map();
const users = new Map();
// Create a new room
router.post("/", (req, res) => {
    const { name, creatorId } = req.body;
    if (!name || !creatorId) {
        return res.status(400).json({ error: "Room name and creator ID are required" });
    }
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const creator = users.get(creatorId);
    if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
    }
    const room = {
        id: roomId,
        users: [creator],
        createdAt: new Date(),
    };
    rooms.set(roomId, room);
    creator.roomId = roomId;
    res.json({ room, message: "Room created successfully" });
});
// Get all rooms
router.get("/", (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => ({
        id: room.id,
        userCount: room.users.length,
        createdAt: room.createdAt,
    }));
    res.json({ rooms: roomList });
});
// Get a specific room
router.get("/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    res.json({ room });
});
// Join a room
router.post("/:roomId/join", (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    const room = rooms.get(roomId);
    const user = users.get(userId);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    // Check if user is already in the room
    const existingUser = room.users.find(u => u.id === userId);
    if (existingUser) {
        return res.json({ room, message: "User already in room" });
    }
    user.roomId = roomId;
    room.users.push(user);
    res.json({ room, message: "User joined room successfully" });
});
// Leave a room
router.post("/:roomId/leave", (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body;
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    const userIndex = room.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: "User not in room" });
    }
    const user = room.users[userIndex];
    room.users.splice(userIndex, 1);
    user.roomId = undefined;
    // Delete room if empty
    if (room.users.length === 0) {
        rooms.delete(roomId);
        return res.json({ message: "Room deleted (no users left)" });
    }
    res.json({ room, message: "User left room successfully" });
});
// Delete a room
router.delete("/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = rooms.get(roomId);
    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }
    // Remove roomId from all users in the room
    room.users.forEach(user => {
        user.roomId = undefined;
    });
    rooms.delete(roomId);
    res.json({ message: "Room deleted successfully" });
});
exports.default = router;
//# sourceMappingURL=rooms.js.map