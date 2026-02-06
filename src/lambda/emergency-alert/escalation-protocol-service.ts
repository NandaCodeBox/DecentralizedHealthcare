// Escalation Protocol Service
// Manages emergency escalation protocols and procedures

import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, UrgencyLevel } from '../../types';

export class EscalationProtocolService {
  constructor(
    private docClient: DynamoDBDocumentClient,
    private snsClient: SNSClient,
    private tableName: string,
    private emergencyTopicArn: string
  ) {}

  /**
   * Process escalation request
   */
  async processEscalation(
    episodeId: string,
    escalationReason: string,
    targetLevel?: string,
    urgentResponse?: boolean
  ): Promise<{
    escalationId: string;
    episode: Episode;
    escalationDetails: any;
  }> {
    const escalationId = `esc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get episode (stub implementation)
    const episode: Episode = {
      episodeId,
      patientId: 'patient-123',
      status: 'active' as any,
      symptoms: {
        primaryComplaint: 'Emergency symptoms',
        duration: '1 hour',
        severity: 9,
        associatedSymptoms: [],
        inputMethod: 'text' as any
      },
      triage: {
        urgencyLevel: UrgencyLevel.EMERGENCY,
        ruleBasedScore: 95,
        aiAssessment: { used: false },
        finalScore: 95
      },
      interactions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const escalationDetails = {
      escalationId,
      reason: escalationReason,
      targetLevel: targetLevel || 'senior_supervisor',
      urgentResponse: urgentResponse || false,
      assignedSupervisors: ['supervisor-1', 'supervisor-2'],
      expectedResponseTime: urgentResponse ? '< 15 minutes' : '< 1 hour',
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    // Update episode with escalation
    await this.updateEpisodeWithEscalation(episodeId, escalationDetails);

    return {
      escalationId,
      episode,
      escalationDetails
    };
  }

  /**
   * Assess escalation need
   */
  async assessEscalationNeed(episode: Episode): Promise<{
    required: boolean;
    reason?: string;
    targetLevel?: string;
  }> {
    const isEmergency = episode.triage?.urgencyLevel === UrgencyLevel.EMERGENCY;
    const highSeverity = episode.symptoms.severity >= 8;
    const hasEmergencyKeywords = this.containsEmergencyKeywords(episode.symptoms.primaryComplaint);

    if (isEmergency || highSeverity || hasEmergencyKeywords) {
      return {
        required: true,
        reason: isEmergency ? 
          'Emergency urgency level requires escalation' : 
          highSeverity ? 
            'High severity symptoms require escalation' :
            'Emergency keywords detected in symptoms',
        targetLevel: 'emergency_supervisor'
      };
    }

    return { required: false };
  }

  /**
   * Update episode with escalation information
   */
  private async updateEpisodeWithEscalation(episodeId: string, escalationDetails: any): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { episodeId },
      UpdateExpression: 'SET escalation = :escalation, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':escalation': escalationDetails,
        ':status': 'escalated',
        ':updatedAt': new Date().toISOString()
      }
    });

    await this.docClient.send(command);
  }

  /**
   * Check for emergency keywords in symptoms
   */
  private containsEmergencyKeywords(complaint: string): boolean {
    const emergencyKeywords = [
      'chest pain', 'difficulty breathing', 'unconscious', 'bleeding',
      'severe pain', 'heart attack', 'stroke', 'emergency', 'can\'t breathe',
      'choking', 'seizure', 'overdose', 'suicide', 'severe bleeding'
    ];

    const lowerComplaint = complaint.toLowerCase();
    return emergencyKeywords.some(keyword => lowerComplaint.includes(keyword));
  }

  /**
   * Get escalation protocols for urgency level
   */
  async getEscalationProtocols(urgencyLevel: UrgencyLevel): Promise<any> {
    const protocols = {
      [UrgencyLevel.EMERGENCY]: {
        maxResponseTime: '5 minutes',
        requiredSupervisors: 2,
        autoEscalate: true,
        notificationChannels: ['sms', 'call', 'email']
      },
      [UrgencyLevel.URGENT]: {
        maxResponseTime: '30 minutes',
        requiredSupervisors: 1,
        autoEscalate: false,
        notificationChannels: ['email', 'app']
      },
      [UrgencyLevel.ROUTINE]: {
        maxResponseTime: '2 hours',
        requiredSupervisors: 1,
        autoEscalate: false,
        notificationChannels: ['email']
      },
      [UrgencyLevel.SELF_CARE]: {
        maxResponseTime: '24 hours',
        requiredSupervisors: 0,
        autoEscalate: false,
        notificationChannels: ['email']
      }
    };

    return protocols[urgencyLevel] || protocols[UrgencyLevel.ROUTINE];
  }

  /**
   * Close escalation
   */
  async closeEscalation(escalationId: string, closureReason: string): Promise<void> {
    // In a full implementation, this would update the escalation record
    console.log(`Closing escalation ${escalationId}: ${closureReason}`);
  }
}