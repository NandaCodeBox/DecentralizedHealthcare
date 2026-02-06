// Human Validation Workflow Lambda Function
// Implements validation queue management for AI recommendations
// Requirements: 2.4, 7.1, 7.3, 7.4, 7.5

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Episode, HumanValidation, UrgencyLevel, EpisodeStatus } from '../../types';
import { humanValidationSchema } from '../../validation';
import { ValidationQueueManager } from './validation-queue-manager';
import { SupervisorNotificationService } from './supervisor-notification-service';
import { EscalationService } from './escalation-service';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-utils';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

// Environment variables
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME!;
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN!;
const EMERGENCY_ALERT_TOPIC_ARN = process.env.EMERGENCY_ALERT_TOPIC_ARN!;

/**
 * Human Validation Workflow Lambda Handler
 * Manages validation queue, supervisor notifications, and approval tracking
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Human validation function called', JSON.stringify(event, null, 2));

  try {
    // Initialize services with clients
    const queueManager = new ValidationQueueManager(docClient, EPISODE_TABLE_NAME);
    const notificationService = new SupervisorNotificationService(snsClient, NOTIFICATION_TOPIC_ARN, EMERGENCY_ALERT_TOPIC_ARN);
    const escalationService = new EscalationService(docClient, snsClient, EPISODE_TABLE_NAME, NOTIFICATION_TOPIC_ARN);

    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    switch (httpMethod) {
      case 'POST':
        return await handleValidationRequest(body, docClient, queueManager, notificationService);
      case 'GET':
        if (pathParameters.episodeId) {
          return await getValidationStatus(pathParameters.episodeId, docClient, queueManager);
        } else {
          return await getValidationQueue(event.queryStringParameters || {}, queueManager);
        }
      case 'PUT':
        return await handleValidationDecision(body, docClient, queueManager, notificationService, escalationService);
      default:
        return createErrorResponse(405, 'Method not allowed');
    }

  } catch (error) {
    console.error('Error in human validation workflow:', error);
    return createErrorResponse(500, 'Internal server error during validation workflow');
  }
};

/**
 * Handle new validation request from triage engine
 */
async function handleValidationRequest(
  body: any,
  docClient: DynamoDBDocumentClient,
  queueManager: ValidationQueueManager,
  notificationService: SupervisorNotificationService
): Promise<APIGatewayProxyResult> {
  const { episodeId, supervisorId } = body;

  if (!episodeId) {
    return createErrorResponse(400, 'Missing required field: episodeId');
  }

  try {
    // Retrieve episode from DynamoDB
    const episode = await getEpisode(episodeId, docClient);
    if (!episode) {
      return createErrorResponse(404, 'Episode not found');
    }

    // Check if episode has triage assessment
    if (!episode.triage) {
      return createErrorResponse(400, 'Episode does not have triage assessment');
    }

    // Check if validation already exists
    if (episode.triage.humanValidation) {
      return createSuccessResponse({
        message: 'Episode already has human validation',
        validation: episode.triage.humanValidation
      });
    }

    // Add episode to validation queue
    await queueManager.addToQueue(episode, supervisorId);

    // Send supervisor notification
    const isEmergency = episode.triage.urgencyLevel === UrgencyLevel.EMERGENCY;
    await notificationService.notifySupervisor(episode, supervisorId, isEmergency);

    // Update episode status to indicate validation pending
    await updateEpisodeValidationStatus(episodeId, 'pending', supervisorId, docClient);

    return createSuccessResponse({
      message: 'Validation request submitted successfully',
      episodeId,
      queuePosition: await queueManager.getQueuePosition(episodeId),
      estimatedWaitTime: await queueManager.getEstimatedWaitTime(episode.triage.urgencyLevel)
    });

  } catch (error) {
    console.error('Error handling validation request:', error);
    return createErrorResponse(500, 'Failed to process validation request');
  }
}

/**
 * Get validation status for a specific episode
 */
async function getValidationStatus(
  episodeId: string,
  docClient: DynamoDBDocumentClient,
  queueManager: ValidationQueueManager
): Promise<APIGatewayProxyResult> {
  try {
    const episode = await getEpisode(episodeId, docClient);
    if (!episode) {
      return createErrorResponse(404, 'Episode not found');
    }

    const queuePosition = await queueManager.getQueuePosition(episodeId);
    const estimatedWaitTime = await queueManager.getEstimatedWaitTime(episode.triage?.urgencyLevel || 'routine');

    return createSuccessResponse({
      episodeId,
      validationStatus: episode.triage?.humanValidation ? 'completed' : 'pending',
      validation: episode.triage?.humanValidation,
      queuePosition,
      estimatedWaitTime
    });

  } catch (error) {
    console.error('Error getting validation status:', error);
    return createErrorResponse(500, 'Failed to get validation status');
  }
}

/**
 * Get validation queue for supervisors
 */
async function getValidationQueue(
  queryParams: any,
  queueManager: ValidationQueueManager
): Promise<APIGatewayProxyResult> {
  try {
    const supervisorId = queryParams.supervisorId;
    const urgencyFilter = queryParams.urgency;
    const limit = parseInt(queryParams.limit || '20');

    const queueItems = await queueManager.getQueue(supervisorId, urgencyFilter, limit);

    return createSuccessResponse({
      queue: queueItems,
      totalItems: queueItems.length,
      supervisorId
    });

  } catch (error) {
    console.error('Error getting validation queue:', error);
    return createErrorResponse(500, 'Failed to get validation queue');
  }
}

/**
 * Handle validation decision from supervisor
 */
async function handleValidationDecision(
  body: any,
  docClient: DynamoDBDocumentClient,
  queueManager: ValidationQueueManager,
  notificationService: SupervisorNotificationService,
  escalationService: EscalationService
): Promise<APIGatewayProxyResult> {
  const { episodeId, supervisorId, approved, overrideReason, notes } = body;

  if (!episodeId || !supervisorId || approved === undefined) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Missing required fields: episodeId, supervisorId, approved'
      }),
    };
  }

  // Retrieve episode from DynamoDB
  const episode = await getEpisode(episodeId, docClient);
  if (!episode) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Episode not found'
      }),
    };
  }

  // Create human validation record
  const humanValidation: HumanValidation = {
    supervisorId,
    approved,
    overrideReason,
    notes,
    timestamp: new Date()
  };

  // Validate the human validation record
  const { error } = humanValidationSchema.validate(humanValidation);
  if (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: `Invalid validation data: ${error.message}`
      }),
    };
  }

  // Update episode with validation decision
  await updateEpisodeWithValidation(episodeId, humanValidation, docClient);

  // Remove from validation queue
  await queueManager.removeFromQueue(episodeId);

  // Update episode status based on approval
  const newStatus = approved ? EpisodeStatus.ACTIVE : EpisodeStatus.ESCALATED;
  await updateEpisodeStatus(episodeId, newStatus, docClient);

  // If not approved and override reason provided, handle escalation
  if (!approved && overrideReason) {
    await escalationService.handleOverride(episode, humanValidation);
  }

  // Notify care coordinator if approved
  if (approved) {
    await notificationService.notifyCareCoordinator(episode, humanValidation);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Validation decision recorded successfully',
      episodeId,
      approved,
      newStatus,
      validation: humanValidation
    }),
  };
}

/**
 * Retrieve episode from DynamoDB
 */
async function getEpisode(episodeId: string, docClient: DynamoDBDocumentClient): Promise<Episode | null> {
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
 * Update episode validation status
 */
async function updateEpisodeValidationStatus(
  episodeId: string,
  status: string,
  supervisorId: string | undefined,
  docClient: DynamoDBDocumentClient
): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: EPISODE_TABLE_NAME,
      Key: { episodeId },
      UpdateExpression: 'SET validationStatus = :status, assignedSupervisor = :supervisor, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':status': status,
        ':supervisor': supervisorId || null,
        ':updatedAt': new Date().toISOString()
      }
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error updating episode validation status:', error);
    throw error;
  }
}

/**
 * Update episode with human validation
 */
async function updateEpisodeWithValidation(
  episodeId: string,
  validation: HumanValidation,
  docClient: DynamoDBDocumentClient
): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: EPISODE_TABLE_NAME,
      Key: { episodeId },
      UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':validation': validation,
        ':status': 'completed',
        ':updatedAt': new Date().toISOString()
      }
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error updating episode with validation:', error);
    throw error;
  }
}

/**
 * Update episode status
 */
async function updateEpisodeStatus(
  episodeId: string,
  status: EpisodeStatus,
  docClient: DynamoDBDocumentClient
): Promise<void> {
  try {
    const command = new UpdateCommand({
      TableName: EPISODE_TABLE_NAME,
      Key: { episodeId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      }
    });

    await docClient.send(command);
  } catch (error) {
    console.error('Error updating episode status:', error);
    throw error;
  }
}