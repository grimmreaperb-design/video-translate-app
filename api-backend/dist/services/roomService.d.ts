import { Room, User } from "../types";
export declare class RoomService {
    private rooms;
    createRoom(roomId: string): Room;
    getRoom(roomId: string): Room | undefined;
    joinRoom(roomId: string, user: User): Room;
    leaveRoom(roomId: string, userId: string): Room | null;
    getUsersInRoom(roomId: string): User[];
    getOtherUsersInRoom(roomId: string, currentUserId: string): User[];
    getAllRooms(): Room[];
    deleteRoom(roomId: string): boolean;
}
//# sourceMappingURL=roomService.d.ts.map