// Triage Engine Lambda Function
// Implements clinical rule engine for symptom urgency assessment
// Requirements: 2.1, 2.3

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Episode, TriageAssessment, UrgencyLevel, AIAssessment } from '../../types';
import { triageAssessmentSchema } from '../../validation';
import { TriageRuleEngine } from './triage-rule-engine';
import { AITriageService } from './ai-triage-service';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-utils';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Environment variables
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME!;

// Initialize services
const ruleEngine = new TriageRuleEngine();
const aiService = new AITriageService(bedrockClient);

/**
 * Triage Engine Lambda Handler
 * Processes symptom data and generates urgency assessment
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Triage engine function called', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { episodeId } = body;

    if (!episodeId) {
      return createErrorResponse(400, 'Missing required field: episodeId');
    }

    // Retrieve episode from DynamoDB
    const episode = await getEpisode(episodeId);
    if (!episode) {
      return createErrorResponse(404, 'Episode not found');
    }

    // Check if episode already has triage assessment
    if (episode.triage) {
      return createSuccessResponse({
        message: 'Episode already has triage assessment',
        triage: episode.triage
      });
    }

    // Perform triage assessment
    const triageAssessment = await performTriageAssessment(episode);

    // Update episode with triage results
    await updateEpisodeWithTriage(episodeId, triageAssessment);

    return createSuccessResponse({
      message: 'Triage assessment completed successfully',
      episodeId,
      triage: triageAssessment,
      nextSteps: getNextSteps(triageAssessment.urgencyLevel)
    });

  } catch (error) {
    console.error('Error in triage engine:', error);
    return createErrorResponse(500, 'Internal server error during triage assessment');
  }
};

/**
 * Retrieve episode from DynamoDB
 */
async function getEpisode(episodeId: string): Promise<Episode | null> {
  try {
    const command = new GetCommand({
      TableName: EPISODE_TABLE_NAME,
      Key: { episodeId }
    });

    const result = await docClient.send(command);
    return result.Item as Episode || null;
  } catch (error) {
    console.error('Error retrieving episode:', error);
    throw error;
  }
}

/**
 * Perform comprehensive triage assessment
 */
async function performTriageAssessment(episode: Episode): Promise<TriageAssessment> {
  // Step 1: Apply rule-based assessment
  const ruleBasedResult = ruleEngine.assessSymptoms(episode.symptoms);
  
  // Step 2: Determine if AI assistance is needed
  const needsAIAssessment = ruleEngine.needsAIAssistance(ruleBasedResult, episode.symptoms);
  
  let aiAssessment: AIAssessment = { used: false };
  
  // Step 3: Apply AI assessment if needed (limited to one call per episode)
  // Cost control: Only call AI if episode doesn't already have AI assessment
  if (needsAIAssessment && !hasExistingAIAssessment(episode)) {
    try {
      aiAssessment = await aiService.assessSymptoms(episode.symptoms, ruleBasedResult);
    } catch (error) {
      console.error('AI assessment failed, falling back to rule-based assessment:', error);
      // Continue with rule-based assessment only
    }
  } else if (hasExistingAIAssessment(episode)) {
    console.log('AI assessment already exists for this episode, skipping to maintain cost control');
  }

  // Step 4: Combine assessments to determine final urgency level
  const finalUrgencyLevel = determineFinalUrgencyLevel(ruleBasedResult, aiAssessment);
  const finalScore = calculateFinalScore(ruleBasedResult, aiAssessment);

  const triageAssessment: TriageAssessment = {
    urgencyLevel: finalUrgencyLevel,
    ruleBasedScore: ruleBasedResult.score,
    aiAssessment,
    finalScore
  };

  // Validate the assessment
  const { error } = triageAssessmentSchema.validate(triageAssessment);
  if (error) {
    throw new Error(`Invalid triage assessment: ${error.message}`);
  }

  return triageAssessment;
}

/**
 * Check if episode already has an AI assessment to enforce cost control
 */
function hasExistingAIAssessment(episode: Episode): boolean {
  return episode.triage?.aiAssessment?.used === true;
}

/**
 * Determine final urgency level combining rule-based and AI assessments
 */
function determineFinalUrgencyLevel(
  ruleBasedResult: { urgencyLevel: UrgencyLevel; score: number },
  aiAssessment: AIAssessment
): UrgencyLevel {
  // If AI was not used, return rule-based result
  if (!aiAssessment.used) {
    return ruleBasedResult.urgencyLevel;
  }

  // If AI assessment exists, use it as primary with rule-based as validation
  // For safety, if there's disagreement, choose the higher urgency level
  const urgencyPriority = {
    [UrgencyLevel.EMERGENCY]: 4,
    [UrgencyLevel.URGENT]: 3,
    [UrgencyLevel.ROUTINE]: 2,
    [UrgencyLevel.SELF_CARE]: 1
  };

  // AI assessment should include urgency level in reasoning
  // For now, we'll use rule-based as primary and AI as validation
  // In a full implementation, AI would provide structured output
  return ruleBasedResult.urgencyLevel;
}

/**
 * Calculate final triage score
 */
function calculateFinalScore(
  ruleBasedResult: { urgencyLevel: UrgencyLevel; score: number },
  aiAssessment: AIAssessment
): number {
  if (!aiAssessment.used || !aiAssessment.confidence) {
    return ruleBasedResult.score;
  }

  // Weight the scores: 70% rule-based, 30% AI confidence
  return Math.round(ruleBasedResult.score * 0.7 + aiAssessment.confidence * 100 * 0.3);
}

/**
 * Update episode with triage assessment
 */
async function updateEpisodeWithTriage(episodeId: string, triage: TriageAssessment): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: EPISODE_TABLE_NAME,
      Key: { episodeId },
      UpdateExpression: 'SET triage = :triage, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':triage': triage,
        ':updatedAt': new Date().toISOString()
      }
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error updating episode with triage:', error);
    throw error;
  }
}

/**
 * Get next steps based on urgency level
 */
function getNextSteps(urgencyLevel: UrgencyLevel): string {
  switch (urgencyLevel) {
    case UrgencyLevel.EMERGENCY:
      return 'Immediate medical attention required. Proceed to emergency care routing.';
    case UrgencyLevel.URGENT:
      return 'Urgent care needed within 24 hours. Proceed to urgent care provider discovery.';
    case UrgencyLevel.ROUTINE:
      return 'Routine care recommended. Proceed to provider discovery and scheduling.';
    case UrgencyLevel.SELF_CARE:
      return 'Self-care guidance provided. Monitor symptoms and seek care if condition worsens.';
    default:
      return 'Assessment complete. Proceed to human validation.';
  }
}