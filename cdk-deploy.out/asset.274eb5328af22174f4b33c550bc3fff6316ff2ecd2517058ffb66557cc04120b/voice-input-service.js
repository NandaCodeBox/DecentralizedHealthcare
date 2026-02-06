"use strict";
// Voice Input Service for Amazon Transcribe Integration
// Handles audio file uploads and voice-to-text conversion with fallback mechanisms
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTranscribeClient = setTranscribeClient;
exports.setS3Client = setS3Client;
exports.processVoiceInput = processVoiceInput;
exports.createPresignedUploadUrl = createPresignedUploadUrl;
const client_transcribe_1 = require("@aws-sdk/client-transcribe");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
// Environment variables
const AUDIO_UPLOAD_BUCKET = process.env.AUDIO_UPLOAD_BUCKET;
// Initialize AWS clients (lazy initialization for testing)
let transcribeClient;
let s3Client;
function getTranscribeClient() {
    if (!transcribeClient) {
        transcribeClient = new client_transcribe_1.TranscribeClient({});
    }
    return transcribeClient;
}
function getS3Client() {
    if (!s3Client) {
        s3Client = new client_s3_1.S3Client({});
    }
    return s3Client;
}
// Export for testing
function setTranscribeClient(client) {
    transcribeClient = client;
}
function setS3Client(client) {
    s3Client = client;
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
async function processVoiceInput(audioFile, patientId, language = client_transcribe_1.LanguageCode.EN_IN) {
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
        }
        catch (transcriptionError) {
            // Clean up S3 file even if transcription fails
            await cleanupS3File(s3Key);
            throw transcriptionError;
        }
    }
    catch (error) {
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
function validateAudioFile(audioFile) {
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
async function uploadAudioToS3(audioFile, patientId) {
    const fileExtension = getFileExtension(audioFile.mimeType);
    const s3Key = `audio-uploads/${patientId}/${(0, uuid_1.v4)()}.${fileExtension}`;
    console.log('Uploading audio file to S3', {
        patientId,
        s3Key,
        size: audioFile.size
    });
    const command = new client_s3_1.PutObjectCommand({
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
async function transcribeAudio(s3Key, language) {
    const jobName = `healthcare-transcription-${(0, uuid_1.v4)()}`;
    const s3Uri = `s3://${AUDIO_UPLOAD_BUCKET}/${s3Key}`;
    console.log('Starting transcription job', {
        jobName,
        s3Uri,
        language
    });
    // Start transcription job
    const startCommand = new client_transcribe_1.StartTranscriptionJobCommand({
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
async function pollTranscriptionJob(jobName) {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds
    while (Date.now() - startTime < MAX_TRANSCRIPTION_WAIT_TIME) {
        const command = new client_transcribe_1.GetTranscriptionJobCommand({
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
            case client_transcribe_1.TranscriptionJobStatus.COMPLETED:
                return await extractTranscriptionResult(job);
            case client_transcribe_1.TranscriptionJobStatus.FAILED:
                throw new Error(`Transcription job failed: ${job.FailureReason || 'Unknown error'}`);
            case client_transcribe_1.TranscriptionJobStatus.IN_PROGRESS:
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
async function extractTranscriptionResult(job) {
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
        .filter((item) => item.alternatives?.[0]?.confidence)
        .map((item) => parseFloat(item.alternatives[0].confidence));
    const averageConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length
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
async function downloadTranscriptFile(transcriptUri) {
    // Parse S3 URI to get bucket and key
    const match = transcriptUri.match(/s3:\/\/([^\/]+)\/(.+)/);
    if (!match) {
        throw new Error(`Invalid transcript URI: ${transcriptUri}`);
    }
    const [, bucket, key] = match;
    const command = new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: key
    });
    const response = await getS3Client().send(command);
    if (!response.Body) {
        throw new Error('Empty transcript file');
    }
    // Convert stream to string
    const chunks = [];
    const reader = response.Body.transformToWebStream().getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
}
/**
 * Clean up S3 file after processing
 */
async function cleanupS3File(s3Key) {
    try {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: AUDIO_UPLOAD_BUCKET,
            Key: s3Key
        });
        await getS3Client().send(command);
        console.log('S3 file cleaned up successfully', { s3Key });
    }
    catch (error) {
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
async function tryFallbackMechanisms(audioFile, patientId) {
    console.log('Attempting fallback mechanisms', { patientId });
    // Fallback 1: Try with different language settings
    try {
        console.log('Fallback 1: Trying Hindi language detection', { patientId });
        const hindiResult = await processVoiceInputWithLanguage(audioFile, patientId, client_transcribe_1.LanguageCode.HI_IN);
        if (hindiResult.success && hindiResult.transcribedText) {
            return hindiResult;
        }
    }
    catch (error) {
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
async function processVoiceInputWithLanguage(audioFile, patientId, language) {
    const s3Key = await uploadAudioToS3(audioFile, patientId);
    try {
        const result = await transcribeAudio(s3Key, language);
        await cleanupS3File(s3Key);
        return result;
    }
    catch (error) {
        await cleanupS3File(s3Key);
        throw error;
    }
}
/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType) {
    const extensions = {
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
function getMediaFormat(s3Key) {
    const extension = s3Key.split('.').pop()?.toLowerCase();
    const formats = {
        'wav': client_transcribe_1.MediaFormat.WAV,
        'mp3': client_transcribe_1.MediaFormat.MP3,
        'mp4': client_transcribe_1.MediaFormat.MP4,
        'ogg': client_transcribe_1.MediaFormat.OGG,
        'webm': client_transcribe_1.MediaFormat.WEBM,
        'flac': client_transcribe_1.MediaFormat.FLAC
    };
    return formats[extension || ''] || client_transcribe_1.MediaFormat.WAV;
}
/**
 * Create presigned URL for direct audio upload (for frontend)
 */
async function createPresignedUploadUrl(patientId, mimeType) {
    const fileExtension = getFileExtension(mimeType);
    const s3Key = `audio-uploads/${patientId}/${(0, uuid_1.v4)()}.${fileExtension}`;
    // Note: In a real implementation, you would use @aws-sdk/s3-request-presigner
    // For now, return the S3 key for direct upload handling
    return {
        uploadUrl: `https://${AUDIO_UPLOAD_BUCKET}.s3.amazonaws.com/${s3Key}`,
        s3Key
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2UtaW5wdXQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9sYW1iZGEvc3ltcHRvbS1pbnRha2Uvdm9pY2UtaW5wdXQtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsd0RBQXdEO0FBQ3hELG1GQUFtRjs7QUF5Q25GLGtEQUVDO0FBRUQsa0NBRUM7QUFtREQsOENBMkVDO0FBMlZELDREQWFDO0FBbmhCRCxrRUFRb0M7QUFDcEMsa0RBSzRCO0FBQzVCLCtCQUFvQztBQUVwQyx3QkFBd0I7QUFDeEIsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFvQixDQUFDO0FBRTdELDJEQUEyRDtBQUMzRCxJQUFJLGdCQUFrQyxDQUFDO0FBQ3ZDLElBQUksUUFBa0IsQ0FBQztBQUV2QixTQUFTLG1CQUFtQjtJQUMxQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QixnQkFBZ0IsR0FBRyxJQUFJLG9DQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFDRCxPQUFPLGdCQUFnQixDQUFDO0FBQzFCLENBQUM7QUFFRCxTQUFTLFdBQVc7SUFDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2QsUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQUVELHFCQUFxQjtBQUNyQixTQUFnQixtQkFBbUIsQ0FBQyxNQUF3QjtJQUMxRCxnQkFBZ0IsR0FBRyxNQUFNLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxNQUFnQjtJQUMxQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0FBQ3BCLENBQUM7QUF5QkQ7O0dBRUc7QUFDSCxNQUFNLHVCQUF1QixHQUFHO0lBQzlCLFdBQVc7SUFDWCxXQUFXO0lBQ1gsV0FBVztJQUNYLFlBQVk7SUFD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S0FBSyxHQUFHLGlCQUFpQixTQUFTLElBQUksSUFBQSxTQUFNLEdBQUUsSUFBSSxhQUFhLEVBQUUsQ0FBQztJQUV4RSw4RUFBOEU7SUFDOUUsd0RBQXdEO0lBQ3hELE9BQU87UUFDTCxTQUFTLEVBQUUsV0FBVyxtQkFBbUIscUJBQXFCLEtBQUssRUFBRTtRQUNyRSxLQUFLO0tBQ04sQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBWb2ljZSBJbnB1dCBTZXJ2aWNlIGZvciBBbWF6b24gVHJhbnNjcmliZSBJbnRlZ3JhdGlvblxyXG4vLyBIYW5kbGVzIGF1ZGlvIGZpbGUgdXBsb2FkcyBhbmQgdm9pY2UtdG8tdGV4dCBjb252ZXJzaW9uIHdpdGggZmFsbGJhY2sgbWVjaGFuaXNtc1xyXG5cclxuaW1wb3J0IHsgXHJcbiAgVHJhbnNjcmliZUNsaWVudCwgXHJcbiAgU3RhcnRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCwgXHJcbiAgR2V0VHJhbnNjcmlwdGlvbkpvYkNvbW1hbmQsXHJcbiAgVHJhbnNjcmlwdGlvbkpvYixcclxuICBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzLFxyXG4gIExhbmd1YWdlQ29kZSxcclxuICBNZWRpYUZvcm1hdFxyXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC10cmFuc2NyaWJlJztcclxuaW1wb3J0IHsgXHJcbiAgUzNDbGllbnQsIFxyXG4gIFB1dE9iamVjdENvbW1hbmQsIFxyXG4gIEdldE9iamVjdENvbW1hbmQsXHJcbiAgRGVsZXRlT2JqZWN0Q29tbWFuZCBcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbi8vIEVudmlyb25tZW50IHZhcmlhYmxlc1xyXG5jb25zdCBBVURJT19VUExPQURfQlVDS0VUID0gcHJvY2Vzcy5lbnYuQVVESU9fVVBMT0FEX0JVQ0tFVCE7XHJcblxyXG4vLyBJbml0aWFsaXplIEFXUyBjbGllbnRzIChsYXp5IGluaXRpYWxpemF0aW9uIGZvciB0ZXN0aW5nKVxyXG5sZXQgdHJhbnNjcmliZUNsaWVudDogVHJhbnNjcmliZUNsaWVudDtcclxubGV0IHMzQ2xpZW50OiBTM0NsaWVudDtcclxuXHJcbmZ1bmN0aW9uIGdldFRyYW5zY3JpYmVDbGllbnQoKTogVHJhbnNjcmliZUNsaWVudCB7XHJcbiAgaWYgKCF0cmFuc2NyaWJlQ2xpZW50KSB7XHJcbiAgICB0cmFuc2NyaWJlQ2xpZW50ID0gbmV3IFRyYW5zY3JpYmVDbGllbnQoe30pO1xyXG4gIH1cclxuICByZXR1cm4gdHJhbnNjcmliZUNsaWVudDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UzNDbGllbnQoKTogUzNDbGllbnQge1xyXG4gIGlmICghczNDbGllbnQpIHtcclxuICAgIHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHt9KTtcclxuICB9XHJcbiAgcmV0dXJuIHMzQ2xpZW50O1xyXG59XHJcblxyXG4vLyBFeHBvcnQgZm9yIHRlc3RpbmdcclxuZXhwb3J0IGZ1bmN0aW9uIHNldFRyYW5zY3JpYmVDbGllbnQoY2xpZW50OiBUcmFuc2NyaWJlQ2xpZW50KTogdm9pZCB7XHJcbiAgdHJhbnNjcmliZUNsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldFMzQ2xpZW50KGNsaWVudDogUzNDbGllbnQpOiB2b2lkIHtcclxuICBzM0NsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZvaWNlIGlucHV0IHByb2Nlc3NpbmcgcmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFZvaWNlSW5wdXRSZXN1bHQge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgdHJhbnNjcmliZWRUZXh0Pzogc3RyaW5nO1xyXG4gIGNvbmZpZGVuY2U/OiBudW1iZXI7XHJcbiAgbGFuZ3VhZ2U/OiBzdHJpbmc7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbiAgZmFsbGJhY2tVc2VkPzogYm9vbGVhbjtcclxuICBwcm9jZXNzaW5nVGltZU1zPzogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogQXVkaW8gZmlsZSBpbmZvcm1hdGlvblxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBBdWRpb0ZpbGVJbmZvIHtcclxuICBidWZmZXI6IEJ1ZmZlcjtcclxuICBtaW1lVHlwZTogc3RyaW5nO1xyXG4gIHNpemU6IG51bWJlcjtcclxuICBkdXJhdGlvbj86IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFN1cHBvcnRlZCBhdWRpbyBmb3JtYXRzIGZvciB0cmFuc2NyaXB0aW9uXHJcbiAqL1xyXG5jb25zdCBTVVBQT1JURURfQVVESU9fRk9STUFUUyA9IFtcclxuICAnYXVkaW8vd2F2JyxcclxuICAnYXVkaW8vbXAzJyxcclxuICAnYXVkaW8vbXA0JyxcclxuICAnYXVkaW8vbXBlZycsXHJcbiAgJ2F1ZGlvL29nZycsXHJcbiAgJ2F1ZGlvL3dlYm0nLFxyXG4gICdhdWRpby9mbGFjJ1xyXG5dO1xyXG5cclxuLyoqXHJcbiAqIE1heGltdW0gYXVkaW8gZmlsZSBzaXplICgxME1CKVxyXG4gKi9cclxuY29uc3QgTUFYX0FVRElPX1NJWkUgPSAxMCAqIDEwMjQgKiAxMDI0O1xyXG5cclxuLyoqXHJcbiAqIE1heGltdW0gdHJhbnNjcmlwdGlvbiB3YWl0IHRpbWUgKDMwIHNlY29uZHMpXHJcbiAqL1xyXG5jb25zdCBNQVhfVFJBTlNDUklQVElPTl9XQUlUX1RJTUUgPSAzMDAwMDtcclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIHZvaWNlIGlucHV0IHdpdGggQW1hem9uIFRyYW5zY3JpYmVcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9jZXNzVm9pY2VJbnB1dChcclxuICBhdWRpb0ZpbGU6IEF1ZGlvRmlsZUluZm8sXHJcbiAgcGF0aWVudElkOiBzdHJpbmcsXHJcbiAgbGFuZ3VhZ2U6IExhbmd1YWdlQ29kZSA9IExhbmd1YWdlQ29kZS5FTl9JTlxyXG4pOiBQcm9taXNlPFZvaWNlSW5wdXRSZXN1bHQ+IHtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKCdTdGFydGluZyB2b2ljZSBpbnB1dCBwcm9jZXNzaW5nJywge1xyXG4gICAgcGF0aWVudElkLFxyXG4gICAgYXVkaW9TaXplOiBhdWRpb0ZpbGUuc2l6ZSxcclxuICAgIG1pbWVUeXBlOiBhdWRpb0ZpbGUubWltZVR5cGUsXHJcbiAgICBsYW5ndWFnZVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gVmFsaWRhdGUgYXVkaW8gZmlsZVxyXG4gICAgY29uc3QgdmFsaWRhdGlvblJlc3VsdCA9IHZhbGlkYXRlQXVkaW9GaWxlKGF1ZGlvRmlsZSk7XHJcbiAgICBpZiAoIXZhbGlkYXRpb25SZXN1bHQudmFsaWQpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdBdWRpbyBmaWxlIHZhbGlkYXRpb24gZmFpbGVkJywge1xyXG4gICAgICAgIHBhdGllbnRJZCxcclxuICAgICAgICBlcnJvcjogdmFsaWRhdGlvblJlc3VsdC5lcnJvclxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBlcnJvcjogdmFsaWRhdGlvblJlc3VsdC5lcnJvcixcclxuICAgICAgICBwcm9jZXNzaW5nVGltZU1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXBsb2FkIGF1ZGlvIGZpbGUgdG8gUzNcclxuICAgIGNvbnN0IHMzS2V5ID0gYXdhaXQgdXBsb2FkQXVkaW9Ub1MzKGF1ZGlvRmlsZSwgcGF0aWVudElkKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gU3RhcnQgdHJhbnNjcmlwdGlvbiBqb2JcclxuICAgICAgY29uc3QgdHJhbnNjcmlwdGlvblJlc3VsdCA9IGF3YWl0IHRyYW5zY3JpYmVBdWRpbyhzM0tleSwgbGFuZ3VhZ2UpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2xlYW4gdXAgUzMgZmlsZVxyXG4gICAgICBhd2FpdCBjbGVhbnVwUzNGaWxlKHMzS2V5KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGUubG9nKCdWb2ljZSBpbnB1dCBwcm9jZXNzaW5nIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgICAgcGF0aWVudElkLFxyXG4gICAgICAgIHRyYW5zY3JpYmVkTGVuZ3RoOiB0cmFuc2NyaXB0aW9uUmVzdWx0LnRyYW5zY3JpYmVkVGV4dD8ubGVuZ3RoIHx8IDAsXHJcbiAgICAgICAgY29uZmlkZW5jZTogdHJhbnNjcmlwdGlvblJlc3VsdC5jb25maWRlbmNlLFxyXG4gICAgICAgIHByb2Nlc3NpbmdUaW1lTXM6IERhdGUubm93KCkgLSBzdGFydFRpbWVcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIC4uLnRyYW5zY3JpcHRpb25SZXN1bHQsXHJcbiAgICAgICAgcHJvY2Vzc2luZ1RpbWVNczogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgIH0gY2F0Y2ggKHRyYW5zY3JpcHRpb25FcnJvcikge1xyXG4gICAgICAvLyBDbGVhbiB1cCBTMyBmaWxlIGV2ZW4gaWYgdHJhbnNjcmlwdGlvbiBmYWlsc1xyXG4gICAgICBhd2FpdCBjbGVhbnVwUzNGaWxlKHMzS2V5KTtcclxuICAgICAgdGhyb3cgdHJhbnNjcmlwdGlvbkVycm9yO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHZvaWNlIGlucHV0IHByb2Nlc3NpbmcnLCB7XHJcbiAgICAgIHBhdGllbnRJZCxcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgcHJvY2Vzc2luZ1RpbWVNczogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIFRyeSBmYWxsYmFjayBtZWNoYW5pc21zXHJcbiAgICBjb25zdCBmYWxsYmFja1Jlc3VsdCA9IGF3YWl0IHRyeUZhbGxiYWNrTWVjaGFuaXNtcyhhdWRpb0ZpbGUsIHBhdGllbnRJZCk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbGxiYWNrUmVzdWx0LnN1Y2Nlc3MsXHJcbiAgICAgIHRyYW5zY3JpYmVkVGV4dDogZmFsbGJhY2tSZXN1bHQudHJhbnNjcmliZWRUZXh0LFxyXG4gICAgICBlcnJvcjogZmFsbGJhY2tSZXN1bHQuc3VjY2VzcyA/IHVuZGVmaW5lZCA6IChlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpLFxyXG4gICAgICBmYWxsYmFja1VzZWQ6IHRydWUsXHJcbiAgICAgIHByb2Nlc3NpbmdUaW1lTXM6IERhdGUubm93KCkgLSBzdGFydFRpbWVcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgYXVkaW8gZmlsZSBmb3JtYXQgYW5kIHNpemVcclxuICovXHJcbmZ1bmN0aW9uIHZhbGlkYXRlQXVkaW9GaWxlKGF1ZGlvRmlsZTogQXVkaW9GaWxlSW5mbyk6IHsgdmFsaWQ6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0ge1xyXG4gIC8vIENoZWNrIGZpbGUgc2l6ZVxyXG4gIGlmIChhdWRpb0ZpbGUuc2l6ZSA+IE1BWF9BVURJT19TSVpFKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogZmFsc2UsXHJcbiAgICAgIGVycm9yOiBgQXVkaW8gZmlsZSB0b28gbGFyZ2UuIE1heGltdW0gc2l6ZSBpcyAke01BWF9BVURJT19TSVpFIC8gKDEwMjQgKiAxMDI0KX1NQmBcclxuICAgIH07XHJcbiAgfVxyXG4gIFxyXG4gIC8vIENoZWNrIG1pbmltdW0gZmlsZSBzaXplICgxS0IpXHJcbiAgaWYgKGF1ZGlvRmlsZS5zaXplIDwgMTAyNCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICBlcnJvcjogJ0F1ZGlvIGZpbGUgdG9vIHNtYWxsLiBNaW5pbXVtIHNpemUgaXMgMUtCJ1xyXG4gICAgfTtcclxuICB9XHJcbiAgXHJcbiAgLy8gQ2hlY2sgc3VwcG9ydGVkIGZvcm1hdFxyXG4gIGlmICghU1VQUE9SVEVEX0FVRElPX0ZPUk1BVFMuaW5jbHVkZXMoYXVkaW9GaWxlLm1pbWVUeXBlKSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdmFsaWQ6IGZhbHNlLFxyXG4gICAgICBlcnJvcjogYFVuc3VwcG9ydGVkIGF1ZGlvIGZvcm1hdDogJHthdWRpb0ZpbGUubWltZVR5cGV9LiBTdXBwb3J0ZWQgZm9ybWF0czogJHtTVVBQT1JURURfQVVESU9fRk9STUFUUy5qb2luKCcsICcpfWBcclxuICAgIH07XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiB7IHZhbGlkOiB0cnVlIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGxvYWQgYXVkaW8gZmlsZSB0byBTM1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdXBsb2FkQXVkaW9Ub1MzKGF1ZGlvRmlsZTogQXVkaW9GaWxlSW5mbywgcGF0aWVudElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIGNvbnN0IGZpbGVFeHRlbnNpb24gPSBnZXRGaWxlRXh0ZW5zaW9uKGF1ZGlvRmlsZS5taW1lVHlwZSk7XHJcbiAgY29uc3QgczNLZXkgPSBgYXVkaW8tdXBsb2Fkcy8ke3BhdGllbnRJZH0vJHt1dWlkdjQoKX0uJHtmaWxlRXh0ZW5zaW9ufWA7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1VwbG9hZGluZyBhdWRpbyBmaWxlIHRvIFMzJywge1xyXG4gICAgcGF0aWVudElkLFxyXG4gICAgczNLZXksXHJcbiAgICBzaXplOiBhdWRpb0ZpbGUuc2l6ZVxyXG4gIH0pO1xyXG4gIFxyXG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICBCdWNrZXQ6IEFVRElPX1VQTE9BRF9CVUNLRVQsXHJcbiAgICBLZXk6IHMzS2V5LFxyXG4gICAgQm9keTogYXVkaW9GaWxlLmJ1ZmZlcixcclxuICAgIENvbnRlbnRUeXBlOiBhdWRpb0ZpbGUubWltZVR5cGUsXHJcbiAgICBNZXRhZGF0YToge1xyXG4gICAgICBwYXRpZW50SWQsXHJcbiAgICAgIHVwbG9hZFRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBvcmlnaW5hbFNpemU6IGF1ZGlvRmlsZS5zaXplLnRvU3RyaW5nKClcclxuICAgIH0sXHJcbiAgICBTZXJ2ZXJTaWRlRW5jcnlwdGlvbjogJ0FFUzI1NidcclxuICB9KTtcclxuICBcclxuICBhd2FpdCBnZXRTM0NsaWVudCgpLnNlbmQoY29tbWFuZCk7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ0F1ZGlvIGZpbGUgdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgcGF0aWVudElkLFxyXG4gICAgczNLZXlcclxuICB9KTtcclxuICBcclxuICByZXR1cm4gczNLZXk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUcmFuc2NyaWJlIGF1ZGlvIHVzaW5nIEFtYXpvbiBUcmFuc2NyaWJlXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB0cmFuc2NyaWJlQXVkaW8oczNLZXk6IHN0cmluZywgbGFuZ3VhZ2U6IExhbmd1YWdlQ29kZSk6IFByb21pc2U8Vm9pY2VJbnB1dFJlc3VsdD4ge1xyXG4gIGNvbnN0IGpvYk5hbWUgPSBgaGVhbHRoY2FyZS10cmFuc2NyaXB0aW9uLSR7dXVpZHY0KCl9YDtcclxuICBjb25zdCBzM1VyaSA9IGBzMzovLyR7QVVESU9fVVBMT0FEX0JVQ0tFVH0vJHtzM0tleX1gO1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKCdTdGFydGluZyB0cmFuc2NyaXB0aW9uIGpvYicsIHtcclxuICAgIGpvYk5hbWUsXHJcbiAgICBzM1VyaSxcclxuICAgIGxhbmd1YWdlXHJcbiAgfSk7XHJcbiAgXHJcbiAgLy8gU3RhcnQgdHJhbnNjcmlwdGlvbiBqb2JcclxuICBjb25zdCBzdGFydENvbW1hbmQgPSBuZXcgU3RhcnRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCh7XHJcbiAgICBUcmFuc2NyaXB0aW9uSm9iTmFtZTogam9iTmFtZSxcclxuICAgIExhbmd1YWdlQ29kZTogbGFuZ3VhZ2UsXHJcbiAgICBNZWRpYToge1xyXG4gICAgICBNZWRpYUZpbGVVcmk6IHMzVXJpXHJcbiAgICB9LFxyXG4gICAgTWVkaWFGb3JtYXQ6IGdldE1lZGlhRm9ybWF0KHMzS2V5KSxcclxuICAgIFNldHRpbmdzOiB7XHJcbiAgICAgIFNob3dTcGVha2VyTGFiZWxzOiBmYWxzZSxcclxuICAgICAgTWF4U3BlYWtlckxhYmVsczogMSxcclxuICAgICAgU2hvd0FsdGVybmF0aXZlczogdHJ1ZSxcclxuICAgICAgTWF4QWx0ZXJuYXRpdmVzOiAzXHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgXHJcbiAgYXdhaXQgZ2V0VHJhbnNjcmliZUNsaWVudCgpLnNlbmQoc3RhcnRDb21tYW5kKTtcclxuICBcclxuICAvLyBQb2xsIGZvciBjb21wbGV0aW9uXHJcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9sbFRyYW5zY3JpcHRpb25Kb2Ioam9iTmFtZSk7XHJcbiAgXHJcbiAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKHJlc3VsdC5lcnJvciB8fCAnVHJhbnNjcmlwdGlvbiBqb2IgZmFpbGVkJyk7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQb2xsIHRyYW5zY3JpcHRpb24gam9iIHVudGlsIGNvbXBsZXRpb25cclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHBvbGxUcmFuc2NyaXB0aW9uSm9iKGpvYk5hbWU6IHN0cmluZyk6IFByb21pc2U8Vm9pY2VJbnB1dFJlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgY29uc3QgcG9sbEludGVydmFsID0gMjAwMDsgLy8gMiBzZWNvbmRzXHJcbiAgXHJcbiAgd2hpbGUgKERhdGUubm93KCkgLSBzdGFydFRpbWUgPCBNQVhfVFJBTlNDUklQVElPTl9XQUlUX1RJTUUpIHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0VHJhbnNjcmlwdGlvbkpvYkNvbW1hbmQoe1xyXG4gICAgICBUcmFuc2NyaXB0aW9uSm9iTmFtZTogam9iTmFtZVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZ2V0VHJhbnNjcmliZUNsaWVudCgpLnNlbmQoY29tbWFuZCk7XHJcbiAgICBjb25zdCBqb2IgPSByZXNwb25zZS5UcmFuc2NyaXB0aW9uSm9iO1xyXG4gICAgXHJcbiAgICBpZiAoIWpvYikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyYW5zY3JpcHRpb24gam9iIG5vdCBmb3VuZCcpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnVHJhbnNjcmlwdGlvbiBqb2Igc3RhdHVzJywge1xyXG4gICAgICBqb2JOYW1lLFxyXG4gICAgICBzdGF0dXM6IGpvYi5UcmFuc2NyaXB0aW9uSm9iU3RhdHVzLFxyXG4gICAgICBlbGFwc2VkTXM6IERhdGUubm93KCkgLSBzdGFydFRpbWVcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBzd2l0Y2ggKGpvYi5UcmFuc2NyaXB0aW9uSm9iU3RhdHVzKSB7XHJcbiAgICAgIGNhc2UgVHJhbnNjcmlwdGlvbkpvYlN0YXR1cy5DT01QTEVURUQ6XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IGV4dHJhY3RUcmFuc2NyaXB0aW9uUmVzdWx0KGpvYik7XHJcbiAgICAgICAgXHJcbiAgICAgIGNhc2UgVHJhbnNjcmlwdGlvbkpvYlN0YXR1cy5GQUlMRUQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUcmFuc2NyaXB0aW9uIGpvYiBmYWlsZWQ6ICR7am9iLkZhaWx1cmVSZWFzb24gfHwgJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgICAgIFxyXG4gICAgICBjYXNlIFRyYW5zY3JpcHRpb25Kb2JTdGF0dXMuSU5fUFJPR1JFU1M6XHJcbiAgICAgICAgLy8gQ29udGludWUgcG9sbGluZ1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBwb2xsSW50ZXJ2YWwpKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgICBcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgdHJhbnNjcmlwdGlvbiBqb2Igc3RhdHVzOiAke2pvYi5UcmFuc2NyaXB0aW9uSm9iU3RhdHVzfWApO1xyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICB0aHJvdyBuZXcgRXJyb3IoJ1RyYW5zY3JpcHRpb24gam9iIHRpbWVkIG91dCcpO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdCB0cmFuc2NyaXB0aW9uIHJlc3VsdCBmcm9tIGNvbXBsZXRlZCBqb2JcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGV4dHJhY3RUcmFuc2NyaXB0aW9uUmVzdWx0KGpvYjogVHJhbnNjcmlwdGlvbkpvYik6IFByb21pc2U8Vm9pY2VJbnB1dFJlc3VsdD4ge1xyXG4gIGlmICgham9iLlRyYW5zY3JpcHQ/LlRyYW5zY3JpcHRGaWxlVXJpKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHRyYW5zY3JpcHQgZmlsZSBVUkkgZm91bmQnKTtcclxuICB9XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ0V4dHJhY3RpbmcgdHJhbnNjcmlwdGlvbiByZXN1bHQnLCB7XHJcbiAgICBqb2JOYW1lOiBqb2IuVHJhbnNjcmlwdGlvbkpvYk5hbWUsXHJcbiAgICB0cmFuc2NyaXB0VXJpOiBqb2IuVHJhbnNjcmlwdC5UcmFuc2NyaXB0RmlsZVVyaVxyXG4gIH0pO1xyXG4gIFxyXG4gIC8vIERvd25sb2FkIHRyYW5zY3JpcHQgZmlsZSBmcm9tIFMzXHJcbiAgY29uc3QgdHJhbnNjcmlwdENvbnRlbnQgPSBhd2FpdCBkb3dubG9hZFRyYW5zY3JpcHRGaWxlKGpvYi5UcmFuc2NyaXB0LlRyYW5zY3JpcHRGaWxlVXJpKTtcclxuICBcclxuICAvLyBQYXJzZSB0cmFuc2NyaXB0IEpTT05cclxuICBjb25zdCB0cmFuc2NyaXB0ID0gSlNPTi5wYXJzZSh0cmFuc2NyaXB0Q29udGVudCk7XHJcbiAgXHJcbiAgLy8gRXh0cmFjdCB0aGUgYmVzdCB0cmFuc2NyaXB0aW9uXHJcbiAgY29uc3QgdHJhbnNjcmliZWRUZXh0ID0gdHJhbnNjcmlwdC5yZXN1bHRzPy50cmFuc2NyaXB0cz8uWzBdPy50cmFuc2NyaXB0IHx8ICcnO1xyXG4gIFxyXG4gIC8vIENhbGN1bGF0ZSBhdmVyYWdlIGNvbmZpZGVuY2VcclxuICBjb25zdCBpdGVtcyA9IHRyYW5zY3JpcHQucmVzdWx0cz8uaXRlbXMgfHwgW107XHJcbiAgY29uc3QgY29uZmlkZW5jZVNjb3JlcyA9IGl0ZW1zXHJcbiAgICAuZmlsdGVyKChpdGVtOiBhbnkpID0+IGl0ZW0uYWx0ZXJuYXRpdmVzPy5bMF0/LmNvbmZpZGVuY2UpXHJcbiAgICAubWFwKChpdGVtOiBhbnkpID0+IHBhcnNlRmxvYXQoaXRlbS5hbHRlcm5hdGl2ZXNbMF0uY29uZmlkZW5jZSkpO1xyXG4gIFxyXG4gIGNvbnN0IGF2ZXJhZ2VDb25maWRlbmNlID0gY29uZmlkZW5jZVNjb3Jlcy5sZW5ndGggPiAwIFxyXG4gICAgPyBjb25maWRlbmNlU2NvcmVzLnJlZHVjZSgoc3VtOiBudW1iZXIsIGNvbmY6IG51bWJlcikgPT4gc3VtICsgY29uZiwgMCkgLyBjb25maWRlbmNlU2NvcmVzLmxlbmd0aFxyXG4gICAgOiB1bmRlZmluZWQ7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1RyYW5zY3JpcHRpb24gcmVzdWx0IGV4dHJhY3RlZCcsIHtcclxuICAgIGpvYk5hbWU6IGpvYi5UcmFuc2NyaXB0aW9uSm9iTmFtZSxcclxuICAgIHRleHRMZW5ndGg6IHRyYW5zY3JpYmVkVGV4dC5sZW5ndGgsXHJcbiAgICBjb25maWRlbmNlOiBhdmVyYWdlQ29uZmlkZW5jZSxcclxuICAgIGl0ZW1Db3VudDogaXRlbXMubGVuZ3RoXHJcbiAgfSk7XHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICB0cmFuc2NyaWJlZFRleHQ6IHRyYW5zY3JpYmVkVGV4dC50cmltKCksXHJcbiAgICBjb25maWRlbmNlOiBhdmVyYWdlQ29uZmlkZW5jZSxcclxuICAgIGxhbmd1YWdlOiBqb2IuTGFuZ3VhZ2VDb2RlXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERvd25sb2FkIHRyYW5zY3JpcHQgZmlsZSBmcm9tIFMzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZFRyYW5zY3JpcHRGaWxlKHRyYW5zY3JpcHRVcmk6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgLy8gUGFyc2UgUzMgVVJJIHRvIGdldCBidWNrZXQgYW5kIGtleVxyXG4gIGNvbnN0IG1hdGNoID0gdHJhbnNjcmlwdFVyaS5tYXRjaCgvczM6XFwvXFwvKFteXFwvXSspXFwvKC4rKS8pO1xyXG4gIGlmICghbWF0Y2gpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0cmFuc2NyaXB0IFVSSTogJHt0cmFuc2NyaXB0VXJpfWApO1xyXG4gIH1cclxuICBcclxuICBjb25zdCBbLCBidWNrZXQsIGtleV0gPSBtYXRjaDtcclxuICBcclxuICBjb25zdCBjb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgQnVja2V0OiBidWNrZXQsXHJcbiAgICBLZXk6IGtleVxyXG4gIH0pO1xyXG4gIFxyXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZ2V0UzNDbGllbnQoKS5zZW5kKGNvbW1hbmQpO1xyXG4gIFxyXG4gIGlmICghcmVzcG9uc2UuQm9keSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSB0cmFuc2NyaXB0IGZpbGUnKTtcclxuICB9XHJcbiAgXHJcbiAgLy8gQ29udmVydCBzdHJlYW0gdG8gc3RyaW5nXHJcbiAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcclxuICBjb25zdCByZWFkZXIgPSByZXNwb25zZS5Cb2R5LnRyYW5zZm9ybVRvV2ViU3RyZWFtKCkuZ2V0UmVhZGVyKCk7XHJcbiAgXHJcbiAgd2hpbGUgKHRydWUpIHtcclxuICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IHJlYWRlci5yZWFkKCk7XHJcbiAgICBpZiAoZG9uZSkgYnJlYWs7XHJcbiAgICBjaHVua3MucHVzaCh2YWx1ZSk7XHJcbiAgfVxyXG4gIFxyXG4gIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKTtcclxuICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKCd1dGYtOCcpO1xyXG59XHJcblxyXG4vKipcclxuICogQ2xlYW4gdXAgUzMgZmlsZSBhZnRlciBwcm9jZXNzaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjbGVhbnVwUzNGaWxlKHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBEZWxldGVPYmplY3RDb21tYW5kKHtcclxuICAgICAgQnVja2V0OiBBVURJT19VUExPQURfQlVDS0VULFxyXG4gICAgICBLZXk6IHMzS2V5XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgYXdhaXQgZ2V0UzNDbGllbnQoKS5zZW5kKGNvbW1hbmQpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnUzMgZmlsZSBjbGVhbmVkIHVwIHN1Y2Nlc3NmdWxseScsIHsgczNLZXkgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGNsZWFuIHVwIFMzIGZpbGUnLCB7XHJcbiAgICAgIHMzS2V5LFxyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXHJcbiAgICB9KTtcclxuICAgIC8vIERvbid0IHRocm93IGVycm9yIGZvciBjbGVhbnVwIGZhaWx1cmVzXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVHJ5IGZhbGxiYWNrIG1lY2hhbmlzbXMgd2hlbiBwcmltYXJ5IHRyYW5zY3JpcHRpb24gZmFpbHNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHRyeUZhbGxiYWNrTWVjaGFuaXNtcyhcclxuICBhdWRpb0ZpbGU6IEF1ZGlvRmlsZUluZm8sIFxyXG4gIHBhdGllbnRJZDogc3RyaW5nXHJcbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyB0cmFuc2NyaWJlZFRleHQ/OiBzdHJpbmcgfT4ge1xyXG4gIGNvbnNvbGUubG9nKCdBdHRlbXB0aW5nIGZhbGxiYWNrIG1lY2hhbmlzbXMnLCB7IHBhdGllbnRJZCB9KTtcclxuICBcclxuICAvLyBGYWxsYmFjayAxOiBUcnkgd2l0aCBkaWZmZXJlbnQgbGFuZ3VhZ2Ugc2V0dGluZ3NcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coJ0ZhbGxiYWNrIDE6IFRyeWluZyBIaW5kaSBsYW5ndWFnZSBkZXRlY3Rpb24nLCB7IHBhdGllbnRJZCB9KTtcclxuICAgIGNvbnN0IGhpbmRpUmVzdWx0ID0gYXdhaXQgcHJvY2Vzc1ZvaWNlSW5wdXRXaXRoTGFuZ3VhZ2UoYXVkaW9GaWxlLCBwYXRpZW50SWQsIExhbmd1YWdlQ29kZS5ISV9JTik7XHJcbiAgICBpZiAoaGluZGlSZXN1bHQuc3VjY2VzcyAmJiBoaW5kaVJlc3VsdC50cmFuc2NyaWJlZFRleHQpIHtcclxuICAgICAgcmV0dXJuIGhpbmRpUmVzdWx0O1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLndhcm4oJ0hpbmRpIGZhbGxiYWNrIGZhaWxlZCcsIHsgcGF0aWVudElkLCBlcnJvciB9KTtcclxuICB9XHJcbiAgXHJcbiAgLy8gRmFsbGJhY2sgMjogUmV0dXJuIGhlbHBmdWwgZXJyb3IgbWVzc2FnZSBmb3IgbWFudWFsIGVudHJ5XHJcbiAgY29uc29sZS5sb2coJ0FsbCBmYWxsYmFjayBtZWNoYW5pc21zIGZhaWxlZCcsIHsgcGF0aWVudElkIH0pO1xyXG4gIHJldHVybiB7XHJcbiAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgIHRyYW5zY3JpYmVkVGV4dDogdW5kZWZpbmVkXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFByb2Nlc3Mgdm9pY2UgaW5wdXQgd2l0aCBzcGVjaWZpYyBsYW5ndWFnZVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc1ZvaWNlSW5wdXRXaXRoTGFuZ3VhZ2UoXHJcbiAgYXVkaW9GaWxlOiBBdWRpb0ZpbGVJbmZvLFxyXG4gIHBhdGllbnRJZDogc3RyaW5nLFxyXG4gIGxhbmd1YWdlOiBMYW5ndWFnZUNvZGVcclxuKTogUHJvbWlzZTxWb2ljZUlucHV0UmVzdWx0PiB7XHJcbiAgY29uc3QgczNLZXkgPSBhd2FpdCB1cGxvYWRBdWRpb1RvUzMoYXVkaW9GaWxlLCBwYXRpZW50SWQpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0cmFuc2NyaWJlQXVkaW8oczNLZXksIGxhbmd1YWdlKTtcclxuICAgIGF3YWl0IGNsZWFudXBTM0ZpbGUoczNLZXkpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgYXdhaXQgY2xlYW51cFMzRmlsZShzM0tleSk7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgZmlsZSBleHRlbnNpb24gZnJvbSBNSU1FIHR5cGVcclxuICovXHJcbmZ1bmN0aW9uIGdldEZpbGVFeHRlbnNpb24obWltZVR5cGU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICdhdWRpby93YXYnOiAnd2F2JyxcclxuICAgICdhdWRpby9tcDMnOiAnbXAzJyxcclxuICAgICdhdWRpby9tcGVnJzogJ21wMycsXHJcbiAgICAnYXVkaW8vbXA0JzogJ21wNCcsXHJcbiAgICAnYXVkaW8vb2dnJzogJ29nZycsXHJcbiAgICAnYXVkaW8vd2VibSc6ICd3ZWJtJyxcclxuICAgICdhdWRpby9mbGFjJzogJ2ZsYWMnXHJcbiAgfTtcclxuICBcclxuICByZXR1cm4gZXh0ZW5zaW9uc1ttaW1lVHlwZV0gfHwgJ2F1ZGlvJztcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBtZWRpYSBmb3JtYXQgZm9yIFRyYW5zY3JpYmUgZnJvbSBTMyBrZXlcclxuICovXHJcbmZ1bmN0aW9uIGdldE1lZGlhRm9ybWF0KHMzS2V5OiBzdHJpbmcpOiBNZWRpYUZvcm1hdCB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gczNLZXkuc3BsaXQoJy4nKS5wb3AoKT8udG9Mb3dlckNhc2UoKTtcclxuICBcclxuICBjb25zdCBmb3JtYXRzOiBSZWNvcmQ8c3RyaW5nLCBNZWRpYUZvcm1hdD4gPSB7XHJcbiAgICAnd2F2JzogTWVkaWFGb3JtYXQuV0FWLFxyXG4gICAgJ21wMyc6IE1lZGlhRm9ybWF0Lk1QMyxcclxuICAgICdtcDQnOiBNZWRpYUZvcm1hdC5NUDQsXHJcbiAgICAnb2dnJzogTWVkaWFGb3JtYXQuT0dHLFxyXG4gICAgJ3dlYm0nOiBNZWRpYUZvcm1hdC5XRUJNLFxyXG4gICAgJ2ZsYWMnOiBNZWRpYUZvcm1hdC5GTEFDXHJcbiAgfTtcclxuICBcclxuICByZXR1cm4gZm9ybWF0c1tleHRlbnNpb24gfHwgJyddIHx8IE1lZGlhRm9ybWF0LldBVjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBwcmVzaWduZWQgVVJMIGZvciBkaXJlY3QgYXVkaW8gdXBsb2FkIChmb3IgZnJvbnRlbmQpXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsKFxyXG4gIHBhdGllbnRJZDogc3RyaW5nLFxyXG4gIG1pbWVUeXBlOiBzdHJpbmdcclxuKTogUHJvbWlzZTx7IHVwbG9hZFVybDogc3RyaW5nOyBzM0tleTogc3RyaW5nIH0+IHtcclxuICBjb25zdCBmaWxlRXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihtaW1lVHlwZSk7XHJcbiAgY29uc3QgczNLZXkgPSBgYXVkaW8tdXBsb2Fkcy8ke3BhdGllbnRJZH0vJHt1dWlkdjQoKX0uJHtmaWxlRXh0ZW5zaW9ufWA7XHJcbiAgXHJcbiAgLy8gTm90ZTogSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgdXNlIEBhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyXHJcbiAgLy8gRm9yIG5vdywgcmV0dXJuIHRoZSBTMyBrZXkgZm9yIGRpcmVjdCB1cGxvYWQgaGFuZGxpbmdcclxuICByZXR1cm4ge1xyXG4gICAgdXBsb2FkVXJsOiBgaHR0cHM6Ly8ke0FVRElPX1VQTE9BRF9CVUNLRVR9LnMzLmFtYXpvbmF3cy5jb20vJHtzM0tleX1gLFxyXG4gICAgczNLZXlcclxuICB9O1xyXG59Il19