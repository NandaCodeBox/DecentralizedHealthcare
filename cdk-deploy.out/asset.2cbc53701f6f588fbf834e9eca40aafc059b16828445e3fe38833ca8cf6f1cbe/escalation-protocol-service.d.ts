import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode } from '../../types';
export interface EscalationProtocol {
    escalationId: string;
    episodeId: string;
    escalationLevel: 'level-1' | 'level-2' | 'level-3' | 'critical';
    reason: string;
    targetLevel?: string;
    urgentResponse: boolean;
    createdAt: Date;
    status: 'active' | 'in-progress' | 'completed' | 'failed';
    assignedSupervisors: string[];
    escalationPath: string[];
    timeoutMinutes: number;
    completedAt?: Date;
    failureReason?: string;
}
export interface EscalationResult {
    escalationId: string;
    episode: Episode;
    escalationDetails: EscalationProtocol;
    targetLevel: string;
    assignedSupervisors: string[];
    expectedResponseTime: number;
}
export interface EscalationAssessment {
    required: boolean;
    reason: string;
    targetLevel: 'level-1' | 'level-2' | 'level-3' | 'critical';
    urgentResponse: boolean;
    timeoutMinutes: number;
}
export declare class EscalationProtocolService {
    private docClient;
    private snsClient;
    private episodeTableName;
    private emergencyAlertTopicArn;
    private readonly ESCALATION_SUPERVISORS;
    private readonly ESCALATION_TIMEOUTS;
    private readonly ESCALATION_PATHS;
    constructor(docClient: DynamoDBDocumentClient, snsClient: SNSClient, episodeTableName: string, emergencyAlertTopicArn: string);
    /**
     * Assess if escalation is needed for an episode
     */
    assessEscalationNeed(episode: Episode): Promise<EscalationAssessment>;
    /**
     * Process escalation for an episode
     */
    processEscalation(episodeId: string, escalationReason: string, targetLevel?: string, urgentResponse?: boolean): Promise<EscalationResult>;
    /**
     * Update escalation status
     */
    updateEscalationStatus(escalationId: string, status: 'in-progress' | 'completed' | 'failed', failureReason?: string): Promise<void>;
    /**
     * Get active escalations for an episode
     */
    getActiveEscalations(episodeId: string): Promise<EscalationProtocol[]>;
    /**
     * Check for escalation timeouts
     */
    checkEscalationTimeouts(): Promise<void>;
    /**
     * Handle escalation timeout
     */
    private handleEscalationTimeout;
    /**
     * Get episode from database
     */
    private getEpisode;
    /**
     * Store escalation protocol
     */
    private storeEscalationProtocol;
    /**
     * Store escalation in episode record as fallback
     */
    private storeEscalationInEpisode;
    /**
     * Update episode with escalation information
     */
    private updateEpisodeEscalation;
    /**
     * Update episode escalation status
     */
    private updateEpisodeEscalationStatus;
    /**
     * Check if episode has critical symptoms
     */
    private hasCriticalSymptoms;
    /**
     * Calculate wait time for episode
     */
    private calculateWaitTime;
    /**
     * Get maximum wait time for urgency level
     */
    private getMaxWaitTime;
    /**
     * Determine escalation level
     */
    private determineEscalationLevel;
    /**
     * Get escalation path for urgency level
     */
    private getEscalationPath;
    /**
     * Get next escalation level
     */
    private getNextEscalationLevel;
}
