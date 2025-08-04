"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAudioBlob = saveAudioBlob;
exports.convertWebmToWav = convertWebmToWav;
exports.cleanupTempFiles = cleanupTempFiles;
exports.checkFfmpegAvailability = checkFfmpegAvailability;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ffmpeg = require('fluent-ffmpeg');
const util_1 = require("util");
// Criar diretório temporário se não existir
const TEMP_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
// Função para salvar blob de áudio como arquivo .webm
async function saveAudioBlob(audioBlob, userId, timestamp) {
    const filename = `audio_${userId}_${timestamp.replace(/[:.]/g, '-')}.webm`;
    const filePath = path.join(TEMP_DIR, filename);
    try {
        await (0, util_1.promisify)(fs.writeFile)(filePath, audioBlob);
        console.log(`📁 [AUDIO] Audio blob saved: ${filename}`);
        return filePath;
    }
    catch (error) {
        console.error('❌ [AUDIO] Error saving audio blob:', error);
        throw new Error(`Failed to save audio blob: ${error}`);
    }
}
// Função para converter .webm para .wav usando ffmpeg
async function convertWebmToWav(webmPath) {
    const wavPath = webmPath.replace('.webm', '.wav');
    return new Promise((resolve) => {
        console.log(`🔄 [FFMPEG] Converting ${path.basename(webmPath)} to WAV...`);
        ffmpeg(webmPath)
            .toFormat('wav')
            .audioCodec('pcm_s16le')
            .audioChannels(1)
            .audioFrequency(16000)
            .on('start', (commandLine) => {
            console.log(`🚀 [FFMPEG] Started: ${commandLine}`);
        })
            .on('progress', (progress) => {
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
            .on('error', (error) => {
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
async function cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
        try {
            if (fs.existsSync(filePath)) {
                await (0, util_1.promisify)(fs.unlink)(filePath);
                console.log(`🗑️ [CLEANUP] Removed: ${path.basename(filePath)}`);
            }
        }
        catch (error) {
            console.error(`❌ [CLEANUP] Error removing ${filePath}:`, error);
        }
    }
}
// Função para verificar se ffmpeg está disponível
function checkFfmpegAvailability() {
    return new Promise((resolve) => {
        ffmpeg.ffprobe('-version', (error) => {
            if (error) {
                console.error('❌ [FFMPEG] FFmpeg not available:', error.message);
                resolve(false);
            }
            else {
                console.log('✅ [FFMPEG] FFmpeg is available');
                resolve(true);
            }
        });
    });
}
//# sourceMappingURL=audioProcessor.js.map