import { Room, User } from "../types";

export class RoomService {
  private rooms: Map<string, Room> = new Map();

  createRoom(roomId: string): Room {
    const room: Room = {
      id: roomId,
      users: [],
      createdAt: new Date(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, user: User): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = this.createRoom(roomId);
    }

    const existingUserIndex = room.users.findIndex(u => u.id === user.id);
    if (existingUserIndex === -1) {
      room.users.push({ ...user, roomId });
    } else {
      room.users[existingUserIndex] = { ...user, roomId };
    }

    return room;
  }

  leaveRoom(roomId: string, userId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.users = room.users.filter(user => user.id !== userId);

    if (room.users.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    return room;
  }

  getUsersInRoom(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? room.users : [];
  }

  getOtherUsersInRoom(roomId: string, currentUserId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.users.filter(user => user.id !== currentUserId);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}
