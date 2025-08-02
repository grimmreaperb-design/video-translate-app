export interface User {
    id: string;
    email: string;
    name: string;
    language: string;
    created_at: string;
    updated_at: string;
}
export interface Room {
    id: string;
    name: string;
    creator_id: string;
    created_at: string;
    updated_at: string;
}
export interface RoomParticipant {
    id: string;
    room_id: string;
    user_id: string;
    joined_at: string;
}
export declare class SupabaseService {
    private supabase;
    constructor();
    sendMagicLink(email: string): Promise<{
        user: null;
        session: null;
        messageId?: string | null;
    }>;
    getUser(): Promise<import("@supabase/supabase-js").AuthUser | null>;
    signOut(): Promise<void>;
    createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<any>;
    getUserById(id: string): Promise<any>;
    updateUser(id: string, updates: Partial<User>): Promise<any>;
    createRoom(roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<any>;
    getRooms(): Promise<any[]>;
    getRoomById(id: string): Promise<any>;
    joinRoom(roomId: string, userId: string): Promise<any>;
    leaveRoom(roomId: string, userId: string): Promise<void>;
    getRoomParticipants(roomId: string): Promise<any[]>;
}
//# sourceMappingURL=supabaseService.d.ts.map