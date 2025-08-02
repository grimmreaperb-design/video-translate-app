"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = exports.WebSpeechProvider = exports.WhisperAPIProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
// Whisper API (Gratuito com limites)
class WhisperAPIProvider {
    constructor() {
        this.name = 'whisper-api';
    }
    async transcribe(audioBuffer) {
        try {
            const formData = new form_data_1.default();
            formData.append('file', audioBuffer, {
                filename: 'audio.wav',
                contentType: 'audio/wav'
            });
            formData.append('model', 'whisper-1');
            formData.append('response_format', 'json');
            const response = await axios_1.default.post('https://api.openai.com/v1/audio/transcriptions', formData, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                }
            });
            return {
                text: response.data.text,
                language: response.data.language || 'en',
                confidence: 0.9,
                provider: this.name
            };
        }
        catch (error) {
            console.error('Whisper API error:', error);
            throw new Error('Transcription failed');
        }
    }
}
exports.WhisperAPIProvider = WhisperAPIProvider;
// Speech Recognition Web API (Fallback)
class WebSpeechProvider {
    constructor() {
        this.name = 'web-speech';
    }
    async transcribe(audioBuffer) {
        // Este é um fallback que seria implementado no frontend
        // Por enquanto, retorna um erro para indicar que precisa ser processado no cliente
        throw new Error('Web Speech API must be used on client side');
    }
}
exports.WebSpeechProvider = WebSpeechProvider;
// Serviço principal de transcrição
class TranscriptionService {
    constructor() {
        this.providers = [];
        // Adicionar provedores disponíveis
        if (process.env.OPENAI_API_KEY) {
            this.providers.push(new WhisperAPIProvider());
        }
        this.providers.push(new WebSpeechProvider());
        // Usar o primeiro provedor disponível
        this.currentProvider = this.providers[0];
    }
    async transcribe(audioBuffer) {
        // Tentar com o provedor atual
        try {
            return await this.currentProvider.transcribe(audioBuffer);
        }
        catch (error) {
            console.error(`Transcription failed with ${this.currentProvider.name}, trying fallback`);
            // Tentar com outros provedores
            for (const provider of this.providers) {
                if (provider !== this.currentProvider) {
                    try {
                        const result = await provider.transcribe(audioBuffer);
                        this.currentProvider = provider;
                        return result;
                    }
                    catch (fallbackError) {
                        console.error(`Fallback provider ${provider.name} also failed`);
                    }
                }
            }
            throw new Error('All transcription providers failed');
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
exports.TranscriptionService = TranscriptionService;
//# sourceMappingURL=transcriptionService.js.map