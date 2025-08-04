export interface AudioChunkData {
    userId: string;
    roomId: string;
    timestamp: string;
    audioBlob: Buffer;
}
export interface TranscriptionProcessResult {
    success: boolean;
    transcript?: string;
    error?: string;
    savedToDatabase?: boolean;
    processingTime?: number;
}
export declare function processAudioChunk(data: AudioChunkData): Promise<TranscriptionProcessResult>;
export declare function checkTranscriptionSystemHealth(): Promise<{
    ffmpeg: boolean;
    whisper: boolean;
    supabase: boolean;
    overall: boolean;
}>;
//# sourceMappingURL=index.d.ts.map