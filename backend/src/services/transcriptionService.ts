import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';

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

// Whisper API (Gratuito com limites)
export class WhisperAPIProvider implements TranscriptionProvider {
  name = 'whisper-api';
  
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');

      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
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
    } catch (error) {
      logger.error('Whisper API error:', error);
      throw new Error('Transcription failed');
    }
  }
}

// Speech Recognition Web API (Fallback)
export class WebSpeechProvider implements TranscriptionProvider {
  name = 'web-speech';
  
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    // Este é um fallback que seria implementado no frontend
    // Por enquanto, retorna um erro para indicar que precisa ser processado no cliente
    throw new Error('Web Speech API must be used on client side');
  }
}

// Serviço principal de transcrição
export class TranscriptionService {
  private providers: TranscriptionProvider[] = [];
  private currentProvider: TranscriptionProvider;

  constructor() {
    // Adicionar provedores disponíveis
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new WhisperAPIProvider());
    }
    this.providers.push(new WebSpeechProvider());
    
    // Usar o primeiro provedor disponível
    this.currentProvider = this.providers[0];
  }

  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    // Tentar com o provedor atual
    try {
      return await this.currentProvider.transcribe(audioBuffer);
    } catch (error) {
      logger.error(`Transcription failed with ${this.currentProvider.name}, trying fallback`);
      
      // Tentar com outros provedores
      for (const provider of this.providers) {
        if (provider !== this.currentProvider) {
          try {
            const result = await provider.transcribe(audioBuffer);
            this.currentProvider = provider;
            return result;
          } catch (fallbackError) {
            logger.error(`Fallback provider ${provider.name} also failed`);
          }
        }
      }
      
      throw new Error('All transcription providers failed');
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