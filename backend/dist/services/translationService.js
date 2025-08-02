"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = exports.GoogleTranslateProvider = exports.LibreTranslateProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
// LibreTranslate Provider (Gratuito)
class LibreTranslateProvider {
    constructor() {
        this.name = 'libretranslate';
    }
    async translate(text, sourceLanguage, targetLanguage) {
        try {
            // Usando instância pública do LibreTranslate
            const response = await axios_1.default.post('https://libretranslate.de/translate', {
                q: text,
                source: sourceLanguage,
                target: targetLanguage,
                format: 'text'
            });
            return {
                originalText: text,
                translatedText: response.data.translatedText,
                sourceLanguage,
                targetLanguage,
                provider: this.name
            };
        }
        catch (error) {
            logger_1.logger.error('LibreTranslate error:', error);
            throw new Error('Translation failed');
        }
    }
}
exports.LibreTranslateProvider = LibreTranslateProvider;
// Google Translate Scraping Provider (Gratuito)
class GoogleTranslateProvider {
    constructor() {
        this.name = 'google-translate';
    }
    async translate(text, sourceLanguage, targetLanguage) {
        try {
            // Usando API pública do Google Translate
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await axios_1.default.get(url);
            const translatedText = response.data[0][0][0];
            return {
                originalText: text,
                translatedText,
                sourceLanguage,
                targetLanguage,
                provider: this.name
            };
        }
        catch (error) {
            logger_1.logger.error('Google Translate error:', error);
            throw new Error('Translation failed');
        }
    }
}
exports.GoogleTranslateProvider = GoogleTranslateProvider;
// Serviço principal de tradução
class TranslationService {
    constructor() {
        this.providers = [];
        // Adicionar provedores disponíveis
        this.providers.push(new LibreTranslateProvider());
        this.providers.push(new GoogleTranslateProvider());
        // Usar LibreTranslate como padrão
        this.currentProvider = this.providers[0];
    }
    async translate(text, sourceLanguage, targetLanguage) {
        // Tentar com o provedor atual
        try {
            return await this.currentProvider.translate(text, sourceLanguage, targetLanguage);
        }
        catch (error) {
            logger_1.logger.error(`Translation failed with ${this.currentProvider.name}, trying fallback`);
            // Tentar com outros provedores
            for (const provider of this.providers) {
                if (provider !== this.currentProvider) {
                    try {
                        const result = await provider.translate(text, sourceLanguage, targetLanguage);
                        this.currentProvider = provider; // Trocar para o provedor que funcionou
                        return result;
                    }
                    catch (fallbackError) {
                        logger_1.logger.error(`Fallback provider ${provider.name} also failed`);
                    }
                }
            }
            throw new Error('All translation providers failed');
        }
    }
    setProvider(providerName) {
        const provider = this.providers.find(p => p.name === providerName);
        if (provider) {
            this.currentProvider = provider;
        }
    }
    getAvailableProviders() {
        return this.providers.map(p => p.name);
    }
}
exports.TranslationService = TranslationService;
//# sourceMappingURL=translationService.js.map