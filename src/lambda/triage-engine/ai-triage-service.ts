// AI Triage Service using Amazon Bedrock
// Provides AI-assisted symptom assessment for complex cases
// Requirements: 2.2, 2.5

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Symptoms, AIAssessment, UrgencyLevel } from '../../types';
import { RuleBasedTriageResult } from './triage-rule-engine';

/**
 * AI Triage Service for complex symptom assessment
 */
export class AITriageService {
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
  private readonly maxTokens = 500;
  private readonly temperature = 0.1; // Low temperature for consistent medical assessment

  constructor(bedrockClient: BedrockRuntimeClient) {
    this.bedrockClient = bedrockClient;
  }

  /**
   * Assess symptoms using AI when rule-based assessment is insufficient
   * Limited to one call per episode for cost control
   */
  async assessSymptoms(
    symptoms: Symptoms, 
    ruleBasedResult: RuleBasedTriageResult
  ): Promise<AIAssessment> {
    try {
      console.log('Initiating AI assessment for complex case');
      
      const prompt = this.buildTriagePrompt(symptoms, ruleBasedResult);
      const response = await this.invokeBedrockModel(prompt);
      
      const assessment: AIAssessment = {
        used: true,
        confidence: this.extractConfidence(response),
        reasoning: this.extractReasoning(response),
        modelUsed: this.modelId,
        timestamp: new Date()
      };

      console.log('AI assessment completed successfully', {
        confidence: assessment.confidence,
        modelUsed: assessment.modelUsed
      });
      
      return assessment;
    } catch (error) {
      console.error('AI assessment failed:', error);
      throw new Error(`AI triage assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build structured prompt for AI triage assessment
   */
  private buildTriagePrompt(symptoms: Symptoms, ruleBasedResult: RuleBasedTriageResult): string {
    return `You are a medical triage AI assistant helping to assess symptom urgency. Your role is to provide additional clinical insight when rule-based assessment is insufficient.

PATIENT SYMPTOMS:
Primary Complaint: ${symptoms.primaryComplaint}
Duration: ${symptoms.duration}
Severity (1-10): ${symptoms.severity}
Associated Symptoms: ${symptoms.associatedSymptoms.join(', ') || 'None reported'}

RULE-BASED ASSESSMENT:
Urgency Level: ${ruleBasedResult.urgencyLevel}
Score: ${ruleBasedResult.score}/100
Triggered Rules: ${ruleBasedResult.triggeredRules.join(', ') || 'None'}
Reasoning: ${ruleBasedResult.reasoning}

INSTRUCTIONS:
1. Review the symptoms and rule-based assessment
2. Consider additional clinical factors that rules might miss
3. Assess if the rule-based urgency level is appropriate
4. Provide your confidence level (0-100) in the assessment
5. Give brief clinical reasoning for your assessment

RESPONSE FORMAT (JSON):
{
  "confidence": <number 0-100>,
  "agrees_with_rules": <boolean>,
  "clinical_reasoning": "<brief explanation>",
  "additional_considerations": "<any factors not captured by rules>",
  "recommended_urgency": "<emergency|urgent|routine|self-care>"
}

Respond only with valid JSON. Be concise but clinically accurate.`;
  }

  /**
   * Invoke Bedrock model with the triage prompt
   */
  private async invokeBedrockModel(prompt: string): Promise<string> {
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    console.log('Invoking Bedrock model', {
      modelId: this.modelId,
      maxTokens: this.maxTokens,
      temperature: this.temperature
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    const response = await this.bedrockClient.send(command);
    
    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
      throw new Error('Invalid response format from Bedrock');
    }

    return responseBody.content[0].text;
  }

  /**
   * Extract confidence score from AI response
   */
  private extractConfidence(response: string): number {
    try {
      const parsed = JSON.parse(response);
      const confidence = parsed.confidence;
      
      if (typeof confidence === 'number' && confidence >= 0 && confidence <= 100) {
        return confidence / 100; // Convert to 0-1 scale
      }
      
      // Default to moderate confidence if parsing fails
      return 0.7;
    } catch (error) {
      console.warn('Failed to parse AI confidence, using default:', error);
      return 0.7;
    }
  }

  /**
   * Extract clinical reasoning from AI response
   */
  private extractReasoning(response: string): string {
    try {
      const parsed = JSON.parse(response);
      const reasoning = parsed.clinical_reasoning || parsed.reasoning;
      
      if (typeof reasoning === 'string' && reasoning.length > 0) {
        return reasoning;
      }
      
      return 'AI assessment completed with additional clinical considerations';
    } catch (error) {
      console.warn('Failed to parse AI reasoning, using default:', error);
      return 'AI assessment completed but reasoning could not be extracted';
    }
  }

  /**
   * Extract recommended urgency level from AI response
   */
  private extractRecommendedUrgency(response: string): UrgencyLevel | null {
    try {
      const parsed = JSON.parse(response);
      const recommended = parsed.recommended_urgency;
      
      if (Object.values(UrgencyLevel).includes(recommended as UrgencyLevel)) {
        return recommended as UrgencyLevel;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to parse AI recommended urgency:', error);
      return null;
    }
  }

  /**
   * Check if AI agrees with rule-based assessment
   */
  private extractAgreement(response: string): boolean {
    try {
      const parsed = JSON.parse(response);
      return parsed.agrees_with_rules === true;
    } catch (error) {
      console.warn('Failed to parse AI agreement, assuming neutral:', error);
      return true; // Default to agreeing with rules
    }
  }
}