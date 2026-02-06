"use strict";
// Escalation Service
// Handles supervisor unavailability and escalation logic
// Requirements: 7.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../../types");
const supervisor_notification_service_1 = require("./supervisor-notification-service");
class EscalationService {
    constructor(docClient, snsClient, episodeTableName, notificationTopicArn) {
        this.docClient = docClient;
        this.snsClient = snsClient;
        this.episodeTableName = episodeTableName;
        this.notificationTopicArn = notificationTopicArn;
        this.escalationRules = [
            {
                urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                maxWaitTimeMinutes: 5,
                backupSupervisors: ['emergency-supervisor-1', 'emergency-supervisor-2'],
                defaultToHigherCareLevel: true
            },
            {
                urgencyLevel: types_1.UrgencyLevel.URGENT,
                maxWaitTimeMinutes: 15,
                backupSupervisors: ['urgent-supervisor-1', 'urgent-supervisor-2'],
                defaultToHigherCareLevel: true
            },
            {
                urgencyLevel: types_1.UrgencyLevel.ROUTINE,
                maxWaitTimeMinutes: 60,
                backupSupervisors: ['routine-supervisor-1', 'routine-supervisor-2'],
                defaultToHigherCareLevel: false
            },
            {
                urgencyLevel: types_1.UrgencyLevel.SELF_CARE,
                maxWaitTimeMinutes: 120,
                backupSupervisors: ['routine-supervisor-1'],
                defaultToHigherCareLevel: false
            }
        ];
        this.notificationService = new supervisor_notification_service_1.SupervisorNotificationService(snsClient, notificationTopicArn, notificationTopicArn // Using same topic for simplicity
        );
    }
    /**
     * Handle supervisor override decision
     */
    async handleOverride(episode, validation) {
        try {
            console.log(`Processing override for episode ${episode.episodeId} by supervisor ${validation.supervisorId}`);
            // Log the override decision
            await this.logOverrideDecision(episode, validation);
            // If not approved, determine escalation path
            if (!validation.approved) {
                await this.escalateEpisode(episode, `Supervisor override: ${validation.overrideReason}`);
            }
            // Update episode with override tracking
            await this.updateEpisodeWithOverride(episode.episodeId, validation);
        }
        catch (error) {
            console.error('Error handling supervisor override:', error);
            throw error;
        }
    }
    /**
     * Check for episodes that need escalation due to timeout
     */
    async checkForTimeoutEscalations() {
        try {
            for (const rule of this.escalationRules) {
                const overdueEpisodes = await this.getOverdueEpisodes(rule.urgencyLevel, rule.maxWaitTimeMinutes);
                for (const episode of overdueEpisodes) {
                    await this.escalateEpisode(episode, `Timeout escalation: exceeded ${rule.maxWaitTimeMinutes} minutes`);
                }
            }
        }
        catch (error) {
            console.error('Error checking for timeout escalations:', error);
            throw error;
        }
    }
    /**
     * Handle supervisor unavailability
     */
    async handleSupervisorUnavailability(supervisorId) {
        try {
            // Get all episodes assigned to unavailable supervisor
            const assignedEpisodes = await this.getEpisodesAssignedToSupervisor(supervisorId);
            for (const episode of assignedEpisodes) {
                const rule = this.getEscalationRule(episode.triage.urgencyLevel);
                // Try to reassign to backup supervisors
                const availableBackup = await this.findAvailableBackupSupervisor(rule.backupSupervisors);
                if (availableBackup) {
                    await this.reassignEpisode(episode.episodeId, availableBackup);
                    await this.notificationService.notifySupervisor(episode, availableBackup, episode.triage.urgencyLevel === types_1.UrgencyLevel.EMERGENCY);
                }
                else {
                    // No backup available, escalate
                    await this.escalateEpisode(episode, `Supervisor unavailable: ${supervisorId}, no backup available`);
                }
            }
        }
        catch (error) {
            console.error('Error handling supervisor unavailability:', error);
            throw error;
        }
    }
    /**
     * Escalate episode to higher care level or backup supervisors
     */
    async escalateEpisode(episode, reason) {
        try {
            const rule = this.getEscalationRule(episode.triage.urgencyLevel);
            console.log(`Escalating episode ${episode.episodeId}: ${reason}`);
            // Try backup supervisors first
            const availableBackup = await this.findAvailableBackupSupervisor(rule.backupSupervisors);
            if (availableBackup) {
                // Reassign to backup supervisor
                await this.reassignEpisode(episode.episodeId, availableBackup);
                await this.notificationService.sendEscalationNotification(episode, reason, rule.backupSupervisors);
                await this.notificationService.notifySupervisor(episode, availableBackup, true);
            }
            else if (rule.defaultToHigherCareLevel) {
                // Default to higher care level
                await this.defaultToHigherCareLevel(episode, reason);
            }
            else {
                // Keep in queue but send escalation alert
                await this.notificationService.sendEscalationNotification(episode, reason, rule.backupSupervisors);
            }
            // Update episode with escalation information
            await this.updateEpisodeWithEscalation(episode.episodeId, reason, availableBackup || undefined);
        }
        catch (error) {
            console.error('Error escalating episode:', error);
            throw error;
        }
    }
    /**
     * Default episode to higher care level when supervisors unavailable
     */
    async defaultToHigherCareLevel(episode, reason) {
        try {
            console.log(`Defaulting episode ${episode.episodeId} to higher care level: ${reason}`);
            // Create automatic approval with escalation note
            const automaticValidation = {
                supervisorId: 'system-escalation',
                approved: true,
                overrideReason: `Automatic approval due to escalation: ${reason}`,
                notes: 'Defaulted to higher care level due to supervisor unavailability',
                timestamp: new Date()
            };
            // Update episode with automatic validation
            await this.updateEpisodeWithValidation(episode.episodeId, automaticValidation);
            // Update status to escalated
            await this.updateEpisodeStatus(episode.episodeId, types_1.EpisodeStatus.ESCALATED);
            // Send notification about automatic escalation
            await this.notificationService.notifyCareCoordinator(episode, automaticValidation);
        }
        catch (error) {
            console.error('Error defaulting to higher care level:', error);
            throw error;
        }
    }
    /**
     * Get escalation rule for urgency level
     */
    getEscalationRule(urgencyLevel) {
        return this.escalationRules.find(rule => rule.urgencyLevel === urgencyLevel) ||
            this.escalationRules[this.escalationRules.length - 1]; // Default to last rule
    }
    /**
     * Get episodes that are overdue for validation
     */
    async getOverdueEpisodes(urgencyLevel, maxWaitMinutes) {
        try {
            const thresholdTime = new Date(Date.now() - maxWaitMinutes * 60 * 1000);
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.episodeTableName,
                IndexName: 'ValidationStatusIndex',
                KeyConditionExpression: 'validationStatus = :status',
                FilterExpression: 'urgencyLevel = :urgency AND queuedAt < :threshold',
                ExpressionAttributeValues: {
                    ':status': 'pending',
                    ':urgency': urgencyLevel,
                    ':threshold': thresholdTime.toISOString()
                }
            });
            const result = await this.docClient.send(command);
            return result.Items;
        }
        catch (error) {
            console.error('Error getting overdue episodes:', error);
            return [];
        }
    }
    /**
     * Get episodes assigned to a specific supervisor
     */
    async getEpisodesAssignedToSupervisor(supervisorId) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.episodeTableName,
                IndexName: 'ValidationStatusIndex',
                KeyConditionExpression: 'validationStatus = :status',
                FilterExpression: 'assignedSupervisor = :supervisor',
                ExpressionAttributeValues: {
                    ':status': 'pending',
                    ':supervisor': supervisorId
                }
            });
            const result = await this.docClient.send(command);
            return result.Items;
        }
        catch (error) {
            console.error('Error getting episodes assigned to supervisor:', error);
            return [];
        }
    }
    /**
     * Find available backup supervisor
     */
    async findAvailableBackupSupervisor(backupSupervisors) {
        // In a full implementation, this would check supervisor availability
        // For now, return the first backup supervisor
        return backupSupervisors.length > 0 ? backupSupervisors[0] : null;
    }
    /**
     * Reassign episode to different supervisor
     */
    async reassignEpisode(episodeId, newSupervisorId) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET assignedSupervisor = :supervisor, reassignedAt = :timestamp, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':supervisor': newSupervisorId,
                    ':timestamp': new Date().toISOString(),
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
     * Update episode with validation
     */
    async updateEpisodeWithValidation(episodeId, validation) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':validation': validation,
                    ':status': 'completed',
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode with validation:', error);
            throw error;
        }
    }
    /**
     * Update episode status
     */
    async updateEpisodeStatus(episodeId, status) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': status,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode status:', error);
            throw error;
        }
    }
    /**
     * Update episode with escalation information
     */
    async updateEpisodeWithEscalation(episodeId, reason, newSupervisorId) {
        try {
            const escalationInfo = {
                reason,
                timestamp: new Date().toISOString(),
                newSupervisorId
            };
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET escalationInfo = :escalation, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':escalation': escalationInfo,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode with escalation:', error);
            throw error;
        }
    }
    /**
     * Update episode with override tracking
     */
    async updateEpisodeWithOverride(episodeId, validation) {
        try {
            const overrideInfo = {
                supervisorId: validation.supervisorId,
                reason: validation.overrideReason,
                timestamp: validation.timestamp,
                approved: validation.approved
            };
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET overrideInfo = :override, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':override': overrideInfo,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode with override:', error);
            throw error;
        }
    }
    /**
     * Log override decision for audit trail
     */
    async logOverrideDecision(episode, validation) {
        console.log('Supervisor override decision:', {
            episodeId: episode.episodeId,
            supervisorId: validation.supervisorId,
            approved: validation.approved,
            overrideReason: validation.overrideReason,
            originalUrgency: episode.triage.urgencyLevel,
            timestamp: validation.timestamp
        });
    }
}
exports.EscalationService = EscalationService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNjYWxhdGlvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xhbWJkYS9odW1hbi12YWxpZGF0aW9uL2VzY2FsYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUJBQXFCO0FBQ3JCLHlEQUF5RDtBQUN6RCxvQkFBb0I7OztBQUVwQix3REFBNEY7QUFFNUYsdUNBQW9GO0FBQ3BGLHVGQUFrRjtBQWlCbEYsTUFBYSxpQkFBaUI7SUE4QjVCLFlBQ1UsU0FBaUMsRUFDakMsU0FBb0IsRUFDcEIsZ0JBQXdCLEVBQ3hCLG9CQUE0QjtRQUg1QixjQUFTLEdBQVQsU0FBUyxDQUF3QjtRQUNqQyxjQUFTLEdBQVQsU0FBUyxDQUFXO1FBQ3BCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBUTtRQUN4Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQVE7UUFqQzlCLG9CQUFlLEdBQXFCO1lBQzFDO2dCQUNFLFlBQVksRUFBRSxvQkFBWSxDQUFDLFNBQVM7Z0JBQ3BDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3JCLGlCQUFpQixFQUFFLENBQUMsd0JBQXdCLEVBQUUsd0JBQXdCLENBQUM7Z0JBQ3ZFLHdCQUF3QixFQUFFLElBQUk7YUFDL0I7WUFDRDtnQkFDRSxZQUFZLEVBQUUsb0JBQVksQ0FBQyxNQUFNO2dCQUNqQyxrQkFBa0IsRUFBRSxFQUFFO2dCQUN0QixpQkFBaUIsRUFBRSxDQUFDLHFCQUFxQixFQUFFLHFCQUFxQixDQUFDO2dCQUNqRSx3QkFBd0IsRUFBRSxJQUFJO2FBQy9CO1lBQ0Q7Z0JBQ0UsWUFBWSxFQUFFLG9CQUFZLENBQUMsT0FBTztnQkFDbEMsa0JBQWtCLEVBQUUsRUFBRTtnQkFDdEIsaUJBQWlCLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxzQkFBc0IsQ0FBQztnQkFDbkUsd0JBQXdCLEVBQUUsS0FBSzthQUNoQztZQUNEO2dCQUNFLFlBQVksRUFBRSxvQkFBWSxDQUFDLFNBQVM7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LFdBQVcsRUFBRSxZQUFZO29CQUN6QixZQUFZLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3ZDO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUQsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLG1CQUFtQixDQUFDLE9BQWdCLEVBQUUsVUFBMkI7UUFDN0UsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsRUFBRTtZQUMzQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7WUFDNUIsWUFBWSxFQUFFLFVBQVUsQ0FBQyxZQUFZO1lBQ3JDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtZQUM3QixjQUFjLEVBQUUsVUFBVSxDQUFDLGNBQWM7WUFDekMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxNQUFPLENBQUMsWUFBWTtZQUM3QyxTQUFTLEVBQUUsVUFBVSxDQUFDLFNBQVM7U0FDaEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcllELDhDQXFZQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEVzY2FsYXRpb24gU2VydmljZVxyXG4vLyBIYW5kbGVzIHN1cGVydmlzb3IgdW5hdmFpbGFiaWxpdHkgYW5kIGVzY2FsYXRpb24gbG9naWNcclxuLy8gUmVxdWlyZW1lbnRzOiA3LjVcclxuXHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFVwZGF0ZUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFNOU0NsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBIdW1hblZhbGlkYXRpb24sIFVyZ2VuY3lMZXZlbCwgRXBpc29kZVN0YXR1cyB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuaW1wb3J0IHsgU3VwZXJ2aXNvck5vdGlmaWNhdGlvblNlcnZpY2UgfSBmcm9tICcuL3N1cGVydmlzb3Itbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFc2NhbGF0aW9uUnVsZSB7XHJcbiAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWw7XHJcbiAgbWF4V2FpdFRpbWVNaW51dGVzOiBudW1iZXI7XHJcbiAgYmFja3VwU3VwZXJ2aXNvcnM6IHN0cmluZ1tdO1xyXG4gIGRlZmF1bHRUb0hpZ2hlckNhcmVMZXZlbDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTdXBlcnZpc29yQXZhaWxhYmlsaXR5IHtcclxuICBzdXBlcnZpc29ySWQ6IHN0cmluZztcclxuICBpc0F2YWlsYWJsZTogYm9vbGVhbjtcclxuICBsYXN0U2VlbjogRGF0ZTtcclxuICBtYXhDb25jdXJyZW50Q2FzZXM6IG51bWJlcjtcclxuICBjdXJyZW50Q2FzZUNvdW50OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFc2NhbGF0aW9uU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBlc2NhbGF0aW9uUnVsZXM6IEVzY2FsYXRpb25SdWxlW10gPSBbXHJcbiAgICB7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLkVNRVJHRU5DWSxcclxuICAgICAgbWF4V2FpdFRpbWVNaW51dGVzOiA1LFxyXG4gICAgICBiYWNrdXBTdXBlcnZpc29yczogWydlbWVyZ2VuY3ktc3VwZXJ2aXNvci0xJywgJ2VtZXJnZW5jeS1zdXBlcnZpc29yLTInXSxcclxuICAgICAgZGVmYXVsdFRvSGlnaGVyQ2FyZUxldmVsOiB0cnVlXHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5VUkdFTlQsXHJcbiAgICAgIG1heFdhaXRUaW1lTWludXRlczogMTUsXHJcbiAgICAgIGJhY2t1cFN1cGVydmlzb3JzOiBbJ3VyZ2VudC1zdXBlcnZpc29yLTEnLCAndXJnZW50LXN1cGVydmlzb3ItMiddLFxyXG4gICAgICBkZWZhdWx0VG9IaWdoZXJDYXJlTGV2ZWw6IHRydWVcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlJPVVRJTkUsXHJcbiAgICAgIG1heFdhaXRUaW1lTWludXRlczogNjAsXHJcbiAgICAgIGJhY2t1cFN1cGVydmlzb3JzOiBbJ3JvdXRpbmUtc3VwZXJ2aXNvci0xJywgJ3JvdXRpbmUtc3VwZXJ2aXNvci0yJ10sXHJcbiAgICAgIGRlZmF1bHRUb0hpZ2hlckNhcmVMZXZlbDogZmFsc2VcclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlNFTEZfQ0FSRSxcclxuICAgICAgbWF4V2FpdFRpbWVNaW51dGVzOiAxMjAsXHJcbiAgICAgIGJhY2t1cFN1cGVydmlzb3JzOiBbJ3JvdXRpbmUtc3VwZXJ2aXNvci0xJ10sXHJcbiAgICAgIGRlZmF1bHRUb0hpZ2hlckNhcmVMZXZlbDogZmFsc2VcclxuICAgIH1cclxuICBdO1xyXG5cclxuICBwcml2YXRlIG5vdGlmaWNhdGlvblNlcnZpY2U6IFN1cGVydmlzb3JOb3RpZmljYXRpb25TZXJ2aWNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LFxyXG4gICAgcHJpdmF0ZSBzbnNDbGllbnQ6IFNOU0NsaWVudCxcclxuICAgIHByaXZhdGUgZXBpc29kZVRhYmxlTmFtZTogc3RyaW5nLFxyXG4gICAgcHJpdmF0ZSBub3RpZmljYXRpb25Ub3BpY0Fybjogc3RyaW5nXHJcbiAgKSB7XHJcbiAgICB0aGlzLm5vdGlmaWNhdGlvblNlcnZpY2UgPSBuZXcgU3VwZXJ2aXNvck5vdGlmaWNhdGlvblNlcnZpY2UoXHJcbiAgICAgIHNuc0NsaWVudCxcclxuICAgICAgbm90aWZpY2F0aW9uVG9waWNBcm4sXHJcbiAgICAgIG5vdGlmaWNhdGlvblRvcGljQXJuIC8vIFVzaW5nIHNhbWUgdG9waWMgZm9yIHNpbXBsaWNpdHlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGUgc3VwZXJ2aXNvciBvdmVycmlkZSBkZWNpc2lvblxyXG4gICAqL1xyXG4gIGFzeW5jIGhhbmRsZU92ZXJyaWRlKGVwaXNvZGU6IEVwaXNvZGUsIHZhbGlkYXRpb246IEh1bWFuVmFsaWRhdGlvbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYFByb2Nlc3Npbmcgb3ZlcnJpZGUgZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH0gYnkgc3VwZXJ2aXNvciAke3ZhbGlkYXRpb24uc3VwZXJ2aXNvcklkfWApO1xyXG5cclxuICAgICAgLy8gTG9nIHRoZSBvdmVycmlkZSBkZWNpc2lvblxyXG4gICAgICBhd2FpdCB0aGlzLmxvZ092ZXJyaWRlRGVjaXNpb24oZXBpc29kZSwgdmFsaWRhdGlvbik7XHJcblxyXG4gICAgICAvLyBJZiBub3QgYXBwcm92ZWQsIGRldGVybWluZSBlc2NhbGF0aW9uIHBhdGhcclxuICAgICAgaWYgKCF2YWxpZGF0aW9uLmFwcHJvdmVkKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5lc2NhbGF0ZUVwaXNvZGUoZXBpc29kZSwgYFN1cGVydmlzb3Igb3ZlcnJpZGU6ICR7dmFsaWRhdGlvbi5vdmVycmlkZVJlYXNvbn1gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXBkYXRlIGVwaXNvZGUgd2l0aCBvdmVycmlkZSB0cmFja2luZ1xyXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUVwaXNvZGVXaXRoT3ZlcnJpZGUoZXBpc29kZS5lcGlzb2RlSWQsIHZhbGlkYXRpb24pO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIHN1cGVydmlzb3Igb3ZlcnJpZGU6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGZvciBlcGlzb2RlcyB0aGF0IG5lZWQgZXNjYWxhdGlvbiBkdWUgdG8gdGltZW91dFxyXG4gICAqL1xyXG4gIGFzeW5jIGNoZWNrRm9yVGltZW91dEVzY2FsYXRpb25zKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgZm9yIChjb25zdCBydWxlIG9mIHRoaXMuZXNjYWxhdGlvblJ1bGVzKSB7XHJcbiAgICAgICAgY29uc3Qgb3ZlcmR1ZUVwaXNvZGVzID0gYXdhaXQgdGhpcy5nZXRPdmVyZHVlRXBpc29kZXMocnVsZS51cmdlbmN5TGV2ZWwsIHJ1bGUubWF4V2FpdFRpbWVNaW51dGVzKTtcclxuICAgICAgICBcclxuICAgICAgICBmb3IgKGNvbnN0IGVwaXNvZGUgb2Ygb3ZlcmR1ZUVwaXNvZGVzKSB7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLmVzY2FsYXRlRXBpc29kZShlcGlzb2RlLCBgVGltZW91dCBlc2NhbGF0aW9uOiBleGNlZWRlZCAke3J1bGUubWF4V2FpdFRpbWVNaW51dGVzfSBtaW51dGVzYCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyBmb3IgdGltZW91dCBlc2NhbGF0aW9uczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIHN1cGVydmlzb3IgdW5hdmFpbGFiaWxpdHlcclxuICAgKi9cclxuICBhc3luYyBoYW5kbGVTdXBlcnZpc29yVW5hdmFpbGFiaWxpdHkoc3VwZXJ2aXNvcklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCBhbGwgZXBpc29kZXMgYXNzaWduZWQgdG8gdW5hdmFpbGFibGUgc3VwZXJ2aXNvclxyXG4gICAgICBjb25zdCBhc3NpZ25lZEVwaXNvZGVzID0gYXdhaXQgdGhpcy5nZXRFcGlzb2Rlc0Fzc2lnbmVkVG9TdXBlcnZpc29yKHN1cGVydmlzb3JJZCk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGVwaXNvZGUgb2YgYXNzaWduZWRFcGlzb2Rlcykge1xyXG4gICAgICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldEVzY2FsYXRpb25SdWxlKGVwaXNvZGUudHJpYWdlIS51cmdlbmN5TGV2ZWwpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFRyeSB0byByZWFzc2lnbiB0byBiYWNrdXAgc3VwZXJ2aXNvcnNcclxuICAgICAgICBjb25zdCBhdmFpbGFibGVCYWNrdXAgPSBhd2FpdCB0aGlzLmZpbmRBdmFpbGFibGVCYWNrdXBTdXBlcnZpc29yKHJ1bGUuYmFja3VwU3VwZXJ2aXNvcnMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChhdmFpbGFibGVCYWNrdXApIHtcclxuICAgICAgICAgIGF3YWl0IHRoaXMucmVhc3NpZ25FcGlzb2RlKGVwaXNvZGUuZXBpc29kZUlkLCBhdmFpbGFibGVCYWNrdXApO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5ub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeVN1cGVydmlzb3IoZXBpc29kZSwgYXZhaWxhYmxlQmFja3VwLCBcclxuICAgICAgICAgICAgZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIE5vIGJhY2t1cCBhdmFpbGFibGUsIGVzY2FsYXRlXHJcbiAgICAgICAgICBhd2FpdCB0aGlzLmVzY2FsYXRlRXBpc29kZShlcGlzb2RlLCBgU3VwZXJ2aXNvciB1bmF2YWlsYWJsZTogJHtzdXBlcnZpc29ySWR9LCBubyBiYWNrdXAgYXZhaWxhYmxlYCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBoYW5kbGluZyBzdXBlcnZpc29yIHVuYXZhaWxhYmlsaXR5OicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFc2NhbGF0ZSBlcGlzb2RlIHRvIGhpZ2hlciBjYXJlIGxldmVsIG9yIGJhY2t1cCBzdXBlcnZpc29yc1xyXG4gICAqL1xyXG4gIGFzeW5jIGVzY2FsYXRlRXBpc29kZShlcGlzb2RlOiBFcGlzb2RlLCByZWFzb246IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcnVsZSA9IHRoaXMuZ2V0RXNjYWxhdGlvblJ1bGUoZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zb2xlLmxvZyhgRXNjYWxhdGluZyBlcGlzb2RlICR7ZXBpc29kZS5lcGlzb2RlSWR9OiAke3JlYXNvbn1gKTtcclxuXHJcbiAgICAgIC8vIFRyeSBiYWNrdXAgc3VwZXJ2aXNvcnMgZmlyc3RcclxuICAgICAgY29uc3QgYXZhaWxhYmxlQmFja3VwID0gYXdhaXQgdGhpcy5maW5kQXZhaWxhYmxlQmFja3VwU3VwZXJ2aXNvcihydWxlLmJhY2t1cFN1cGVydmlzb3JzKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChhdmFpbGFibGVCYWNrdXApIHtcclxuICAgICAgICAvLyBSZWFzc2lnbiB0byBiYWNrdXAgc3VwZXJ2aXNvclxyXG4gICAgICAgIGF3YWl0IHRoaXMucmVhc3NpZ25FcGlzb2RlKGVwaXNvZGUuZXBpc29kZUlkLCBhdmFpbGFibGVCYWNrdXApO1xyXG4gICAgICAgIGF3YWl0IHRoaXMubm90aWZpY2F0aW9uU2VydmljZS5zZW5kRXNjYWxhdGlvbk5vdGlmaWNhdGlvbihlcGlzb2RlLCByZWFzb24sIHJ1bGUuYmFja3VwU3VwZXJ2aXNvcnMpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMubm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlTdXBlcnZpc29yKGVwaXNvZGUsIGF2YWlsYWJsZUJhY2t1cCwgdHJ1ZSk7XHJcbiAgICAgIH0gZWxzZSBpZiAocnVsZS5kZWZhdWx0VG9IaWdoZXJDYXJlTGV2ZWwpIHtcclxuICAgICAgICAvLyBEZWZhdWx0IHRvIGhpZ2hlciBjYXJlIGxldmVsXHJcbiAgICAgICAgYXdhaXQgdGhpcy5kZWZhdWx0VG9IaWdoZXJDYXJlTGV2ZWwoZXBpc29kZSwgcmVhc29uKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBLZWVwIGluIHF1ZXVlIGJ1dCBzZW5kIGVzY2FsYXRpb24gYWxlcnRcclxuICAgICAgICBhd2FpdCB0aGlzLm5vdGlmaWNhdGlvblNlcnZpY2Uuc2VuZEVzY2FsYXRpb25Ob3RpZmljYXRpb24oZXBpc29kZSwgcmVhc29uLCBydWxlLmJhY2t1cFN1cGVydmlzb3JzKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXBkYXRlIGVwaXNvZGUgd2l0aCBlc2NhbGF0aW9uIGluZm9ybWF0aW9uXHJcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRXBpc29kZVdpdGhFc2NhbGF0aW9uKGVwaXNvZGUuZXBpc29kZUlkLCByZWFzb24sIGF2YWlsYWJsZUJhY2t1cCB8fCB1bmRlZmluZWQpO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGVzY2FsYXRpbmcgZXBpc29kZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVmYXVsdCBlcGlzb2RlIHRvIGhpZ2hlciBjYXJlIGxldmVsIHdoZW4gc3VwZXJ2aXNvcnMgdW5hdmFpbGFibGVcclxuICAgKi9cclxuICBhc3luYyBkZWZhdWx0VG9IaWdoZXJDYXJlTGV2ZWwoZXBpc29kZTogRXBpc29kZSwgcmVhc29uOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBEZWZhdWx0aW5nIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH0gdG8gaGlnaGVyIGNhcmUgbGV2ZWw6ICR7cmVhc29ufWApO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGF1dG9tYXRpYyBhcHByb3ZhbCB3aXRoIGVzY2FsYXRpb24gbm90ZVxyXG4gICAgICBjb25zdCBhdXRvbWF0aWNWYWxpZGF0aW9uOiBIdW1hblZhbGlkYXRpb24gPSB7XHJcbiAgICAgICAgc3VwZXJ2aXNvcklkOiAnc3lzdGVtLWVzY2FsYXRpb24nLFxyXG4gICAgICAgIGFwcHJvdmVkOiB0cnVlLFxyXG4gICAgICAgIG92ZXJyaWRlUmVhc29uOiBgQXV0b21hdGljIGFwcHJvdmFsIGR1ZSB0byBlc2NhbGF0aW9uOiAke3JlYXNvbn1gLFxyXG4gICAgICAgIG5vdGVzOiAnRGVmYXVsdGVkIHRvIGhpZ2hlciBjYXJlIGxldmVsIGR1ZSB0byBzdXBlcnZpc29yIHVuYXZhaWxhYmlsaXR5JyxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBlcGlzb2RlIHdpdGggYXV0b21hdGljIHZhbGlkYXRpb25cclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVFcGlzb2RlV2l0aFZhbGlkYXRpb24oZXBpc29kZS5lcGlzb2RlSWQsIGF1dG9tYXRpY1ZhbGlkYXRpb24pO1xyXG5cclxuICAgICAgLy8gVXBkYXRlIHN0YXR1cyB0byBlc2NhbGF0ZWRcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVFcGlzb2RlU3RhdHVzKGVwaXNvZGUuZXBpc29kZUlkLCBFcGlzb2RlU3RhdHVzLkVTQ0FMQVRFRCk7XHJcblxyXG4gICAgICAvLyBTZW5kIG5vdGlmaWNhdGlvbiBhYm91dCBhdXRvbWF0aWMgZXNjYWxhdGlvblxyXG4gICAgICBhd2FpdCB0aGlzLm5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5Q2FyZUNvb3JkaW5hdG9yKGVwaXNvZGUsIGF1dG9tYXRpY1ZhbGlkYXRpb24pO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlZmF1bHRpbmcgdG8gaGlnaGVyIGNhcmUgbGV2ZWw6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBlc2NhbGF0aW9uIHJ1bGUgZm9yIHVyZ2VuY3kgbGV2ZWxcclxuICAgKi9cclxuICBwcml2YXRlIGdldEVzY2FsYXRpb25SdWxlKHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsKTogRXNjYWxhdGlvblJ1bGUge1xyXG4gICAgcmV0dXJuIHRoaXMuZXNjYWxhdGlvblJ1bGVzLmZpbmQocnVsZSA9PiBydWxlLnVyZ2VuY3lMZXZlbCA9PT0gdXJnZW5jeUxldmVsKSB8fCBcclxuICAgICAgICAgICB0aGlzLmVzY2FsYXRpb25SdWxlc1t0aGlzLmVzY2FsYXRpb25SdWxlcy5sZW5ndGggLSAxXTsgLy8gRGVmYXVsdCB0byBsYXN0IHJ1bGVcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBlcGlzb2RlcyB0aGF0IGFyZSBvdmVyZHVlIGZvciB2YWxpZGF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRPdmVyZHVlRXBpc29kZXModXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwsIG1heFdhaXRNaW51dGVzOiBudW1iZXIpOiBQcm9taXNlPEVwaXNvZGVbXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdGhyZXNob2xkVGltZSA9IG5ldyBEYXRlKERhdGUubm93KCkgLSBtYXhXYWl0TWludXRlcyAqIDYwICogMTAwMCk7XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnVmFsaWRhdGlvblN0YXR1c0luZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndmFsaWRhdGlvblN0YXR1cyA9IDpzdGF0dXMnLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICd1cmdlbmN5TGV2ZWwgPSA6dXJnZW5jeSBBTkQgcXVldWVkQXQgPCA6dGhyZXNob2xkJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnN0YXR1cyc6ICdwZW5kaW5nJyxcclxuICAgICAgICAgICc6dXJnZW5jeSc6IHVyZ2VuY3lMZXZlbCxcclxuICAgICAgICAgICc6dGhyZXNob2xkJzogdGhyZXNob2xkVGltZS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbXMgYXMgRXBpc29kZVtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBvdmVyZHVlIGVwaXNvZGVzOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGVwaXNvZGVzIGFzc2lnbmVkIHRvIGEgc3BlY2lmaWMgc3VwZXJ2aXNvclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2V0RXBpc29kZXNBc3NpZ25lZFRvU3VwZXJ2aXNvcihzdXBlcnZpc29ySWQ6IHN0cmluZyk6IFByb21pc2U8RXBpc29kZVtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnVmFsaWRhdGlvblN0YXR1c0luZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndmFsaWRhdGlvblN0YXR1cyA9IDpzdGF0dXMnLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICdhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvcicsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdGF0dXMnOiAncGVuZGluZycsXHJcbiAgICAgICAgICAnOnN1cGVydmlzb3InOiBzdXBlcnZpc29ySWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtcyBhcyBFcGlzb2RlW107XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGVwaXNvZGVzIGFzc2lnbmVkIHRvIHN1cGVydmlzb3I6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGaW5kIGF2YWlsYWJsZSBiYWNrdXAgc3VwZXJ2aXNvclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZmluZEF2YWlsYWJsZUJhY2t1cFN1cGVydmlzb3IoYmFja3VwU3VwZXJ2aXNvcnM6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XHJcbiAgICAvLyBJbiBhIGZ1bGwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQgY2hlY2sgc3VwZXJ2aXNvciBhdmFpbGFiaWxpdHlcclxuICAgIC8vIEZvciBub3csIHJldHVybiB0aGUgZmlyc3QgYmFja3VwIHN1cGVydmlzb3JcclxuICAgIHJldHVybiBiYWNrdXBTdXBlcnZpc29ycy5sZW5ndGggPiAwID8gYmFja3VwU3VwZXJ2aXNvcnNbMF0gOiBudWxsO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVhc3NpZ24gZXBpc29kZSB0byBkaWZmZXJlbnQgc3VwZXJ2aXNvclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcmVhc3NpZ25FcGlzb2RlKGVwaXNvZGVJZDogc3RyaW5nLCBuZXdTdXBlcnZpc29ySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvciwgcmVhc3NpZ25lZEF0ID0gOnRpbWVzdGFtcCwgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdXBlcnZpc29yJzogbmV3U3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgJzp0aW1lc3RhbXAnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRXBpc29kZSAke2VwaXNvZGVJZH0gcmVhc3NpZ25lZCB0byBzdXBlcnZpc29yICR7bmV3U3VwZXJ2aXNvcklkfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVhc3NpZ25pbmcgZXBpc29kZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGVwaXNvZGUgd2l0aCB2YWxpZGF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVFcGlzb2RlV2l0aFZhbGlkYXRpb24oZXBpc29kZUlkOiBzdHJpbmcsIHZhbGlkYXRpb246IEh1bWFuVmFsaWRhdGlvbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCB0cmlhZ2UuaHVtYW5WYWxpZGF0aW9uID0gOnZhbGlkYXRpb24sIHZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnZhbGlkYXRpb24nOiB2YWxpZGF0aW9uLFxyXG4gICAgICAgICAgJzpzdGF0dXMnOiAnY29tcGxldGVkJyxcclxuICAgICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBlcGlzb2RlIHdpdGggdmFsaWRhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGVwaXNvZGUgc3RhdHVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVFcGlzb2RlU3RhdHVzKGVwaXNvZGVJZDogc3RyaW5nLCBzdGF0dXM6IEVwaXNvZGVTdGF0dXMpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IGVwaXNvZGVJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgI3N0YXR1cyA9IDpzdGF0dXMsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdGF0dXMnOiBzdGF0dXMsXHJcbiAgICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZXBpc29kZSBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBlcGlzb2RlIHdpdGggZXNjYWxhdGlvbiBpbmZvcm1hdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlRXBpc29kZVdpdGhFc2NhbGF0aW9uKGVwaXNvZGVJZDogc3RyaW5nLCByZWFzb246IHN0cmluZywgbmV3U3VwZXJ2aXNvcklkPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBlc2NhbGF0aW9uSW5mbyA9IHtcclxuICAgICAgICByZWFzb24sXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgbmV3U3VwZXJ2aXNvcklkXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGVzY2FsYXRpb25JbmZvID0gOmVzY2FsYXRpb24sIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZXNjYWxhdGlvbic6IGVzY2FsYXRpb25JbmZvLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGVwaXNvZGUgd2l0aCBlc2NhbGF0aW9uOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgZXBpc29kZSB3aXRoIG92ZXJyaWRlIHRyYWNraW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVFcGlzb2RlV2l0aE92ZXJyaWRlKGVwaXNvZGVJZDogc3RyaW5nLCB2YWxpZGF0aW9uOiBIdW1hblZhbGlkYXRpb24pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG92ZXJyaWRlSW5mbyA9IHtcclxuICAgICAgICBzdXBlcnZpc29ySWQ6IHZhbGlkYXRpb24uc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgIHJlYXNvbjogdmFsaWRhdGlvbi5vdmVycmlkZVJlYXNvbixcclxuICAgICAgICB0aW1lc3RhbXA6IHZhbGlkYXRpb24udGltZXN0YW1wLFxyXG4gICAgICAgIGFwcHJvdmVkOiB2YWxpZGF0aW9uLmFwcHJvdmVkXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIG92ZXJyaWRlSW5mbyA9IDpvdmVycmlkZSwgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpvdmVycmlkZSc6IG92ZXJyaWRlSW5mbyxcclxuICAgICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBlcGlzb2RlIHdpdGggb3ZlcnJpZGU6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBvdmVycmlkZSBkZWNpc2lvbiBmb3IgYXVkaXQgdHJhaWxcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGxvZ092ZXJyaWRlRGVjaXNpb24oZXBpc29kZTogRXBpc29kZSwgdmFsaWRhdGlvbjogSHVtYW5WYWxpZGF0aW9uKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zb2xlLmxvZygnU3VwZXJ2aXNvciBvdmVycmlkZSBkZWNpc2lvbjonLCB7XHJcbiAgICAgIGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQsXHJcbiAgICAgIHN1cGVydmlzb3JJZDogdmFsaWRhdGlvbi5zdXBlcnZpc29ySWQsXHJcbiAgICAgIGFwcHJvdmVkOiB2YWxpZGF0aW9uLmFwcHJvdmVkLFxyXG4gICAgICBvdmVycmlkZVJlYXNvbjogdmFsaWRhdGlvbi5vdmVycmlkZVJlYXNvbixcclxuICAgICAgb3JpZ2luYWxVcmdlbmN5OiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsLFxyXG4gICAgICB0aW1lc3RhbXA6IHZhbGlkYXRpb24udGltZXN0YW1wXHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=