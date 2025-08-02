import axios from 'axios';

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

// LibreTranslate Provider (Gratuito)
export class LibreTranslateProvider implements TranslationProvider {
  name = 'libretranslate';
  
  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> {
    try {
      // Usando instância pública do LibreTranslate
      const response = await axios.post('https://libretranslate.de/translate', {
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
    } catch (error) {
      console.error('LibreTranslate error:', error);
      throw new Error('Translation failed');
    }
  }
}

// Google Translate Scraping Provider (Gratuito)
export class GoogleTranslateProvider implements TranslationProvider {
  name = 'google-translate';
  
  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> {
    try {
      // Usando API pública do Google Translate
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await axios.get(url);
      const translatedText = response.data[0][0][0];

      return {
        originalText: text,
        translatedText,
        sourceLanguage,
        targetLanguage,
        provider: this.name
      };
    } catch (error) {
      console.error('Google Translate error:', error);
      throw new Error('Translation failed');
    }
  }
}

// Serviço principal de tradução
export class TranslationService {
  private providers: TranslationProvider[] = [];
  private currentProvider: TranslationProvider;

  constructor() {
    // Adicionar provedores disponíveis
    this.providers.push(new LibreTranslateProvider());
    this.providers.push(new GoogleTranslateProvider());
    
    // Usar LibreTranslate como padrão
    this.currentProvider = this.providers[0];
  }

  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> {
    // Tentar com o provedor atual
    try {
      return await this.currentProvider.translate(text, sourceLanguage, targetLanguage);
    } catch (error) {
      console.error(`Translation failed with ${this.currentProvider.name}, trying fallback`);
      
      // Tentar com outros provedores
      for (const provider of this.providers) {
        if (provider !== this.currentProvider) {
          try {
            const result = await provider.translate(text, sourceLanguage, targetLanguage);
            this.currentProvider = provider; // Trocar para o provedor que funcionou
            return result;
          } catch (fallbackError) {
            console.error(`Fallback provider ${provider.name} also failed`);
          }
        }
      }
      
      throw new Error('All translation providers failed');
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