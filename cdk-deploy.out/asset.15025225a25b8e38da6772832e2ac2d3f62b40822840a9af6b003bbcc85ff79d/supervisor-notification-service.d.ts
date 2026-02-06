import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, HumanValidation, UrgencyLevel } from '../../types';
export interface NotificationMessage {
    type: 'validation_required' | 'emergency_alert' | 'validation_completed' | 'escalation_required';
    episodeId: string;
    patientId: string;
    urgencyLevel: UrgencyLevel;
    supervisorId?: string;
    timestamp: Date;
    details: Record<string, any>;
}
export declare class SupervisorNotificationService {
    private snsClient;
    private notificationTopicArn;
    private emergencyAlertTopicArn;
    constructor(snsClient: SNSClient, notificationTopicArn: string, emergencyAlertTopicArn: string);
    /**
     * Notify supervisor about validation requirement
     */
    notifySupervisor(episode: Episode, supervisorId?: string, isEmergency?: boolean): Promise<void>;
    /**
     * Notify care coordinator about completed validation
     */
    notifyCareCoordinator(episode: Episode, validation: HumanValidation): Promise<void>;
    /**
     * Send escalation notification when supervisor is unavailable
     */
    sendEscalationNotification(episode: Episode, reason: string, backupSupervisors: string[]): Promise<void>;
    /**
     * Send batch notifications for queue status updates
     */
    sendQueueStatusUpdate(queueStats: {
        totalPending: number;
        emergencyCount: number;
        urgentCount: number;
        averageWaitTime: number;
    }): Promise<void>;
    /**
     * Create notification subject line
     */
    private createNotificationSubject;
    /**
     * Create notification message body
     */
    private createNotificationMessage;
    /**
     * Calculate wait time in minutes
     */
    private calculateWaitTime;
    /**
     * Log notification for audit trail
     */
    private logNotification;
}
