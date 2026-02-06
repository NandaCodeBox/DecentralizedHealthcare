// Voice Input Service for Amazon Transcribe Integration
// Handles audio file uploads and voice-to-text conversion with fallback mechanisms

import { 
  TranscribeClient, 
  StartTranscriptionJobCommand, 
  GetTranscriptionJobCommand,
  TranscriptionJob,
  TranscriptionJobStatus,
  LanguageCode,
  MediaFormat
} from '@aws-sdk/client-transcribe';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const AUDIO_UPLOAD_BUCKET = process.env.AUDIO_UPLOAD_BUCKET!;

// Initialize AWS clients (lazy initialization for testing)
let transcribeClient: TranscribeClient;
let s3Client: S3Client;

function getTranscribeClient(): TranscribeClient {
  if (!transcribeClient) {
    transcribeClient = new TranscribeClient({});
  }
  return transcribeClient;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({});
  }
  return s3Client;
}

// Export for testing
export function setTranscribeClient(client: TranscribeClient): void {
  transcribeClient = client;
}

export function setS3Client(client: S3Client): void {
  s3Client = client;
}

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
 * Supported audio formats for transcription
 */
const SUPPORTED_AUDIO_FORMATS = [
  'audio/wav',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/flac'
];

/**
 * Maximum audio file size (10MB)
 */
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

/**
 * Maximum transcription wait time (30 seconds)
 */
const MAX_TRANSCRIPTION_WAIT_TIME = 30000;

/**
 * Process voice input with Amazon Transcribe
 */
export async function processVoiceInput(
  audioFile: AudioFileInfo,
  patientId: string,
  language: LanguageCode = LanguageCode.EN_IN
): Promise<VoiceInputResult> {
  const startTime = Date.now();
  
  console.log('Starting voice input processing', {
    patientId,
    audioSize: audioFile.size,
    mimeType: audioFile.mimeType,
    language
  });

  try {
    // Validate audio file
    const validationResult = validateAudioFile(audioFile);
    if (!validationResult.valid) {
      console.warn('Audio file validation failed', {
        patientId,
        error: validationResult.error
      });
      return {
        success: false,
        error: validationResult.error,
        processingTimeMs: Date.now() - startTime
      };
    }

    // Upload audio file to S3
    const s3Key = await uploadAudioToS3(audioFile, patientId);
    
    try {
      // Start transcription job
      const transcriptionResult = await transcribeAudio(s3Key, language);
      
      // Clean up S3 file
      await cleanupS3File(s3Key);
      
      console.log('Voice input processing completed successfully', {
        patientId,
        transcribedLength: transcriptionResult.transcribedText?.length || 0,
        confidence: transcriptionResult.confidence,
        processingTimeMs: Date.now() - startTime
      });
      
      return {
        ...transcriptionResult,
        processingTimeMs: Date.now() - startTime
      };
      
    } catch (transcriptionError) {
      // Clean up S3 file even if transcription fails
      await cleanupS3File(s3Key);
      throw transcriptionError;
    }
    
  } catch (error) {
    console.error('Error in voice input processing', {
      patientId,
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime
    });
    
    // Try fallback mechanisms
    const fallbackResult = await tryFallbackMechanisms(audioFile, patientId);
    
    return {
      success: fallbackResult.success,
      transcribedText: fallbackResult.transcribedText,
      error: fallbackResult.success ? undefined : (error instanceof Error ? error.message : String(error)),
      fallbackUsed: true,
      processingTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Validate audio file format and size
 */
function validateAudioFile(audioFile: AudioFileInfo): { valid: boolean; error?: string } {
  // Check file size
  if (audioFile.size > MAX_AUDIO_SIZE) {
    return {
      valid: false,
      error: `Audio file too large. Maximum size is ${MAX_AUDIO_SIZE / (1024 * 1024)}MB`
    };
  }
  
  // Check minimum file size (1KB)
  if (audioFile.size < 1024) {
    return {
      valid: false,
      error: 'Audio file too small. Minimum size is 1KB'
    };
  }
  
  // Check supported format
  if (!SUPPORTED_AUDIO_FORMATS.includes(audioFile.mimeType)) {
    return {
      valid: false,
      error: `Unsupported audio format: ${audioFile.mimeType}. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Upload audio file to S3
 */
async function uploadAudioToS3(audioFile: AudioFileInfo, patientId: string): Promise<string> {
  const fileExtension = getFileExtension(audioFile.mimeType);
  const s3Key = `audio-uploads/${patientId}/${uuidv4()}.${fileExtension}`;
  
  console.log('Uploading audio file to S3', {
    patientId,
    s3Key,
    size: audioFile.size
  });
  
  const command = new PutObjectCommand({
    Bucket: AUDIO_UPLOAD_BUCKET,
    Key: s3Key,
    Body: audioFile.buffer,
    ContentType: audioFile.mimeType,
    Metadata: {
      patientId,
      uploadTimestamp: new Date().toISOString(),
      originalSize: audioFile.size.toString()
    },
    ServerSideEncryption: 'AES256'
  });
  
  await getS3Client().send(command);
  
  console.log('Audio file uploaded successfully', {
    patientId,
    s3Key
  });
  
  return s3Key;
}

/**
 * Transcribe audio using Amazon Transcribe
 */
async function transcribeAudio(s3Key: string, language: LanguageCode): Promise<VoiceInputResult> {
  const jobName = `healthcare-transcription-${uuidv4()}`;
  const s3Uri = `s3://${AUDIO_UPLOAD_BUCKET}/${s3Key}`;
  
  console.log('Starting transcription job', {
    jobName,
    s3Uri,
    language
  });
  
  // Start transcription job
  const startCommand = new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    LanguageCode: language,
    Media: {
      MediaFileUri: s3Uri
    },
    MediaFormat: getMediaFormat(s3Key),
    Settings: {
      ShowSpeakerLabels: false,
      MaxSpeakerLabels: 1,
      ShowAlternatives: true,
      MaxAlternatives: 3
    }
  });
  
  await getTranscribeClient().send(startCommand);
  
  // Poll for completion
  const result = await pollTranscriptionJob(jobName);
  
  if (!result.success) {
    throw new Error(result.error || 'Transcription job failed');
  }
  
  return result;
}

/**
 * Poll transcription job until completion
 */
async function pollTranscriptionJob(jobName: string): Promise<VoiceInputResult> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  while (Date.now() - startTime < MAX_TRANSCRIPTION_WAIT_TIME) {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobName
    });
    
    const response = await getTranscribeClient().send(command);
    const job = response.TranscriptionJob;
    
    if (!job) {
      throw new Error('Transcription job not found');
    }
    
    console.log('Transcription job status', {
      jobName,
      status: job.TranscriptionJobStatus,
      elapsedMs: Date.now() - startTime
    });
    
    switch (job.TranscriptionJobStatus) {
      case TranscriptionJobStatus.COMPLETED:
        return await extractTranscriptionResult(job);
        
      case TranscriptionJobStatus.FAILED:
        throw new Error(`Transcription job failed: ${job.FailureReason || 'Unknown error'}`);
        
      case TranscriptionJobStatus.IN_PROGRESS:
        // Continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        break;
        
      default:
        throw new Error(`Unexpected transcription job status: ${job.TranscriptionJobStatus}`);
    }
  }
  
  throw new Error('Transcription job timed out');
}

/**
 * Extract transcription result from completed job
 */
async function extractTranscriptionResult(job: TranscriptionJob): Promise<VoiceInputResult> {
  if (!job.Transcript?.TranscriptFileUri) {
    throw new Error('No transcript file URI found');
  }
  
  console.log('Extracting transcription result', {
    jobName: job.TranscriptionJobName,
    transcriptUri: job.Transcript.TranscriptFileUri
  });
  
  // Download transcript file from S3
  const transcriptContent = await downloadTranscriptFile(job.Transcript.TranscriptFileUri);
  
  // Parse transcript JSON
  const transcript = JSON.parse(transcriptContent);
  
  // Extract the best transcription
  const transcribedText = transcript.results?.transcripts?.[0]?.transcript || '';
  
  // Calculate average confidence
  const items = transcript.results?.items || [];
  const confidenceScores = items
    .filter((item: any) => item.alternatives?.[0]?.confidence)
    .map((item: any) => parseFloat(item.alternatives[0].confidence));
  
  const averageConfidence = confidenceScores.length > 0 
    ? confidenceScores.reduce((sum: number, conf: number) => sum + conf, 0) / confidenceScores.length
    : undefined;
  
  console.log('Transcription result extracted', {
    jobName: job.TranscriptionJobName,
    textLength: transcribedText.length,
    confidence: averageConfidence,
    itemCount: items.length
  });
  
  return {
    success: true,
    transcribedText: transcribedText.trim(),
    confidence: averageConfidence,
    language: job.LanguageCode
  };
}

/**
 * Download transcript file from S3
 */
async function downloadTranscriptFile(transcriptUri: string): Promise<string> {
  // Parse S3 URI to get bucket and key
  const match = transcriptUri.match(/s3:\/\/([^\/]+)\/(.+)/);
  if (!match) {
    throw new Error(`Invalid transcript URI: ${transcriptUri}`);
  }
  
  const [, bucket, key] = match;
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  
  const response = await getS3Client().send(command);
  
  if (!response.Body) {
    throw new Error('Empty transcript file');
  }
  
  // Convert stream to string
  const chunks: Uint8Array[] = [];
  const reader = response.Body.transformToWebStream().getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const buffer = Buffer.concat(chunks);
  return buffer.toString('utf-8');
}

/**
 * Clean up S3 file after processing
 */
async function cleanupS3File(s3Key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: AUDIO_UPLOAD_BUCKET,
      Key: s3Key
    });
    
    await getS3Client().send(command);
    
    console.log('S3 file cleaned up successfully', { s3Key });
  } catch (error) {
    console.warn('Failed to clean up S3 file', {
      s3Key,
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't throw error for cleanup failures
  }
}

/**
 * Try fallback mechanisms when primary transcription fails
 */
async function tryFallbackMechanisms(
  audioFile: AudioFileInfo, 
  patientId: string
): Promise<{ success: boolean; transcribedText?: string }> {
  console.log('Attempting fallback mechanisms', { patientId });
  
  // Fallback 1: Try with different language settings
  try {
    console.log('Fallback 1: Trying Hindi language detection', { patientId });
    const hindiResult = await processVoiceInputWithLanguage(audioFile, patientId, LanguageCode.HI_IN);
    if (hindiResult.success && hindiResult.transcribedText) {
      return hindiResult;
    }
  } catch (error) {
    console.warn('Hindi fallback failed', { patientId, error });
  }
  
  // Fallback 2: Return helpful error message for manual entry
  console.log('All fallback mechanisms failed', { patientId });
  return {
    success: false,
    transcribedText: undefined
  };
}

/**
 * Process voice input with specific language
 */
async function processVoiceInputWithLanguage(
  audioFile: AudioFileInfo,
  patientId: string,
  language: LanguageCode
): Promise<VoiceInputResult> {
  const s3Key = await uploadAudioToS3(audioFile, patientId);
  
  try {
    const result = await transcribeAudio(s3Key, language);
    await cleanupS3File(s3Key);
    return result;
  } catch (error) {
    await cleanupS3File(s3Key);
    throw error;
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'audio/wav': 'wav',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'audio/flac': 'flac'
  };
  
  return extensions[mimeType] || 'audio';
}

/**
 * Get media format for Transcribe from S3 key
 */
function getMediaFormat(s3Key: string): MediaFormat {
  const extension = s3Key.split('.').pop()?.toLowerCase();
  
  const formats: Record<string, MediaFormat> = {
    'wav': MediaFormat.WAV,
    'mp3': MediaFormat.MP3,
    'mp4': MediaFormat.MP4,
    'ogg': MediaFormat.OGG,
    'webm': MediaFormat.WEBM,
    'flac': MediaFormat.FLAC
  };
  
  return formats[extension || ''] || MediaFormat.WAV;
}

/**
 * Create presigned URL for direct audio upload (for frontend)
 */
export async function createPresignedUploadUrl(
  patientId: string,
  mimeType: string
): Promise<{ uploadUrl: string; s3Key: string }> {
  const fileExtension = getFileExtension(mimeType);
  const s3Key = `audio-uploads/${patientId}/${uuidv4()}.${fileExtension}`;
  
  // Note: In a real implementation, you would use @aws-sdk/s3-request-presigner
  // For now, return the S3 key for direct upload handling
  return {
    uploadUrl: `https://${AUDIO_UPLOAD_BUCKET}.s3.amazonaws.com/${s3Key}`,
    s3Key
  };
}