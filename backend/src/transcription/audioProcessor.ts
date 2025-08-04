import * as fs from 'fs';
import * as path from 'path';
const ffmpeg = require('fluent-ffmpeg');
import { promisify } from 'util';

// Criar diretório temporário se não existir
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Interface para resultado do processamento
export interface AudioProcessingResult {
  success: boolean;
  wavFilePath?: string;
  error?: string;
}

// Função para salvar blob de áudio como arquivo .webm
export async function saveAudioBlob(audioBlob: Buffer, userId: string, timestamp: string): Promise<string> {
  const filename = `audio_${userId}_${timestamp.replace(/[:.]/g, '-')}.webm`;
  const filePath = path.join(TEMP_DIR, filename);
  
  try {
    await promisify(fs.writeFile)(filePath, audioBlob);
    console.log(`📁 [AUDIO] Audio blob saved: ${filename}`);
    return filePath;
  } catch (error) {
    console.error('❌ [AUDIO] Error saving audio blob:', error);
    throw new Error(`Failed to save audio blob: ${error}`);
  }
}

// Função para converter .webm para .wav usando ffmpeg
export async function convertWebmToWav(webmPath: string): Promise<AudioProcessingResult> {
  const wavPath = webmPath.replace('.webm', '.wav');
  
  return new Promise((resolve) => {
    console.log(`🔄 [FFMPEG] Converting ${path.basename(webmPath)} to WAV...`);
    
    ffmpeg(webmPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('start', (commandLine: string) => {
        console.log(`🚀 [FFMPEG] Started: ${commandLine}`);
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.log(`⏳ [FFMPEG] Progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ [FFMPEG] Conversion completed: ${path.basename(wavPath)}`);
        resolve({
          success: true,
          wavFilePath: wavPath
        });
      })
      .on('error', (error: any) => {
        console.error('❌ [FFMPEG] Conversion error:', error);
        resolve({
          success: false,
          error: error.message
        });
      })
      .save(wavPath);
  });
}

// Função para limpar arquivos temporários
export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        await promisify(fs.unlink)(filePath);
        console.log(`🗑️ [CLEANUP] Removed: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`❌ [CLEANUP] Error removing ${filePath}:`, error);
    }
  }
}

// Função para verificar se ffmpeg está disponível
export function checkFfmpegAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe('-version', (error: any) => {
      if (error) {
        console.error('❌ [FFMPEG] FFmpeg not available:', error.message);
        resolve(false);
      } else {
        console.log('✅ [FFMPEG] FFmpeg is available');
        resolve(true);
      }
    });
  });
}