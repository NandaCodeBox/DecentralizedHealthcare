import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Episode, UrgencyLevel } from '../../types';
export interface QueueItem {
    episodeId: string;
    patientId: string;
    urgencyLevel: UrgencyLevel;
    assignedSupervisor?: string;
    queuedAt: Date;
    estimatedWaitTime: number;
    symptoms: {
        primaryComplaint: string;
        severity: number;
    };
    aiAssessment?: {
        confidence?: number;
        reasoning?: string;
    };
}
export declare class ValidationQueueManager {
    private docClient;
    private episodeTableName;
    constructor(docClient: DynamoDBDocumentClient, episodeTableName: string);
    /**
     * Add episode to validation queue
     */
    addToQueue(episode: Episode, supervisorId?: string): Promise<void>;
    /**
     * Remove episode from validation queue
     */
    removeFromQueue(episodeId: string): Promise<void>;
    /**
     * Get validation queue items
     */
    getQueue(supervisorId?: string, urgencyFilter?: string, limit?: number): Promise<QueueItem[]>;
    /**
     * Get queue position for a specific episode
     */
    getQueuePosition(episodeId: string): Promise<number>;
    /**
     * Get estimated wait time for an episode
     */
    getEstimatedWaitTime(episodeId: string): Promise<number>;
    /**
     * Get episodes that have been in queue too long (for escalation)
     */
    getOverdueEpisodes(thresholdMinutes?: number): Promise<Episode[]>;
    /**
     * Reassign episode to different supervisor
     */
    reassignEpisode(episodeId: string, newSupervisorId: string): Promise<void>;
    /**
     * Get queue statistics
     */
    getQueueStatistics(): Promise<{
        totalPending: number;
        emergencyCount: number;
        urgentCount: number;
        routineCount: number;
        averageWaitTime: number;
    }>;
    /**
     * Calculate priority based on urgency level
     */
    private calculatePriority;
    /**
     * Convert episode to queue item
     */
    private convertToQueueItem;
    /**
     * Get episode from queue by ID
     */
    private getEpisodeFromQueue;
    /**
     * Calculate average validation time based on historical data
     */
    private getAverageValidationTime;
}
