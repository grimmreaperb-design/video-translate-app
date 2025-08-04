"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.saveTranscriptionToSupabase = saveTranscriptionToSupabase;
exports.getTranscriptionsByRoom = getTranscriptionsByRoom;
const supabase_js_1 = require("@supabase/supabase-js");
// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found. Transcription storage will be disabled.');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Função para salvar transcrição no Supabase
async function saveTranscriptionToSupabase(transcription) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            console.log('📝 [SUPABASE] Credentials not configured, skipping save');
            return false;
        }
        const { data, error } = await exports.supabase
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
    }
    catch (error) {
        console.error('❌ [SUPABASE] Exception saving transcription:', error);
        return false;
    }
}
// Função para buscar transcrições de uma sala
async function getTranscriptionsByRoom(roomId) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            console.log('📝 [SUPABASE] Credentials not configured, returning empty array');
            return [];
        }
        const { data, error } = await exports.supabase
            .from('transcriptions')
            .select('*')
            .eq('room_id', roomId)
            .order('timestamp', { ascending: true });
        if (error) {
            console.error('❌ [SUPABASE] Error fetching transcriptions:', error);
            return [];
        }
        return data || [];
    }
    catch (error) {
        console.error('❌ [SUPABASE] Exception fetching transcriptions:', error);
        return [];
    }
}
//# sourceMappingURL=supabase.js.map