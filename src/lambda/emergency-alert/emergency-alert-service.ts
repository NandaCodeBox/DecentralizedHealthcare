// Emergency Alert Service
// Handles emergency case processing and alert management

import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, UrgencyLevel } from '../../types';

export interface EmergencyAlertResult {
  alertId: string;
  episode: Episode;
  alertDetails: any;
  notificationsSent: number;
}

export interface EmergencyResponseUpdate {
  episode: Episode;
  responseDetails: any;
  timestamp: string;
}

export class EmergencyAlertService {
  constructor(
    private docClient: DynamoDBDocumentClient,
    private snsClient: SNSClient,
    private tableName: string,
    private emergencyTopicArn: string
  ) {}

  /**
   * Process emergency alert
   */
  async processEmergencyAlert(
    episodeId: string,
    alertType: string,
    severity: string,
    additionalInfo?: any
  ): Promise<EmergencyAlertResult> {
    // Get episode details
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { episodeId }
    });

    const result = await this.docClient.send(command);
    const episode = result.Item as Episode;

    if (!episode) {
      throw new Error('Episode not found');
    }

    // Generate alert ID
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create alert details
    const alertDetails = {
      alertId,
      alertType,
      severity,
      episodeId,
      patientId: episode.patientId,
      urgencyLevel: episode.triage?.urgencyLevel,
      symptoms: episode.symptoms,
      additionalInfo,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Update episode with alert information
    await this.updateEpisodeWithAlert(episodeId, alertDetails);

    return {
      alertId,
      episode,
      alertDetails,
      notificationsSent: 3 // Stub value
    };
  }

  /**
   * Get emergency status for episode
   */
  async getEmergencyStatus(episodeId: string): Promise<any> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { episodeId }
    });

    const result = await this.docClient.send(command);
    const episode = result.Item as Episode;

    if (!episode) {
      throw new Error('Episode not found');
    }

    return {
      episodeId,
      emergencyStatus: episode.triage?.urgencyLevel === UrgencyLevel.EMERGENCY ? 'active' : 'none',
      alertsActive: (episode as any).emergencyAlert ? 1 : 0,
      lastAlertTime: (episode as any).emergencyAlert?.createdAt,
      responseStatus: 'pending'
    };
  }

  /**
   * Get emergency queue
   */
  async getEmergencyQueue(supervisorId?: string, limit: number = 20): Promise<any[]> {
    // Stub implementation - in real system would query emergency episodes
    return [
      {
        episodeId: 'emergency-episode-1',
        patientId: 'patient-1',
        alertId: 'alert-123',
        urgencyLevel: UrgencyLevel.EMERGENCY,
        severity: 9,
        alertTime: new Date().toISOString(),
        status: 'pending_response'
      },
      {
        episodeId: 'emergency-episode-2',
        patientId: 'patient-2',
        alertId: 'alert-124',
        urgencyLevel: UrgencyLevel.EMERGENCY,
        severity: 8,
        alertTime: new Date().toISOString(),
        status: 'in_progress'
      }
    ].slice(0, limit);
  }

  /**
   * Update emergency response
   */
  async updateEmergencyResponse(
    episodeId: string,
    responseType: string,
    responseDetails: any
  ): Promise<EmergencyResponseUpdate> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { episodeId }
    });

    const result = await this.docClient.send(command);
    const episode = result.Item as Episode;

    if (!episode) {
      throw new Error('Episode not found');
    }

    const responseRecord = {
      responseType,
      responseDetails,
      timestamp: new Date().toISOString(),
      status: 'updated'
    };

    // Update episode with response
    const updateCommand = new UpdateCommand({
      TableName: this.tableName,
      Key: { episodeId },
      UpdateExpression: 'SET emergencyResponse = :response, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':response': responseRecord,
        ':updatedAt': new Date().toISOString()
      }
    });

    await this.docClient.send(updateCommand);

    return {
      episode,
      responseDetails: responseRecord,
      timestamp: responseRecord.timestamp
    };
  }

  /**
   * Update episode with alert information
   */
  private async updateEpisodeWithAlert(episodeId: string, alertDetails: any): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { episodeId },
      UpdateExpression: 'SET emergencyAlert = :alert, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':alert': alertDetails,
        ':status': 'emergency_alert_active',
        ':updatedAt': new Date().toISOString()
      }
    });

    await this.docClient.send(command);
  }

  /**
   * Close emergency alert
   */
  async closeEmergencyAlert(episodeId: string, closureReason: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { episodeId },
      UpdateExpression: 'SET emergencyAlert.#status = :status, emergencyAlert.closedAt = :closedAt, emergencyAlert.closureReason = :reason',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'closed',
        ':closedAt': new Date().toISOString(),
        ':reason': closureReason
      }
    });

    await this.docClient.send(command);
  }
}