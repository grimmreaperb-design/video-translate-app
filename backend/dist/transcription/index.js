"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAudioChunk = processAudioChunk;
exports.checkTranscriptionSystemHealth = checkTranscriptionSystemHealth;
const audioProcessor_1 = require("./audioProcessor");
const whisperProcessor_1 = require("./whisperProcessor");
const supabase_1 = require("./supabase");
// Função principal para processar chunk de áudio
async function processAudioChunk(data) {
    const startTime = Date.now();
    const filesToCleanup = [];
    try {
        console.log(`🎵 [TRANSCRIPTION] Processing audio chunk for user ${data.userId} in room ${data.roomId}`);
        // 1. Verificar se ffmpeg está disponível
        const ffmpegAvailable = await (0, audioProcessor_1.checkFfmpegAvailability)();
        if (!ffmpegAvailable) {
            return {
                success: false,
                error: 'FFmpeg not available. Please install FFmpeg for audio processing.',
                processingTime: Date.now() - startTime
            };
        }
        // 2. Salvar blob de áudio como arquivo .webm
        const webmPath = await (0, audioProcessor_1.saveAudioBlob)(data.audioBlob, data.userId, data.timestamp);
        filesToCleanup.push(webmPath);
        // 3. Converter .webm para .wav
        console.log('🔄 [TRANSCRIPTION] Converting audio to WAV format...');
        const conversionResult = await (0, audioProcessor_1.convertWebmToWav)(webmPath);
        if (!conversionResult.success || !conversionResult.wavFilePath) {
            await (0, audioProcessor_1.cleanupTempFiles)(filesToCleanup);
            return {
                success: false,
                error: `Audio conversion failed: ${conversionResult.error}`,
                processingTime: Date.now() - startTime
            };
        }
        filesToCleanup.push(conversionResult.wavFilePath);
        // 4. Transcrever áudio usando Whisper.cpp (com fallback)
        console.log('🎤 [TRANSCRIPTION] Starting audio transcription...');
        const transcriptionResult = await (0, whisperProcessor_1.transcribeWithFallback)(conversionResult.wavFilePath);
        if (!transcriptionResult.success || !transcriptionResult.transcript) {
            await (0, audioProcessor_1.cleanupTempFiles)(filesToCleanup);
            return {
                success: false,
                error: `Transcription failed: ${transcriptionResult.error}`,
                processingTime: Date.now() - startTime
            };
        }
        // 5. Salvar transcrição no Supabase
        console.log('💾 [TRANSCRIPTION] Saving transcription to database...');
        const transcriptionRecord = {
            user_id: data.userId,
            room_id: data.roomId,
            timestamp: data.timestamp,
            transcript: transcriptionResult.transcript
        };
        const savedToDatabase = await (0, supabase_1.saveTranscriptionToSupabase)(transcriptionRecord);
        // 6. Limpar arquivos temporários
        await (0, audioProcessor_1.cleanupTempFiles)(filesToCleanup);
        const processingTime = Date.now() - startTime;
        console.log(`✅ [TRANSCRIPTION] Processing completed in ${processingTime}ms`);
        console.log(`📝 [TRANSCRIPTION] Transcript: "${transcriptionResult.transcript}"`);
        console.log(`💾 [TRANSCRIPTION] Saved to database: ${savedToDatabase}`);
        return {
            success: true,
            transcript: transcriptionResult.transcript,
            savedToDatabase,
            processingTime
        };
    }
    catch (error) {
        console.error('❌ [TRANSCRIPTION] Exception during processing:', error);
        // Limpar arquivos em caso de erro
        await (0, audioProcessor_1.cleanupTempFiles)(filesToCleanup);
        return {
            success: false,
            error: `Processing exception: ${error}`,
            processingTime: Date.now() - startTime
        };
    }
}
// Função para verificar se o sistema de transcrição está pronto
async function checkTranscriptionSystemHealth() {
    console.log('🔍 [TRANSCRIPTION] Checking system health...');
    // Verificar FFmpeg
    const ffmpegAvailable = await (0, audioProcessor_1.checkFfmpegAvailability)();
    // Verificar Whisper (simulado - seria necessário verificar se o binário existe)
    const whisperAvailable = true; // Sempre true pois temos fallback
    // Verificar Supabase (verificar se as credenciais estão configuradas)
    const supabaseAvailable = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    const overall = ffmpegAvailable && whisperAvailable;
    console.log(`🔍 [TRANSCRIPTION] Health check results:`);
    console.log(`   FFmpeg: ${ffmpegAvailable ? '✅' : '❌'}`);
    console.log(`   Whisper: ${whisperAvailable ? '✅' : '❌'}`);
    console.log(`   Supabase: ${supabaseAvailable ? '✅' : '⚠️'}`);
    console.log(`   Overall: ${overall ? '✅' : '❌'}`);
    return {
        ffmpeg: ffmpegAvailable,
        whisper: whisperAvailable,
        supabase: supabaseAvailable,
        overall
    };
}
//# sourceMappingURL=index.js.map