export interface User {
    id: string;
    name: string;
    language: string;
    roomId?: string;
}
export interface Room {
    id: string;
    users: User[];
    createdAt: Date;
}
export interface AudioChunk {
    userId: string;
    roomId: string;
    audioData: Buffer;
    timestamp: number;
}
export interface TranscriptionResult {
    text: string;
    language: string;
    confidence: number;
}
export interface TranslationResult {
    originalText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
}
export interface AudioGenerationResult {
    audioBuffer: Buffer;
    duration: number;
}
export interface SocketEvents {
    "join-room": (data: {
        roomId: string;
        user: User;
    }) => void;
    "leave-room": (data: {
        roomId: string;
        userId: string;
    }) => void;
    "audio-chunk": (data: AudioChunk) => void;
    "translated-audio": (data: {
        audioBuffer: Buffer;
        userId: string;
        roomId: string;
    }) => void;
    "user-joined": (user: User) => void;
    "user-left": (userId: string) => void;
    "error": (error: string) => void;
}
//# sourceMappingURL=index.d.ts.map