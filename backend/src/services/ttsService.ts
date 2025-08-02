import axios from 'axios';
import { logger } from '../utils/logger';

export interface TTSResult {
  audioBuffer: Buffer;
  duration: number;
  provider: string;
}

export interface TTSProvider {
  name: string;
  synthesize(text: string, voice?: string): Promise<TTSResult>;
}

// ElevenLabs TTS (Gratuito com limites)
export class ElevenLabsProvider implements TTSProvider {
  name = 'elevenlabs';
  
  async synthesize(text: string, voice: string = '21m00Tcm4TlvDq8ikWAM'): Promise<TTSResult> {
    try {
      const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
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
    } catch (error) {
      logger.error('ElevenLabs error:', error);
      throw new Error('TTS failed');
    }
  }
}

// Web Speech API TTS (Fallback)
export class WebSpeechTTSProvider implements TTSProvider {
  name = 'web-speech-tts';
  
  async synthesize(text: string, voice?: string): Promise<TTSResult> {
    // Este seria implementado no frontend usando Web Speech API
    throw new Error('Web Speech TTS must be used on client side');
  }
}

// Serviço principal de TTS
export class TTSService {
  private providers: TTSProvider[] = [];
  private currentProvider: TTSProvider;

  constructor() {
    // Adicionar provedores disponíveis
    if (process.env.ELEVENLABS_API_KEY) {
      this.providers.push(new ElevenLabsProvider());
    }
    this.providers.push(new WebSpeechTTSProvider());
    
    // Usar o primeiro provedor disponível
    this.currentProvider = this.providers[0];
  }

  async synthesize(text: string, voice?: string): Promise<TTSResult> {
    // Tentar com o provedor atual
    try {
      return await this.currentProvider.synthesize(text, voice);
    } catch (error) {
      logger.error(`TTS failed with ${this.currentProvider.name}, trying fallback`);
      
      // Tentar com outros provedores
      for (const provider of this.providers) {
        if (provider !== this.currentProvider) {
          try {
            const result = await provider.synthesize(text, voice);
            this.currentProvider = provider;
            return result;
          } catch (fallbackError) {
            logger.error(`Fallback provider ${provider.name} also failed`);
          }
        }
      }
      
      throw new Error('All TTS providers failed');
    }
  }

  setProvider(providerName: string) {
    const provider = this.providers.find(p => p.name === providerName);
    if (provider) {
      this.currentProvider = provider;
    }
  }

  getAvailableProviders() {
    return this.providers.map(p => p.name);
  }
}