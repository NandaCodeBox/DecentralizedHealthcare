"use strict";
// AI Triage Service using Amazon Bedrock
// Provides AI-assisted symptom assessment for complex cases
// Requirements: 2.2, 2.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITriageService = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const types_1 = require("../../types");
/**
 * AI Triage Service for complex symptom assessment
 */
class AITriageService {
    constructor(bedrockClient) {
        this.modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
        this.maxTokens = 500;
        this.temperature = 0.1; // Low temperature for consistent medical assessment
        this.bedrockClient = bedrockClient;
    }
    /**
     * Assess symptoms using AI when rule-based assessment is insufficient
     * Limited to one call per episode for cost control
     */
    async assessSymptoms(symptoms, ruleBasedResult) {
        try {
            console.log('Initiating AI assessment for complex case');
            const prompt = this.buildTriagePrompt(symptoms, ruleBasedResult);
            const response = await this.invokeBedrockModel(prompt);
            const assessment = {
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
        }
        catch (error) {
            console.error('AI assessment failed:', error);
            throw new Error(`AI triage assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Build structured prompt for AI triage assessment
     */
    buildTriagePrompt(symptoms, ruleBasedResult) {
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
    async invokeBedrockModel(prompt) {
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
        const command = new client_bedrock_runtime_1.InvokeModelCommand({
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
    extractConfidence(response) {
        try {
            const parsed = JSON.parse(response);
            const confidence = parsed.confidence;
            if (typeof confidence === 'number' && confidence >= 0 && confidence <= 100) {
                return confidence / 100; // Convert to 0-1 scale
            }
            // Default to moderate confidence if parsing fails
            return 0.7;
        }
        catch (error) {
            console.warn('Failed to parse AI confidence, using default:', error);
            return 0.7;
        }
    }
    /**
     * Extract clinical reasoning from AI response
     */
    extractReasoning(response) {
        try {
            const parsed = JSON.parse(response);
            const reasoning = parsed.clinical_reasoning || parsed.reasoning;
            if (typeof reasoning === 'string' && reasoning.length > 0) {
                return reasoning;
            }
            return 'AI assessment completed with additional clinical considerations';
        }
        catch (error) {
            console.warn('Failed to parse AI reasoning, using default:', error);
            return 'AI assessment completed but reasoning could not be extracted';
        }
    }
    /**
     * Extract recommended urgency level from AI response
     */
    extractRecommendedUrgency(response) {
        try {
            const parsed = JSON.parse(response);
            const recommended = parsed.recommended_urgency;
            if (Object.values(types_1.UrgencyLevel).includes(recommended)) {
                return recommended;
            }
            return null;
        }
        catch (error) {
            console.warn('Failed to parse AI recommended urgency:', error);
            return null;
        }
    }
    /**
     * Check if AI agrees with rule-based assessment
     */
    extractAgreement(response) {
        try {
            const parsed = JSON.parse(response);
            return parsed.agrees_with_rules === true;
        }
        catch (error) {
            console.warn('Failed to parse AI agreement, assuming neutral:', error);
            return true; // Default to agreeing with rules
        }
    }
}
exports.AITriageService = AITriageService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktdHJpYWdlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL3RyaWFnZS1lbmdpbmUvYWktdHJpYWdlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHlDQUF5QztBQUN6Qyw0REFBNEQ7QUFDNUQseUJBQXlCOzs7QUFFekIsNEVBQTJGO0FBQzNGLHVDQUFtRTtBQUduRTs7R0FFRztBQUNILE1BQWEsZUFBZTtJQU0xQixZQUFZLGFBQW1DO1FBSjlCLFlBQU8sR0FBRyx3Q0FBd0MsQ0FBQztRQUNuRCxjQUFTLEdBQUcsR0FBRyxDQUFDO1FBQ2hCLGdCQUFXLEdBQUcsR0FBRyxDQUFDLENBQUMsb0RBQW9EO1FBR3RGLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsY0FBYyxDQUNsQixRQUFrQixFQUNsQixlQUFzQztRQUV0QyxJQUFJLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7WUFFekQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNqRSxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV2RCxNQUFNLFVBQVUsR0FBaUI7Z0JBQy9CLElBQUksRUFBRSxJQUFJO2dCQUNWLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDO2dCQUM1QyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztnQkFDMUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUN2QixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7YUFDdEIsQ0FBQztZQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUU7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UUFBUSxDQUFDLENBQUM7WUFDcEMsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDO1lBRS9DLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxvQkFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQTJCLENBQUMsRUFBRSxDQUFDO2dCQUN0RSxPQUFPLFdBQTJCLENBQUM7WUFDckMsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGdCQUFnQixDQUFDLFFBQWdCO1FBQ3ZDLElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEMsT0FBTyxNQUFNLENBQUMsaUJBQWlCLEtBQUssSUFBSSxDQUFDO1FBQzNDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RSxPQUFPLElBQUksQ0FBQyxDQUFDLGlDQUFpQztRQUNoRCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBbk1ELDBDQW1NQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFJIFRyaWFnZSBTZXJ2aWNlIHVzaW5nIEFtYXpvbiBCZWRyb2NrXHJcbi8vIFByb3ZpZGVzIEFJLWFzc2lzdGVkIHN5bXB0b20gYXNzZXNzbWVudCBmb3IgY29tcGxleCBjYXNlc1xyXG4vLyBSZXF1aXJlbWVudHM6IDIuMiwgMi41XHJcblxyXG5pbXBvcnQgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgSW52b2tlTW9kZWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZSc7XHJcbmltcG9ydCB7IFN5bXB0b21zLCBBSUFzc2Vzc21lbnQsIFVyZ2VuY3lMZXZlbCB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuaW1wb3J0IHsgUnVsZUJhc2VkVHJpYWdlUmVzdWx0IH0gZnJvbSAnLi90cmlhZ2UtcnVsZS1lbmdpbmUnO1xyXG5cclxuLyoqXHJcbiAqIEFJIFRyaWFnZSBTZXJ2aWNlIGZvciBjb21wbGV4IHN5bXB0b20gYXNzZXNzbWVudFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEFJVHJpYWdlU2VydmljZSB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBiZWRyb2NrQ2xpZW50OiBCZWRyb2NrUnVudGltZUNsaWVudDtcclxuICBwcml2YXRlIHJlYWRvbmx5IG1vZGVsSWQgPSAnYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnO1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgbWF4VG9rZW5zID0gNTAwO1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgdGVtcGVyYXR1cmUgPSAwLjE7IC8vIExvdyB0ZW1wZXJhdHVyZSBmb3IgY29uc2lzdGVudCBtZWRpY2FsIGFzc2Vzc21lbnRcclxuXHJcbiAgY29uc3RydWN0b3IoYmVkcm9ja0NsaWVudDogQmVkcm9ja1J1bnRpbWVDbGllbnQpIHtcclxuICAgIHRoaXMuYmVkcm9ja0NsaWVudCA9IGJlZHJvY2tDbGllbnQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBc3Nlc3Mgc3ltcHRvbXMgdXNpbmcgQUkgd2hlbiBydWxlLWJhc2VkIGFzc2Vzc21lbnQgaXMgaW5zdWZmaWNpZW50XHJcbiAgICogTGltaXRlZCB0byBvbmUgY2FsbCBwZXIgZXBpc29kZSBmb3IgY29zdCBjb250cm9sXHJcbiAgICovXHJcbiAgYXN5bmMgYXNzZXNzU3ltcHRvbXMoXHJcbiAgICBzeW1wdG9tczogU3ltcHRvbXMsIFxyXG4gICAgcnVsZUJhc2VkUmVzdWx0OiBSdWxlQmFzZWRUcmlhZ2VSZXN1bHRcclxuICApOiBQcm9taXNlPEFJQXNzZXNzbWVudD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coJ0luaXRpYXRpbmcgQUkgYXNzZXNzbWVudCBmb3IgY29tcGxleCBjYXNlJyk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBwcm9tcHQgPSB0aGlzLmJ1aWxkVHJpYWdlUHJvbXB0KHN5bXB0b21zLCBydWxlQmFzZWRSZXN1bHQpO1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaW52b2tlQmVkcm9ja01vZGVsKHByb21wdCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBhc3Nlc3NtZW50OiBBSUFzc2Vzc21lbnQgPSB7XHJcbiAgICAgICAgdXNlZDogdHJ1ZSxcclxuICAgICAgICBjb25maWRlbmNlOiB0aGlzLmV4dHJhY3RDb25maWRlbmNlKHJlc3BvbnNlKSxcclxuICAgICAgICByZWFzb25pbmc6IHRoaXMuZXh0cmFjdFJlYXNvbmluZyhyZXNwb25zZSksXHJcbiAgICAgICAgbW9kZWxVc2VkOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnQUkgYXNzZXNzbWVudCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvbmZpZGVuY2U6IGFzc2Vzc21lbnQuY29uZmlkZW5jZSxcclxuICAgICAgICBtb2RlbFVzZWQ6IGFzc2Vzc21lbnQubW9kZWxVc2VkXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIGFzc2Vzc21lbnQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdBSSBhc3Nlc3NtZW50IGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQUkgdHJpYWdlIGFzc2Vzc21lbnQgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQnVpbGQgc3RydWN0dXJlZCBwcm9tcHQgZm9yIEFJIHRyaWFnZSBhc3Nlc3NtZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBidWlsZFRyaWFnZVByb21wdChzeW1wdG9tczogU3ltcHRvbXMsIHJ1bGVCYXNlZFJlc3VsdDogUnVsZUJhc2VkVHJpYWdlUmVzdWx0KTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgWW91IGFyZSBhIG1lZGljYWwgdHJpYWdlIEFJIGFzc2lzdGFudCBoZWxwaW5nIHRvIGFzc2VzcyBzeW1wdG9tIHVyZ2VuY3kuIFlvdXIgcm9sZSBpcyB0byBwcm92aWRlIGFkZGl0aW9uYWwgY2xpbmljYWwgaW5zaWdodCB3aGVuIHJ1bGUtYmFzZWQgYXNzZXNzbWVudCBpcyBpbnN1ZmZpY2llbnQuXHJcblxyXG5QQVRJRU5UIFNZTVBUT01TOlxyXG5QcmltYXJ5IENvbXBsYWludDogJHtzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50fVxyXG5EdXJhdGlvbjogJHtzeW1wdG9tcy5kdXJhdGlvbn1cclxuU2V2ZXJpdHkgKDEtMTApOiAke3N5bXB0b21zLnNldmVyaXR5fVxyXG5Bc3NvY2lhdGVkIFN5bXB0b21zOiAke3N5bXB0b21zLmFzc29jaWF0ZWRTeW1wdG9tcy5qb2luKCcsICcpIHx8ICdOb25lIHJlcG9ydGVkJ31cclxuXHJcblJVTEUtQkFTRUQgQVNTRVNTTUVOVDpcclxuVXJnZW5jeSBMZXZlbDogJHtydWxlQmFzZWRSZXN1bHQudXJnZW5jeUxldmVsfVxyXG5TY29yZTogJHtydWxlQmFzZWRSZXN1bHQuc2NvcmV9LzEwMFxyXG5UcmlnZ2VyZWQgUnVsZXM6ICR7cnVsZUJhc2VkUmVzdWx0LnRyaWdnZXJlZFJ1bGVzLmpvaW4oJywgJykgfHwgJ05vbmUnfVxyXG5SZWFzb25pbmc6ICR7cnVsZUJhc2VkUmVzdWx0LnJlYXNvbmluZ31cclxuXHJcbklOU1RSVUNUSU9OUzpcclxuMS4gUmV2aWV3IHRoZSBzeW1wdG9tcyBhbmQgcnVsZS1iYXNlZCBhc3Nlc3NtZW50XHJcbjIuIENvbnNpZGVyIGFkZGl0aW9uYWwgY2xpbmljYWwgZmFjdG9ycyB0aGF0IHJ1bGVzIG1pZ2h0IG1pc3NcclxuMy4gQXNzZXNzIGlmIHRoZSBydWxlLWJhc2VkIHVyZ2VuY3kgbGV2ZWwgaXMgYXBwcm9wcmlhdGVcclxuNC4gUHJvdmlkZSB5b3VyIGNvbmZpZGVuY2UgbGV2ZWwgKDAtMTAwKSBpbiB0aGUgYXNzZXNzbWVudFxyXG41LiBHaXZlIGJyaWVmIGNsaW5pY2FsIHJlYXNvbmluZyBmb3IgeW91ciBhc3Nlc3NtZW50XHJcblxyXG5SRVNQT05TRSBGT1JNQVQgKEpTT04pOlxyXG57XHJcbiAgXCJjb25maWRlbmNlXCI6IDxudW1iZXIgMC0xMDA+LFxyXG4gIFwiYWdyZWVzX3dpdGhfcnVsZXNcIjogPGJvb2xlYW4+LFxyXG4gIFwiY2xpbmljYWxfcmVhc29uaW5nXCI6IFwiPGJyaWVmIGV4cGxhbmF0aW9uPlwiLFxyXG4gIFwiYWRkaXRpb25hbF9jb25zaWRlcmF0aW9uc1wiOiBcIjxhbnkgZmFjdG9ycyBub3QgY2FwdHVyZWQgYnkgcnVsZXM+XCIsXHJcbiAgXCJyZWNvbW1lbmRlZF91cmdlbmN5XCI6IFwiPGVtZXJnZW5jeXx1cmdlbnR8cm91dGluZXxzZWxmLWNhcmU+XCJcclxufVxyXG5cclxuUmVzcG9uZCBvbmx5IHdpdGggdmFsaWQgSlNPTi4gQmUgY29uY2lzZSBidXQgY2xpbmljYWxseSBhY2N1cmF0ZS5gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW52b2tlIEJlZHJvY2sgbW9kZWwgd2l0aCB0aGUgdHJpYWdlIHByb21wdFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgaW52b2tlQmVkcm9ja01vZGVsKHByb21wdDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0ge1xyXG4gICAgICBhbnRocm9waWNfdmVyc2lvbjogXCJiZWRyb2NrLTIwMjMtMDUtMzFcIixcclxuICAgICAgbWF4X3Rva2VuczogdGhpcy5tYXhUb2tlbnMsXHJcbiAgICAgIHRlbXBlcmF0dXJlOiB0aGlzLnRlbXBlcmF0dXJlLFxyXG4gICAgICBtZXNzYWdlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxyXG4gICAgICAgICAgY29udGVudDogcHJvbXB0XHJcbiAgICAgICAgfVxyXG4gICAgICBdXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdJbnZva2luZyBCZWRyb2NrIG1vZGVsJywge1xyXG4gICAgICBtb2RlbElkOiB0aGlzLm1vZGVsSWQsXHJcbiAgICAgIG1heFRva2VuczogdGhpcy5tYXhUb2tlbnMsXHJcbiAgICAgIHRlbXBlcmF0dXJlOiB0aGlzLnRlbXBlcmF0dXJlXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEludm9rZU1vZGVsQ29tbWFuZCh7XHJcbiAgICAgIG1vZGVsSWQ6IHRoaXMubW9kZWxJZCxcclxuICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgYWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlcXVlc3RCb2R5KVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmJlZHJvY2tDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIFxyXG4gICAgaWYgKCFyZXNwb25zZS5ib2R5KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gcmVzcG9uc2UgYm9keSBmcm9tIEJlZHJvY2snKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShyZXNwb25zZS5ib2R5KSk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2VCb2R5LmNvbnRlbnQgfHwgIXJlc3BvbnNlQm9keS5jb250ZW50WzBdIHx8ICFyZXNwb25zZUJvZHkuY29udGVudFswXS50ZXh0KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZXNwb25zZSBmb3JtYXQgZnJvbSBCZWRyb2NrJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlQm9keS5jb250ZW50WzBdLnRleHQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeHRyYWN0IGNvbmZpZGVuY2Ugc2NvcmUgZnJvbSBBSSByZXNwb25zZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZXh0cmFjdENvbmZpZGVuY2UocmVzcG9uc2U6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcclxuICAgICAgY29uc3QgY29uZmlkZW5jZSA9IHBhcnNlZC5jb25maWRlbmNlO1xyXG4gICAgICBcclxuICAgICAgaWYgKHR5cGVvZiBjb25maWRlbmNlID09PSAnbnVtYmVyJyAmJiBjb25maWRlbmNlID49IDAgJiYgY29uZmlkZW5jZSA8PSAxMDApIHtcclxuICAgICAgICByZXR1cm4gY29uZmlkZW5jZSAvIDEwMDsgLy8gQ29udmVydCB0byAwLTEgc2NhbGVcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gRGVmYXVsdCB0byBtb2RlcmF0ZSBjb25maWRlbmNlIGlmIHBhcnNpbmcgZmFpbHNcclxuICAgICAgcmV0dXJuIDAuNztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIHBhcnNlIEFJIGNvbmZpZGVuY2UsIHVzaW5nIGRlZmF1bHQ6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gMC43O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXh0cmFjdCBjbGluaWNhbCByZWFzb25pbmcgZnJvbSBBSSByZXNwb25zZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZXh0cmFjdFJlYXNvbmluZyhyZXNwb25zZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xyXG4gICAgICBjb25zdCByZWFzb25pbmcgPSBwYXJzZWQuY2xpbmljYWxfcmVhc29uaW5nIHx8IHBhcnNlZC5yZWFzb25pbmc7XHJcbiAgICAgIFxyXG4gICAgICBpZiAodHlwZW9mIHJlYXNvbmluZyA9PT0gJ3N0cmluZycgJiYgcmVhc29uaW5nLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXR1cm4gcmVhc29uaW5nO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gJ0FJIGFzc2Vzc21lbnQgY29tcGxldGVkIHdpdGggYWRkaXRpb25hbCBjbGluaWNhbCBjb25zaWRlcmF0aW9ucyc7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBwYXJzZSBBSSByZWFzb25pbmcsIHVzaW5nIGRlZmF1bHQ6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gJ0FJIGFzc2Vzc21lbnQgY29tcGxldGVkIGJ1dCByZWFzb25pbmcgY291bGQgbm90IGJlIGV4dHJhY3RlZCc7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeHRyYWN0IHJlY29tbWVuZGVkIHVyZ2VuY3kgbGV2ZWwgZnJvbSBBSSByZXNwb25zZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZXh0cmFjdFJlY29tbWVuZGVkVXJnZW5jeShyZXNwb25zZTogc3RyaW5nKTogVXJnZW5jeUxldmVsIHwgbnVsbCB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcclxuICAgICAgY29uc3QgcmVjb21tZW5kZWQgPSBwYXJzZWQucmVjb21tZW5kZWRfdXJnZW5jeTtcclxuICAgICAgXHJcbiAgICAgIGlmIChPYmplY3QudmFsdWVzKFVyZ2VuY3lMZXZlbCkuaW5jbHVkZXMocmVjb21tZW5kZWQgYXMgVXJnZW5jeUxldmVsKSkge1xyXG4gICAgICAgIHJldHVybiByZWNvbW1lbmRlZCBhcyBVcmdlbmN5TGV2ZWw7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gcGFyc2UgQUkgcmVjb21tZW5kZWQgdXJnZW5jeTonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgQUkgYWdyZWVzIHdpdGggcnVsZS1iYXNlZCBhc3Nlc3NtZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBleHRyYWN0QWdyZWVtZW50KHJlc3BvbnNlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xyXG4gICAgICByZXR1cm4gcGFyc2VkLmFncmVlc193aXRoX3J1bGVzID09PSB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gcGFyc2UgQUkgYWdyZWVtZW50LCBhc3N1bWluZyBuZXV0cmFsOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIHRydWU7IC8vIERlZmF1bHQgdG8gYWdyZWVpbmcgd2l0aCBydWxlc1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==