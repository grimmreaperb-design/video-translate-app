"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTSService = exports.WebSpeechTTSProvider = exports.ElevenLabsProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
// ElevenLabs TTS (Gratuito com limites)
class ElevenLabsProvider {
    constructor() {
        this.name = 'elevenlabs';
    }
    async synthesize(text, voice = '21m00Tcm4TlvDq8ikWAM') {
        try {
            const response = await axios_1.default.post(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            }, {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });
            return {
                audioBuffer: Buffer.from(response.data),
                duration: response.data.length / 16000, // Estimativa
                provider: this.name
            };
        }
        catch (error) {
            logger_1.logger.error('ElevenLabs error:', error);
            throw new Error('TTS failed');
        }
    }
}
exports.ElevenLabsProvider = ElevenLabsProvider;
// Web Speech API TTS (Fallback)
class WebSpeechTTSProvider {
    constructor() {
        this.name = 'web-speech-tts';
    }
    async synthesize(text, voice) {
        // Este seria implementado no frontend usando Web Speech API
        throw new Error('Web Speech TTS must be used on client side');
    }
}
exports.WebSpeechTTSProvider = WebSpeechTTSProvider;
// Serviço principal de TTS
class TTSService {
    constructor() {
        this.providers = [];
        // Adicionar provedores disponíveis
        if (process.env.ELEVENLABS_API_KEY) {
            this.providers.push(new ElevenLabsProvider());
        }
        this.providers.push(new WebSpeechTTSProvider());
        // Usar o primeiro provedor disponível
        this.currentProvider = this.providers[0];
    }
    async synthesize(text, voice) {
        // Tentar com o provedor atual
        try {
            return await this.currentProvider.synthesize(text, voice);
        }
        catch (error) {
            logger_1.logger.error(`TTS failed with ${this.currentProvider.name}, trying fallback`);
            // Tentar com outros provedores
            for (const provider of this.providers) {
                if (provider !== this.currentProvider) {
                    try {
                        const result = await provider.synthesize(text, voice);
                        this.currentProvider = provider;
                        return result;
                    }
                    catch (fallbackError) {
                        logger_1.logger.error(`Fallback provider ${provider.name} also failed`);
                    }
                }
            }
            throw new Error('All TTS providers failed');
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
exports.TTSService = TTSService;
//# sourceMappingURL=ttsService.js.map