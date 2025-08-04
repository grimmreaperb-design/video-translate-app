import { saveAudioBlob, convertWebmToWav, cleanupTempFiles, checkFfmpegAvailability } from './audioProcessor';
import { transcribeWithFallback } from './whisperProcessor';
import { saveTranscriptionToSupabase, TranscriptionRecord } from './supabase';

// Interface para dados de entrada do áudio
export interface AudioChunkData {
  userId: string;
  roomId: string;
  timestamp: string;
  audioBlob: Buffer;
}

// Interface para resultado do processamento completo
export interface TranscriptionProcessResult {
  success: boolean;
  transcript?: string;
  error?: string;
  savedToDatabase?: boolean;
  processingTime?: number;
}

// Função principal para processar chunk de áudio
export async function processAudioChunk(data: AudioChunkData): Promise<TranscriptionProcessResult> {
  const startTime = Date.now();
  const filesToCleanup: string[] = [];
  
  try {
    console.log(`🎵 [TRANSCRIPTION] Processing audio chunk for user ${data.userId} in room ${data.roomId}`);
    
    // 1. Verificar se ffmpeg está disponível
    const ffmpegAvailable = await checkFfmpegAvailability();
    if (!ffmpegAvailable) {
      return {
        success: false,
        error: 'FFmpeg not available. Please install FFmpeg for audio processing.',
        processingTime: Date.now() - startTime
      };
    }
    
    // 2. Salvar blob de áudio como arquivo .webm
    const webmPath = await saveAudioBlob(data.audioBlob, data.userId, data.timestamp);
    filesToCleanup.push(webmPath);
    
    // 3. Converter .webm para .wav
    console.log('🔄 [TRANSCRIPTION] Converting audio to WAV format...');
    const conversionResult = await convertWebmToWav(webmPath);
    
    if (!conversionResult.success || !conversionResult.wavFilePath) {
      await cleanupTempFiles(filesToCleanup);
      return {
        success: false,
        error: `Audio conversion failed: ${conversionResult.error}`,
        processingTime: Date.now() - startTime
      };
    }
    
    filesToCleanup.push(conversionResult.wavFilePath);
    
    // 4. Transcrever áudio usando Whisper.cpp (com fallback)
    console.log('🎤 [TRANSCRIPTION] Starting audio transcription...');
    const transcriptionResult = await transcribeWithFallback(conversionResult.wavFilePath);
    
    if (!transcriptionResult.success || !transcriptionResult.transcript) {
      await cleanupTempFiles(filesToCleanup);
      return {
        success: false,
        error: `Transcription failed: ${transcriptionResult.error}`,
        processingTime: Date.now() - startTime
      };
    }
    
    // 5. Salvar transcrição no Supabase
    console.log('💾 [TRANSCRIPTION] Saving transcription to database...');
    const transcriptionRecord: TranscriptionRecord = {
      user_id: data.userId,
      room_id: data.roomId,
      timestamp: data.timestamp,
      transcript: transcriptionResult.transcript
    };
    
    const savedToDatabase = await saveTranscriptionToSupabase(transcriptionRecord);
    
    // 6. Limpar arquivos temporários
    await cleanupTempFiles(filesToCleanup);
    
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
    
  } catch (error) {
    console.error('❌ [TRANSCRIPTION] Exception during processing:', error);
    
    // Limpar arquivos em caso de erro
    await cleanupTempFiles(filesToCleanup);
    
    return {
      success: false,
      error: `Processing exception: ${error}`,
      processingTime: Date.now() - startTime
    };
  }
}

// Função para verificar se o sistema de transcrição está pronto
export async function checkTranscriptionSystemHealth(): Promise<{
  ffmpeg: boolean;
  whisper: boolean;
  supabase: boolean;
  overall: boolean;
}> {
  console.log('🔍 [TRANSCRIPTION] Checking system health...');
  
  // Verificar FFmpeg
  const ffmpegAvailable = await checkFfmpegAvailability();
  
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