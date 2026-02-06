// Supervisor Notification Service
// Handles notifications to supervisors for validation requests

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Episode, HumanValidation } from '../../types';

export class SupervisorNotificationService {
  constructor(
    private snsClient: SNSClient,
    private notificationTopicArn: string,
    private emergencyTopicArn: string
  ) {}

  /**
   * Notify supervisor of pending validation
   */
  async notifySupervisor(episode: Episode, supervisorId?: string, isEmergency: boolean = false): Promise<void> {
    const topicArn = isEmergency ? this.emergencyTopicArn : this.notificationTopicArn;
    
    const message = {
      type: 'validation_request',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      urgencyLevel: episode.triage?.urgencyLevel,
      supervisorId,
      isEmergency,
      timestamp: new Date().toISOString(),
      symptoms: {
        primaryComplaint: episode.symptoms.primaryComplaint,
        severity: episode.symptoms.severity,
        duration: episode.symptoms.duration
      }
    };

    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      Subject: isEmergency ? 
        `EMERGENCY: Validation Required - Episode ${episode.episodeId}` :
        `Validation Required - Episode ${episode.episodeId}`,
      MessageAttributes: {
        urgencyLevel: {
          DataType: 'String',
          StringValue: episode.triage?.urgencyLevel || 'routine'
        },
        isEmergency: {
          DataType: 'String',
          StringValue: isEmergency.toString()
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Notify care coordinator of approved validation
   */
  async notifyCareCoordinator(episode: Episode, validation: HumanValidation): Promise<void> {
    const message = {
      type: 'validation_approved',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      supervisorId: validation.supervisorId,
      approved: validation.approved,
      timestamp: validation.timestamp,
      nextSteps: 'Proceed to care coordination'
    };

    const command = new PublishCommand({
      TopicArn: this.notificationTopicArn,
      Message: JSON.stringify(message),
      Subject: `Validation Approved - Episode ${episode.episodeId}`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'validation_approved'
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Send validation reminder to supervisor
   */
  async sendValidationReminder(episode: Episode, supervisorId: string, waitTime: string): Promise<void> {
    const message = {
      type: 'validation_reminder',
      episodeId: episode.episodeId,
      supervisorId,
      waitTime,
      urgencyLevel: episode.triage?.urgencyLevel,
      timestamp: new Date().toISOString()
    };

    const command = new PublishCommand({
      TopicArn: this.notificationTopicArn,
      Message: JSON.stringify(message),
      Subject: `Validation Reminder - Episode ${episode.episodeId}`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'validation_reminder'
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Send batch notification for multiple pending validations
   */
  async sendBatchNotification(episodes: Episode[], supervisorId: string): Promise<void> {
    const message = {
      type: 'batch_validation_request',
      supervisorId,
      episodeCount: episodes.length,
      episodes: episodes.map(ep => ({
        episodeId: ep.episodeId,
        urgencyLevel: ep.triage?.urgencyLevel,
        severity: ep.symptoms.severity
      })),
      timestamp: new Date().toISOString()
    };

    const command = new PublishCommand({
      TopicArn: this.notificationTopicArn,
      Message: JSON.stringify(message),
      Subject: `${episodes.length} Episodes Pending Validation`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'batch_validation_request'
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