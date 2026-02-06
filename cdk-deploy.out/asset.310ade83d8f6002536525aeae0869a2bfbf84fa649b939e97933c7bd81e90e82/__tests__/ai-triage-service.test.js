"use strict";
// Unit tests for AI Triage Service
// Tests Amazon Bedrock integration and AI assessment logic
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../../types");
// Mock Bedrock client before importing
const mockBedrockClientSend = jest.fn();
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: jest.fn(() => ({
        send: mockBedrockClientSend
    })),
    InvokeModelCommand: jest.fn((params) => params)
}));
// Import after mocking
const ai_triage_service_1 = require("../ai-triage-service");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
describe('AITriageService', () => {
    let aiService;
    let mockBedrockClient;
    beforeEach(() => {
        jest.clearAllMocks();
        mockBedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({});
        aiService = new ai_triage_service_1.AITriageService(mockBedrockClient);
    });
    const createSymptoms = (overrides = {}) => ({
        primaryComplaint: 'complex symptoms',
        duration: 'several days',
        severity: 6,
        associatedSymptoms: ['fatigue', 'dizziness'],
        inputMethod: types_1.InputMethod.TEXT,
        ...overrides
    });
    const createRuleBasedResult = (overrides = {}) => ({
        urgencyLevel: types_1.UrgencyLevel.ROUTINE,
        score: 55,
        triggeredRules: ['ROUTINE_MILD_PAIN'],
        reasoning: 'Mild symptoms detected',
        ...overrides
    });
    const createMockBedrockResponse = (confidence = 75, reasoning = 'AI assessment completed') => ({
        body: new TextEncoder().encode(JSON.stringify({
            content: [{
                    text: JSON.stringify({
                        confidence,
                        agrees_with_rules: true,
                        clinical_reasoning: reasoning,
                        additional_considerations: 'No additional factors identified',
                        recommended_urgency: 'routine'
                    })
                }]
        }))
    });
    describe('Successful AI Assessment', () => {
        it('should successfully assess symptoms with AI', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            mockBedrockClientSend.mockResolvedValueOnce(createMockBedrockResponse(80, 'Symptoms suggest routine care with monitoring'));
            const result = await aiService.assessSymptoms(symptoms, ruleBasedResult);
            expect(result.used).toBe(true);
            expect(result.confidence).toBe(0.8); // Converted to 0-1 scale
            expect(result.reasoning).toBe('Symptoms suggest routine care with monitoring');
            expect(result.modelUsed).toBe('anthropic.claude-3-haiku-20240307-v1:0');
            expect(result.timestamp).toBeInstanceOf(Date);
        });
        it('should use low temperature for consistent medical assessment', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            mockBedrockClientSend.mockResolvedValueOnce(createMockBedrockResponse());
            await aiService.assessSymptoms(symptoms, ruleBasedResult);
            const callArgs = mockBedrockClientSend.mock.calls[0][0];
            const requestBody = JSON.parse(callArgs.body);
            expect(requestBody.temperature).toBe(0.1);
            expect(requestBody.max_tokens).toBe(500);
        });
    });
    describe('Response Parsing', () => {
        it('should handle valid JSON response with all fields', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            const mockResponse = {
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{
                            text: JSON.stringify({
                                confidence: 85,
                                agrees_with_rules: false,
                                clinical_reasoning: 'Additional factors suggest higher urgency',
                                additional_considerations: 'Patient age and comorbidities',
                                recommended_urgency: 'urgent'
                            })
                        }]
                }))
            };
            mockBedrockClientSend.mockResolvedValueOnce(mockResponse);
            const result = await aiService.assessSymptoms(symptoms, ruleBasedResult);
            expect(result.confidence).toBe(0.85);
            expect(result.reasoning).toBe('Additional factors suggest higher urgency');
        });
        it('should handle malformed JSON response gracefully', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            const mockResponse = {
                body: new TextEncoder().encode(JSON.stringify({
                    content: [{
                            text: 'invalid json response'
                        }]
                }))
            };
            mockBedrockClientSend.mockResolvedValueOnce(mockResponse);
            const result = await aiService.assessSymptoms(symptoms, ruleBasedResult);
            expect(result.confidence).toBe(0.7); // Default confidence
            expect(result.reasoning).toContain('reasoning could not be extracted');
        });
    });
    describe('Error Handling', () => {
        it('should throw error when Bedrock call fails', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            mockBedrockClientSend.mockRejectedValueOnce(new Error('Bedrock service unavailable'));
            await expect(aiService.assessSymptoms(symptoms, ruleBasedResult))
                .rejects.toThrow('AI triage assessment failed: Bedrock service unavailable');
        });
        it('should throw error when response body is missing', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            mockBedrockClientSend.mockResolvedValueOnce({ body: null });
            await expect(aiService.assessSymptoms(symptoms, ruleBasedResult))
                .rejects.toThrow('AI triage assessment failed: No response body from Bedrock');
        });
        it('should throw error when response format is invalid', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            const mockResponse = {
                body: new TextEncoder().encode(JSON.stringify({
                    // Missing content field
                    invalid: 'response'
                }))
            };
            mockBedrockClientSend.mockResolvedValueOnce(mockResponse);
            await expect(aiService.assessSymptoms(symptoms, ruleBasedResult))
                .rejects.toThrow('AI triage assessment failed: Invalid response format from Bedrock');
        });
    });
    describe('Prompt Construction', () => {
        it('should include symptom details in prompt', async () => {
            const symptoms = createSymptoms({
                primaryComplaint: 'severe headache',
                duration: '3 days',
                severity: 8,
                associatedSymptoms: ['nausea', 'light sensitivity']
            });
            const ruleBasedResult = createRuleBasedResult();
            mockBedrockClientSend.mockResolvedValueOnce(createMockBedrockResponse());
            await aiService.assessSymptoms(symptoms, ruleBasedResult);
            const callArgs = mockBedrockClientSend.mock.calls[0][0];
            const requestBody = JSON.parse(callArgs.body);
            const prompt = requestBody.messages[0].content;
            expect(prompt).toContain('severe headache');
            expect(prompt).toContain('3 days');
            expect(prompt).toContain('8');
            expect(prompt).toContain('nausea, light sensitivity');
        });
        it('should request JSON response format', async () => {
            const symptoms = createSymptoms();
            const ruleBasedResult = createRuleBasedResult();
            mockBedrockClientSend.mockResolvedValueOnce(createMockBedrockResponse());
            await aiService.assessSymptoms(symptoms, ruleBasedResult);
            const callArgs = mockBedrockClientSend.mock.calls[0][0];
            const requestBody = JSON.parse(callArgs.body);
            const prompt = requestBody.messages[0].content;
            expect(prompt).toContain('RESPONSE FORMAT (JSON)');
            expect(prompt).toContain('Respond only with valid JSON');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktdHJpYWdlLXNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvdHJpYWdlLWVuZ2luZS9fX3Rlc3RzX18vYWktdHJpYWdlLXNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBQW1DO0FBQ25DLDJEQUEyRDs7QUFFM0QsMENBQXFFO0FBR3JFLHVDQUF1QztBQUN2QyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUV4QyxJQUFJLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDbEQsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLElBQUksRUFBRSxxQkFBcUI7S0FDNUIsQ0FBQyxDQUFDO0lBQ0gsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDO0NBQ2hELENBQUMsQ0FBQyxDQUFDO0FBRUosdUJBQXVCO0FBQ3ZCLDREQUF1RDtBQUN2RCw0RUFBdUU7QUFFdkUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLFNBQTBCLENBQUM7SUFDL0IsSUFBSSxpQkFBdUMsQ0FBQztJQUU1QyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLGlCQUFpQixHQUFHLElBQUksNkNBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakQsU0FBUyxHQUFHLElBQUksbUNBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxjQUFjLEdBQUcsQ0FBQyxZQUErQixFQUFFLEVBQVksRUFBRSxDQUFDLENBQUM7UUFDdkUsZ0JBQWdCLEVBQUUsa0JBQWtC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TUFBTSxTQUFTLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUUxRCxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBRS9DLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVW5pdCB0ZXN0cyBmb3IgQUkgVHJpYWdlIFNlcnZpY2VcclxuLy8gVGVzdHMgQW1hem9uIEJlZHJvY2sgaW50ZWdyYXRpb24gYW5kIEFJIGFzc2Vzc21lbnQgbG9naWNcclxuXHJcbmltcG9ydCB7IFN5bXB0b21zLCBJbnB1dE1ldGhvZCwgVXJnZW5jeUxldmVsIH0gZnJvbSAnLi4vLi4vLi4vdHlwZXMnO1xyXG5pbXBvcnQgeyBSdWxlQmFzZWRUcmlhZ2VSZXN1bHQgfSBmcm9tICcuLi90cmlhZ2UtcnVsZS1lbmdpbmUnO1xyXG5cclxuLy8gTW9jayBCZWRyb2NrIGNsaWVudCBiZWZvcmUgaW1wb3J0aW5nXHJcbmNvbnN0IG1vY2tCZWRyb2NrQ2xpZW50U2VuZCA9IGplc3QuZm4oKTtcclxuXHJcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZScsICgpID0+ICh7XHJcbiAgQmVkcm9ja1J1bnRpbWVDbGllbnQ6IGplc3QuZm4oKCkgPT4gKHtcclxuICAgIHNlbmQ6IG1vY2tCZWRyb2NrQ2xpZW50U2VuZFxyXG4gIH0pKSxcclxuICBJbnZva2VNb2RlbENvbW1hbmQ6IGplc3QuZm4oKHBhcmFtcykgPT4gcGFyYW1zKVxyXG59KSk7XHJcblxyXG4vLyBJbXBvcnQgYWZ0ZXIgbW9ja2luZ1xyXG5pbXBvcnQgeyBBSVRyaWFnZVNlcnZpY2UgfSBmcm9tICcuLi9haS10cmlhZ2Utc2VydmljZSc7XHJcbmltcG9ydCB7IEJlZHJvY2tSdW50aW1lQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZSc7XHJcblxyXG5kZXNjcmliZSgnQUlUcmlhZ2VTZXJ2aWNlJywgKCkgPT4ge1xyXG4gIGxldCBhaVNlcnZpY2U6IEFJVHJpYWdlU2VydmljZTtcclxuICBsZXQgbW9ja0JlZHJvY2tDbGllbnQ6IEJlZHJvY2tSdW50aW1lQ2xpZW50O1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG4gICAgbW9ja0JlZHJvY2tDbGllbnQgPSBuZXcgQmVkcm9ja1J1bnRpbWVDbGllbnQoe30pO1xyXG4gICAgYWlTZXJ2aWNlID0gbmV3IEFJVHJpYWdlU2VydmljZShtb2NrQmVkcm9ja0NsaWVudCk7XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZVN5bXB0b21zID0gKG92ZXJyaWRlczogUGFydGlhbDxTeW1wdG9tcz4gPSB7fSk6IFN5bXB0b21zID0+ICh7XHJcbiAgICBwcmltYXJ5Q29tcGxhaW50OiAnY29tcGxleCBzeW1wdG9tcycsXHJcbiAgICBkdXJhdGlvbjogJ3NldmVyYWwgZGF5cycsXHJcbiAgICBzZXZlcml0eTogNixcclxuICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydmYXRpZ3VlJywgJ2RpenppbmVzcyddLFxyXG4gICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFQsXHJcbiAgICAuLi5vdmVycmlkZXNcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlUnVsZUJhc2VkUmVzdWx0ID0gKG92ZXJyaWRlczogUGFydGlhbDxSdWxlQmFzZWRUcmlhZ2VSZXN1bHQ+ID0ge30pOiBSdWxlQmFzZWRUcmlhZ2VSZXN1bHQgPT4gKHtcclxuICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlJPVVRJTkUsXHJcbiAgICBzY29yZTogNTUsXHJcbiAgICB0cmlnZ2VyZWRSdWxlczogWydST1VUSU5FX01JTERfUEFJTiddLFxyXG4gICAgcmVhc29uaW5nOiAnTWlsZCBzeW1wdG9tcyBkZXRlY3RlZCcsXHJcbiAgICAuLi5vdmVycmlkZXNcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlTW9ja0JlZHJvY2tSZXNwb25zZSA9IChjb25maWRlbmNlOiBudW1iZXIgPSA3NSwgcmVhc29uaW5nOiBzdHJpbmcgPSAnQUkgYXNzZXNzbWVudCBjb21wbGV0ZWQnKSA9PiAoe1xyXG4gICAgYm9keTogbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgY29udGVudDogW3tcclxuICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBjb25maWRlbmNlLFxyXG4gICAgICAgICAgYWdyZWVzX3dpdGhfcnVsZXM6IHRydWUsXHJcbiAgICAgICAgICBjbGluaWNhbF9yZWFzb25pbmc6IHJlYXNvbmluZyxcclxuICAgICAgICAgIGFkZGl0aW9uYWxfY29uc2lkZXJhdGlvbnM6ICdObyBhZGRpdGlvbmFsIGZhY3RvcnMgaWRlbnRpZmllZCcsXHJcbiAgICAgICAgICByZWNvbW1lbmRlZF91cmdlbmN5OiAncm91dGluZSdcclxuICAgICAgICB9KVxyXG4gICAgICB9XVxyXG4gICAgfSkpXHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdTdWNjZXNzZnVsIEFJIEFzc2Vzc21lbnQnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHN1Y2Nlc3NmdWxseSBhc3Nlc3Mgc3ltcHRvbXMgd2l0aCBBSScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcygpO1xyXG4gICAgICBjb25zdCBydWxlQmFzZWRSZXN1bHQgPSBjcmVhdGVSdWxlQmFzZWRSZXN1bHQoKTtcclxuICAgICAgXHJcbiAgICAgIG1vY2tCZWRyb2NrQ2xpZW50U2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoXHJcbiAgICAgICAgY3JlYXRlTW9ja0JlZHJvY2tSZXNwb25zZSg4MCwgJ1N5bXB0b21zIHN1Z2dlc3Qgcm91dGluZSBjYXJlIHdpdGggbW9uaXRvcmluZycpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhaVNlcnZpY2UuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMsIHJ1bGVCYXNlZFJlc3VsdCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnVzZWQpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuY29uZmlkZW5jZSkudG9CZSgwLjgpOyAvLyBDb252ZXJ0ZWQgdG8gMC0xIHNjYWxlXHJcbiAgICAgIGV4cGVjdChyZXN1bHQucmVhc29uaW5nKS50b0JlKCdTeW1wdG9tcyBzdWdnZXN0IHJvdXRpbmUgY2FyZSB3aXRoIG1vbml0b3JpbmcnKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5tb2RlbFVzZWQpLnRvQmUoJ2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQudGltZXN0YW1wKS50b0JlSW5zdGFuY2VPZihEYXRlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgdXNlIGxvdyB0ZW1wZXJhdHVyZSBmb3IgY29uc2lzdGVudCBtZWRpY2FsIGFzc2Vzc21lbnQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoKTtcclxuICAgICAgY29uc3QgcnVsZUJhc2VkUmVzdWx0ID0gY3JlYXRlUnVsZUJhc2VkUmVzdWx0KCk7XHJcblxyXG4gICAgICBtb2NrQmVkcm9ja0NsaWVudFNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKGNyZWF0ZU1vY2tCZWRyb2NrUmVzcG9uc2UoKSk7XHJcblxyXG4gICAgICBhd2FpdCBhaVNlcnZpY2UuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMsIHJ1bGVCYXNlZFJlc3VsdCk7XHJcblxyXG4gICAgICBjb25zdCBjYWxsQXJncyA9IG1vY2tCZWRyb2NrQ2xpZW50U2VuZC5tb2NrLmNhbGxzWzBdWzBdO1xyXG4gICAgICBjb25zdCByZXF1ZXN0Qm9keSA9IEpTT04ucGFyc2UoY2FsbEFyZ3MuYm9keSk7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QocmVxdWVzdEJvZHkudGVtcGVyYXR1cmUpLnRvQmUoMC4xKTtcclxuICAgICAgZXhwZWN0KHJlcXVlc3RCb2R5Lm1heF90b2tlbnMpLnRvQmUoNTAwKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUmVzcG9uc2UgUGFyc2luZycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHZhbGlkIEpTT04gcmVzcG9uc2Ugd2l0aCBhbGwgZmllbGRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzeW1wdG9tcyA9IGNyZWF0ZVN5bXB0b21zKCk7XHJcbiAgICAgIGNvbnN0IHJ1bGVCYXNlZFJlc3VsdCA9IGNyZWF0ZVJ1bGVCYXNlZFJlc3VsdCgpO1xyXG5cclxuICAgICAgY29uc3QgbW9ja1Jlc3BvbnNlID0ge1xyXG4gICAgICAgIGJvZHk6IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBjb250ZW50OiBbe1xyXG4gICAgICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgY29uZmlkZW5jZTogODUsXHJcbiAgICAgICAgICAgICAgYWdyZWVzX3dpdGhfcnVsZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgIGNsaW5pY2FsX3JlYXNvbmluZzogJ0FkZGl0aW9uYWwgZmFjdG9ycyBzdWdnZXN0IGhpZ2hlciB1cmdlbmN5JyxcclxuICAgICAgICAgICAgICBhZGRpdGlvbmFsX2NvbnNpZGVyYXRpb25zOiAnUGF0aWVudCBhZ2UgYW5kIGNvbW9yYmlkaXRpZXMnLFxyXG4gICAgICAgICAgICAgIHJlY29tbWVuZGVkX3VyZ2VuY3k6ICd1cmdlbnQnXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XVxyXG4gICAgICAgIH0pKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja0JlZHJvY2tDbGllbnRTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYWlTZXJ2aWNlLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zLCBydWxlQmFzZWRSZXN1bHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5jb25maWRlbmNlKS50b0JlKDAuODUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LnJlYXNvbmluZykudG9CZSgnQWRkaXRpb25hbCBmYWN0b3JzIHN1Z2dlc3QgaGlnaGVyIHVyZ2VuY3knKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG1hbGZvcm1lZCBKU09OIHJlc3BvbnNlIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoKTtcclxuICAgICAgY29uc3QgcnVsZUJhc2VkUmVzdWx0ID0gY3JlYXRlUnVsZUJhc2VkUmVzdWx0KCk7XHJcblxyXG4gICAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgYm9keTogbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGNvbnRlbnQ6IFt7XHJcbiAgICAgICAgICAgIHRleHQ6ICdpbnZhbGlkIGpzb24gcmVzcG9uc2UnXHJcbiAgICAgICAgICB9XVxyXG4gICAgICAgIH0pKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja0JlZHJvY2tDbGllbnRTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYWlTZXJ2aWNlLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zLCBydWxlQmFzZWRSZXN1bHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5jb25maWRlbmNlKS50b0JlKDAuNyk7IC8vIERlZmF1bHQgY29uZmlkZW5jZVxyXG4gICAgICBleHBlY3QocmVzdWx0LnJlYXNvbmluZykudG9Db250YWluKCdyZWFzb25pbmcgY291bGQgbm90IGJlIGV4dHJhY3RlZCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFcnJvciBIYW5kbGluZycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3Igd2hlbiBCZWRyb2NrIGNhbGwgZmFpbHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoKTtcclxuICAgICAgY29uc3QgcnVsZUJhc2VkUmVzdWx0ID0gY3JlYXRlUnVsZUJhc2VkUmVzdWx0KCk7XHJcblxyXG4gICAgICBtb2NrQmVkcm9ja0NsaWVudFNlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignQmVkcm9jayBzZXJ2aWNlIHVuYXZhaWxhYmxlJykpO1xyXG5cclxuICAgICAgYXdhaXQgZXhwZWN0KGFpU2VydmljZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcywgcnVsZUJhc2VkUmVzdWx0KSlcclxuICAgICAgICAucmVqZWN0cy50b1Rocm93KCdBSSB0cmlhZ2UgYXNzZXNzbWVudCBmYWlsZWQ6IEJlZHJvY2sgc2VydmljZSB1bmF2YWlsYWJsZScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBlcnJvciB3aGVuIHJlc3BvbnNlIGJvZHkgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcygpO1xyXG4gICAgICBjb25zdCBydWxlQmFzZWRSZXN1bHQgPSBjcmVhdGVSdWxlQmFzZWRSZXN1bHQoKTtcclxuXHJcbiAgICAgIG1vY2tCZWRyb2NrQ2xpZW50U2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBib2R5OiBudWxsIH0pO1xyXG5cclxuICAgICAgYXdhaXQgZXhwZWN0KGFpU2VydmljZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcywgcnVsZUJhc2VkUmVzdWx0KSlcclxuICAgICAgICAucmVqZWN0cy50b1Rocm93KCdBSSB0cmlhZ2UgYXNzZXNzbWVudCBmYWlsZWQ6IE5vIHJlc3BvbnNlIGJvZHkgZnJvbSBCZWRyb2NrJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gcmVzcG9uc2UgZm9ybWF0IGlzIGludmFsaWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoKTtcclxuICAgICAgY29uc3QgcnVsZUJhc2VkUmVzdWx0ID0gY3JlYXRlUnVsZUJhc2VkUmVzdWx0KCk7XHJcblxyXG4gICAgICBjb25zdCBtb2NrUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgYm9keTogbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIC8vIE1pc3NpbmcgY29udGVudCBmaWVsZFxyXG4gICAgICAgICAgaW52YWxpZDogJ3Jlc3BvbnNlJ1xyXG4gICAgICAgIH0pKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja0JlZHJvY2tDbGllbnRTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZShtb2NrUmVzcG9uc2UpO1xyXG5cclxuICAgICAgYXdhaXQgZXhwZWN0KGFpU2VydmljZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcywgcnVsZUJhc2VkUmVzdWx0KSlcclxuICAgICAgICAucmVqZWN0cy50b1Rocm93KCdBSSB0cmlhZ2UgYXNzZXNzbWVudCBmYWlsZWQ6IEludmFsaWQgcmVzcG9uc2UgZm9ybWF0IGZyb20gQmVkcm9jaycpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdQcm9tcHQgQ29uc3RydWN0aW9uJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBpbmNsdWRlIHN5bXB0b20gZGV0YWlscyBpbiBwcm9tcHQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN5bXB0b21zID0gY3JlYXRlU3ltcHRvbXMoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdzZXZlcmUgaGVhZGFjaGUnLFxyXG4gICAgICAgIGR1cmF0aW9uOiAnMyBkYXlzJyxcclxuICAgICAgICBzZXZlcml0eTogOCxcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnbmF1c2VhJywgJ2xpZ2h0IHNlbnNpdGl2aXR5J11cclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBydWxlQmFzZWRSZXN1bHQgPSBjcmVhdGVSdWxlQmFzZWRSZXN1bHQoKTtcclxuXHJcbiAgICAgIG1vY2tCZWRyb2NrQ2xpZW50U2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoY3JlYXRlTW9ja0JlZHJvY2tSZXNwb25zZSgpKTtcclxuXHJcbiAgICAgIGF3YWl0IGFpU2VydmljZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcywgcnVsZUJhc2VkUmVzdWx0KTtcclxuXHJcbiAgICAgIGNvbnN0IGNhbGxBcmdzID0gbW9ja0JlZHJvY2tDbGllbnRTZW5kLm1vY2suY2FsbHNbMF1bMF07XHJcbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShjYWxsQXJncy5ib2R5KTtcclxuICAgICAgY29uc3QgcHJvbXB0ID0gcmVxdWVzdEJvZHkubWVzc2FnZXNbMF0uY29udGVudDtcclxuXHJcbiAgICAgIGV4cGVjdChwcm9tcHQpLnRvQ29udGFpbignc2V2ZXJlIGhlYWRhY2hlJyk7XHJcbiAgICAgIGV4cGVjdChwcm9tcHQpLnRvQ29udGFpbignMyBkYXlzJyk7XHJcbiAgICAgIGV4cGVjdChwcm9tcHQpLnRvQ29udGFpbignOCcpO1xyXG4gICAgICBleHBlY3QocHJvbXB0KS50b0NvbnRhaW4oJ25hdXNlYSwgbGlnaHQgc2Vuc2l0aXZpdHknKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmVxdWVzdCBKU09OIHJlc3BvbnNlIGZvcm1hdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3Qgc3ltcHRvbXMgPSBjcmVhdGVTeW1wdG9tcygpO1xyXG4gICAgICBjb25zdCBydWxlQmFzZWRSZXN1bHQgPSBjcmVhdGVSdWxlQmFzZWRSZXN1bHQoKTtcclxuXHJcbiAgICAgIG1vY2tCZWRyb2NrQ2xpZW50U2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoY3JlYXRlTW9ja0JlZHJvY2tSZXNwb25zZSgpKTtcclxuXHJcbiAgICAgIGF3YWl0IGFpU2VydmljZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcywgcnVsZUJhc2VkUmVzdWx0KTtcclxuXHJcbiAgICAgIGNvbnN0IGNhbGxBcmdzID0gbW9ja0JlZHJvY2tDbGllbnRTZW5kLm1vY2suY2FsbHNbMF1bMF07XHJcbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShjYWxsQXJncy5ib2R5KTtcclxuICAgICAgY29uc3QgcHJvbXB0ID0gcmVxdWVzdEJvZHkubWVzc2FnZXNbMF0uY29udGVudDtcclxuXHJcbiAgICAgIGV4cGVjdChwcm9tcHQpLnRvQ29udGFpbignUkVTUE9OU0UgRk9STUFUIChKU09OKScpO1xyXG4gICAgICBleHBlY3QocHJvbXB0KS50b0NvbnRhaW4oJ1Jlc3BvbmQgb25seSB3aXRoIHZhbGlkIEpTT04nKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=