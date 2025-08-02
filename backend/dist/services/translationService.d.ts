export interface TranslationResult {
    originalText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    provider: string;
}
export interface TranslationProvider {
    name: string;
    translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult>;
}
export declare class LibreTranslateProvider implements TranslationProvider {
    name: string;
    translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult>;
}
export declare class GoogleTranslateProvider implements TranslationProvider {
    name: string;
    translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult>;
}
export declare class TranslationService {
    private providers;
    private currentProvider;
    constructor();
    translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult>;
    setProvider(providerName: string): void;
    getAvailableProviders(): string[];
}
//# sourceMappingURL=translationService.d.ts.map