export declare const supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
export interface TranscriptionRecord {
    user_id: string;
    room_id: string;
    timestamp: string;
    transcript: string;
}
export declare function saveTranscriptionToSupabase(transcription: TranscriptionRecord): Promise<boolean>;
export declare function getTranscriptionsByRoom(roomId: string): Promise<TranscriptionRecord[]>;
//# sourceMappingURL=supabase.d.ts.map