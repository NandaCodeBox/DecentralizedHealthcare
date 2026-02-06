import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, UrgencyLevel } from '../../types';
import { EmergencyAlert } from './emergency-alert-service';
import { EscalationProtocol } from './escalation-protocol-service';
export interface EmergencyNotificationMessage {
    type: 'immediate_alert' | 'escalation_alert' | 'response_confirmation' | 'timeout_warning';
    episodeId: string;
    patientId: string;
    urgencyLevel: UrgencyLevel;
    severity: string;
    timestamp: Date;
    supervisors: string[];
    details: Record<string, any>;
}
export declare class EmergencyNotificationService {
    private snsClient;
    private emergencyAlertTopicArn;
    private notificationTopicArn;
    constructor(snsClient: SNSClient, emergencyAlertTopicArn: string, notificationTopicArn: string);
    /**
     * Send immediate emergency alert to supervisors
     */
    sendImmediateAlert(episode: Episode, alertDetails: EmergencyAlert): Promise<void>;
    /**
     * Send escalation alert
     */
    sendEscalationAlert(episode: Episode, escalationDetails: EscalationProtocol): Promise<void>;
    /**
     * Send response confirmation
     */
    sendResponseConfirmation(episode: Episode, responseDetails: any): Promise<void>;
    /**
     * Send timeout warning
     */
    sendTimeoutWarning(episode: Episode, alertDetails: EmergencyAlert, minutesRemaining: number): Promise<void>;
    /**
     * Send batch emergency status update
     */
    sendEmergencyStatusUpdate(stats: {
        activeEmergencies: number;
        criticalCount: number;
        averageResponseTime: number;
        overdueCount: number;
    }): Promise<void>;
    /**
     * Send emergency notification to topic
     */
    private sendEmergencyNotification;
    /**
     * Send supervisor-specific alert
     */
    private sendSupervisorSpecificAlert;
    /**
     * Send notification to specified topic
     */
    private sendNotification;
    /**
     * Create notification subject line
     */
    private createNotificationSubject;
    /**
     * Create notification message body
     */
    private createNotificationMessage;
    /**
     * Create status update message
     */
    private createStatusUpdateMessage;
    /**
     * Calculate wait time in minutes
     */
    private calculateWaitTime;
}
