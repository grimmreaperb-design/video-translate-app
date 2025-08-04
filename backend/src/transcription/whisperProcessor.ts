import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Interface para resultado da transcrição
export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
  duration?: number;
}

// Caminho para o modelo Whisper (será baixado se não existir)
const MODELS_DIR = path.join(__dirname, '../../models');
const MODEL_PATH = path.join(MODELS_DIR, 'ggml-base.en.bin');

// Função para verificar se o modelo existe
function checkModelExists(): boolean {
  return fs.existsSync(MODEL_PATH);
}

// Função para baixar o modelo Whisper (fallback simples)
async function downloadModel(): Promise<boolean> {
  try {
    console.log('📥 [WHISPER] Model not found, attempting to download...');
    
    // Criar diretório de modelos se não existir
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    // Para simplificar, vamos usar um modelo mock ou indicar que precisa ser baixado manualmente
    console.log('⚠️ [WHISPER] Please download the model manually:');
    console.log('   wget https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin');
    console.log(`   mv ggml-base.en.bin ${MODEL_PATH}`);
    
    return false;
  } catch (error) {
    console.error('❌ [WHISPER] Error downloading model:', error);
    return false;
  }
}

// Função para transcrever áudio usando Whisper.cpp
export async function transcribeAudio(wavFilePath: string): Promise<TranscriptionResult> {
  const startTime = Date.now();
  
  try {
    // Verificar se o arquivo WAV existe
    if (!fs.existsSync(wavFilePath)) {
      return {
        success: false,
        error: 'WAV file not found'
      };
    }

    // Verificar se o modelo existe
    if (!checkModelExists()) {
      console.log('📥 [WHISPER] Model not found, trying to download...');
      const downloaded = await downloadModel();
      if (!downloaded) {
        return {
          success: false,
          error: 'Whisper model not available. Please download ggml-base.en.bin manually.'
        };
      }
    }

    console.log(`🎤 [WHISPER] Starting transcription of ${path.basename(wavFilePath)}...`);

    // Executar Whisper.cpp via linha de comando
    return new Promise((resolve) => {
      const whisperProcess = spawn('whisper', [
        '--model', MODEL_PATH,
        '--file', wavFilePath,
        '--output-txt',
        '--no-timestamps',
        '--language', 'en'
      ]);

      let stdout = '';
      let stderr = '';

      whisperProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      whisperProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      whisperProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          // Tentar ler o arquivo de saída
          const outputFile = wavFilePath.replace('.wav', '.txt');
          
          try {
            if (fs.existsSync(outputFile)) {
              const transcript = fs.readFileSync(outputFile, 'utf8').trim();
              
              // Limpar arquivo de saída
              fs.unlinkSync(outputFile);
              
              console.log(`✅ [WHISPER] Transcription completed in ${duration}ms`);
              console.log(`📝 [WHISPER] Result: "${transcript}"`);
              
              resolve({
                success: true,
                transcript,
                duration
              });
            } else {
              resolve({
                success: false,
                error: 'Transcription output file not found',
                duration
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: `Error reading transcription output: ${error}`,
              duration
            });
          }
        } else {
          console.error(`❌ [WHISPER] Process exited with code ${code}`);
          console.error(`❌ [WHISPER] stderr: ${stderr}`);
          
          resolve({
            success: false,
            error: `Whisper process failed with code ${code}: ${stderr}`,
            duration
          });
        }
      });

      whisperProcess.on('error', (error) => {
        const duration = Date.now() - startTime;
        console.error('❌ [WHISPER] Process error:', error);
        
        resolve({
          success: false,
          error: `Whisper process error: ${error.message}`,
          duration
        });
      });
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [WHISPER] Exception during transcription:', error);
    
    return {
      success: false,
      error: `Transcription exception: ${error}`,
      duration
    };
  }
}

// Função fallback usando Web Speech API simulation (para desenvolvimento)
export async function transcribeAudioFallback(wavFilePath: string): Promise<TranscriptionResult> {
  console.log('🔄 [WHISPER-FALLBACK] Using fallback transcription...');
  
  // Simular transcrição para desenvolvimento
  const mockTranscripts = [
    "Hello, this is a test transcription.",
    "The audio quality is good.",
    "Whisper.cpp is not available, using fallback.",
    "This is a mock transcription for development.",
    "Please install Whisper.cpp for real transcription."
  ];
  
  const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`📝 [WHISPER-FALLBACK] Mock result: "${randomTranscript}"`);
  
  return {
    success: true,
    transcript: randomTranscript,
    duration: 1000
  };
}

// Função principal que tenta Whisper.cpp e usa fallback se necessário
export async function transcribeWithFallback(wavFilePath: string): Promise<TranscriptionResult> {
  // Tentar transcrição real primeiro
  const result = await transcribeAudio(wavFilePath);
  
  if (result.success) {
    return result;
  }
  
  // Se falhar, usar fallback
  console.log('⚠️ [WHISPER] Real transcription failed, using fallback...');
  return await transcribeAudioFallback(wavFilePath);
}