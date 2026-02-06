"use strict";
// Unit tests for voice input service
// Tests Amazon Transcribe integration with sample audio and error handling
Object.defineProperty(exports, "__esModule", { value: true });
const voice_input_service_1 = require("../voice-input-service");
const client_transcribe_1 = require("@aws-sdk/client-transcribe");
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
// Mock AWS clients
const transcribeMock = (0, aws_sdk_client_mock_1.mockClient)(client_transcribe_1.TranscribeClient);
const s3Mock = (0, aws_sdk_client_mock_1.mockClient)(client_s3_1.S3Client);
// Set environment variables for testing
process.env.AUDIO_UPLOAD_BUCKET = 'test-audio-bucket';
describe('Voice Input Service', () => {
    beforeEach(() => {
        // Reset mocks
        transcribeMock.reset();
        s3Mock.reset();
        // Set mock clients
        (0, voice_input_service_1.setTranscribeClient)(transcribeMock);
        (0, voice_input_service_1.setS3Client)(s3Mock);
    });
    describe('processVoiceInput', () => {
        const mockAudioFile = {
            buffer: Buffer.from('mock audio data'),
            mimeType: 'audio/wav',
            size: 1024
        };
        const patientId = 'test-patient-123';
        it('should successfully process voice input with transcription', async () => {
            // Mock S3 upload
            s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
            s3Mock.on(client_s3_1.DeleteObjectCommand).resolves({});
            // Mock successful transcription job
            transcribeMock.on(client_transcribe_1.StartTranscriptionJobCommand).resolves({});
            // Mock transcription job polling - first in progress, then completed
            transcribeMock.on(client_transcribe_1.GetTranscriptionJobCommand)
                .resolvesOnce({
                TranscriptionJob: {
                    TranscriptionJobName: 'test-job',
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.IN_PROGRESS
                }
            })
                .resolvesOnce({
                TranscriptionJob: {
                    TranscriptionJobName: 'test-job',
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.COMPLETED,
                    LanguageCode: client_transcribe_1.LanguageCode.EN_IN,
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
            s3Mock.on(client_s3_1.GetObjectCommand).resolves({
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
            });
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, patientId);
            expect(result.success).toBe(true);
            expect(result.transcribedText).toBe('I have a headache and fever');
            expect(result.confidence).toBeCloseTo(0.935, 2); // Average of 0.95 and 0.92
            expect(result.language).toBe(client_transcribe_1.LanguageCode.EN_IN);
            expect(result.processingTimeMs).toBeGreaterThan(0);
            // Verify S3 operations
            expect(s3Mock.commandCalls(client_s3_1.PutObjectCommand)).toHaveLength(1);
            expect(s3Mock.commandCalls(client_s3_1.DeleteObjectCommand)).toHaveLength(1);
            // Verify Transcribe operations
            expect(transcribeMock.commandCalls(client_transcribe_1.StartTranscriptionJobCommand)).toHaveLength(1);
            expect(transcribeMock.commandCalls(client_transcribe_1.GetTranscriptionJobCommand)).toHaveLength(2);
        });
        it('should handle transcription job failure', async () => {
            // Mock S3 upload and cleanup
            s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
            s3Mock.on(client_s3_1.DeleteObjectCommand).resolves({});
            // Mock transcription job start
            transcribeMock.on(client_transcribe_1.StartTranscriptionJobCommand).resolves({});
            // Mock failed transcription job
            transcribeMock.on(client_transcribe_1.GetTranscriptionJobCommand).resolves({
                TranscriptionJob: {
                    TranscriptionJobName: 'test-job',
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.FAILED,
                    FailureReason: 'Audio quality too poor'
                }
            });
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, patientId);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Audio quality too poor');
            expect(result.fallbackUsed).toBe(true);
            // Verify cleanup still happened
            expect(s3Mock.commandCalls(client_s3_1.DeleteObjectCommand)).toHaveLength(2); // Original + fallback
        });
        it('should handle invalid audio file format', async () => {
            const invalidAudioFile = {
                buffer: Buffer.from('invalid data'),
                mimeType: 'text/plain', // Invalid MIME type
                size: 1024
            };
            const result = await (0, voice_input_service_1.processVoiceInput)(invalidAudioFile, patientId);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported audio format');
            expect(result.processingTimeMs).toBeGreaterThan(0);
            // Should not call AWS services for invalid files
            expect(s3Mock.commandCalls(client_s3_1.PutObjectCommand)).toHaveLength(0);
            expect(transcribeMock.commandCalls(client_transcribe_1.StartTranscriptionJobCommand)).toHaveLength(0);
        });
        it('should handle audio file too large', async () => {
            const largeAudioFile = {
                buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB - exceeds 10MB limit
                mimeType: 'audio/wav',
                size: 11 * 1024 * 1024
            };
            const result = await (0, voice_input_service_1.processVoiceInput)(largeAudioFile, patientId);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Audio file too large');
            expect(result.processingTimeMs).toBeGreaterThan(0);
        });
        it('should handle audio file too small', async () => {
            const tinyAudioFile = {
                buffer: Buffer.alloc(500), // 500 bytes - below 1KB minimum
                mimeType: 'audio/wav',
                size: 500
            };
            const result = await (0, voice_input_service_1.processVoiceInput)(tinyAudioFile, patientId);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Audio file too small');
        });
        it('should handle S3 upload failure', async () => {
            // Mock S3 upload failure
            s3Mock.on(client_s3_1.PutObjectCommand).rejects(new Error('S3 upload failed'));
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, patientId);
            expect(result.success).toBe(false);
            expect(result.fallbackUsed).toBe(true);
            expect(result.processingTimeMs).toBeGreaterThan(0);
        });
        it('should handle transcription timeout', async () => {
            // Mock S3 operations
            s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
            s3Mock.on(client_s3_1.DeleteObjectCommand).resolves({});
            // Mock transcription job start
            transcribeMock.on(client_transcribe_1.StartTranscriptionJobCommand).resolves({});
            // Mock transcription job that stays in progress (simulating timeout)
            transcribeMock.on(client_transcribe_1.GetTranscriptionJobCommand).resolves({
                TranscriptionJob: {
                    TranscriptionJobName: 'test-job',
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.IN_PROGRESS
                }
            });
            // This test would take too long with real timeout, so we'll mock the timeout behavior
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, patientId);
            expect(result.success).toBe(false);
            expect(result.fallbackUsed).toBe(true);
        });
        it('should try Hindi fallback when English fails', async () => {
            // Mock S3 operations for both attempts
            s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
            s3Mock.on(client_s3_1.DeleteObjectCommand).resolves({});
            // Mock first transcription job (English) failure
            transcribeMock.on(client_transcribe_1.StartTranscriptionJobCommand)
                .resolvesOnce({}) // English attempt
                .resolvesOnce({}); // Hindi fallback
            transcribeMock.on(client_transcribe_1.GetTranscriptionJobCommand)
                .resolvesOnce({
                TranscriptionJob: {
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.FAILED,
                    FailureReason: 'Language detection failed'
                }
            })
                .resolvesOnce({
                TranscriptionJob: {
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.IN_PROGRESS
                }
            })
                .resolvesOnce({
                TranscriptionJob: {
                    TranscriptionJobStatus: client_transcribe_1.TranscriptionJobStatus.COMPLETED,
                    LanguageCode: client_transcribe_1.LanguageCode.HI_IN,
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
            s3Mock.on(client_s3_1.GetObjectCommand).resolves({
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
            });
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, patientId);
            expect(result.success).toBe(true);
            expect(result.transcribedText).toBe('मुझे सिरदर्द और बुखार है');
            expect(result.language).toBe(client_transcribe_1.LanguageCode.HI_IN);
            expect(result.fallbackUsed).toBe(true);
        });
    });
    describe('createPresignedUploadUrl', () => {
        it('should create presigned URL for audio upload', async () => {
            const patientId = 'test-patient-123';
            const mimeType = 'audio/wav';
            const result = await (0, voice_input_service_1.createPresignedUploadUrl)(patientId, mimeType);
            expect(result.uploadUrl).toContain('test-audio-bucket');
            expect(result.s3Key).toContain(`audio-uploads/${patientId}/`);
            expect(result.s3Key).toMatch(/\.wav$/);
        });
        it('should handle different audio formats', async () => {
            const patientId = 'test-patient-123';
            const mp3Result = await (0, voice_input_service_1.createPresignedUploadUrl)(patientId, 'audio/mp3');
            expect(mp3Result.s3Key).toMatch(/\.mp3$/);
            const oggResult = await (0, voice_input_service_1.createPresignedUploadUrl)(patientId, 'audio/ogg');
            expect(oggResult.s3Key).toMatch(/\.ogg$/);
            const unknownResult = await (0, voice_input_service_1.createPresignedUploadUrl)(patientId, 'audio/unknown');
            expect(unknownResult.s3Key).toMatch(/\.audio$/);
        });
    });
    describe('Error handling and fallback mechanisms', () => {
        it('should provide helpful error messages for common failures', async () => {
            const mockAudioFile = {
                buffer: Buffer.from('mock audio data'),
                mimeType: 'audio/wav',
                size: 1024
            };
            // Mock complete failure scenario
            s3Mock.on(client_s3_1.PutObjectCommand).rejects(new Error('Network error'));
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, 'test-patient');
            expect(result.success).toBe(false);
            expect(result.fallbackUsed).toBe(true);
            expect(result.processingTimeMs).toBeGreaterThan(0);
        });
        it('should clean up resources even when processing fails', async () => {
            const mockAudioFile = {
                buffer: Buffer.from('mock audio data'),
                mimeType: 'audio/wav',
                size: 1024
            };
            // Mock S3 upload success but transcription failure
            s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
            s3Mock.on(client_s3_1.DeleteObjectCommand).resolves({});
            transcribeMock.on(client_transcribe_1.StartTranscriptionJobCommand).rejects(new Error('Transcribe service error'));
            const result = await (0, voice_input_service_1.processVoiceInput)(mockAudioFile, 'test-patient');
            expect(result.success).toBe(false);
            expect(result.fallbackUsed).toBe(true);
            // Verify cleanup was attempted
            expect(s3Mock.commandCalls(client_s3_1.DeleteObjectCommand)).toHaveLength(2); // Original + fallback cleanup
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2UtaW5wdXQtc2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xhbWJkYS9zeW1wdG9tLWludGFrZS9fX3Rlc3RzX18vdm9pY2UtaW5wdXQtc2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsMkVBQTJFOztBQUUzRSxnRUFNZ0M7QUFDaEMsa0VBTW9DO0FBQ3BDLGtEQUs0QjtBQUM1Qiw2REFBaUQ7QUFFakQsbUJBQW1CO0FBQ25CLE1BQU0sY0FBYyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxvQ0FBZ0IsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sTUFBTSxHQUFHLElBQUEsZ0NBQVUsRUFBQyxvQkFBUSxDQUFDLENBQUM7QUFFcEMsd0NBQXdDO0FBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsbUJBQW1CLENBQUM7QUFFdEQsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNuQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsY0FBYztRQUNkLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFZixtQkFBbUI7UUFDbkIsSUFBQSx5Q0FBbUIsRUFBQyxjQUFxQixDQUFDLENBQUM7UUFDM0MsSUFBQSxpQ0FBVyxFQUFDLE1BQWEsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxNQUFNLGFBQWEsR0FBa0I7WUFDbkMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7WUFDdEMsUUFBUSxFQUFFLFdBQVc7WUFDckIsSUFBSSxFQUFFLElBQUk7U0FDWCxDQUFDO1FBRUYsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUM7UUFFckMsRUFBRSxDQUFDLDREQUE0RCxF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QyxpQkFBaUIsQ0FBQztnQkFDdEMsUUFBUSxFQUFFLFdBQVc7Z0JBQ3JCLElBQUksRUFBRSxJQUFJO2FBQ1gsQ0FBQztZQUVGLG1EQUFtRDtZQUNuRCxNQUFNLENBQUMsRUFBRSxDQUFDLDRCQUFnQixDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsK0JBQW1CLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxnREFBNEIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7WUFFL0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHVDQUFpQixFQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUV0RSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV2QywrQkFBK0I7WUFDL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsK0JBQW1CLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtRQUNsRyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBVbml0IHRlc3RzIGZvciB2b2ljZSBpbnB1dCBzZXJ2aWNlXHJcbi8vIFRlc3RzIEFtYXpvbiBUcmFuc2NyaWJlIGludGVncmF0aW9uIHdpdGggc2FtcGxlIGF1ZGlvIGFuZCBlcnJvciBoYW5kbGluZ1xyXG5cclxuaW1wb3J0IHsgXHJcbiAgcHJvY2Vzc1ZvaWNlSW5wdXQsIFxyXG4gIEF1ZGlvRmlsZUluZm8sIFxyXG4gIHNldFRyYW5zY3JpYmVDbGllbnQsIFxyXG4gIHNldFMzQ2xpZW50LFxyXG4gIGNyZWF0ZVByZXNpZ25lZFVwbG9hZFVybFxyXG59IGZyb20gJy4uL3ZvaWNlLWlucHV0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBcclxuICBUcmFuc2NyaWJlQ2xpZW50LCBcclxuICBTdGFydFRyYW5zY3JpcHRpb25Kb2JDb21tYW5kLCBcclxuICBHZXRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCxcclxuICBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzLFxyXG4gIExhbmd1YWdlQ29kZVxyXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC10cmFuc2NyaWJlJztcclxuaW1wb3J0IHsgXHJcbiAgUzNDbGllbnQsIFxyXG4gIFB1dE9iamVjdENvbW1hbmQsIFxyXG4gIEdldE9iamVjdENvbW1hbmQsXHJcbiAgRGVsZXRlT2JqZWN0Q29tbWFuZCBcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBtb2NrQ2xpZW50IH0gZnJvbSAnYXdzLXNkay1jbGllbnQtbW9jayc7XHJcblxyXG4vLyBNb2NrIEFXUyBjbGllbnRzXHJcbmNvbnN0IHRyYW5zY3JpYmVNb2NrID0gbW9ja0NsaWVudChUcmFuc2NyaWJlQ2xpZW50KTtcclxuY29uc3QgczNNb2NrID0gbW9ja0NsaWVudChTM0NsaWVudCk7XHJcblxyXG4vLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0ZXN0aW5nXHJcbnByb2Nlc3MuZW52LkFVRElPX1VQTE9BRF9CVUNLRVQgPSAndGVzdC1hdWRpby1idWNrZXQnO1xyXG5cclxuZGVzY3JpYmUoJ1ZvaWNlIElucHV0IFNlcnZpY2UnLCAoKSA9PiB7XHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAvLyBSZXNldCBtb2Nrc1xyXG4gICAgdHJhbnNjcmliZU1vY2sucmVzZXQoKTtcclxuICAgIHMzTW9jay5yZXNldCgpO1xyXG4gICAgXHJcbiAgICAvLyBTZXQgbW9jayBjbGllbnRzXHJcbiAgICBzZXRUcmFuc2NyaWJlQ2xpZW50KHRyYW5zY3JpYmVNb2NrIGFzIGFueSk7XHJcbiAgICBzZXRTM0NsaWVudChzM01vY2sgYXMgYW55KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ3Byb2Nlc3NWb2ljZUlucHV0JywgKCkgPT4ge1xyXG4gICAgY29uc3QgbW9ja0F1ZGlvRmlsZTogQXVkaW9GaWxlSW5mbyA9IHtcclxuICAgICAgYnVmZmVyOiBCdWZmZXIuZnJvbSgnbW9jayBhdWRpbyBkYXRhJyksXHJcbiAgICAgIG1pbWVUeXBlOiAnYXVkaW8vd2F2JyxcclxuICAgICAgc2l6ZTogMTAyNFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBwYXRpZW50SWQgPSAndGVzdC1wYXRpZW50LTEyMyc7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBzdWNjZXNzZnVsbHkgcHJvY2VzcyB2b2ljZSBpbnB1dCB3aXRoIHRyYW5zY3JpcHRpb24nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgUzMgdXBsb2FkXHJcbiAgICAgIHMzTW9jay5vbihQdXRPYmplY3RDb21tYW5kKS5yZXNvbHZlcyh7fSk7XHJcbiAgICAgIHMzTW9jay5vbihEZWxldGVPYmplY3RDb21tYW5kKS5yZXNvbHZlcyh7fSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHN1Y2Nlc3NmdWwgdHJhbnNjcmlwdGlvbiBqb2JcclxuICAgICAgdHJhbnNjcmliZU1vY2sub24oU3RhcnRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG4gICAgICBcclxuICAgICAgLy8gTW9jayB0cmFuc2NyaXB0aW9uIGpvYiBwb2xsaW5nIC0gZmlyc3QgaW4gcHJvZ3Jlc3MsIHRoZW4gY29tcGxldGVkXHJcbiAgICAgIHRyYW5zY3JpYmVNb2NrLm9uKEdldFRyYW5zY3JpcHRpb25Kb2JDb21tYW5kKVxyXG4gICAgICAgIC5yZXNvbHZlc09uY2Uoe1xyXG4gICAgICAgICAgVHJhbnNjcmlwdGlvbkpvYjoge1xyXG4gICAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iTmFtZTogJ3Rlc3Qtam9iJyxcclxuICAgICAgICAgICAgVHJhbnNjcmlwdGlvbkpvYlN0YXR1czogVHJhbnNjcmlwdGlvbkpvYlN0YXR1cy5JTl9QUk9HUkVTU1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnJlc29sdmVzT25jZSh7XHJcbiAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iOiB7XHJcbiAgICAgICAgICAgIFRyYW5zY3JpcHRpb25Kb2JOYW1lOiAndGVzdC1qb2InLFxyXG4gICAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzOiBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzLkNPTVBMRVRFRCxcclxuICAgICAgICAgICAgTGFuZ3VhZ2VDb2RlOiBMYW5ndWFnZUNvZGUuRU5fSU4sXHJcbiAgICAgICAgICAgIFRyYW5zY3JpcHQ6IHtcclxuICAgICAgICAgICAgICBUcmFuc2NyaXB0RmlsZVVyaTogJ3MzOi8vdGVzdC1idWNrZXQvdHJhbnNjcmlwdC5qc29uJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHRyYW5zY3JpcHQgZmlsZSBkb3dubG9hZFxyXG4gICAgICBjb25zdCBtb2NrVHJhbnNjcmlwdCA9IHtcclxuICAgICAgICByZXN1bHRzOiB7XHJcbiAgICAgICAgICB0cmFuc2NyaXB0czogW3sgdHJhbnNjcmlwdDogJ0kgaGF2ZSBhIGhlYWRhY2hlIGFuZCBmZXZlcicgfV0sXHJcbiAgICAgICAgICBpdGVtczogW1xyXG4gICAgICAgICAgICB7IGFsdGVybmF0aXZlczogW3sgY29uZmlkZW5jZTogJzAuOTUnIH1dIH0sXHJcbiAgICAgICAgICAgIHsgYWx0ZXJuYXRpdmVzOiBbeyBjb25maWRlbmNlOiAnMC45MicgfV0gfVxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHMzTW9jay5vbihHZXRPYmplY3RDb21tYW5kKS5yZXNvbHZlcyh7XHJcbiAgICAgICAgQm9keToge1xyXG4gICAgICAgICAgdHJhbnNmb3JtVG9XZWJTdHJlYW06ICgpID0+ICh7XHJcbiAgICAgICAgICAgIGdldFJlYWRlcjogKCkgPT4gKHtcclxuICAgICAgICAgICAgICByZWFkOiBqZXN0LmZuKClcclxuICAgICAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBcclxuICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsIFxyXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KG1vY2tUcmFuc2NyaXB0KSkgXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IGRvbmU6IHRydWUgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9IGFzIGFueSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm9jZXNzVm9pY2VJbnB1dChtb2NrQXVkaW9GaWxlLCBwYXRpZW50SWQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnRyYW5zY3JpYmVkVGV4dCkudG9CZSgnSSBoYXZlIGEgaGVhZGFjaGUgYW5kIGZldmVyJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuY29uZmlkZW5jZSkudG9CZUNsb3NlVG8oMC45MzUsIDIpOyAvLyBBdmVyYWdlIG9mIDAuOTUgYW5kIDAuOTJcclxuICAgICAgZXhwZWN0KHJlc3VsdC5sYW5ndWFnZSkudG9CZShMYW5ndWFnZUNvZGUuRU5fSU4pO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnByb2Nlc3NpbmdUaW1lTXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBTMyBvcGVyYXRpb25zXHJcbiAgICAgIGV4cGVjdChzM01vY2suY29tbWFuZENhbGxzKFB1dE9iamVjdENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMSk7XHJcbiAgICAgIGV4cGVjdChzM01vY2suY29tbWFuZENhbGxzKERlbGV0ZU9iamVjdENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgVHJhbnNjcmliZSBvcGVyYXRpb25zXHJcbiAgICAgIGV4cGVjdCh0cmFuc2NyaWJlTW9jay5jb21tYW5kQ2FsbHMoU3RhcnRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KHRyYW5zY3JpYmVNb2NrLmNvbW1hbmRDYWxscyhHZXRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgyKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHRyYW5zY3JpcHRpb24gam9iIGZhaWx1cmUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgUzMgdXBsb2FkIGFuZCBjbGVhbnVwXHJcbiAgICAgIHMzTW9jay5vbihQdXRPYmplY3RDb21tYW5kKS5yZXNvbHZlcyh7fSk7XHJcbiAgICAgIHMzTW9jay5vbihEZWxldGVPYmplY3RDb21tYW5kKS5yZXNvbHZlcyh7fSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHRyYW5zY3JpcHRpb24gam9iIHN0YXJ0XHJcbiAgICAgIHRyYW5zY3JpYmVNb2NrLm9uKFN0YXJ0VHJhbnNjcmlwdGlvbkpvYkNvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIE1vY2sgZmFpbGVkIHRyYW5zY3JpcHRpb24gam9iXHJcbiAgICAgIHRyYW5zY3JpYmVNb2NrLm9uKEdldFRyYW5zY3JpcHRpb25Kb2JDb21tYW5kKS5yZXNvbHZlcyh7XHJcbiAgICAgICAgVHJhbnNjcmlwdGlvbkpvYjoge1xyXG4gICAgICAgICAgVHJhbnNjcmlwdGlvbkpvYk5hbWU6ICd0ZXN0LWpvYicsXHJcbiAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzOiBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzLkZBSUxFRCxcclxuICAgICAgICAgIEZhaWx1cmVSZWFzb246ICdBdWRpbyBxdWFsaXR5IHRvbyBwb29yJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm9jZXNzVm9pY2VJbnB1dChtb2NrQXVkaW9GaWxlLCBwYXRpZW50SWQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKCdBdWRpbyBxdWFsaXR5IHRvbyBwb29yJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFsbGJhY2tVc2VkKS50b0JlKHRydWUpO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IGNsZWFudXAgc3RpbGwgaGFwcGVuZWRcclxuICAgICAgZXhwZWN0KHMzTW9jay5jb21tYW5kQ2FsbHMoRGVsZXRlT2JqZWN0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgyKTsgLy8gT3JpZ2luYWwgKyBmYWxsYmFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgaW52YWxpZCBhdWRpbyBmaWxlIGZvcm1hdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaW52YWxpZEF1ZGlvRmlsZTogQXVkaW9GaWxlSW5mbyA9IHtcclxuICAgICAgICBidWZmZXI6IEJ1ZmZlci5mcm9tKCdpbnZhbGlkIGRhdGEnKSxcclxuICAgICAgICBtaW1lVHlwZTogJ3RleHQvcGxhaW4nLCAvLyBJbnZhbGlkIE1JTUUgdHlwZVxyXG4gICAgICAgIHNpemU6IDEwMjRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb2Nlc3NWb2ljZUlucHV0KGludmFsaWRBdWRpb0ZpbGUsIHBhdGllbnRJZCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oJ1Vuc3VwcG9ydGVkIGF1ZGlvIGZvcm1hdCcpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnByb2Nlc3NpbmdUaW1lTXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCBub3QgY2FsbCBBV1Mgc2VydmljZXMgZm9yIGludmFsaWQgZmlsZXNcclxuICAgICAgZXhwZWN0KHMzTW9jay5jb21tYW5kQ2FsbHMoUHV0T2JqZWN0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgwKTtcclxuICAgICAgZXhwZWN0KHRyYW5zY3JpYmVNb2NrLmNvbW1hbmRDYWxscyhTdGFydFRyYW5zY3JpcHRpb25Kb2JDb21tYW5kKSkudG9IYXZlTGVuZ3RoKDApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgYXVkaW8gZmlsZSB0b28gbGFyZ2UnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxhcmdlQXVkaW9GaWxlOiBBdWRpb0ZpbGVJbmZvID0ge1xyXG4gICAgICAgIGJ1ZmZlcjogQnVmZmVyLmFsbG9jKDExICogMTAyNCAqIDEwMjQpLCAvLyAxMU1CIC0gZXhjZWVkcyAxME1CIGxpbWl0XHJcbiAgICAgICAgbWltZVR5cGU6ICdhdWRpby93YXYnLFxyXG4gICAgICAgIHNpemU6IDExICogMTAyNCAqIDEwMjRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb2Nlc3NWb2ljZUlucHV0KGxhcmdlQXVkaW9GaWxlLCBwYXRpZW50SWQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcikudG9Db250YWluKCdBdWRpbyBmaWxlIHRvbyBsYXJnZScpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnByb2Nlc3NpbmdUaW1lTXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIGF1ZGlvIGZpbGUgdG9vIHNtYWxsJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB0aW55QXVkaW9GaWxlOiBBdWRpb0ZpbGVJbmZvID0ge1xyXG4gICAgICAgIGJ1ZmZlcjogQnVmZmVyLmFsbG9jKDUwMCksIC8vIDUwMCBieXRlcyAtIGJlbG93IDFLQiBtaW5pbXVtXHJcbiAgICAgICAgbWltZVR5cGU6ICdhdWRpby93YXYnLFxyXG4gICAgICAgIHNpemU6IDUwMFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvY2Vzc1ZvaWNlSW5wdXQodGlueUF1ZGlvRmlsZSwgcGF0aWVudElkKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbignQXVkaW8gZmlsZSB0b28gc21hbGwnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIFMzIHVwbG9hZCBmYWlsdXJlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAvLyBNb2NrIFMzIHVwbG9hZCBmYWlsdXJlXHJcbiAgICAgIHMzTW9jay5vbihQdXRPYmplY3RDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignUzMgdXBsb2FkIGZhaWxlZCcpKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb2Nlc3NWb2ljZUlucHV0KG1vY2tBdWRpb0ZpbGUsIHBhdGllbnRJZCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmZhbGxiYWNrVXNlZCkudG9CZSh0cnVlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5wcm9jZXNzaW5nVGltZU1zKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB0cmFuc2NyaXB0aW9uIHRpbWVvdXQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgUzMgb3BlcmF0aW9uc1xyXG4gICAgICBzM01vY2sub24oUHV0T2JqZWN0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG4gICAgICBzM01vY2sub24oRGVsZXRlT2JqZWN0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG5cclxuICAgICAgLy8gTW9jayB0cmFuc2NyaXB0aW9uIGpvYiBzdGFydFxyXG4gICAgICB0cmFuc2NyaWJlTW9jay5vbihTdGFydFRyYW5zY3JpcHRpb25Kb2JDb21tYW5kKS5yZXNvbHZlcyh7fSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBNb2NrIHRyYW5zY3JpcHRpb24gam9iIHRoYXQgc3RheXMgaW4gcHJvZ3Jlc3MgKHNpbXVsYXRpbmcgdGltZW91dClcclxuICAgICAgdHJhbnNjcmliZU1vY2sub24oR2V0VHJhbnNjcmlwdGlvbkpvYkNvbW1hbmQpLnJlc29sdmVzKHtcclxuICAgICAgICBUcmFuc2NyaXB0aW9uSm9iOiB7XHJcbiAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iTmFtZTogJ3Rlc3Qtam9iJyxcclxuICAgICAgICAgIFRyYW5zY3JpcHRpb25Kb2JTdGF0dXM6IFRyYW5zY3JpcHRpb25Kb2JTdGF0dXMuSU5fUFJPR1JFU1NcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gVGhpcyB0ZXN0IHdvdWxkIHRha2UgdG9vIGxvbmcgd2l0aCByZWFsIHRpbWVvdXQsIHNvIHdlJ2xsIG1vY2sgdGhlIHRpbWVvdXQgYmVoYXZpb3JcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvY2Vzc1ZvaWNlSW5wdXQobW9ja0F1ZGlvRmlsZSwgcGF0aWVudElkKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFsbGJhY2tVc2VkKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB0cnkgSGluZGkgZmFsbGJhY2sgd2hlbiBFbmdsaXNoIGZhaWxzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAvLyBNb2NrIFMzIG9wZXJhdGlvbnMgZm9yIGJvdGggYXR0ZW1wdHNcclxuICAgICAgczNNb2NrLm9uKFB1dE9iamVjdENvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuICAgICAgczNNb2NrLm9uKERlbGV0ZU9iamVjdENvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgZmlyc3QgdHJhbnNjcmlwdGlvbiBqb2IgKEVuZ2xpc2gpIGZhaWx1cmVcclxuICAgICAgdHJhbnNjcmliZU1vY2sub24oU3RhcnRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZClcclxuICAgICAgICAucmVzb2x2ZXNPbmNlKHt9KSAvLyBFbmdsaXNoIGF0dGVtcHRcclxuICAgICAgICAucmVzb2x2ZXNPbmNlKHt9KTsgLy8gSGluZGkgZmFsbGJhY2tcclxuXHJcbiAgICAgIHRyYW5zY3JpYmVNb2NrLm9uKEdldFRyYW5zY3JpcHRpb25Kb2JDb21tYW5kKVxyXG4gICAgICAgIC5yZXNvbHZlc09uY2Uoe1xyXG4gICAgICAgICAgVHJhbnNjcmlwdGlvbkpvYjoge1xyXG4gICAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzOiBUcmFuc2NyaXB0aW9uSm9iU3RhdHVzLkZBSUxFRCxcclxuICAgICAgICAgICAgRmFpbHVyZVJlYXNvbjogJ0xhbmd1YWdlIGRldGVjdGlvbiBmYWlsZWQnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAucmVzb2x2ZXNPbmNlKHtcclxuICAgICAgICAgIFRyYW5zY3JpcHRpb25Kb2I6IHtcclxuICAgICAgICAgICAgVHJhbnNjcmlwdGlvbkpvYlN0YXR1czogVHJhbnNjcmlwdGlvbkpvYlN0YXR1cy5JTl9QUk9HUkVTU1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnJlc29sdmVzT25jZSh7XHJcbiAgICAgICAgICBUcmFuc2NyaXB0aW9uSm9iOiB7XHJcbiAgICAgICAgICAgIFRyYW5zY3JpcHRpb25Kb2JTdGF0dXM6IFRyYW5zY3JpcHRpb25Kb2JTdGF0dXMuQ09NUExFVEVELFxyXG4gICAgICAgICAgICBMYW5ndWFnZUNvZGU6IExhbmd1YWdlQ29kZS5ISV9JTixcclxuICAgICAgICAgICAgVHJhbnNjcmlwdDoge1xyXG4gICAgICAgICAgICAgIFRyYW5zY3JpcHRGaWxlVXJpOiAnczM6Ly90ZXN0LWJ1Y2tldC90cmFuc2NyaXB0LWhpbmRpLmpzb24nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgSGluZGkgdHJhbnNjcmlwdFxyXG4gICAgICBjb25zdCBoaW5kaVRyYW5zY3JpcHQgPSB7XHJcbiAgICAgICAgcmVzdWx0czoge1xyXG4gICAgICAgICAgdHJhbnNjcmlwdHM6IFt7IHRyYW5zY3JpcHQ6ICfgpK7gpYHgpJ3gpYcg4KS44KS/4KSw4KSm4KSw4KWN4KSmIOCklOCksCDgpKzgpYHgpJbgpL7gpLAg4KS54KWIJyB9XSxcclxuICAgICAgICAgIGl0ZW1zOiBbeyBhbHRlcm5hdGl2ZXM6IFt7IGNvbmZpZGVuY2U6ICcwLjg4JyB9XSB9XVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIHMzTW9jay5vbihHZXRPYmplY3RDb21tYW5kKS5yZXNvbHZlcyh7XHJcbiAgICAgICAgQm9keToge1xyXG4gICAgICAgICAgdHJhbnNmb3JtVG9XZWJTdHJlYW06ICgpID0+ICh7XHJcbiAgICAgICAgICAgIGdldFJlYWRlcjogKCkgPT4gKHtcclxuICAgICAgICAgICAgICByZWFkOiBqZXN0LmZuKClcclxuICAgICAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBcclxuICAgICAgICAgICAgICAgICAgZG9uZTogZmFsc2UsIFxyXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KGhpbmRpVHJhbnNjcmlwdCkpIFxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBkb25lOiB0cnVlIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfSBhcyBhbnkpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvY2Vzc1ZvaWNlSW5wdXQobW9ja0F1ZGlvRmlsZSwgcGF0aWVudElkKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC50cmFuc2NyaWJlZFRleHQpLnRvQmUoJ+CkruClgeCkneClhyDgpLjgpL/gpLDgpKbgpLDgpY3gpKYg4KSU4KSwIOCkrOClgeCkluCkvuCksCDgpLngpYgnKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5sYW5ndWFnZSkudG9CZShMYW5ndWFnZUNvZGUuSElfSU4pO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmZhbGxiYWNrVXNlZCkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnY3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgcHJlc2lnbmVkIFVSTCBmb3IgYXVkaW8gdXBsb2FkJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwYXRpZW50SWQgPSAndGVzdC1wYXRpZW50LTEyMyc7XHJcbiAgICAgIGNvbnN0IG1pbWVUeXBlID0gJ2F1ZGlvL3dhdic7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVQcmVzaWduZWRVcGxvYWRVcmwocGF0aWVudElkLCBtaW1lVHlwZSk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVwbG9hZFVybCkudG9Db250YWluKCd0ZXN0LWF1ZGlvLWJ1Y2tldCcpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnMzS2V5KS50b0NvbnRhaW4oYGF1ZGlvLXVwbG9hZHMvJHtwYXRpZW50SWR9L2ApO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnMzS2V5KS50b01hdGNoKC9cXC53YXYkLyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBkaWZmZXJlbnQgYXVkaW8gZm9ybWF0cycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcGF0aWVudElkID0gJ3Rlc3QtcGF0aWVudC0xMjMnO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgbXAzUmVzdWx0ID0gYXdhaXQgY3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsKHBhdGllbnRJZCwgJ2F1ZGlvL21wMycpO1xyXG4gICAgICBleHBlY3QobXAzUmVzdWx0LnMzS2V5KS50b01hdGNoKC9cXC5tcDMkLyk7XHJcblxyXG4gICAgICBjb25zdCBvZ2dSZXN1bHQgPSBhd2FpdCBjcmVhdGVQcmVzaWduZWRVcGxvYWRVcmwocGF0aWVudElkLCAnYXVkaW8vb2dnJyk7XHJcbiAgICAgIGV4cGVjdChvZ2dSZXN1bHQuczNLZXkpLnRvTWF0Y2goL1xcLm9nZyQvKTtcclxuXHJcbiAgICAgIGNvbnN0IHVua25vd25SZXN1bHQgPSBhd2FpdCBjcmVhdGVQcmVzaWduZWRVcGxvYWRVcmwocGF0aWVudElkLCAnYXVkaW8vdW5rbm93bicpO1xyXG4gICAgICBleHBlY3QodW5rbm93blJlc3VsdC5zM0tleSkudG9NYXRjaCgvXFwuYXVkaW8kLyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0Vycm9yIGhhbmRsaW5nIGFuZCBmYWxsYmFjayBtZWNoYW5pc21zJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBwcm92aWRlIGhlbHBmdWwgZXJyb3IgbWVzc2FnZXMgZm9yIGNvbW1vbiBmYWlsdXJlcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0F1ZGlvRmlsZTogQXVkaW9GaWxlSW5mbyA9IHtcclxuICAgICAgICBidWZmZXI6IEJ1ZmZlci5mcm9tKCdtb2NrIGF1ZGlvIGRhdGEnKSxcclxuICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dhdicsXHJcbiAgICAgICAgc2l6ZTogMTAyNFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gTW9jayBjb21wbGV0ZSBmYWlsdXJlIHNjZW5hcmlvXHJcbiAgICAgIHMzTW9jay5vbihQdXRPYmplY3RDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignTmV0d29yayBlcnJvcicpKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb2Nlc3NWb2ljZUlucHV0KG1vY2tBdWRpb0ZpbGUsICd0ZXN0LXBhdGllbnQnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFsbGJhY2tVc2VkKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnByb2Nlc3NpbmdUaW1lTXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2xlYW4gdXAgcmVzb3VyY2VzIGV2ZW4gd2hlbiBwcm9jZXNzaW5nIGZhaWxzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrQXVkaW9GaWxlOiBBdWRpb0ZpbGVJbmZvID0ge1xyXG4gICAgICAgIGJ1ZmZlcjogQnVmZmVyLmZyb20oJ21vY2sgYXVkaW8gZGF0YScpLFxyXG4gICAgICAgIG1pbWVUeXBlOiAnYXVkaW8vd2F2JyxcclxuICAgICAgICBzaXplOiAxMDI0XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIFMzIHVwbG9hZCBzdWNjZXNzIGJ1dCB0cmFuc2NyaXB0aW9uIGZhaWx1cmVcclxuICAgICAgczNNb2NrLm9uKFB1dE9iamVjdENvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuICAgICAgczNNb2NrLm9uKERlbGV0ZU9iamVjdENvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuICAgICAgdHJhbnNjcmliZU1vY2sub24oU3RhcnRUcmFuc2NyaXB0aW9uSm9iQ29tbWFuZCkucmVqZWN0cyhuZXcgRXJyb3IoJ1RyYW5zY3JpYmUgc2VydmljZSBlcnJvcicpKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb2Nlc3NWb2ljZUlucHV0KG1vY2tBdWRpb0ZpbGUsICd0ZXN0LXBhdGllbnQnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFsbGJhY2tVc2VkKS50b0JlKHRydWUpO1xyXG4gICAgICBcclxuICAgICAgLy8gVmVyaWZ5IGNsZWFudXAgd2FzIGF0dGVtcHRlZFxyXG4gICAgICBleHBlY3QoczNNb2NrLmNvbW1hbmRDYWxscyhEZWxldGVPYmplY3RDb21tYW5kKSkudG9IYXZlTGVuZ3RoKDIpOyAvLyBPcmlnaW5hbCArIGZhbGxiYWNrIGNsZWFudXBcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=