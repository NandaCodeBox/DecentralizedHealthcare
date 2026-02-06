// Emergency Alert System Lambda Function
// Implements immediate supervisor alerting for emergency situations
// Requirements: 7.2

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Episode, UrgencyLevel, EpisodeStatus } from '../../types';
import { EmergencyAlertService } from './emergency-alert-service';
import { EscalationProtocolService } from './escalation-protocol-service';
import { EmergencyNotificationService } from './emergency-notification-service';
import { createSuccessResponse, createErrorResponse } from '../../utils/response-utils';

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

// Environment variables
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME!;
const EMERGENCY_ALERT_TOPIC_ARN = process.env.EMERGENCY_ALERT_TOPIC_ARN!;
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN!;

/**
 * Emergency Alert System Lambda Handler
 * Handles immediate supervisor alerting for emergency situations
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Emergency alert function called', JSON.stringify(event, null, 2));

  try {
    // Initialize services
    const alertService = new EmergencyAlertService(docClient, snsClient, EPISODE_TABLE_NAME, EMERGENCY_ALERT_TOPIC_ARN);
    const escalationService = new EscalationProtocolService(docClient, snsClient, EPISODE_TABLE_NAME, EMERGENCY_ALERT_TOPIC_ARN);
    const notificationService = new EmergencyNotificationService(snsClient, EMERGENCY_ALERT_TOPIC_ARN, NOTIFICATION_TOPIC_ARN);

    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    switch (httpMethod) {
      case 'POST':
        if (event.path?.includes('/alert')) {
          return await handleEmergencyAlert(body, alertService, notificationService);
        } else if (event.path?.includes('/escalate')) {
          return await handleEmergencyEscalation(body, escalationService, notificationService);
        } else {
          return await processEmergencyCase(body, alertService, escalationService, notificationService);
        }
      case 'GET':
        if (pathParameters.episodeId) {
          return await getEmergencyStatus(pathParameters.episodeId, alertService);
        } else {
          return await getEmergencyQueue(event.queryStringParameters || {}, alertService);
        }
      case 'PUT':
        return await updateEmergencyResponse(body, alertService, notificationService);
      default:
        return createErrorResponse(405, 'Method not allowed');
    }

  } catch (error) {
    console.error('Error in emergency alert system:', error);
    return createErrorResponse(500, 'Internal server error in emergency alert system');
  }
};

/**
 * Handle emergency alert request
 */
async function handleEmergencyAlert(
  body: any,
  alertService: EmergencyAlertService,
  notificationService: EmergencyNotificationService
): Promise<APIGatewayProxyResult> {
  const { episodeId, alertType, severity, additionalInfo } = body;

  if (!episodeId || !alertType) {
    return createErrorResponse(400, 'Missing required fields: episodeId, alertType');
  }

  try {
    // Process emergency alert
    const alertResult = await alertService.processEmergencyAlert(episodeId, alertType, severity, additionalInfo);

    // Send immediate notifications
    await notificationService.sendImmediateAlert(alertResult.episode, alertResult.alertDetails);

    return createSuccessResponse({
      message: 'Emergency alert processed successfully',
      alertId: alertResult.alertId,
      episodeId,
      notificationsSent: alertResult.notificationsSent
    });

  } catch (error) {
    console.error('Error processing emergency alert:', error);
    return createErrorResponse(500, 'Failed to process emergency alert');
  }
}

/**
 * Handle emergency escalation
 */
async function handleEmergencyEscalation(
  body: any,
  escalationService: EscalationProtocolService,
  notificationService: EmergencyNotificationService
): Promise<APIGatewayProxyResult> {
  const { episodeId, escalationReason, targetLevel, urgentResponse } = body;

  if (!episodeId || !escalationReason) {
    return createErrorResponse(400, 'Missing required fields: episodeId, escalationReason');
  }

  try {
    // Process escalation
    const escalationResult = await escalationService.processEscalation(episodeId, escalationReason, targetLevel, urgentResponse);

    // Send escalation notifications
    await notificationService.sendEscalationAlert(escalationResult.episode, escalationResult.escalationDetails);

    return createSuccessResponse({
      message: 'Emergency escalation processed successfully',
      escalationId: escalationResult.escalationId,
      episodeId,
      targetLevel: escalationResult.escalationDetails.targetLevel,
      assignedSupervisors: escalationResult.escalationDetails.assignedSupervisors,
      expectedResponseTime: escalationResult.escalationDetails.expectedResponseTime
    });

  } catch (error) {
    console.error('Error processing emergency escalation:', error);
    return createErrorResponse(500, 'Failed to process emergency escalation');
  }
}

/**
 * Process emergency case (main entry point)
 */
async function processEmergencyCase(
  body: any,
  alertService: EmergencyAlertService,
  escalationService: EscalationProtocolService,
  notificationService: EmergencyNotificationService
): Promise<APIGatewayProxyResult> {
  const { episodeId } = body;

  if (!episodeId) {
    return createErrorResponse(400, 'Missing required field: episodeId');
  }

  try {
    // Get episode details
    const episode = await getEpisode(episodeId);
    if (!episode) {
      return createErrorResponse(404, 'Episode not found');
    }

    // Check if this is an emergency case
    const isEmergency = episode.triage?.urgencyLevel === UrgencyLevel.EMERGENCY;
    if (!isEmergency) {
      return createErrorResponse(400, 'Episode is not classified as emergency');
    }

    // Process emergency alert
    const alertResult = await alertService.processEmergencyAlert(episodeId, 'emergency_case', 'high', {
      symptoms: episode.symptoms,
      triage: episode.triage
    });

    // Send immediate notifications
    await notificationService.sendImmediateAlert(episode, alertResult.alertDetails);

    // Check if escalation is needed
    const needsEscalation = await escalationService.assessEscalationNeed(episode);
    if (needsEscalation.required) {
      const escalationResult = await escalationService.processEscalation(
        episodeId, 
        needsEscalation.reason || 'Emergency escalation required', 
        needsEscalation.targetLevel, 
        true
      );
      await notificationService.sendEscalationAlert(episode, escalationResult.escalationDetails);
    }

    return createSuccessResponse({
      message: 'Emergency case processed successfully',
      episodeId,
      alertId: alertResult.alertId,
      escalated: needsEscalation.required,
      notificationsSent: alertResult.notificationsSent
    });

  } catch (error) {
    console.error('Error processing emergency case:', error);
    return createErrorResponse(500, 'Failed to process emergency case');
  }
}

/**
 * Get emergency status for a specific episode
 */
async function getEmergencyStatus(
  episodeId: string,
  alertService: EmergencyAlertService
): Promise<APIGatewayProxyResult> {
  try {
    const status = await alertService.getEmergencyStatus(episodeId);
    return createSuccessResponse(status);
  } catch (error) {
    console.error('Error getting emergency status:', error);
    return createErrorResponse(500, 'Failed to get emergency status');
  }
}

/**
 * Get emergency queue
 */
async function getEmergencyQueue(
  queryParams: any,
  alertService: EmergencyAlertService
): Promise<APIGatewayProxyResult> {
  try {
    const queue = await alertService.getEmergencyQueue(queryParams);
    return createSuccessResponse(queue);
  } catch (error) {
    console.error('Error getting emergency queue:', error);
    return createErrorResponse(500, 'Failed to get emergency queue');
  }
}

/**
 * Update emergency response
 */
async function updateEmergencyResponse(
  body: any,
  alertService: EmergencyAlertService,
  notificationService: EmergencyNotificationService
): Promise<APIGatewayProxyResult> {
  const { episodeId, responseType, responseDetails } = body;

  if (!episodeId || !responseType) {
    return createErrorResponse(400, 'Missing required fields: episodeId, responseType');
  }

  try {
    const result = await alertService.updateEmergencyResponse(episodeId, responseType, responseDetails);
    await notificationService.sendResponseConfirmation(result.episode, result.responseDetails);

    return createSuccessResponse({
      message: 'Emergency response updated successfully',
      episodeId,
      responseType
    });

  } catch (error) {
    console.error('Error updating emergency response:', error);
    return createErrorResponse(500, 'Failed to update emergency response');
  }
}

/**
 * Get episode from DynamoDB
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