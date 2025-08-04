export interface TranscriptionResult {
    success: boolean;
    transcript?: string;
    error?: string;
    duration?: number;
}
export declare function transcribeAudio(wavFilePath: string): Promise<TranscriptionResult>;
export declare function transcribeAudioFallback(wavFilePath: string): Promise<TranscriptionResult>;
export declare function transcribeWithFallback(wavFilePath: string): Promise<TranscriptionResult>;
//# sourceMappingURL=whisperProcessor.d.ts.map