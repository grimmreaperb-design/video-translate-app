export interface TranscriptionResult {
    text: string;
    language: string;
    confidence: number;
    provider: string;
}
export interface TranscriptionProvider {
    name: string;
    transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;
}
export declare class WhisperAPIProvider implements TranscriptionProvider {
    name: string;
    transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;
}
export declare class WebSpeechProvider implements TranscriptionProvider {
    name: string;
    transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;
}
export declare class TranscriptionService {
    private providers;
    private currentProvider;
    constructor();
    transcribe(audioBuffer: Buffer): Promise<TranscriptionResult>;
    setProvider(providerName: string): void;
    getAvailableProviders(): string[];
}
//# sourceMappingURL=transcriptionService.d.ts.map