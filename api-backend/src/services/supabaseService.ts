import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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

export class SupabaseService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Autenticação
  async sendMagicLink(email: string) {
    const { data, error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (error) throw error;
    return data;
  }

  async getUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  // Usuários
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        id: uuidv4(),
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Salas
  async createRoom(roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('rooms')
      .insert({
        id: uuidv4(),
        ...roomData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
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

    if (error) throw error;
    return data;
  }

  async getRoomById(id: string) {
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

    if (error) throw error;
    return data;
  }

  async joinRoom(roomId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('room_participants')
      .insert({
        id: uuidv4(),
        room_id: roomId,
        user_id: userId,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async leaveRoom(roomId: string, userId: string) {
    const { error } = await this.supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getRoomParticipants(roomId: string) {
    const { data, error } = await this.supabase
      .from('room_participants')
      .select(`
        *,
        user:users(id, name, language)
      `)
      .eq('room_id', roomId);

    if (error) throw error;
    return data;
  }
} 