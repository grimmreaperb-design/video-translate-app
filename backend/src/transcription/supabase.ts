import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found. Transcription storage will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Interface para transcrição
export interface TranscriptionRecord {
  user_id: string;
  room_id: string;
  timestamp: string;
  transcript: string;
}

// Função para salvar transcrição no Supabase
export async function saveTranscriptionToSupabase(transcription: TranscriptionRecord): Promise<boolean> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.log('📝 [SUPABASE] Credentials not configured, skipping save');
      return false;
    }

    const { data, error } = await supabase
      .from('transcriptions')
      .insert([transcription]);

    if (error) {
      console.error('❌ [SUPABASE] Error saving transcription:', error);
      return false;
    }

    console.log('✅ [SUPABASE] Transcription saved successfully:', {
      user_id: transcription.user_id,
      room_id: transcription.room_id,
      transcript_length: transcription.transcript.length
    });

    return true;
  } catch (error) {
    console.error('❌ [SUPABASE] Exception saving transcription:', error);
    return false;
  }
}

// Função para buscar transcrições de uma sala
export async function getTranscriptionsByRoom(roomId: string): Promise<TranscriptionRecord[]> {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.log('📝 [SUPABASE] Credentials not configured, returning empty array');
      return [];
    }

    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('❌ [SUPABASE] Error fetching transcriptions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ [SUPABASE] Exception fetching transcriptions:', error);
    return [];
  }
}