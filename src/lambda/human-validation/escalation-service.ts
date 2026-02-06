// Escalation Service
// Handles escalation of rejected validations and emergency cases

import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Episode, HumanValidation, UrgencyLevel } from '../../types';

export class EscalationService {
  constructor(
    private docClient: DynamoDBDocumentClient,
    private snsClient: SNSClient,
    private tableName: string,
    private notificationTopicArn: string
  ) {}

  /**
   * Handle validation override/rejection
   */
  async handleOverride(episode: Episode, validation: HumanValidation): Promise<void> {
    // Log the override
    console.log('Validation override detected', {
      episodeId: episode.episodeId,
      supervisorId: validation.supervisorId,
      overrideReason: validation.overrideReason,
      approved: validation.approved
    });

    // If not approved, escalate to emergency alert system
    if (!validation.approved && validation.overrideReason) {
      await this.escalateToEmergencySystem(episode, validation);
    }

    // Update episode with escalation status
    await this.updateEpisodeEscalationStatus(episode.episodeId, 'escalated', validation);
  }

  /**
   * Escalate episode to emergency alert system
   */
  private async escalateToEmergencySystem(episode: Episode, validation: HumanValidation): Promise<void> {
    const escalationMessage = {
      type: 'validation_override_escalation',
      episodeId: episode.episodeId,
      patientId: episode.patientId,
      originalUrgencyLevel: episode.triage?.urgencyLevel,
      supervisorId: validation.supervisorId,
      overrideReason: validation.overrideReason,
      escalatedAt: new Date().toISOString(),
      requiresImmediateAttention: episode.triage?.urgencyLevel === UrgencyLevel.EMERGENCY
    };

    const command = new PublishCommand({
      TopicArn: this.notificationTopicArn,
      Message: JSON.stringify(escalationMessage),
      Subject: `ESCALATION: Validation Override - Episode ${episode.episodeId}`,
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'validation_override_escalation'
        },
        urgencyLevel: {
          DataType: 'String',
          StringValue: episode.triage?.urgencyLevel || 'routine'
        },
        requiresImmediateAttention: {
          DataType: 'String',
          StringValue: (episode.triage?.urgencyLevel === UrgencyLevel.EMERGENCY).toString()
        }
      }
    });

    await this.snsClient.send(command);
  }

  /**
   * Update episode escalation status
   */
  private async updateEpisodeEscalationStatus(
    episodeId: string, 
    status: string, 
    validation: HumanValidation
  ): Promise<void> {
    const escalationRecord = {
      status,
      escalatedAt: new Date().toISOString(),
      escalatedBy: validation.supervisorId,
      reason: validation.overrideReason,
      originalValidation: validation
    };

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { episodeId },
      UpdateExpression: 'SET escalation = :escalation, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':escalation': escalationRecord,
        ':status': 'escalated',
        ':updatedAt': new Date().toISOString()
      }
    });

    await this.docClient.send(command);
  }

  /**
   * Process escalation workflow
   */
  async processEscalation(
    episodeId: string,
    escalationReason: string,
    targetLevel?: string,
    urgentResponse?: boolean
  ): Promise<{
    escalationId: string;
    targetLevel: string;
    assignedSupervisors: string[];
    expectedResponseTime: string;
  }> {
    const escalationId = `esc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Stub implementation
    return {
      escalationId,
      targetLevel: targetLevel || 'senior_supervisor',
      assignedSupervisors: ['supervisor-1', 'supervisor-2'],
      expectedResponseTime: urgentResponse ? '< 15 minutes' : '< 1 hour'
    };
  }

  /**
   * Assess if escalation is needed
   */
  async assessEscalationNeed(episode: Episode): Promise<{
    required: boolean;
    reason?: string;
    targetLevel?: string;
  }> {
    // Simple escalation logic
    const isEmergency = episode.triage?.urgencyLevel === UrgencyLevel.EMERGENCY;
    const highSeverity = episode.symptoms.severity >= 8;
    
    if (isEmergency || highSeverity) {
      return {
        required: true,
        reason: isEmergency ? 'Emergency case requires immediate escalation' : 'High severity symptoms',
        targetLevel: 'emergency_supervisor'
      };
    }

    return { required: false };
  }

  /**
   * Get escalation history for episode
   */
  async getEscalationHistory(episodeId: string): Promise<any[]> {
    // Stub implementation
    return [
      {
        escalationId: 'esc-123',
        timestamp: new Date().toISOString(),
        reason: 'Validation override',
        status: 'resolved'
      }
    ];
  }
}