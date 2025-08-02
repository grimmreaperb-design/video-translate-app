export interface TTSResult {
    audioBuffer: Buffer;
    duration: number;
    provider: string;
}
export interface TTSProvider {
    name: string;
    synthesize(text: string, voice?: string): Promise<TTSResult>;
}
export declare class ElevenLabsProvider implements TTSProvider {
    name: string;
    synthesize(text: string, voice?: string): Promise<TTSResult>;
}
export declare class WebSpeechTTSProvider implements TTSProvider {
    name: string;
    synthesize(text: string, voice?: string): Promise<TTSResult>;
}
export declare class TTSService {
    private providers;
    private currentProvider;
    constructor();
    synthesize(text: string, voice?: string): Promise<TTSResult>;
    setProvider(providerName: string): void;
    getAvailableProviders(): string[];
}
//# sourceMappingURL=ttsService.d.ts.map