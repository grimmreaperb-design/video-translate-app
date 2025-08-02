"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
class RoomService {
    constructor() {
        this.rooms = new Map();
    }
    createRoom(roomId) {
        const room = {
            id: roomId,
            users: [],
            createdAt: new Date(),
        };
        this.rooms.set(roomId, room);
        return room;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    joinRoom(roomId, user) {
        let room = this.rooms.get(roomId);
        if (!room) {
            room = this.createRoom(roomId);
        }
        const existingUserIndex = room.users.findIndex(u => u.id === user.id);
        if (existingUserIndex === -1) {
            room.users.push({ ...user, roomId });
        }
        else {
            room.users[existingUserIndex] = { ...user, roomId };
        }
        return room;
    }
    leaveRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        room.users = room.users.filter(user => user.id !== userId);
        if (room.users.length === 0) {
            this.rooms.delete(roomId);
            return null;
        }
        return room;
    }
    getUsersInRoom(roomId) {
        const room = this.rooms.get(roomId);
        return room ? room.users : [];
    }
    getOtherUsersInRoom(roomId, currentUserId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return room.users.filter(user => user.id !== currentUserId);
    }
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    deleteRoom(roomId) {
        return this.rooms.delete(roomId);
    }
}
exports.RoomService = RoomService;
//# sourceMappingURL=roomService.js.map