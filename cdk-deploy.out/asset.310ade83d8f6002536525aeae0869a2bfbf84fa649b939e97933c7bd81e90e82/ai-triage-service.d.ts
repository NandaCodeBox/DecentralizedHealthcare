import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Symptoms, AIAssessment } from '../../types';
import { RuleBasedTriageResult } from './triage-rule-engine';
/**
 * AI Triage Service for complex symptom assessment
 */
export declare class AITriageService {
    private readonly bedrockClient;
    private readonly modelId;
    private readonly maxTokens;
    private readonly temperature;
    constructor(bedrockClient: BedrockRuntimeClient);
    /**
     * Assess symptoms using AI when rule-based assessment is insufficient
     * Limited to one call per episode for cost control
     */
    assessSymptoms(symptoms: Symptoms, ruleBasedResult: RuleBasedTriageResult): Promise<AIAssessment>;
    /**
     * Build structured prompt for AI triage assessment
     */
    private buildTriagePrompt;
    /**
     * Invoke Bedrock model with the triage prompt
     */
    private invokeBedrockModel;
    /**
     * Extract confidence score from AI response
     */
    private extractConfidence;
    /**
     * Extract clinical reasoning from AI response
     */
    private extractReasoning;
    /**
     * Extract recommended urgency level from AI response
     */
    private extractRecommendedUrgency;
    /**
     * Check if AI agrees with rule-based assessment
     */
    private extractAgreement;
}
