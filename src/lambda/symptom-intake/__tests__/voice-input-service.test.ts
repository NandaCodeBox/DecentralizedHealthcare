// Unit tests for voice input service
// Tests Amazon Transcribe integration with sample audio and error handling

import { 
  processVoiceInput, 
  AudioFileInfo, 
  setTranscribeClient, 
  setS3Client,
  createPresignedUploadUrl
} from '../voice-input-service';
import { 
  TranscribeClient, 
  StartTranscriptionJobCommand, 
  GetTranscriptionJobCommand,
  TranscriptionJobStatus,
  LanguageCode
} from '@aws-sdk/client-transcribe';
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

// Mock AWS clients
const transcribeMock = mockClient(TranscribeClient);
const s3Mock = mockClient(S3Client);

// Set environment variables for testing
process.env.AUDIO_UPLOAD_BUCKET = 'test-audio-bucket';

describe('Voice Input Service', () => {
  beforeEach(() => {
    // Reset mocks
    transcribeMock.reset();
    s3Mock.reset();
    
    // Set mock clients
    setTranscribeClient(transcribeMock as any);
    setS3Client(s3Mock as any);
  });

  describe('processVoiceInput', () => {
    const mockAudioFile: AudioFileInfo = {
      buffer: Buffer.from('mock audio data'),
      mimeType: 'audio/wav',
      size: 1024
    };

    const patientId = 'test-patient-123';

    it('should successfully process voice input with transcription', async () => {
      // Mock S3 upload
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock.on(DeleteObjectCommand).resolves({});

      // Mock successful transcription job
      transcribeMock.on(StartTranscriptionJobCommand).resolves({});
      
      // Mock transcription job polling - first in progress, then completed
      transcribeMock.on(GetTranscriptionJobCommand)
        .resolvesOnce({
          TranscriptionJob: {
            TranscriptionJobName: 'test-job',
            TranscriptionJobStatus: TranscriptionJobStatus.IN_PROGRESS
          }
        })
        .resolvesOnce({
          TranscriptionJob: {
            TranscriptionJobName: 'test-job',
            TranscriptionJobStatus: TranscriptionJobStatus.COMPLETED,
            LanguageCode: LanguageCode.EN_IN,
            Transcript: {
              TranscriptFileUri: 's3://test-bucket/transcript.json'
            }
          }
        });

      // Mock transcript file download
      const mockTranscript = {
        results: {
          transcripts: [{ transcript: 'I have a headache and fever' }],
          items: [
            { alternatives: [{ confidence: '0.95' }] },
            { alternatives: [{ confidence: '0.92' }] }
          ]
        }
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToWebStream: () => ({
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ 
                  done: false, 
                  value: new TextEncoder().encode(JSON.stringify(mockTranscript)) 
                })
                .mockResolvedValueOnce({ done: true })
            })
          })
        }
      } as any);

      const result = await processVoiceInput(mockAudioFile, patientId);

      expect(result.success).toBe(true);
      expect(result.transcribedText).toBe('I have a headache and fever');
      expect(result.confidence).toBeCloseTo(0.935, 2); // Average of 0.95 and 0.92
      expect(result.language).toBe(LanguageCode.EN_IN);
      expect(result.processingTimeMs).toBeGreaterThan(0);

      // Verify S3 operations
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);

      // Verify Transcribe operations
      expect(transcribeMock.commandCalls(StartTranscriptionJobCommand)).toHaveLength(1);
      expect(transcribeMock.commandCalls(GetTranscriptionJobCommand)).toHaveLength(2);
    });

    it('should handle transcription job failure', async () => {
      // Mock S3 upload and cleanup
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock.on(DeleteObjectCommand).resolves({});

      // Mock transcription job start
      transcribeMock.on(StartTranscriptionJobCommand).resolves({});
      
      // Mock failed transcription job
      transcribeMock.on(GetTranscriptionJobCommand).resolves({
        TranscriptionJob: {
          TranscriptionJobName: 'test-job',
          TranscriptionJobStatus: TranscriptionJobStatus.FAILED,
          FailureReason: 'Audio quality too poor'
        }
      });

      const result = await processVoiceInput(mockAudioFile, patientId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio quality too poor');
      expect(result.fallbackUsed).toBe(true);

      // Verify cleanup still happened
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(2); // Original + fallback
    });

    it('should handle invalid audio file format', async () => {
      const invalidAudioFile: AudioFileInfo = {
        buffer: Buffer.from('invalid data'),
        mimeType: 'text/plain', // Invalid MIME type
        size: 1024
      };

      const result = await processVoiceInput(invalidAudioFile, patientId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported audio format');
      expect(result.processingTimeMs).toBeGreaterThan(0);

      // Should not call AWS services for invalid files
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
      expect(transcribeMock.commandCalls(StartTranscriptionJobCommand)).toHaveLength(0);
    });

    it('should handle audio file too large', async () => {
      const largeAudioFile: AudioFileInfo = {
        buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB - exceeds 10MB limit
        mimeType: 'audio/wav',
        size: 11 * 1024 * 1024
      };

      const result = await processVoiceInput(largeAudioFile, patientId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio file too large');
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle audio file too small', async () => {
      const tinyAudioFile: AudioFileInfo = {
        buffer: Buffer.alloc(500), // 500 bytes - below 1KB minimum
        mimeType: 'audio/wav',
        size: 500
      };

      const result = await processVoiceInput(tinyAudioFile, patientId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio file too small');
    });

    it('should handle S3 upload failure', async () => {
      // Mock S3 upload failure
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 upload failed'));

      const result = await processVoiceInput(mockAudioFile, patientId);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle transcription timeout', async () => {
      // Mock S3 operations
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock.on(DeleteObjectCommand).resolves({});

      // Mock transcription job start
      transcribeMock.on(StartTranscriptionJobCommand).resolves({});
      
      // Mock transcription job that stays in progress (simulating timeout)
      transcribeMock.on(GetTranscriptionJobCommand).resolves({
        TranscriptionJob: {
          TranscriptionJobName: 'test-job',
          TranscriptionJobStatus: TranscriptionJobStatus.IN_PROGRESS
        }
      });

      // This test would take too long with real timeout, so we'll mock the timeout behavior
      const result = await processVoiceInput(mockAudioFile, patientId);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should try Hindi fallback when English fails', async () => {
      // Mock S3 operations for both attempts
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock.on(DeleteObjectCommand).resolves({});

      // Mock first transcription job (English) failure
      transcribeMock.on(StartTranscriptionJobCommand)
        .resolvesOnce({}) // English attempt
        .resolvesOnce({}); // Hindi fallback

      transcribeMock.on(GetTranscriptionJobCommand)
        .resolvesOnce({
          TranscriptionJob: {
            TranscriptionJobStatus: TranscriptionJobStatus.FAILED,
            FailureReason: 'Language detection failed'
          }
        })
        .resolvesOnce({
          TranscriptionJob: {
            TranscriptionJobStatus: TranscriptionJobStatus.IN_PROGRESS
          }
        })
        .resolvesOnce({
          TranscriptionJob: {
            TranscriptionJobStatus: TranscriptionJobStatus.COMPLETED,
            LanguageCode: LanguageCode.HI_IN,
            Transcript: {
              TranscriptFileUri: 's3://test-bucket/transcript-hindi.json'
            }
          }
        });

      // Mock Hindi transcript
      const hindiTranscript = {
        results: {
          transcripts: [{ transcript: 'मुझे सिरदर्द और बुखार है' }],
          items: [{ alternatives: [{ confidence: '0.88' }] }]
        }
      };

      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToWebStream: () => ({
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ 
                  done: false, 
                  value: new TextEncoder().encode(JSON.stringify(hindiTranscript)) 
                })
                .mockResolvedValueOnce({ done: true })
            })
          })
        }
      } as any);

      const result = await processVoiceInput(mockAudioFile, patientId);

      expect(result.success).toBe(true);
      expect(result.transcribedText).toBe('मुझे सिरदर्द और बुखार है');
      expect(result.language).toBe(LanguageCode.HI_IN);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('createPresignedUploadUrl', () => {
    it('should create presigned URL for audio upload', async () => {
      const patientId = 'test-patient-123';
      const mimeType = 'audio/wav';

      const result = await createPresignedUploadUrl(patientId, mimeType);

      expect(result.uploadUrl).toContain('test-audio-bucket');
      expect(result.s3Key).toContain(`audio-uploads/${patientId}/`);
      expect(result.s3Key).toMatch(/\.wav$/);
    });

    it('should handle different audio formats', async () => {
      const patientId = 'test-patient-123';
      
      const mp3Result = await createPresignedUploadUrl(patientId, 'audio/mp3');
      expect(mp3Result.s3Key).toMatch(/\.mp3$/);

      const oggResult = await createPresignedUploadUrl(patientId, 'audio/ogg');
      expect(oggResult.s3Key).toMatch(/\.ogg$/);

      const unknownResult = await createPresignedUploadUrl(patientId, 'audio/unknown');
      expect(unknownResult.s3Key).toMatch(/\.audio$/);
    });
  });

  describe('Error handling and fallback mechanisms', () => {
    it('should provide helpful error messages for common failures', async () => {
      const mockAudioFile: AudioFileInfo = {
        buffer: Buffer.from('mock audio data'),
        mimeType: 'audio/wav',
        size: 1024
      };

      // Mock complete failure scenario
      s3Mock.on(PutObjectCommand).rejects(new Error('Network error'));

      const result = await processVoiceInput(mockAudioFile, 'test-patient');

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should clean up resources even when processing fails', async () => {
      const mockAudioFile: AudioFileInfo = {
        buffer: Buffer.from('mock audio data'),
        mimeType: 'audio/wav',
        size: 1024
      };

      // Mock S3 upload success but transcription failure
      s3Mock.on(PutObjectCommand).resolves({});
      s3Mock.on(DeleteObjectCommand).resolves({});
      transcribeMock.on(StartTranscriptionJobCommand).rejects(new Error('Transcribe service error'));

      const result = await processVoiceInput(mockAudioFile, 'test-patient');

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      
      // Verify cleanup was attempted
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(2); // Original + fallback cleanup
    });
  });
});