"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async transcribeAudio(audioBuffer) {
        try {
            const transcription = await this.openai.audio.transcriptions.create({
                file: new Blob([audioBuffer], { type: "audio/wav" }),
                model: "whisper-1",
                response_format: "json",
            });
            return {
                text: transcription.text,
                language: "en",
                confidence: 0.9,
            };
        }
        catch (error) {
            console.error("Error transcribing audio:", error);
            throw new Error("Failed to transcribe audio");
        }
    }
    async translateText(text, sourceLanguage, targetLanguage) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else.`,
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
                max_tokens: 1000,
                temperature: 0.3,
            });
            const translatedText = completion.choices[0]?.message?.content || "";
            return {
                originalText: text,
                translatedText,
                sourceLanguage,
                targetLanguage,
            };
        }
        catch (error) {
            console.error("Error translating text:", error);
            throw new Error("Failed to translate text");
        }
    }
    async generateAudio(text, voice = "alloy") {
        try {
            const mp3 = await this.openai.audio.speech.create({
                model: "tts-1",
                voice: voice,
                input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return {
                audioBuffer: buffer,
                duration: buffer.length / 16000,
            };
        }
        catch (error) {
            console.error("Error generating audio:", error);
            throw new Error("Failed to generate audio");
        }
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openaiService.js.map