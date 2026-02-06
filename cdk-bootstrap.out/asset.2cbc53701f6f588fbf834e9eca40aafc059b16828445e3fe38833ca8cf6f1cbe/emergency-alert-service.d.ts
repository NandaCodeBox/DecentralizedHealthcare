import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode } from '../../types';
export interface EmergencyAlert {
    alertId: string;
    episodeId: string;
    alertType: string;
    severity: 'critical' | 'high' | 'medium';
    createdAt: Date;
    status: 'active' | 'acknowledged' | 'resolved';
    assignedSupervisors: string[];
    responseTime?: Date;
    resolvedAt?: Date;
    additionalInfo?: Record<string, any>;
}
export interface EmergencyAlertResult {
    alertId: string;
    episode: Episode;
    alertDetails: EmergencyAlert;
    notificationsSent: number;
    estimatedResponseTime: number;
    severity: string;
}
export interface EmergencyStatus {
    episodeId: string;
    isEmergency: boolean;
    activeAlerts: EmergencyAlert[];
    lastAlertTime?: Date;
    responseStatus: 'pending' | 'acknowledged' | 'responding' | 'resolved';
    assignedSupervisors: string[];
    estimatedResponseTime: number;
}
export interface EmergencyQueueItem {
    episodeId: string;
    patientId: string;
    alertId: string;
    alertType: string;
    severity: string;
    createdAt: Date;
    waitTime: number;
    assignedSupervisors: string[];
    symptoms: {
        primaryComplaint: string;
        severity: number;
    };
    status: string;
}
export interface EmergencyResponseUpdate {
    episode: Episode;
    responseDetails: {
        supervisorId: string;
        responseAction: string;
        notes?: string;
        timestamp: Date;
    };
    timestamp: Date;
}
export declare class EmergencyAlertService {
    private docClient;
    private snsClient;
    private episodeTableName;
    private emergencyAlertTopicArn;
    private readonly EMERGENCY_SUPERVISORS;
    private readonly CRITICAL_RESPONSE_TIME;
    private readonly HIGH_RESPONSE_TIME;
    private readonly MEDIUM_RESPONSE_TIME;
    constructor(docClient: DynamoDBDocumentClient, snsClient: SNSClient, episodeTableName: string, emergencyAlertTopicArn: string);
    /**
     * Process emergency alert for an episode
     */
    processEmergencyAlert(episodeId: string, alertType: string, severity?: 'critical' | 'high' | 'medium', additionalInfo?: Record<string, any>): Promise<EmergencyAlertResult>;
    /**
     * Get emergency status for an episode
     */
    getEmergencyStatus(episodeId: string): Promise<EmergencyStatus>;
    /**
     * Get emergency queue for supervisors
     */
    getEmergencyQueue(supervisorId?: string, limit?: number): Promise<EmergencyQueueItem[]>;
    /**
     * Update emergency response
     */
    updateEmergencyResponse(episodeId: string, supervisorId: string, responseAction: string, notes?: string): Promise<EmergencyResponseUpdate>;
    /**
     * Get episode from database
     */
    private getEpisode;
    /**
     * Store emergency alert in database
     */
    private storeEmergencyAlert;
    /**
     * Store alert in episode record as fallback
     */
    private storeAlertInEpisode;
    /**
     * Update episode emergency status
     */
    private updateEpisodeEmergencyStatus;
    /**
     * Get active alerts for an episode
     */
    private getActiveAlerts;
    /**
     * Update episode response information
     */
    private updateEpisodeResponse;
    /**
     * Update alert status
     */
    private updateAlertStatus;
    /**
     * Select emergency supervisors based on severity
     */
    private selectEmergencySupervisors;
    /**
     * Calculate expected response time based on severity
     */
    private calculateResponseTime;
    /**
     * Determine response status based on active alerts
     */
    private determineResponseStatus;
}
