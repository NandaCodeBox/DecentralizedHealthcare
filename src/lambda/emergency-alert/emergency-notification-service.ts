// Emergency Notification Service
// Handles emergency notifications and alerts

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Episode } from '../../types';

export class EmergencyNotificationService {
  constructor(
    private snsClient: SNSClient,
    private emergencyTopicArn: string,
    private notificationTopicArn: string
  ) {}

  /**
   * Send immediate emergency alert
   */
  async sendImmediateAlert(episode: Episode, alertDetails: any): Promise<void> {
    const message = {
      type: 'immediate_emergency_alert',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      alertId: alertDetails.alertId,
      urgencyLevel: episode.triage?.urgencyLevel,
      severity: episode.symptoms.severity,
      symptoms: {
        primaryComplaint: episode.symptoms.primaryComplaint,
        duration: episode.symptoms.duration,
        associatedSymptoms: episode.symptoms.associatedSymptoms
      },
      alertDetails,
      timestamp: new Date().toISOString(),
      requiresImmediateResponse: true
    };

    const command = new PublishCommand({
      TopicArn: this.emergencyTopicArn,
      Message: JSON.stringify(message),
      Subject: `🚨 EMERGENCY ALERT - Episode ${episode.episodeId}`,
      MessageAttributes: {
        priority: {
          DataType: 'String',
          StringValue: 'CRITICAL'
        },
        urgencyLevel: {
          DataType: 'String',
          StringValue: episode.triage?.urgencyLevel || 'emergency'
        },
        severity: {
          DataType: 'Number',
          StringValue: episode.symptoms.severity.toString()
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Send escalation alert
   */
  async sendEscalationAlert(episode: Episode, escalationDetails: any): Promise<void> {
    const message = {
      type: 'emergency_escalation_alert',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      escalationId: escalationDetails.escalationId,
      targetLevel: escalationDetails.targetLevel,
      escalationReason: escalationDetails.reason,
      assignedSupervisors: escalationDetails.assignedSupervisors,
      expectedResponseTime: escalationDetails.expectedResponseTime,
      timestamp: new Date().toISOString()
    };

    const command = new PublishCommand({
      TopicArn: this.emergencyTopicArn,
      Message: JSON.stringify(message),
      Subject: `🔺 EMERGENCY ESCALATION - Episode ${episode.episodeId}`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'emergency_escalation'
        },
        targetLevel: {
          DataType: 'String',
          StringValue: escalationDetails.targetLevel
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Send response confirmation
   */
  async sendResponseConfirmation(episode: Episode, responseDetails: any): Promise<void> {
    const message = {
      type: 'emergency_response_confirmation',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      responseType: responseDetails.responseType,
      responseTimestamp: responseDetails.timestamp,
      status: 'confirmed',
      timestamp: new Date().toISOString()
    };

    const command = new PublishCommand({
      TopicArn: this.notificationTopicArn,
      Message: JSON.stringify(message),
      Subject: `✅ Emergency Response Confirmed - Episode ${episode.episodeId}`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'emergency_response_confirmation'
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Send status update notification
   */
  async sendStatusUpdate(episode: Episode, statusUpdate: any): Promise<void> {
    const message = {
      type: 'emergency_status_update',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      previousStatus: statusUpdate.previousStatus,
      newStatus: statusUpdate.newStatus,
      updateReason: statusUpdate.reason,
      updatedBy: statusUpdate.updatedBy,
      timestamp: new Date().toISOString()
    };

    const command = new PublishCommand({
      TopicArn: this.notificationTopicArn,
      Message: JSON.stringify(message),
      Subject: `📊 Emergency Status Update - Episode ${episode.episodeId}`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'emergency_status_update'
        },
        newStatus: {
          DataType: 'String',
          StringValue: statusUpdate.newStatus
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Send batch emergency notification
   */
  async sendBatchEmergencyNotification(episodes: Episode[]): Promise<void> {
    const message = {
      type: 'batch_emergency_notification',
      episodeCount: episodes.length,
      episodes: episodes.map(ep => ({
        episodeId: ep.episodeId,
        patientId: ep.patientId,
        urgencyLevel: ep.triage?.urgencyLevel,
        severity: ep.symptoms.severity
      })),
      timestamp: new Date().toISOString(),
      requiresImmediateAttention: true
    };

    const command = new PublishCommand({
      TopicArn: this.emergencyTopicArn,
      Message: JSON.stringify(message),
      Subject: `🚨 MULTIPLE EMERGENCIES - ${episodes.length} Episodes Require Attention`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'batch_emergency_notification'
        },
        count: {
          DataType: 'Number',
          StringValue: episodes.length.toString()
        }
      }
    });

    await this.snsClient.send(command);
  }
}