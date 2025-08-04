export interface AudioProcessingResult {
    success: boolean;
    wavFilePath?: string;
    error?: string;
}
export declare function saveAudioBlob(audioBlob: Buffer, userId: string, timestamp: string): Promise<string>;
export declare function convertWebmToWav(webmPath: string): Promise<AudioProcessingResult>;
export declare function cleanupTempFiles(filePaths: string[]): Promise<void>;
export declare function checkFfmpegAvailability(): Promise<boolean>;
//# sourceMappingURL=audioProcessor.d.ts.map