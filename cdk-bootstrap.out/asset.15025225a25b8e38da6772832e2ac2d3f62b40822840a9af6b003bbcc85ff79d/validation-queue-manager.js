"use strict";
// Validation Queue Manager
// Manages the queue of episodes awaiting human validation
// Requirements: 7.1, 7.4
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationQueueManager = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../../types");
class ValidationQueueManager {
    constructor(docClient, episodeTableName) {
        this.docClient = docClient;
        this.episodeTableName = episodeTableName;
    }
    /**
     * Add episode to validation queue
     */
    async addToQueue(episode, supervisorId) {
        try {
            const queuedAt = new Date();
            const priority = this.calculatePriority(episode.triage.urgencyLevel);
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId: episode.episodeId },
                UpdateExpression: 'SET validationStatus = :status, assignedSupervisor = :supervisor, queuedAt = :queuedAt, queuePriority = :priority, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':status': 'pending',
                    ':supervisor': supervisorId || null,
                    ':queuedAt': queuedAt.toISOString(),
                    ':priority': priority,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
            console.log(`Episode ${episode.episodeId} added to validation queue with priority ${priority}`);
        }
        catch (error) {
            console.error('Error adding episode to validation queue:', error);
            throw error;
        }
    }
    /**
     * Remove episode from validation queue
     */
    async removeFromQueue(episodeId) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'REMOVE queuedAt, queuePriority, assignedSupervisor SET validationStatus = :status, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':status': 'completed',
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
            console.log(`Episode ${episodeId} removed from validation queue`);
        }
        catch (error) {
            console.error('Error removing episode from validation queue:', error);
            throw error;
        }
    }
    /**
     * Get validation queue items
     */
    async getQueue(supervisorId, urgencyFilter, limit = 20) {
        try {
            let command;
            if (supervisorId) {
                // Get queue items assigned to specific supervisor
                command = new lib_dynamodb_1.QueryCommand({
                    TableName: this.episodeTableName,
                    IndexName: 'ValidationStatusIndex',
                    KeyConditionExpression: 'validationStatus = :status',
                    FilterExpression: 'assignedSupervisor = :supervisor',
                    ExpressionAttributeValues: {
                        ':status': 'pending',
                        ':supervisor': supervisorId
                    },
                    ScanIndexForward: false, // Sort by updatedAt descending
                    Limit: limit
                });
            }
            else {
                // Get all pending validation items
                command = new lib_dynamodb_1.QueryCommand({
                    TableName: this.episodeTableName,
                    IndexName: 'ValidationStatusIndex',
                    KeyConditionExpression: 'validationStatus = :status',
                    ExpressionAttributeValues: {
                        ':status': 'pending'
                    },
                    ScanIndexForward: false, // Sort by updatedAt descending
                    Limit: limit
                });
            }
            const result = await this.docClient.send(command);
            const episodes = result.Items;
            // Convert episodes to queue items and apply urgency filter
            let queueItems = episodes.map(episode => this.convertToQueueItem(episode));
            if (urgencyFilter) {
                queueItems = queueItems.filter(item => item.urgencyLevel === urgencyFilter);
            }
            // Sort by priority (emergency first, then by queue time)
            queueItems.sort((a, b) => {
                const priorityA = this.calculatePriority(a.urgencyLevel);
                const priorityB = this.calculatePriority(b.urgencyLevel);
                if (priorityA !== priorityB) {
                    return priorityB - priorityA; // Higher priority first
                }
                return a.queuedAt.getTime() - b.queuedAt.getTime(); // Earlier queued first
            });
            return queueItems;
        }
        catch (error) {
            console.error('Error getting validation queue:', error);
            throw error;
        }
    }
    /**
     * Get queue position for a specific episode
     */
    async getQueuePosition(episodeId) {
        try {
            const episode = await this.getEpisodeFromQueue(episodeId);
            if (!episode) {
                return -1; // Not in queue
            }
            const allQueueItems = await this.getQueue();
            const position = allQueueItems.findIndex(item => item.episodeId === episodeId);
            return position + 1; // 1-based position
        }
        catch (error) {
            console.error('Error getting queue position:', error);
            return -1;
        }
    }
    /**
     * Get estimated wait time for an episode
     */
    async getEstimatedWaitTime(episodeId) {
        try {
            const position = await this.getQueuePosition(episodeId);
            if (position <= 0) {
                return 0;
            }
            // Estimate based on average validation time and queue position
            const averageValidationTime = await this.getAverageValidationTime();
            const estimatedWaitTime = (position - 1) * averageValidationTime;
            return Math.max(0, estimatedWaitTime);
        }
        catch (error) {
            console.error('Error calculating estimated wait time:', error);
            return 0;
        }
    }
    /**
     * Get episodes that have been in queue too long (for escalation)
     */
    async getOverdueEpisodes(thresholdMinutes = 30) {
        try {
            const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.episodeTableName,
                IndexName: 'ValidationStatusIndex',
                KeyConditionExpression: 'validationStatus = :status',
                FilterExpression: 'queuedAt < :threshold',
                ExpressionAttributeValues: {
                    ':status': 'pending',
                    ':threshold': thresholdTime.toISOString()
                }
            });
            const result = await this.docClient.send(command);
            return result.Items;
        }
        catch (error) {
            console.error('Error getting overdue episodes:', error);
            throw error;
        }
    }
    /**
     * Reassign episode to different supervisor
     */
    async reassignEpisode(episodeId, newSupervisorId) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET assignedSupervisor = :supervisor, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':supervisor': newSupervisorId,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
            console.log(`Episode ${episodeId} reassigned to supervisor ${newSupervisorId}`);
        }
        catch (error) {
            console.error('Error reassigning episode:', error);
            throw error;
        }
    }
    /**
     * Get queue statistics
     */
    async getQueueStatistics() {
        try {
            const allQueueItems = await this.getQueue(undefined, undefined, 1000);
            const stats = {
                totalPending: allQueueItems.length,
                emergencyCount: allQueueItems.filter(item => item.urgencyLevel === types_1.UrgencyLevel.EMERGENCY).length,
                urgentCount: allQueueItems.filter(item => item.urgencyLevel === types_1.UrgencyLevel.URGENT).length,
                routineCount: allQueueItems.filter(item => item.urgencyLevel === types_1.UrgencyLevel.ROUTINE).length,
                averageWaitTime: await this.getAverageValidationTime()
            };
            return stats;
        }
        catch (error) {
            console.error('Error getting queue statistics:', error);
            throw error;
        }
    }
    /**
     * Calculate priority based on urgency level
     */
    calculatePriority(urgencyLevel) {
        switch (urgencyLevel) {
            case types_1.UrgencyLevel.EMERGENCY:
                return 100;
            case types_1.UrgencyLevel.URGENT:
                return 75;
            case types_1.UrgencyLevel.ROUTINE:
                return 50;
            case types_1.UrgencyLevel.SELF_CARE:
                return 25;
            default:
                return 50;
        }
    }
    /**
     * Convert episode to queue item
     */
    convertToQueueItem(episode) {
        return {
            episodeId: episode.episodeId,
            patientId: episode.patientId,
            urgencyLevel: episode.triage.urgencyLevel,
            assignedSupervisor: episode.assignedSupervisor,
            queuedAt: new Date(episode.queuedAt || episode.createdAt),
            estimatedWaitTime: 0, // Will be calculated separately
            symptoms: {
                primaryComplaint: episode.symptoms.primaryComplaint,
                severity: episode.symptoms.severity
            },
            aiAssessment: episode.triage.aiAssessment.used ? {
                confidence: episode.triage.aiAssessment.confidence,
                reasoning: episode.triage.aiAssessment.reasoning
            } : undefined
        };
    }
    /**
     * Get episode from queue by ID
     */
    async getEpisodeFromQueue(episodeId) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.episodeTableName,
                KeyConditionExpression: 'episodeId = :episodeId',
                FilterExpression: 'validationStatus = :status',
                ExpressionAttributeValues: {
                    ':episodeId': episodeId,
                    ':status': 'pending'
                }
            });
            const result = await this.docClient.send(command);
            return result.Items?.[0] || null;
        }
        catch (error) {
            console.error('Error getting episode from queue:', error);
            return null;
        }
    }
    /**
     * Calculate average validation time based on historical data
     */
    async getAverageValidationTime() {
        // For now, return a default estimate
        // In a full implementation, this would analyze historical validation times
        return 15; // 15 minutes average
    }
}
exports.ValidationQueueManager = ValidationQueueManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi1xdWV1ZS1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xhbWJkYS9odW1hbi12YWxpZGF0aW9uL3ZhbGlkYXRpb24tcXVldWUtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMkJBQTJCO0FBQzNCLDBEQUEwRDtBQUMxRCx5QkFBeUI7OztBQUV6Qix3REFBd0g7QUFDeEgsdUNBQW9EO0FBbUJwRCxNQUFhLHNCQUFzQjtJQUNqQyxZQUNVLFNBQWlDLEVBQ2pDLGdCQUF3QjtRQUR4QixjQUFTLEdBQVQsU0FBUyxDQUF3QjtRQUNqQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7SUFDL0IsQ0FBQztJQUVKOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFnQixFQUFFLFlBQXFCO1FBQ3RELElBQUksQ0FBQztZQUNILE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxNQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFdEUsTUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBYSxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtnQkFDaEMsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUU7Z0JBQ3JDLGdCQUFnQixFQUFFLDJJQUEySTtnQkFDN0oseUJBQXlCLEVBQUU7b0JBQ3pCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixhQUFhLEVBQUUsWUFBWSxJQUFJLElBQUk7b0JBQ25DLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFO29CQUNuQyxXQUFXLEVBQUUsUUFBUTtvQkFDckIsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUN2QzthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0s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O1FBQ2pELElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLElBQUksMkJBQVksQ0FBQztnQkFDL0IsU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQ2hDLHNCQUFzQixFQUFFLHdCQUF3QjtnQkFDaEQsZ0JBQWdCLEVBQUUsNEJBQTRCO2dCQUM5Qyx5QkFBeUIsRUFBRTtvQkFDekIsWUFBWSxFQUFFLFNBQVM7b0JBQ3ZCLFNBQVMsRUFBRSxTQUFTO2lCQUNyQjthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEQsT0FBTyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFZLElBQUksSUFBSSxDQUFDO1FBQzlDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsd0JBQXdCO1FBQ3BDLHFDQUFxQztRQUNyQywyRUFBMkU7UUFDM0UsT0FBTyxFQUFFLENBQUMsQ0FBQyxxQkFBcUI7SUFDbEMsQ0FBQztDQUNGO0FBdlRELHdEQXVUQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFZhbGlkYXRpb24gUXVldWUgTWFuYWdlclxyXG4vLyBNYW5hZ2VzIHRoZSBxdWV1ZSBvZiBlcGlzb2RlcyBhd2FpdGluZyBodW1hbiB2YWxpZGF0aW9uXHJcbi8vIFJlcXVpcmVtZW50czogNy4xLCA3LjRcclxuXHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFF1ZXJ5Q29tbWFuZCwgU2NhbkNvbW1hbmQsIFVwZGF0ZUNvbW1hbmQsIERlbGV0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBVcmdlbmN5TGV2ZWwgfSBmcm9tICcuLi8uLi90eXBlcyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFF1ZXVlSXRlbSB7XHJcbiAgZXBpc29kZUlkOiBzdHJpbmc7XHJcbiAgcGF0aWVudElkOiBzdHJpbmc7XHJcbiAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWw7XHJcbiAgYXNzaWduZWRTdXBlcnZpc29yPzogc3RyaW5nO1xyXG4gIHF1ZXVlZEF0OiBEYXRlO1xyXG4gIGVzdGltYXRlZFdhaXRUaW1lOiBudW1iZXI7IC8vIGluIG1pbnV0ZXNcclxuICBzeW1wdG9tczoge1xyXG4gICAgcHJpbWFyeUNvbXBsYWludDogc3RyaW5nO1xyXG4gICAgc2V2ZXJpdHk6IG51bWJlcjtcclxuICB9O1xyXG4gIGFpQXNzZXNzbWVudD86IHtcclxuICAgIGNvbmZpZGVuY2U/OiBudW1iZXI7XHJcbiAgICByZWFzb25pbmc/OiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFZhbGlkYXRpb25RdWV1ZU1hbmFnZXIge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJpdmF0ZSBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsXHJcbiAgICBwcml2YXRlIGVwaXNvZGVUYWJsZU5hbWU6IHN0cmluZ1xyXG4gICkge31cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIGVwaXNvZGUgdG8gdmFsaWRhdGlvbiBxdWV1ZVxyXG4gICAqL1xyXG4gIGFzeW5jIGFkZFRvUXVldWUoZXBpc29kZTogRXBpc29kZSwgc3VwZXJ2aXNvcklkPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBxdWV1ZWRBdCA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IHByaW9yaXR5ID0gdGhpcy5jYWxjdWxhdGVQcmlvcml0eShlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsKTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIHZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzLCBhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvciwgcXVldWVkQXQgPSA6cXVldWVkQXQsIHF1ZXVlUHJpb3JpdHkgPSA6cHJpb3JpdHksIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6c3RhdHVzJzogJ3BlbmRpbmcnLFxyXG4gICAgICAgICAgJzpzdXBlcnZpc29yJzogc3VwZXJ2aXNvcklkIHx8IG51bGwsXHJcbiAgICAgICAgICAnOnF1ZXVlZEF0JzogcXVldWVkQXQudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICc6cHJpb3JpdHknOiBwcmlvcml0eSxcclxuICAgICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBFcGlzb2RlICR7ZXBpc29kZS5lcGlzb2RlSWR9IGFkZGVkIHRvIHZhbGlkYXRpb24gcXVldWUgd2l0aCBwcmlvcml0eSAke3ByaW9yaXR5fWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYWRkaW5nIGVwaXNvZGUgdG8gdmFsaWRhdGlvbiBxdWV1ZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVtb3ZlIGVwaXNvZGUgZnJvbSB2YWxpZGF0aW9uIHF1ZXVlXHJcbiAgICovXHJcbiAgYXN5bmMgcmVtb3ZlRnJvbVF1ZXVlKGVwaXNvZGVJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnUkVNT1ZFIHF1ZXVlZEF0LCBxdWV1ZVByaW9yaXR5LCBhc3NpZ25lZFN1cGVydmlzb3IgU0VUIHZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnN0YXR1cyc6ICdjb21wbGV0ZWQnLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYEVwaXNvZGUgJHtlcGlzb2RlSWR9IHJlbW92ZWQgZnJvbSB2YWxpZGF0aW9uIHF1ZXVlYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZW1vdmluZyBlcGlzb2RlIGZyb20gdmFsaWRhdGlvbiBxdWV1ZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHZhbGlkYXRpb24gcXVldWUgaXRlbXNcclxuICAgKi9cclxuICBhc3luYyBnZXRRdWV1ZShzdXBlcnZpc29ySWQ/OiBzdHJpbmcsIHVyZ2VuY3lGaWx0ZXI/OiBzdHJpbmcsIGxpbWl0OiBudW1iZXIgPSAyMCk6IFByb21pc2U8UXVldWVJdGVtW10+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGxldCBjb21tYW5kO1xyXG5cclxuICAgICAgaWYgKHN1cGVydmlzb3JJZCkge1xyXG4gICAgICAgIC8vIEdldCBxdWV1ZSBpdGVtcyBhc3NpZ25lZCB0byBzcGVjaWZpYyBzdXBlcnZpc29yXHJcbiAgICAgICAgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdWYWxpZGF0aW9uU3RhdHVzSW5kZXgnLFxyXG4gICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3ZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgICAgIEZpbHRlckV4cHJlc3Npb246ICdhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvcicsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6c3RhdHVzJzogJ3BlbmRpbmcnLFxyXG4gICAgICAgICAgICAnOnN1cGVydmlzb3InOiBzdXBlcnZpc29ySWRcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSB1cGRhdGVkQXQgZGVzY2VuZGluZ1xyXG4gICAgICAgICAgTGltaXQ6IGxpbWl0XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gR2V0IGFsbCBwZW5kaW5nIHZhbGlkYXRpb24gaXRlbXNcclxuICAgICAgICBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICAgIEluZGV4TmFtZTogJ1ZhbGlkYXRpb25TdGF0dXNJbmRleCcsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndmFsaWRhdGlvblN0YXR1cyA9IDpzdGF0dXMnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOnN0YXR1cyc6ICdwZW5kaW5nJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBTb3J0IGJ5IHVwZGF0ZWRBdCBkZXNjZW5kaW5nXHJcbiAgICAgICAgICBMaW1pdDogbGltaXRcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc3QgZXBpc29kZXMgPSByZXN1bHQuSXRlbXMgYXMgRXBpc29kZVtdO1xyXG5cclxuICAgICAgLy8gQ29udmVydCBlcGlzb2RlcyB0byBxdWV1ZSBpdGVtcyBhbmQgYXBwbHkgdXJnZW5jeSBmaWx0ZXJcclxuICAgICAgbGV0IHF1ZXVlSXRlbXMgPSBlcGlzb2Rlcy5tYXAoZXBpc29kZSA9PiB0aGlzLmNvbnZlcnRUb1F1ZXVlSXRlbShlcGlzb2RlKSk7XHJcblxyXG4gICAgICBpZiAodXJnZW5jeUZpbHRlcikge1xyXG4gICAgICAgIHF1ZXVlSXRlbXMgPSBxdWV1ZUl0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0udXJnZW5jeUxldmVsID09PSB1cmdlbmN5RmlsdGVyKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU29ydCBieSBwcmlvcml0eSAoZW1lcmdlbmN5IGZpcnN0LCB0aGVuIGJ5IHF1ZXVlIHRpbWUpXHJcbiAgICAgIHF1ZXVlSXRlbXMuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICAgIGNvbnN0IHByaW9yaXR5QSA9IHRoaXMuY2FsY3VsYXRlUHJpb3JpdHkoYS51cmdlbmN5TGV2ZWwpO1xyXG4gICAgICAgIGNvbnN0IHByaW9yaXR5QiA9IHRoaXMuY2FsY3VsYXRlUHJpb3JpdHkoYi51cmdlbmN5TGV2ZWwpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChwcmlvcml0eUEgIT09IHByaW9yaXR5Qikge1xyXG4gICAgICAgICAgcmV0dXJuIHByaW9yaXR5QiAtIHByaW9yaXR5QTsgLy8gSGlnaGVyIHByaW9yaXR5IGZpcnN0XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBhLnF1ZXVlZEF0LmdldFRpbWUoKSAtIGIucXVldWVkQXQuZ2V0VGltZSgpOyAvLyBFYXJsaWVyIHF1ZXVlZCBmaXJzdFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBxdWV1ZUl0ZW1zO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB2YWxpZGF0aW9uIHF1ZXVlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgcXVldWUgcG9zaXRpb24gZm9yIGEgc3BlY2lmaWMgZXBpc29kZVxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFF1ZXVlUG9zaXRpb24oZXBpc29kZUlkOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGF3YWl0IHRoaXMuZ2V0RXBpc29kZUZyb21RdWV1ZShlcGlzb2RlSWQpO1xyXG4gICAgICBpZiAoIWVwaXNvZGUpIHtcclxuICAgICAgICByZXR1cm4gLTE7IC8vIE5vdCBpbiBxdWV1ZVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBhbGxRdWV1ZUl0ZW1zID0gYXdhaXQgdGhpcy5nZXRRdWV1ZSgpO1xyXG4gICAgICBjb25zdCBwb3NpdGlvbiA9IGFsbFF1ZXVlSXRlbXMuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5lcGlzb2RlSWQgPT09IGVwaXNvZGVJZCk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gcG9zaXRpb24gKyAxOyAvLyAxLWJhc2VkIHBvc2l0aW9uXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHF1ZXVlIHBvc2l0aW9uOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGVzdGltYXRlZCB3YWl0IHRpbWUgZm9yIGFuIGVwaXNvZGVcclxuICAgKi9cclxuICBhc3luYyBnZXRFc3RpbWF0ZWRXYWl0VGltZShlcGlzb2RlSWQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwb3NpdGlvbiA9IGF3YWl0IHRoaXMuZ2V0UXVldWVQb3NpdGlvbihlcGlzb2RlSWQpO1xyXG4gICAgICBpZiAocG9zaXRpb24gPD0gMCkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBFc3RpbWF0ZSBiYXNlZCBvbiBhdmVyYWdlIHZhbGlkYXRpb24gdGltZSBhbmQgcXVldWUgcG9zaXRpb25cclxuICAgICAgY29uc3QgYXZlcmFnZVZhbGlkYXRpb25UaW1lID0gYXdhaXQgdGhpcy5nZXRBdmVyYWdlVmFsaWRhdGlvblRpbWUoKTtcclxuICAgICAgY29uc3QgZXN0aW1hdGVkV2FpdFRpbWUgPSAocG9zaXRpb24gLSAxKSAqIGF2ZXJhZ2VWYWxpZGF0aW9uVGltZTtcclxuXHJcbiAgICAgIHJldHVybiBNYXRoLm1heCgwLCBlc3RpbWF0ZWRXYWl0VGltZSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjYWxjdWxhdGluZyBlc3RpbWF0ZWQgd2FpdCB0aW1lOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZXBpc29kZXMgdGhhdCBoYXZlIGJlZW4gaW4gcXVldWUgdG9vIGxvbmcgKGZvciBlc2NhbGF0aW9uKVxyXG4gICAqL1xyXG4gIGFzeW5jIGdldE92ZXJkdWVFcGlzb2Rlcyh0aHJlc2hvbGRNaW51dGVzOiBudW1iZXIgPSAzMCk6IFByb21pc2U8RXBpc29kZVtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB0aHJlc2hvbGRUaW1lID0gbmV3IERhdGUoRGF0ZS5ub3coKSAtIHRocmVzaG9sZE1pbnV0ZXMgKiA2MCAqIDEwMDApO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ1ZhbGlkYXRpb25TdGF0dXNJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3ZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgICBGaWx0ZXJFeHByZXNzaW9uOiAncXVldWVkQXQgPCA6dGhyZXNob2xkJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnN0YXR1cyc6ICdwZW5kaW5nJyxcclxuICAgICAgICAgICc6dGhyZXNob2xkJzogdGhyZXNob2xkVGltZS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbXMgYXMgRXBpc29kZVtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBvdmVyZHVlIGVwaXNvZGVzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWFzc2lnbiBlcGlzb2RlIHRvIGRpZmZlcmVudCBzdXBlcnZpc29yXHJcbiAgICovXHJcbiAgYXN5bmMgcmVhc3NpZ25FcGlzb2RlKGVwaXNvZGVJZDogc3RyaW5nLCBuZXdTdXBlcnZpc29ySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvciwgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdXBlcnZpc29yJzogbmV3U3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYEVwaXNvZGUgJHtlcGlzb2RlSWR9IHJlYXNzaWduZWQgdG8gc3VwZXJ2aXNvciAke25ld1N1cGVydmlzb3JJZH1gKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlYXNzaWduaW5nIGVwaXNvZGU6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBxdWV1ZSBzdGF0aXN0aWNzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0UXVldWVTdGF0aXN0aWNzKCk6IFByb21pc2U8e1xyXG4gICAgdG90YWxQZW5kaW5nOiBudW1iZXI7XHJcbiAgICBlbWVyZ2VuY3lDb3VudDogbnVtYmVyO1xyXG4gICAgdXJnZW50Q291bnQ6IG51bWJlcjtcclxuICAgIHJvdXRpbmVDb3VudDogbnVtYmVyO1xyXG4gICAgYXZlcmFnZVdhaXRUaW1lOiBudW1iZXI7XHJcbiAgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgYWxsUXVldWVJdGVtcyA9IGF3YWl0IHRoaXMuZ2V0UXVldWUodW5kZWZpbmVkLCB1bmRlZmluZWQsIDEwMDApO1xyXG4gICAgICBcclxuICAgICAgY29uc3Qgc3RhdHMgPSB7XHJcbiAgICAgICAgdG90YWxQZW5kaW5nOiBhbGxRdWV1ZUl0ZW1zLmxlbmd0aCxcclxuICAgICAgICBlbWVyZ2VuY3lDb3VudDogYWxsUXVldWVJdGVtcy5maWx0ZXIoaXRlbSA9PiBpdGVtLnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSkubGVuZ3RoLFxyXG4gICAgICAgIHVyZ2VudENvdW50OiBhbGxRdWV1ZUl0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0udXJnZW5jeUxldmVsID09PSBVcmdlbmN5TGV2ZWwuVVJHRU5UKS5sZW5ndGgsXHJcbiAgICAgICAgcm91dGluZUNvdW50OiBhbGxRdWV1ZUl0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0udXJnZW5jeUxldmVsID09PSBVcmdlbmN5TGV2ZWwuUk9VVElORSkubGVuZ3RoLFxyXG4gICAgICAgIGF2ZXJhZ2VXYWl0VGltZTogYXdhaXQgdGhpcy5nZXRBdmVyYWdlVmFsaWRhdGlvblRpbWUoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHN0YXRzO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBxdWV1ZSBzdGF0aXN0aWNzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgcHJpb3JpdHkgYmFzZWQgb24gdXJnZW5jeSBsZXZlbFxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlUHJpb3JpdHkodXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwpOiBudW1iZXIge1xyXG4gICAgc3dpdGNoICh1cmdlbmN5TGV2ZWwpIHtcclxuICAgICAgY2FzZSBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZOlxyXG4gICAgICAgIHJldHVybiAxMDA7XHJcbiAgICAgIGNhc2UgVXJnZW5jeUxldmVsLlVSR0VOVDpcclxuICAgICAgICByZXR1cm4gNzU7XHJcbiAgICAgIGNhc2UgVXJnZW5jeUxldmVsLlJPVVRJTkU6XHJcbiAgICAgICAgcmV0dXJuIDUwO1xyXG4gICAgICBjYXNlIFVyZ2VuY3lMZXZlbC5TRUxGX0NBUkU6XHJcbiAgICAgICAgcmV0dXJuIDI1O1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiA1MDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnQgZXBpc29kZSB0byBxdWV1ZSBpdGVtXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjb252ZXJ0VG9RdWV1ZUl0ZW0oZXBpc29kZTogRXBpc29kZSk6IFF1ZXVlSXRlbSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICB1cmdlbmN5TGV2ZWw6IGVwaXNvZGUudHJpYWdlIS51cmdlbmN5TGV2ZWwsXHJcbiAgICAgIGFzc2lnbmVkU3VwZXJ2aXNvcjogKGVwaXNvZGUgYXMgYW55KS5hc3NpZ25lZFN1cGVydmlzb3IsXHJcbiAgICAgIHF1ZXVlZEF0OiBuZXcgRGF0ZSgoZXBpc29kZSBhcyBhbnkpLnF1ZXVlZEF0IHx8IGVwaXNvZGUuY3JlYXRlZEF0KSxcclxuICAgICAgZXN0aW1hdGVkV2FpdFRpbWU6IDAsIC8vIFdpbGwgYmUgY2FsY3VsYXRlZCBzZXBhcmF0ZWx5XHJcbiAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogZXBpc29kZS5zeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LFxyXG4gICAgICAgIHNldmVyaXR5OiBlcGlzb2RlLnN5bXB0b21zLnNldmVyaXR5XHJcbiAgICAgIH0sXHJcbiAgICAgIGFpQXNzZXNzbWVudDogZXBpc29kZS50cmlhZ2UhLmFpQXNzZXNzbWVudC51c2VkID8ge1xyXG4gICAgICAgIGNvbmZpZGVuY2U6IGVwaXNvZGUudHJpYWdlIS5haUFzc2Vzc21lbnQuY29uZmlkZW5jZSxcclxuICAgICAgICByZWFzb25pbmc6IGVwaXNvZGUudHJpYWdlIS5haUFzc2Vzc21lbnQucmVhc29uaW5nXHJcbiAgICAgIH0gOiB1bmRlZmluZWRcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZXBpc29kZSBmcm9tIHF1ZXVlIGJ5IElEXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRFcGlzb2RlRnJvbVF1ZXVlKGVwaXNvZGVJZDogc3RyaW5nKTogUHJvbWlzZTxFcGlzb2RlIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdlcGlzb2RlSWQgPSA6ZXBpc29kZUlkJyxcclxuICAgICAgICBGaWx0ZXJFeHByZXNzaW9uOiAndmFsaWRhdGlvblN0YXR1cyA9IDpzdGF0dXMnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZXBpc29kZUlkJzogZXBpc29kZUlkLFxyXG4gICAgICAgICAgJzpzdGF0dXMnOiAncGVuZGluZydcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtcz8uWzBdIGFzIEVwaXNvZGUgfHwgbnVsbDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZXBpc29kZSBmcm9tIHF1ZXVlOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgYXZlcmFnZSB2YWxpZGF0aW9uIHRpbWUgYmFzZWQgb24gaGlzdG9yaWNhbCBkYXRhXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRBdmVyYWdlVmFsaWRhdGlvblRpbWUoKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICAgIC8vIEZvciBub3csIHJldHVybiBhIGRlZmF1bHQgZXN0aW1hdGVcclxuICAgIC8vIEluIGEgZnVsbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZCBhbmFseXplIGhpc3RvcmljYWwgdmFsaWRhdGlvbiB0aW1lc1xyXG4gICAgcmV0dXJuIDE1OyAvLyAxNSBtaW51dGVzIGF2ZXJhZ2VcclxuICB9XHJcbn0iXX0=