// Unit tests for AI Triage Service
// Tests Amazon Bedrock integration and AI assessment logic

import { Symptoms, InputMethod, UrgencyLevel } from '../../../types';
import { RuleBasedTriageResult } from '../triage-rule-engine';

// Mock Bedrock client before importing
const mockBedrockClientSend = jest.fn();

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: mockBedrockClientSend
  })),
  InvokeModelCommand: jest.fn((params) => params)
}));

// Import after mocking
import { AITriageService } from '../ai-triage-service';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

describe('AITriageService', () => {
  let aiService: AITriageService;
  let mockBedrockClient: BedrockRuntimeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBedrockClient = new BedrockRuntimeClient({});
    aiService = new AITriageService(mockBedrockClient);
  });

  const createSymptoms = (overrides: Partial<Symptoms> = {}): Symptoms => ({
    primaryComplaint: 'complex symptoms',
    duration: 'several days',
    severity: 6,
    associatedSymptoms: ['fatigue', 'dizziness'],
    inputMethod: InputMethod.TEXT,
    ...overrides
  });

  const createRuleBasedResult = (overrides: Partial<RuleBasedTriageResult> = {}): RuleBasedTriageResult => ({
    urgencyLevel: UrgencyLevel.ROUTINE,
    score: 55,
    triggeredRules: ['ROUTINE_MILD_PAIN'],
    reasoning: 'Mild symptoms detected',
    ...overrides
  });

  const createMockBedrockResponse = (confidence: number = 75, reasoning: string = 'AI assessment completed') => ({
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
      
      mockBedrockClientSend.mockResolvedValueOnce(
        createMockBedrockResponse(80, 'Symptoms suggest routine care with monitoring')
      );

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