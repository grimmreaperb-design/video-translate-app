"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const uuid_1 = require("uuid");
class SupabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    // Autenticação
    async sendMagicLink(email) {
        const { data, error } = await this.supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
            }
        });
        if (error)
            throw error;
        return data;
    }
    async getUser() {
        const { data: { user }, error } = await this.supabase.auth.getUser();
        if (error)
            throw error;
        return user;
    }
    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error)
            throw error;
    }
    // Usuários
    async createUser(userData) {
        const { data, error } = await this.supabase
            .from('users')
            .insert({
            id: (0, uuid_1.v4)(),
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getUserById(id) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateUser(id, updates) {
        const { data, error } = await this.supabase
            .from('users')
            .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // Salas
    async createRoom(roomData) {
        const { data, error } = await this.supabase
            .from('rooms')
            .insert({
            id: (0, uuid_1.v4)(),
            ...roomData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getRooms() {
        const { data, error } = await this.supabase
            .from('rooms')
            .select(`
        *,
        creator:users(name, email),
        participants:room_participants(
          user:users(id, name, language)
        )
      `)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getRoomById(id) {
        const { data, error } = await this.supabase
            .from('rooms')
            .select(`
        *,
        creator:users(name, email),
        participants:room_participants(
          user:users(id, name, language)
        )
      `)
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return data;
    }
    async joinRoom(roomId, userId) {
        const { data, error } = await this.supabase
            .from('room_participants')
            .insert({
            id: (0, uuid_1.v4)(),
            room_id: roomId,
            user_id: userId,
            joined_at: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async leaveRoom(roomId, userId) {
        const { error } = await this.supabase
            .from('room_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);
        if (error)
            throw error;
    }
    async getRoomParticipants(roomId) {
        const { data, error } = await this.supabase
            .from('room_participants')
            .select(`
        *,
        user:users(id, name, language)
      `)
            .eq('room_id', roomId);
        if (error)
            throw error;
        return data;
    }
}
exports.SupabaseService = SupabaseService;
//# sourceMappingURL=supabaseService.js.map