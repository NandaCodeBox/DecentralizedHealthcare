import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, HumanValidation, UrgencyLevel } from '../../types';
export interface EscalationRule {
    urgencyLevel: UrgencyLevel;
    maxWaitTimeMinutes: number;
    backupSupervisors: string[];
    defaultToHigherCareLevel: boolean;
}
export interface SupervisorAvailability {
    supervisorId: string;
    isAvailable: boolean;
    lastSeen: Date;
    maxConcurrentCases: number;
    currentCaseCount: number;
}
export declare class EscalationService {
    private docClient;
    private snsClient;
    private episodeTableName;
    private notificationTopicArn;
    private escalationRules;
    private notificationService;
    constructor(docClient: DynamoDBDocumentClient, snsClient: SNSClient, episodeTableName: string, notificationTopicArn: string);
    /**
     * Handle supervisor override decision
     */
    handleOverride(episode: Episode, validation: HumanValidation): Promise<void>;
    /**
     * Check for episodes that need escalation due to timeout
     */
    checkForTimeoutEscalations(): Promise<void>;
    /**
     * Handle supervisor unavailability
     */
    handleSupervisorUnavailability(supervisorId: string): Promise<void>;
    /**
     * Escalate episode to higher care level or backup supervisors
     */
    escalateEpisode(episode: Episode, reason: string): Promise<void>;
    /**
     * Default episode to higher care level when supervisors unavailable
     */
    defaultToHigherCareLevel(episode: Episode, reason: string): Promise<void>;
    /**
     * Get escalation rule for urgency level
     */
    private getEscalationRule;
    /**
     * Get episodes that are overdue for validation
     */
    private getOverdueEpisodes;
    /**
     * Get episodes assigned to a specific supervisor
     */
    private getEpisodesAssignedToSupervisor;
    /**
     * Find available backup supervisor
     */
    private findAvailableBackupSupervisor;
    /**
     * Reassign episode to different supervisor
     */
    private reassignEpisode;
    /**
     * Update episode with validation
     */
    private updateEpisodeWithValidation;
    /**
     * Update episode status
     */
    private updateEpisodeStatus;
    /**
     * Update episode with escalation information
     */
    private updateEpisodeWithEscalation;
    /**
     * Update episode with override tracking
     */
    private updateEpisodeWithOverride;
    /**
     * Log override decision for audit trail
     */
    private logOverrideDecision;
}
