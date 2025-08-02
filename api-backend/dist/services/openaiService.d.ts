import { TranscriptionResult, TranslationResult, AudioGenerationResult } from "../types";
export declare class OpenAIService {
    private openai;
    constructor();
    transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult>;
    translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult>;
    generateAudio(text: string, voice?: string): Promise<AudioGenerationResult>;
}
//# sourceMappingURL=openaiService.d.ts.map