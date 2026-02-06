import { TranscribeClient, LanguageCode } from '@aws-sdk/client-transcribe';
import { S3Client } from '@aws-sdk/client-s3';
export declare function setTranscribeClient(client: TranscribeClient): void;
export declare function setS3Client(client: S3Client): void;
/**
 * Voice input processing result
 */
export interface VoiceInputResult {
    success: boolean;
    transcribedText?: string;
    confidence?: number;
    language?: string;
    error?: string;
    fallbackUsed?: boolean;
    processingTimeMs?: number;
}
/**
 * Audio file information
 */
export interface AudioFileInfo {
    buffer: Buffer;
    mimeType: string;
    size: number;
    duration?: number;
}
/**
 * Process voice input with Amazon Transcribe
 */
export declare function processVoiceInput(audioFile: AudioFileInfo, patientId: string, language?: LanguageCode): Promise<VoiceInputResult>;
/**
 * Create presigned URL for direct audio upload (for frontend)
 */
export declare function createPresignedUploadUrl(patientId: string, mimeType: string): Promise<{
    uploadUrl: string;
    s3Key: string;
}>;
