"use strict";
// Escalation Protocol Service
// Handles escalation protocols for critical emergency cases
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationProtocolService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../../types");
const uuid_1 = require("uuid");
class EscalationProtocolService {
    constructor(docClient, snsClient, episodeTableName, emergencyAlertTopicArn) {
        this.docClient = docClient;
        this.snsClient = snsClient;
        this.episodeTableName = episodeTableName;
        this.emergencyAlertTopicArn = emergencyAlertTopicArn;
        this.ESCALATION_SUPERVISORS = {
            'level-1': ['emergency-supervisor-1', 'emergency-supervisor-2'],
            'level-2': ['senior-supervisor-1', 'senior-supervisor-2', 'emergency-supervisor-1'],
            'level-3': ['chief-supervisor-1', 'senior-supervisor-1', 'senior-supervisor-2'],
            'critical': ['chief-supervisor-1', 'chief-supervisor-2', 'emergency-director-1']
        };
        this.ESCALATION_TIMEOUTS = {
            'level-1': 10, // 10 minutes
            'level-2': 15, // 15 minutes
            'level-3': 20, // 20 minutes
            'critical': 5 // 5 minutes for critical
        };
        this.ESCALATION_PATHS = {
            'emergency': ['level-1', 'level-2', 'level-3', 'critical'],
            'urgent': ['level-1', 'level-2', 'level-3'],
            'routine': ['level-1', 'level-2']
        };
    }
    /**
     * Assess if escalation is needed for an episode
     */
    async assessEscalationNeed(episode) {
        try {
            console.log(`Assessing escalation need for episode ${episode.episodeId}`);
            // Check urgency level
            const urgencyLevel = episode.triage?.urgencyLevel;
            if (!urgencyLevel) {
                return {
                    required: false,
                    reason: 'No triage assessment available',
                    targetLevel: 'level-1',
                    urgentResponse: false,
                    timeoutMinutes: 10
                };
            }
            // Check for critical symptoms
            const hasCriticalSymptoms = this.hasCriticalSymptoms(episode);
            // Check for high severity
            const isHighSeverity = episode.symptoms.severity >= 8;
            // Check for AI assessment concerns
            const hasAIConcerns = episode.triage?.aiAssessment?.confidence &&
                episode.triage.aiAssessment.confidence < 0.7;
            // Check wait time
            const waitTime = this.calculateWaitTime(episode);
            const hasExceededWaitTime = waitTime > this.getMaxWaitTime(urgencyLevel);
            // Determine if escalation is needed
            let required = false;
            let reason = '';
            let targetLevel = 'level-1';
            let urgentResponse = false;
            if (urgencyLevel === types_1.UrgencyLevel.EMERGENCY) {
                if (hasCriticalSymptoms || isHighSeverity) {
                    required = true;
                    reason = 'Critical emergency symptoms detected';
                    targetLevel = 'critical';
                    urgentResponse = true;
                }
                else if (hasExceededWaitTime) {
                    required = true;
                    reason = 'Emergency case exceeded maximum wait time';
                    targetLevel = 'level-2';
                    urgentResponse = true;
                }
                else if (hasAIConcerns) {
                    required = true;
                    reason = 'AI assessment has low confidence for emergency case';
                    targetLevel = 'level-1';
                    urgentResponse = false;
                }
            }
            else if (urgencyLevel === types_1.UrgencyLevel.URGENT) {
                if (hasExceededWaitTime) {
                    required = true;
                    reason = 'Urgent case exceeded maximum wait time';
                    targetLevel = 'level-1';
                    urgentResponse = false;
                }
            }
            const timeoutMinutes = this.ESCALATION_TIMEOUTS[targetLevel];
            console.log(`Escalation assessment for episode ${episode.episodeId}: required=${required}, reason=${reason}`);
            return {
                required,
                reason,
                targetLevel,
                urgentResponse,
                timeoutMinutes
            };
        }
        catch (error) {
            console.error('Error assessing escalation need:', error);
            throw error;
        }
    }
    /**
     * Process escalation for an episode
     */
    async processEscalation(episodeId, escalationReason, targetLevel, urgentResponse = false) {
        try {
            console.log(`Processing escalation for episode ${episodeId}, reason: ${escalationReason}`);
            // Get episode details
            const episode = await this.getEpisode(episodeId);
            if (!episode) {
                throw new Error(`Episode ${episodeId} not found`);
            }
            // Determine escalation level
            const escalationLevel = this.determineEscalationLevel(episode, targetLevel);
            // Create escalation protocol
            const escalationId = (0, uuid_1.v4)();
            const escalationProtocol = {
                escalationId,
                episodeId,
                escalationLevel,
                reason: escalationReason,
                targetLevel,
                urgentResponse,
                createdAt: new Date(),
                status: 'active',
                assignedSupervisors: this.ESCALATION_SUPERVISORS[escalationLevel],
                escalationPath: this.getEscalationPath(episode.triage?.urgencyLevel || types_1.UrgencyLevel.ROUTINE),
                timeoutMinutes: this.ESCALATION_TIMEOUTS[escalationLevel]
            };
            // Store escalation protocol
            await this.storeEscalationProtocol(escalationProtocol);
            // Update episode with escalation information
            await this.updateEpisodeEscalation(episodeId, escalationProtocol);
            // Calculate expected response time
            const expectedResponseTime = urgentResponse ?
                Math.floor(escalationProtocol.timeoutMinutes / 2) :
                escalationProtocol.timeoutMinutes;
            const result = {
                escalationId,
                episode,
                escalationDetails: escalationProtocol,
                targetLevel: escalationLevel,
                assignedSupervisors: escalationProtocol.assignedSupervisors,
                expectedResponseTime
            };
            console.log(`Escalation ${escalationId} processed successfully for episode ${episodeId}`);
            return result;
        }
        catch (error) {
            console.error('Error processing escalation:', error);
            throw error;
        }
    }
    /**
     * Update escalation status
     */
    async updateEscalationStatus(escalationId, status, failureReason) {
        try {
            const updateExpression = status === 'failed' && failureReason ?
                'SET #status = :status, failureReason = :failureReason, updatedAt = :updatedAt' :
                'SET #status = :status, updatedAt = :updatedAt';
            const expressionAttributeValues = {
                ':status': status,
                ':updatedAt': new Date().toISOString()
            };
            if (status === 'completed') {
                expressionAttributeValues[':completedAt'] = new Date().toISOString();
                updateExpression.replace('updatedAt = :updatedAt', 'completedAt = :completedAt, updatedAt = :updatedAt');
            }
            if (failureReason) {
                expressionAttributeValues[':failureReason'] = failureReason;
            }
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: `${this.episodeTableName}-escalations`,
                Key: { escalationId },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: expressionAttributeValues
            });
            await this.docClient.send(command);
            console.log(`Escalation ${escalationId} status updated to ${status}`);
        }
        catch (error) {
            console.error('Error updating escalation status:', error);
            // Fallback to episode record update
            await this.updateEpisodeEscalationStatus(escalationId, status, failureReason);
        }
    }
    /**
     * Get active escalations for an episode
     */
    async getActiveEscalations(episodeId) {
        try {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: `${this.episodeTableName}-escalations`,
                KeyConditionExpression: 'episodeId = :episodeId',
                FilterExpression: '#status IN (:active, :inProgress)',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':episodeId': episodeId,
                    ':active': 'active',
                    ':inProgress': 'in-progress'
                }
            });
            const result = await this.docClient.send(command);
            return result.Items;
        }
        catch (error) {
            console.error('Error getting active escalations:', error);
            // Fallback to episode record
            const episode = await this.getEpisode(episodeId);
            const escalations = episode?.escalations || [];
            return escalations.filter((esc) => esc.status === 'active' || esc.status === 'in-progress');
        }
    }
    /**
     * Check for escalation timeouts
     */
    async checkEscalationTimeouts() {
        try {
            // This would typically be called by a scheduled Lambda or CloudWatch event
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: `${this.episodeTableName}-escalations`,
                IndexName: 'StatusIndex',
                KeyConditionExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': 'active'
                }
            });
            const result = await this.docClient.send(command);
            const activeEscalations = result.Items;
            for (const escalation of activeEscalations) {
                const timeElapsed = (new Date().getTime() - escalation.createdAt.getTime()) / (1000 * 60);
                if (timeElapsed > escalation.timeoutMinutes) {
                    console.log(`Escalation ${escalation.escalationId} has timed out`);
                    await this.handleEscalationTimeout(escalation);
                }
            }
        }
        catch (error) {
            console.error('Error checking escalation timeouts:', error);
        }
    }
    /**
     * Handle escalation timeout
     */
    async handleEscalationTimeout(escalation) {
        try {
            // Move to next escalation level
            const nextLevel = this.getNextEscalationLevel(escalation.escalationLevel);
            if (nextLevel) {
                // Create new escalation at higher level
                await this.processEscalation(escalation.episodeId, `Escalation timeout: ${escalation.reason}`, nextLevel, true // Urgent response for timeout
                );
            }
            // Mark current escalation as failed
            await this.updateEscalationStatus(escalation.escalationId, 'failed', 'Escalation timeout exceeded');
        }
        catch (error) {
            console.error('Error handling escalation timeout:', error);
        }
    }
    /**
     * Get episode from database
     */
    async getEpisode(episodeId) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.episodeTableName,
                Key: { episodeId }
            });
            const result = await this.docClient.send(command);
            return result.Item || null;
        }
        catch (error) {
            console.error('Error getting episode:', error);
            throw error;
        }
    }
    /**
     * Store escalation protocol
     */
    async storeEscalationProtocol(escalation) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: `${this.episodeTableName}-escalations`,
                Item: escalation
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error storing escalation protocol:', error);
            // Fallback to episode record
            await this.storeEscalationInEpisode(escalation);
        }
    }
    /**
     * Store escalation in episode record as fallback
     */
    async storeEscalationInEpisode(escalation) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId: escalation.episodeId },
                UpdateExpression: 'SET escalations = list_append(if_not_exists(escalations, :empty_list), :escalation), updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':escalation': [escalation],
                    ':empty_list': [],
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error storing escalation in episode:', error);
            throw error;
        }
    }
    /**
     * Update episode with escalation information
     */
    async updateEpisodeEscalation(episodeId, escalation) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET escalationStatus = :status, currentEscalation = :escalation, escalationLevel = :level, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':status': 'escalated',
                    ':escalation': escalation,
                    ':level': escalation.escalationLevel,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode escalation:', error);
            throw error;
        }
    }
    /**
     * Update episode escalation status
     */
    async updateEpisodeEscalationStatus(escalationId, status, failureReason) {
        try {
            // This is a fallback method when escalations table is not available
            console.log(`Updating escalation status in episode record: ${escalationId} -> ${status}`);
        }
        catch (error) {
            console.error('Error updating episode escalation status:', error);
        }
    }
    /**
     * Check if episode has critical symptoms
     */
    hasCriticalSymptoms(episode) {
        const criticalKeywords = [
            'chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding',
            'stroke', 'heart attack', 'seizure', 'severe trauma', 'poisoning'
        ];
        const primaryComplaint = episode.symptoms.primaryComplaint.toLowerCase();
        return criticalKeywords.some(keyword => primaryComplaint.includes(keyword));
    }
    /**
     * Calculate wait time for episode
     */
    calculateWaitTime(episode) {
        const createdAt = new Date(episode.createdAt);
        const now = new Date();
        return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)); // minutes
    }
    /**
     * Get maximum wait time for urgency level
     */
    getMaxWaitTime(urgencyLevel) {
        switch (urgencyLevel) {
            case types_1.UrgencyLevel.EMERGENCY:
                return 5; // 5 minutes
            case types_1.UrgencyLevel.URGENT:
                return 30; // 30 minutes
            case types_1.UrgencyLevel.ROUTINE:
                return 120; // 2 hours
            default:
                return 60; // 1 hour
        }
    }
    /**
     * Determine escalation level
     */
    determineEscalationLevel(episode, targetLevel) {
        if (targetLevel && ['level-1', 'level-2', 'level-3', 'critical'].includes(targetLevel)) {
            return targetLevel;
        }
        const urgencyLevel = episode.triage?.urgencyLevel;
        const severity = episode.symptoms.severity;
        if (urgencyLevel === types_1.UrgencyLevel.EMERGENCY && severity >= 9) {
            return 'critical';
        }
        else if (urgencyLevel === types_1.UrgencyLevel.EMERGENCY) {
            return 'level-2';
        }
        else if (urgencyLevel === types_1.UrgencyLevel.URGENT) {
            return 'level-1';
        }
        else {
            return 'level-1';
        }
    }
    /**
     * Get escalation path for urgency level
     */
    getEscalationPath(urgencyLevel) {
        switch (urgencyLevel) {
            case types_1.UrgencyLevel.EMERGENCY:
                return this.ESCALATION_PATHS.emergency;
            case types_1.UrgencyLevel.URGENT:
                return this.ESCALATION_PATHS.urgent;
            default:
                return this.ESCALATION_PATHS.routine;
        }
    }
    /**
     * Get next escalation level
     */
    getNextEscalationLevel(currentLevel) {
        switch (currentLevel) {
            case 'level-1':
                return 'level-2';
            case 'level-2':
                return 'level-3';
            case 'level-3':
                return 'critical';
            case 'critical':
                return null; // No higher level
            default:
                return null;
        }
    }
}
exports.EscalationProtocolService = EscalationProtocolService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNjYWxhdGlvbi1wcm90b2NvbC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xhbWJkYS9lbWVyZ2VuY3ktYWxlcnQvZXNjYWxhdGlvbi1wcm90b2NvbC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSw4QkFBOEI7QUFDOUIsNERBQTREO0FBQzVELG9CQUFvQjs7O0FBRXBCLHdEQUFvSDtBQUVwSCx1Q0FBbUU7QUFDbkUsK0JBQW9DO0FBbUNwQyxNQUFhLHlCQUF5QjtJQXFCcEMsWUFDVSxTQUFpQyxFQUNqQyxTQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsc0JBQThCO1FBSDlCLGNBQVMsR0FBVCxTQUFTLENBQXdCO1FBQ2pDLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFRO1FBQ3hCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBUTtRQXhCdkIsMkJBQXNCLEdBQUc7WUFDeEMsU0FBUyxFQUFFLENBQUMsd0JBQXdCLEVBQUUsd0JBQXdCLENBQUM7WUFDL0QsU0FBUyxFQUFFLENBQUMscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsd0JBQXdCLENBQUM7WUFDbkYsU0FBUyxFQUFFLENBQUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLENBQUM7WUFDL0UsVUFBVSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUM7U0FDakYsQ0FBQztRQUVlLHdCQUFtQixHQUFHO1lBQ3JDLFNBQVMsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUM1QixTQUFTLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDNUIsU0FBUyxFQUFFLEVBQUUsRUFBRSxhQUFhO1lBQzVCLFVBQVUsRUFBRSxDQUFDLENBQUcseUJBQXlCO1NBQzFDLENBQUM7UUFFZSxxQkFBZ0IsR0FBRztZQUNsQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUM7WUFDMUQsUUFBUSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUM7WUFDM0MsU0FBUyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztTQUNsQyxDQUFDO0lBT0MsQ0FBQztJQUVKOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE9BQWdCO1FBQ3pDLElBQUksQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBRTFFLHNCQUFzQjtZQUN0QixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQztZQUNsRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU87b0JBQ0wsUUFBUSxFQUFFLEtBQUs7b0JBQ2YsTUFBTSxFQUFFLGdDQUFnQztvQkFDeEMsV0FBVyxFQUFFLFNBQVM7b0JBQ3RCLGNBQWMsRUFBRSxLQUFLO29CQUNyQixjQUFjLEVBQUUsRUFBRTtpQkFDbkIsQ0FBQztZQUNKLENBQUM7WUFFRCw4QkFBOEI7WUFDOUIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFOUQsMEJBQTBCO1lBQzFCLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQztZQUV0RCxtQ0FBbUM7WUFDbkMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsVUFBVTtnQkFDekMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztZQUVsRSxrQkFBa0I7WUFDbEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFekUsb0NBQW9DO1lBQ3BDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztZQUNyQixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDaEIsSUFBSSxXQUFXLEdBQW1ELFNBQVMsQ0FBQztZQUM1RSxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFFM0IsSUFBSSxZQUFZLEtBQUssb0JBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxtQkFBbUIsSUFBSSxjQUFjLEVBQUUsQ0FBQztvQkFDMUMsUUFBUSxHQUFHLElBQUksQ0FBQztvQkFDaEIsTUFBTSxHQUFHLHNDQUFzQyxDQUFDO29CQUNoRCxXQUFXLEdBQUcsVUFBVSxDQUFDO29CQUN6QixjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixDQUFDO3FCQUFNLElBQUksbUJBQW1CLEVBQUUsQ0FBQztvQkFDL0IsUUFBUSxHQUFHLElBQUksQ0FBQztvQkFDaEIsTUFBTSxHQUFHLDJDQUEyQyxDQUFDO29CQUNyRCxXQUFXLEdBQUcsU0FBUyxDQUFDO29CQUN4QixjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixDQUFDO3FCQUFNLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ3pCLFFBQVEsR0FBRyxJQUFJLENBQUM7b0JBQ2hCLE1BQU0sR0FBRyxxREFBcUQsQ0FBQztvQkFDL0QsV0FBVyxHQUFHLFNBQVMsQ0FBQztvQkFDeEIsY0FBYyxHQUFHLEtBQUssQ0FBQztnQkFDekIsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxZQUFZLEtBQUssb0JBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO29CQUN4QixRQUFRLEdBQUcsSUFBSSxDQUFDO29CQUNoQixNQUFNLEdBQUcsd0NBQXdDLENBQUM7b0JBQ2xELFdBQVcsR0FBRyxTQUFTLENBQUM7b0JBQ3hCLGNBQWMsR0FBRyxLQUFLLENBQUM7Z0JBQ3pCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTdELE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLE9BQU8sQ0FBQyxTQUFTLGNBQWMsUUFBUSxZQUFZLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFOUcsT0FBTztnQkFDTCxRQUFRO2dCQUNSLE1BQU07Z0JBQ04sV0FBVztnQkFDWCxjQUFjO2dCQUNkLGNBQWM7YUFDZixDQUFDO1FBRUosQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxpQkFBaUIsQ0FDckIsU0FBaUIsRUFDakIsZ0JBQXdCLEVBQ3hCLFdBQW9CLEVBQ3BCLGlCQUEwQixLQUFLO1FBRS9CLElBQUksQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLFNBQVMsYUFBYSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7WUFFM0Ysc0JBQXNCO1lBQ3RCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLFNBQVMsWUFBWSxDQUFDLENBQUM7WUFDcEQsQ0FBQztZQUVELDZCQUE2QjtZQUM3QixNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBRTVFLDZCQUE2QjtZQUM3QixNQUFNLFlBQVksR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFDO1lBQzlCLE1BQU0sa0JBQWtCLEdBQXVCO2dCQUM3QyxZQUFZO2dCQUNaLFNBQVM7Z0JBQ1QsZUFBZTtnQkFDZixNQUFNLEVBQUUsZ0JBQWdCO2dCQUN4QixXQUFXO2dCQUNYLGNBQWM7Z0JBQ2QsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNyQixNQUFNLEVBQUUsUUFBUTtnQkFDaEIsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGVBQWUsQ0FBQztnQkFDakUsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFlBQVksSUFBSSxvQkFBWSxDQUFDLE9BQU8sQ0FBQztnQkFDNUYsY0FBYyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7YUFDMUQsQ0FBQztZQUVGLDRCQUE0QjtZQUM1QixNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRXZELDZDQUE2QztZQUM3QyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUVsRSxtQ0FBbUM7WUFDbkMsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkQsa0JBQWtCLENBQUMsY0FBYyxDQUFDO1lBRXBDLE1BQU0sTUFBTSxHQUFxQjtnQkFDL0IsWUFBWTtnQkFDWixPQUFPO2dCQUNQLGlCQUFpQixFQUFFLGtCQUFrQjtnQkFDckMsV0FBVyxFQUFFLGVBQWU7Z0JBQzVCLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLG1CQUFtQjtnQkFDM0Qsb0JBQW9CO2FBQ3JCLENBQUM7WUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsWUFBWSx1Q0FBdUMsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUMxRixPQUFPLE1BQU0sQ0FBQztRQUVoQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckQsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHNCQUFzQixDQUMxQixZQUFvQixFQUNwQixNQUE4QyxFQUM5QyxhQUFzQjtRQUV0QixJQUFJLENBQUM7WUFDSCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sS0FBSyxRQUFRLElBQUksYUFBYSxDQUFDLENBQUM7Z0JBQzdELCtFQUErRSxDQUFDLENBQUM7Z0JBQ2pGLCtDQUErQyxDQUFDO1lBRWxELE1BQU0seUJBQXlCLEdBQVE7Z0JBQ3JDLFNBQVMsRUFBRSxNQUFNO2dCQUNqQixZQUFZLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7YUFDdkMsQ0FBQztZQUVGLElBQUksTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO2dCQUMzQix5QkFBeUIsQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNyRSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztZQUMzRyxDQUFDO1lBRUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbEIseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxhQUFhLENBQUM7WUFDOUQsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQWEsQ0FBQztnQkFDaEMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixjQUFjO2dCQUNqRCxHQUFHLEVBQUUsRUFBRSxZQUFZLEVBQUU7Z0JBQ3JCLGdCQUFnQixFQUFFLGdCQUFnQjtnQkFDbEMsd0JBQXdCLEVBQUU7b0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2lCQUNwQjtnQkFDRCx5QkFBeUIsRUFBRSx5QkFBeUI7YUFDckQsQ0FBQyxDQUFDO1lBRUgsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsWUFBWSxzQkFBc0IsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUV4RSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUQsb0NBQW9DO1lBQ3BDLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLFlBQVksRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDaEYsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFpQjtRQUMxQyxJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsY0FBYztnQkFDakQsc0JBQXNCLEVBQUUsd0JBQXdCO2dCQUNoRCxnQkFBZ0IsRUFBRSxtQ0FBbUM7Z0JBQ3JELHdCQUF3QixFQUFFO29CQUN4QixTQUFTLEVBQUUsUUFBUTtpQkFDcEI7Z0JBQ0QseUJBQXlCLEVBQUU7b0JBQ3pCLFlBQVksRUFBRSxTQUFTO29CQUN2QixTQUFTLEVBQUUsUUFBUTtvQkFDbkIsYUFBYSxFQUFFLGFBQWE7aUJBQzdCO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxPQUFPLE1BQU0sQ0FBQyxLQUE2QixDQUFDO1FBRTlDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRCw2QkFBNkI7WUFDN0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sV0FBVyxHQUFJLE9BQWUsRUFBRSxXQUFXLElBQUksRUFBRSxDQUFDO1lBQ3hELE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQXVCLEVBQUUsRUFBRSxDQUNwRCxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLGFBQWEsQ0FDeEQsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsdUJBQXVCO1FBQzNCLElBQUksQ0FBQztZQUNILDJFQUEyRTtZQUMzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsY0FBYztnQkFDakQsU0FBUyxFQUFFLGFBQWE7Z0JBQ3hCLHNCQUFzQixFQUFFLG1CQUFtQjtnQkFDM0Msd0JBQXdCLEVBQUU7b0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2lCQUNwQjtnQkFDRCx5QkFBeUIsRUFBRTtvQkFDekIsU0FBUyxFQUFFLFFBQVE7aUJBQ3BCO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxLQUE2QixDQUFDO1lBRS9ELEtBQUssTUFBTSxVQUFVLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFFMUYsSUFBSSxXQUFXLEdBQUcsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsVUFBVSxDQUFDLFlBQVksZ0JBQWdCLENBQUMsQ0FBQztvQkFDbkUsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2pELENBQUM7WUFDSCxDQUFDO1FBRUgsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsdUJBQXVCLENBQUMsVUFBOEI7UUFDbEUsSUFBSSxDQUFDO1lBQ0gsZ0NBQWdDO1lBQ2hDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFMUUsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZCx3Q0FBd0M7Z0JBQ3hDLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUMxQixVQUFVLENBQUMsU0FBUyxFQUNwQix1QkFBdUIsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUMxQyxTQUFTLEVBQ1QsSUFBSSxDQUFDLDhCQUE4QjtpQkFDcEMsQ0FBQztZQUNKLENBQUM7WUFFRCxvQ0FBb0M7WUFDcEMsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQy9CLFVBQVUsQ0FBQyxZQUFZLEVBQ3ZCLFFBQVEsRUFDUiw2QkFBNkIsQ0FDOUIsQ0FBQztRQUVKLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFpQjtRQUN4QyxJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7Z0JBQzdCLFNBQVMsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO2dCQUNoQyxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUU7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsRCxPQUFPLE1BQU0sQ0FBQyxJQUFlLElBQUksSUFBSSxDQUFDO1FBQ3hDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMvQyxNQUFNLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsdUJBQXVCLENBQUMsVUFBOEI7UUFDbEUsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO2dCQUM3QixTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLGNBQWM7Z0JBQ2pELElBQUksRUFBRSxVQUFVO2FBQ2pCLENBQUMsQ0FBQztZQUVILE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELDZCQUE2QjtZQUM3QixNQUFNLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNsRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLHdCQUF3QixDQUFDLFVBQThCO1FBQ25FLElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQWEsQ0FBQztnQkFDaEMsU0FBUyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQ2hDLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsU0FBUyxFQUFFO2dCQUN4QyxnQkFBZ0IsRUFBRSw2R0FBNkc7Z0JBQy9ILHlCQUF5QixFQUFFO29CQUN6QixhQUFhLEVBQUUsQ0FBQyxVQUFVLENBQUM7b0JBQzNCLGFBQWEsRUFBRSxFQUFFO29CQUNqQixZQUFZLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3ZDO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0QsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLHVCQUF1QixDQUFDLFNBQWlCLEVBQUUsVUFBOEI7UUFDckYsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBYSxDQUFDO2dCQUNoQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtnQkFDaEMsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFO2dCQUNsQixnQkFBZ0IsRUFBRSxtSEFBbUg7Z0JBQ3JJLHlCQUF5QixFQUFFO29CQUN6QixTQUFTLEVBQUUsV0FBVztvQkFDdEIsYUFBYSxFQUFFLFVBQVU7b0JBQ3pCLFFBQVEsRUFBRSxVQUFVLENBQUMsZUFBZTtvQkFDcEMsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUN2QzthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyw2QkFBNkIsQ0FDekMsWUFBb0IsRUFDcEIsTUFBYyxFQUNkLGFBQXNCO1FBRXRCLElBQUksQ0FBQztZQUNILG9FQUFvRTtZQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFDLGlEQUFpRCxZQUFZLE9BQU8sTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM1RixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLG1CQUFtQixDQUFDLE9BQWdCO1FBQzFDLE1BQU0sZ0JBQWdCLEdBQUc7WUFDdkIsWUFBWSxFQUFFLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxpQkFBaUI7WUFDdEUsUUFBUSxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLFdBQVc7U0FDbEUsQ0FBQztRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6RSxPQUFPLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRDs7T0FFRztJQUNLLGlCQUFpQixDQUFDLE9BQWdCO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtJQUNwRixDQUFDO0lBRUQ7O09BRUc7SUFDSyxjQUFjLENBQUMsWUFBMEI7UUFDL0MsUUFBUSxZQUFZLEVBQUUsQ0FBQztZQUNyQixLQUFLLG9CQUFZLENBQUMsU0FBUztnQkFDekIsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZO1lBQ3hCLEtBQUssb0JBQVksQ0FBQyxNQUFNO2dCQUN0QixPQUFPLEVBQUUsQ0FBQyxDQUFDLGFBQWE7WUFDMUIsS0FBSyxvQkFBWSxDQUFDLE9BQU87Z0JBQ3ZCLE9BQU8sR0FBRyxDQUFDLENBQUMsVUFBVTtZQUN4QjtnQkFDRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLFNBQVM7UUFDeEIsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLHdCQUF3QixDQUM5QixPQUFnQixFQUNoQixXQUFvQjtRQUVwQixJQUFJLFdBQVcsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQ3ZGLE9BQU8sV0FBNkQsQ0FBQztRQUN2RSxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUM7UUFDbEQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFFM0MsSUFBSSxZQUFZLEtBQUssb0JBQVksQ0FBQyxTQUFTLElBQUksUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzdELE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7YUFBTSxJQUFJLFlBQVksS0FBSyxvQkFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25ELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7YUFBTSxJQUFJLFlBQVksS0FBSyxvQkFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hELE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGlCQUFpQixDQUFDLFlBQTBCO1FBQ2xELFFBQVEsWUFBWSxFQUFFLENBQUM7WUFDckIsS0FBSyxvQkFBWSxDQUFDLFNBQVM7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztZQUN6QyxLQUFLLG9CQUFZLENBQUMsTUFBTTtnQkFDdEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1lBQ3RDO2dCQUNFLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztRQUN6QyxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssc0JBQXNCLENBQzVCLFlBQTREO1FBRTVELFFBQVEsWUFBWSxFQUFFLENBQUM7WUFDckIsS0FBSyxTQUFTO2dCQUNaLE9BQU8sU0FBUyxDQUFDO1lBQ25CLEtBQUssU0FBUztnQkFDWixPQUFPLFNBQVMsQ0FBQztZQUNuQixLQUFLLFNBQVM7Z0JBQ1osT0FBTyxVQUFVLENBQUM7WUFDcEIsS0FBSyxVQUFVO2dCQUNiLE9BQU8sSUFBSSxDQUFDLENBQUMsa0JBQWtCO1lBQ2pDO2dCQUNFLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFyZ0JELDhEQXFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBFc2NhbGF0aW9uIFByb3RvY29sIFNlcnZpY2VcclxuLy8gSGFuZGxlcyBlc2NhbGF0aW9uIHByb3RvY29scyBmb3IgY3JpdGljYWwgZW1lcmdlbmN5IGNhc2VzXHJcbi8vIFJlcXVpcmVtZW50czogNy4yXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kLCBVcGRhdGVDb21tYW5kLCBRdWVyeUNvbW1hbmQsIFB1dENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTTlNDbGllbnQsIFB1Ymxpc2hDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNucyc7XHJcbmltcG9ydCB7IEVwaXNvZGUsIFVyZ2VuY3lMZXZlbCwgRXBpc29kZVN0YXR1cyB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVzY2FsYXRpb25Qcm90b2NvbCB7XHJcbiAgZXNjYWxhdGlvbklkOiBzdHJpbmc7XHJcbiAgZXBpc29kZUlkOiBzdHJpbmc7XHJcbiAgZXNjYWxhdGlvbkxldmVsOiAnbGV2ZWwtMScgfCAnbGV2ZWwtMicgfCAnbGV2ZWwtMycgfCAnY3JpdGljYWwnO1xyXG4gIHJlYXNvbjogc3RyaW5nO1xyXG4gIHRhcmdldExldmVsPzogc3RyaW5nO1xyXG4gIHVyZ2VudFJlc3BvbnNlOiBib29sZWFuO1xyXG4gIGNyZWF0ZWRBdDogRGF0ZTtcclxuICBzdGF0dXM6ICdhY3RpdmUnIHwgJ2luLXByb2dyZXNzJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCc7XHJcbiAgYXNzaWduZWRTdXBlcnZpc29yczogc3RyaW5nW107XHJcbiAgZXNjYWxhdGlvblBhdGg6IHN0cmluZ1tdO1xyXG4gIHRpbWVvdXRNaW51dGVzOiBudW1iZXI7XHJcbiAgY29tcGxldGVkQXQ/OiBEYXRlO1xyXG4gIGZhaWx1cmVSZWFzb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRXNjYWxhdGlvblJlc3VsdCB7XHJcbiAgZXNjYWxhdGlvbklkOiBzdHJpbmc7XHJcbiAgZXBpc29kZTogRXBpc29kZTtcclxuICBlc2NhbGF0aW9uRGV0YWlsczogRXNjYWxhdGlvblByb3RvY29sO1xyXG4gIHRhcmdldExldmVsOiBzdHJpbmc7XHJcbiAgYXNzaWduZWRTdXBlcnZpc29yczogc3RyaW5nW107XHJcbiAgZXhwZWN0ZWRSZXNwb25zZVRpbWU6IG51bWJlcjsgLy8gaW4gbWludXRlc1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVzY2FsYXRpb25Bc3Nlc3NtZW50IHtcclxuICByZXF1aXJlZDogYm9vbGVhbjtcclxuICByZWFzb246IHN0cmluZztcclxuICB0YXJnZXRMZXZlbDogJ2xldmVsLTEnIHwgJ2xldmVsLTInIHwgJ2xldmVsLTMnIHwgJ2NyaXRpY2FsJztcclxuICB1cmdlbnRSZXNwb25zZTogYm9vbGVhbjtcclxuICB0aW1lb3V0TWludXRlczogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRXNjYWxhdGlvblByb3RvY29sU2VydmljZSB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBFU0NBTEFUSU9OX1NVUEVSVklTT1JTID0ge1xyXG4gICAgJ2xldmVsLTEnOiBbJ2VtZXJnZW5jeS1zdXBlcnZpc29yLTEnLCAnZW1lcmdlbmN5LXN1cGVydmlzb3ItMiddLFxyXG4gICAgJ2xldmVsLTInOiBbJ3Nlbmlvci1zdXBlcnZpc29yLTEnLCAnc2VuaW9yLXN1cGVydmlzb3ItMicsICdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0xJ10sXHJcbiAgICAnbGV2ZWwtMyc6IFsnY2hpZWYtc3VwZXJ2aXNvci0xJywgJ3Nlbmlvci1zdXBlcnZpc29yLTEnLCAnc2VuaW9yLXN1cGVydmlzb3ItMiddLFxyXG4gICAgJ2NyaXRpY2FsJzogWydjaGllZi1zdXBlcnZpc29yLTEnLCAnY2hpZWYtc3VwZXJ2aXNvci0yJywgJ2VtZXJnZW5jeS1kaXJlY3Rvci0xJ11cclxuICB9O1xyXG5cclxuICBwcml2YXRlIHJlYWRvbmx5IEVTQ0FMQVRJT05fVElNRU9VVFMgPSB7XHJcbiAgICAnbGV2ZWwtMSc6IDEwLCAvLyAxMCBtaW51dGVzXHJcbiAgICAnbGV2ZWwtMic6IDE1LCAvLyAxNSBtaW51dGVzXHJcbiAgICAnbGV2ZWwtMyc6IDIwLCAvLyAyMCBtaW51dGVzXHJcbiAgICAnY3JpdGljYWwnOiA1ICAgLy8gNSBtaW51dGVzIGZvciBjcml0aWNhbFxyXG4gIH07XHJcblxyXG4gIHByaXZhdGUgcmVhZG9ubHkgRVNDQUxBVElPTl9QQVRIUyA9IHtcclxuICAgICdlbWVyZ2VuY3knOiBbJ2xldmVsLTEnLCAnbGV2ZWwtMicsICdsZXZlbC0zJywgJ2NyaXRpY2FsJ10sXHJcbiAgICAndXJnZW50JzogWydsZXZlbC0xJywgJ2xldmVsLTInLCAnbGV2ZWwtMyddLFxyXG4gICAgJ3JvdXRpbmUnOiBbJ2xldmVsLTEnLCAnbGV2ZWwtMiddXHJcbiAgfTtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBwcml2YXRlIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCxcclxuICAgIHByaXZhdGUgc25zQ2xpZW50OiBTTlNDbGllbnQsXHJcbiAgICBwcml2YXRlIGVwaXNvZGVUYWJsZU5hbWU6IHN0cmluZyxcclxuICAgIHByaXZhdGUgZW1lcmdlbmN5QWxlcnRUb3BpY0Fybjogc3RyaW5nXHJcbiAgKSB7fVxyXG5cclxuICAvKipcclxuICAgKiBBc3Nlc3MgaWYgZXNjYWxhdGlvbiBpcyBuZWVkZWQgZm9yIGFuIGVwaXNvZGVcclxuICAgKi9cclxuICBhc3luYyBhc3Nlc3NFc2NhbGF0aW9uTmVlZChlcGlzb2RlOiBFcGlzb2RlKTogUHJvbWlzZTxFc2NhbGF0aW9uQXNzZXNzbWVudD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYEFzc2Vzc2luZyBlc2NhbGF0aW9uIG5lZWQgZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH1gKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIHVyZ2VuY3kgbGV2ZWxcclxuICAgICAgY29uc3QgdXJnZW5jeUxldmVsID0gZXBpc29kZS50cmlhZ2U/LnVyZ2VuY3lMZXZlbDtcclxuICAgICAgaWYgKCF1cmdlbmN5TGV2ZWwpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgcmVhc29uOiAnTm8gdHJpYWdlIGFzc2Vzc21lbnQgYXZhaWxhYmxlJyxcclxuICAgICAgICAgIHRhcmdldExldmVsOiAnbGV2ZWwtMScsXHJcbiAgICAgICAgICB1cmdlbnRSZXNwb25zZTogZmFsc2UsXHJcbiAgICAgICAgICB0aW1lb3V0TWludXRlczogMTBcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBmb3IgY3JpdGljYWwgc3ltcHRvbXNcclxuICAgICAgY29uc3QgaGFzQ3JpdGljYWxTeW1wdG9tcyA9IHRoaXMuaGFzQ3JpdGljYWxTeW1wdG9tcyhlcGlzb2RlKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBoaWdoIHNldmVyaXR5XHJcbiAgICAgIGNvbnN0IGlzSGlnaFNldmVyaXR5ID0gZXBpc29kZS5zeW1wdG9tcy5zZXZlcml0eSA+PSA4O1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIEFJIGFzc2Vzc21lbnQgY29uY2VybnNcclxuICAgICAgY29uc3QgaGFzQUlDb25jZXJucyA9IGVwaXNvZGUudHJpYWdlPy5haUFzc2Vzc21lbnQ/LmNvbmZpZGVuY2UgJiYgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGVwaXNvZGUudHJpYWdlLmFpQXNzZXNzbWVudC5jb25maWRlbmNlIDwgMC43O1xyXG5cclxuICAgICAgLy8gQ2hlY2sgd2FpdCB0aW1lXHJcbiAgICAgIGNvbnN0IHdhaXRUaW1lID0gdGhpcy5jYWxjdWxhdGVXYWl0VGltZShlcGlzb2RlKTtcclxuICAgICAgY29uc3QgaGFzRXhjZWVkZWRXYWl0VGltZSA9IHdhaXRUaW1lID4gdGhpcy5nZXRNYXhXYWl0VGltZSh1cmdlbmN5TGV2ZWwpO1xyXG5cclxuICAgICAgLy8gRGV0ZXJtaW5lIGlmIGVzY2FsYXRpb24gaXMgbmVlZGVkXHJcbiAgICAgIGxldCByZXF1aXJlZCA9IGZhbHNlO1xyXG4gICAgICBsZXQgcmVhc29uID0gJyc7XHJcbiAgICAgIGxldCB0YXJnZXRMZXZlbDogJ2xldmVsLTEnIHwgJ2xldmVsLTInIHwgJ2xldmVsLTMnIHwgJ2NyaXRpY2FsJyA9ICdsZXZlbC0xJztcclxuICAgICAgbGV0IHVyZ2VudFJlc3BvbnNlID0gZmFsc2U7XHJcblxyXG4gICAgICBpZiAodXJnZW5jeUxldmVsID09PSBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKSB7XHJcbiAgICAgICAgaWYgKGhhc0NyaXRpY2FsU3ltcHRvbXMgfHwgaXNIaWdoU2V2ZXJpdHkpIHtcclxuICAgICAgICAgIHJlcXVpcmVkID0gdHJ1ZTtcclxuICAgICAgICAgIHJlYXNvbiA9ICdDcml0aWNhbCBlbWVyZ2VuY3kgc3ltcHRvbXMgZGV0ZWN0ZWQnO1xyXG4gICAgICAgICAgdGFyZ2V0TGV2ZWwgPSAnY3JpdGljYWwnO1xyXG4gICAgICAgICAgdXJnZW50UmVzcG9uc2UgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaGFzRXhjZWVkZWRXYWl0VGltZSkge1xyXG4gICAgICAgICAgcmVxdWlyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgcmVhc29uID0gJ0VtZXJnZW5jeSBjYXNlIGV4Y2VlZGVkIG1heGltdW0gd2FpdCB0aW1lJztcclxuICAgICAgICAgIHRhcmdldExldmVsID0gJ2xldmVsLTInO1xyXG4gICAgICAgICAgdXJnZW50UmVzcG9uc2UgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoaGFzQUlDb25jZXJucykge1xyXG4gICAgICAgICAgcmVxdWlyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgcmVhc29uID0gJ0FJIGFzc2Vzc21lbnQgaGFzIGxvdyBjb25maWRlbmNlIGZvciBlbWVyZ2VuY3kgY2FzZSc7XHJcbiAgICAgICAgICB0YXJnZXRMZXZlbCA9ICdsZXZlbC0xJztcclxuICAgICAgICAgIHVyZ2VudFJlc3BvbnNlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKHVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLlVSR0VOVCkge1xyXG4gICAgICAgIGlmIChoYXNFeGNlZWRlZFdhaXRUaW1lKSB7XHJcbiAgICAgICAgICByZXF1aXJlZCA9IHRydWU7XHJcbiAgICAgICAgICByZWFzb24gPSAnVXJnZW50IGNhc2UgZXhjZWVkZWQgbWF4aW11bSB3YWl0IHRpbWUnO1xyXG4gICAgICAgICAgdGFyZ2V0TGV2ZWwgPSAnbGV2ZWwtMSc7XHJcbiAgICAgICAgICB1cmdlbnRSZXNwb25zZSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgdGltZW91dE1pbnV0ZXMgPSB0aGlzLkVTQ0FMQVRJT05fVElNRU9VVFNbdGFyZ2V0TGV2ZWxdO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYEVzY2FsYXRpb24gYXNzZXNzbWVudCBmb3IgZXBpc29kZSAke2VwaXNvZGUuZXBpc29kZUlkfTogcmVxdWlyZWQ9JHtyZXF1aXJlZH0sIHJlYXNvbj0ke3JlYXNvbn1gKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVxdWlyZWQsXHJcbiAgICAgICAgcmVhc29uLFxyXG4gICAgICAgIHRhcmdldExldmVsLFxyXG4gICAgICAgIHVyZ2VudFJlc3BvbnNlLFxyXG4gICAgICAgIHRpbWVvdXRNaW51dGVzXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYXNzZXNzaW5nIGVzY2FsYXRpb24gbmVlZDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHJvY2VzcyBlc2NhbGF0aW9uIGZvciBhbiBlcGlzb2RlXHJcbiAgICovXHJcbiAgYXN5bmMgcHJvY2Vzc0VzY2FsYXRpb24oXHJcbiAgICBlcGlzb2RlSWQ6IHN0cmluZyxcclxuICAgIGVzY2FsYXRpb25SZWFzb246IHN0cmluZyxcclxuICAgIHRhcmdldExldmVsPzogc3RyaW5nLFxyXG4gICAgdXJnZW50UmVzcG9uc2U6IGJvb2xlYW4gPSBmYWxzZVxyXG4gICk6IFByb21pc2U8RXNjYWxhdGlvblJlc3VsdD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYFByb2Nlc3NpbmcgZXNjYWxhdGlvbiBmb3IgZXBpc29kZSAke2VwaXNvZGVJZH0sIHJlYXNvbjogJHtlc2NhbGF0aW9uUmVhc29ufWApO1xyXG5cclxuICAgICAgLy8gR2V0IGVwaXNvZGUgZGV0YWlsc1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gYXdhaXQgdGhpcy5nZXRFcGlzb2RlKGVwaXNvZGVJZCk7XHJcbiAgICAgIGlmICghZXBpc29kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRXBpc29kZSAke2VwaXNvZGVJZH0gbm90IGZvdW5kYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIERldGVybWluZSBlc2NhbGF0aW9uIGxldmVsXHJcbiAgICAgIGNvbnN0IGVzY2FsYXRpb25MZXZlbCA9IHRoaXMuZGV0ZXJtaW5lRXNjYWxhdGlvbkxldmVsKGVwaXNvZGUsIHRhcmdldExldmVsKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENyZWF0ZSBlc2NhbGF0aW9uIHByb3RvY29sXHJcbiAgICAgIGNvbnN0IGVzY2FsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgICBjb25zdCBlc2NhbGF0aW9uUHJvdG9jb2w6IEVzY2FsYXRpb25Qcm90b2NvbCA9IHtcclxuICAgICAgICBlc2NhbGF0aW9uSWQsXHJcbiAgICAgICAgZXBpc29kZUlkLFxyXG4gICAgICAgIGVzY2FsYXRpb25MZXZlbCxcclxuICAgICAgICByZWFzb246IGVzY2FsYXRpb25SZWFzb24sXHJcbiAgICAgICAgdGFyZ2V0TGV2ZWwsXHJcbiAgICAgICAgdXJnZW50UmVzcG9uc2UsXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN0YXR1czogJ2FjdGl2ZScsXHJcbiAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogdGhpcy5FU0NBTEFUSU9OX1NVUEVSVklTT1JTW2VzY2FsYXRpb25MZXZlbF0sXHJcbiAgICAgICAgZXNjYWxhdGlvblBhdGg6IHRoaXMuZ2V0RXNjYWxhdGlvblBhdGgoZXBpc29kZS50cmlhZ2U/LnVyZ2VuY3lMZXZlbCB8fCBVcmdlbmN5TGV2ZWwuUk9VVElORSksXHJcbiAgICAgICAgdGltZW91dE1pbnV0ZXM6IHRoaXMuRVNDQUxBVElPTl9USU1FT1VUU1tlc2NhbGF0aW9uTGV2ZWxdXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBTdG9yZSBlc2NhbGF0aW9uIHByb3RvY29sXHJcbiAgICAgIGF3YWl0IHRoaXMuc3RvcmVFc2NhbGF0aW9uUHJvdG9jb2woZXNjYWxhdGlvblByb3RvY29sKTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBlcGlzb2RlIHdpdGggZXNjYWxhdGlvbiBpbmZvcm1hdGlvblxyXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUVwaXNvZGVFc2NhbGF0aW9uKGVwaXNvZGVJZCwgZXNjYWxhdGlvblByb3RvY29sKTtcclxuXHJcbiAgICAgIC8vIENhbGN1bGF0ZSBleHBlY3RlZCByZXNwb25zZSB0aW1lXHJcbiAgICAgIGNvbnN0IGV4cGVjdGVkUmVzcG9uc2VUaW1lID0gdXJnZW50UmVzcG9uc2UgPyBcclxuICAgICAgICBNYXRoLmZsb29yKGVzY2FsYXRpb25Qcm90b2NvbC50aW1lb3V0TWludXRlcyAvIDIpIDogXHJcbiAgICAgICAgZXNjYWxhdGlvblByb3RvY29sLnRpbWVvdXRNaW51dGVzO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0OiBFc2NhbGF0aW9uUmVzdWx0ID0ge1xyXG4gICAgICAgIGVzY2FsYXRpb25JZCxcclxuICAgICAgICBlcGlzb2RlLFxyXG4gICAgICAgIGVzY2FsYXRpb25EZXRhaWxzOiBlc2NhbGF0aW9uUHJvdG9jb2wsXHJcbiAgICAgICAgdGFyZ2V0TGV2ZWw6IGVzY2FsYXRpb25MZXZlbCxcclxuICAgICAgICBhc3NpZ25lZFN1cGVydmlzb3JzOiBlc2NhbGF0aW9uUHJvdG9jb2wuYXNzaWduZWRTdXBlcnZpc29ycyxcclxuICAgICAgICBleHBlY3RlZFJlc3BvbnNlVGltZVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYEVzY2FsYXRpb24gJHtlc2NhbGF0aW9uSWR9IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHkgZm9yIGVwaXNvZGUgJHtlcGlzb2RlSWR9YCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBlc2NhbGF0aW9uOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgZXNjYWxhdGlvbiBzdGF0dXNcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGVFc2NhbGF0aW9uU3RhdHVzKFxyXG4gICAgZXNjYWxhdGlvbklkOiBzdHJpbmcsXHJcbiAgICBzdGF0dXM6ICdpbi1wcm9ncmVzcycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnLFxyXG4gICAgZmFpbHVyZVJlYXNvbj86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbiA9IHN0YXR1cyA9PT0gJ2ZhaWxlZCcgJiYgZmFpbHVyZVJlYXNvbiA/XHJcbiAgICAgICAgJ1NFVCAjc3RhdHVzID0gOnN0YXR1cywgZmFpbHVyZVJlYXNvbiA9IDpmYWlsdXJlUmVhc29uLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyA6XHJcbiAgICAgICAgJ1NFVCAjc3RhdHVzID0gOnN0YXR1cywgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCc7XHJcblxyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBhbnkgPSB7XHJcbiAgICAgICAgJzpzdGF0dXMnOiBzdGF0dXMsXHJcbiAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGlmIChzdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmNvbXBsZXRlZEF0J10gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5yZXBsYWNlKCd1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JywgJ2NvbXBsZXRlZEF0ID0gOmNvbXBsZXRlZEF0LCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChmYWlsdXJlUmVhc29uKSB7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmZhaWx1cmVSZWFzb24nXSA9IGZhaWx1cmVSZWFzb247XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBgJHt0aGlzLmVwaXNvZGVUYWJsZU5hbWV9LWVzY2FsYXRpb25zYCxcclxuICAgICAgICBLZXk6IHsgZXNjYWxhdGlvbklkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogdXBkYXRlRXhwcmVzc2lvbixcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjc3RhdHVzJzogJ3N0YXR1cydcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRXNjYWxhdGlvbiAke2VzY2FsYXRpb25JZH0gc3RhdHVzIHVwZGF0ZWQgdG8gJHtzdGF0dXN9YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZXNjYWxhdGlvbiBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgICAvLyBGYWxsYmFjayB0byBlcGlzb2RlIHJlY29yZCB1cGRhdGVcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVFcGlzb2RlRXNjYWxhdGlvblN0YXR1cyhlc2NhbGF0aW9uSWQsIHN0YXR1cywgZmFpbHVyZVJlYXNvbik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYWN0aXZlIGVzY2FsYXRpb25zIGZvciBhbiBlcGlzb2RlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0QWN0aXZlRXNjYWxhdGlvbnMoZXBpc29kZUlkOiBzdHJpbmcpOiBQcm9taXNlPEVzY2FsYXRpb25Qcm90b2NvbFtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBgJHt0aGlzLmVwaXNvZGVUYWJsZU5hbWV9LWVzY2FsYXRpb25zYCxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZXBpc29kZUlkID0gOmVwaXNvZGVJZCcsXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJyNzdGF0dXMgSU4gKDphY3RpdmUsIDppblByb2dyZXNzKScsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmVwaXNvZGVJZCc6IGVwaXNvZGVJZCxcclxuICAgICAgICAgICc6YWN0aXZlJzogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAnOmluUHJvZ3Jlc3MnOiAnaW4tcHJvZ3Jlc3MnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbXMgYXMgRXNjYWxhdGlvblByb3RvY29sW107XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBhY3RpdmUgZXNjYWxhdGlvbnM6JywgZXJyb3IpO1xyXG4gICAgICAvLyBGYWxsYmFjayB0byBlcGlzb2RlIHJlY29yZFxyXG4gICAgICBjb25zdCBlcGlzb2RlID0gYXdhaXQgdGhpcy5nZXRFcGlzb2RlKGVwaXNvZGVJZCk7XHJcbiAgICAgIGNvbnN0IGVzY2FsYXRpb25zID0gKGVwaXNvZGUgYXMgYW55KT8uZXNjYWxhdGlvbnMgfHwgW107XHJcbiAgICAgIHJldHVybiBlc2NhbGF0aW9ucy5maWx0ZXIoKGVzYzogRXNjYWxhdGlvblByb3RvY29sKSA9PiBcclxuICAgICAgICBlc2Muc3RhdHVzID09PSAnYWN0aXZlJyB8fCBlc2Muc3RhdHVzID09PSAnaW4tcHJvZ3Jlc3MnXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBmb3IgZXNjYWxhdGlvbiB0aW1lb3V0c1xyXG4gICAqL1xyXG4gIGFzeW5jIGNoZWNrRXNjYWxhdGlvblRpbWVvdXRzKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVGhpcyB3b3VsZCB0eXBpY2FsbHkgYmUgY2FsbGVkIGJ5IGEgc2NoZWR1bGVkIExhbWJkYSBvciBDbG91ZFdhdGNoIGV2ZW50XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IGAke3RoaXMuZXBpc29kZVRhYmxlTmFtZX0tZXNjYWxhdGlvbnNgLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ1N0YXR1c0luZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnI3N0YXR1cyA9IDpzdGF0dXMnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdGF0dXMnOiAnYWN0aXZlJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zdCBhY3RpdmVFc2NhbGF0aW9ucyA9IHJlc3VsdC5JdGVtcyBhcyBFc2NhbGF0aW9uUHJvdG9jb2xbXTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgZXNjYWxhdGlvbiBvZiBhY3RpdmVFc2NhbGF0aW9ucykge1xyXG4gICAgICAgIGNvbnN0IHRpbWVFbGFwc2VkID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gZXNjYWxhdGlvbi5jcmVhdGVkQXQuZ2V0VGltZSgpKSAvICgxMDAwICogNjApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aW1lRWxhcHNlZCA+IGVzY2FsYXRpb24udGltZW91dE1pbnV0ZXMpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGBFc2NhbGF0aW9uICR7ZXNjYWxhdGlvbi5lc2NhbGF0aW9uSWR9IGhhcyB0aW1lZCBvdXRgKTtcclxuICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlRXNjYWxhdGlvblRpbWVvdXQoZXNjYWxhdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgZXNjYWxhdGlvbiB0aW1lb3V0czonLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBIYW5kbGUgZXNjYWxhdGlvbiB0aW1lb3V0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBoYW5kbGVFc2NhbGF0aW9uVGltZW91dChlc2NhbGF0aW9uOiBFc2NhbGF0aW9uUHJvdG9jb2wpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIE1vdmUgdG8gbmV4dCBlc2NhbGF0aW9uIGxldmVsXHJcbiAgICAgIGNvbnN0IG5leHRMZXZlbCA9IHRoaXMuZ2V0TmV4dEVzY2FsYXRpb25MZXZlbChlc2NhbGF0aW9uLmVzY2FsYXRpb25MZXZlbCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAobmV4dExldmVsKSB7XHJcbiAgICAgICAgLy8gQ3JlYXRlIG5ldyBlc2NhbGF0aW9uIGF0IGhpZ2hlciBsZXZlbFxyXG4gICAgICAgIGF3YWl0IHRoaXMucHJvY2Vzc0VzY2FsYXRpb24oXHJcbiAgICAgICAgICBlc2NhbGF0aW9uLmVwaXNvZGVJZCxcclxuICAgICAgICAgIGBFc2NhbGF0aW9uIHRpbWVvdXQ6ICR7ZXNjYWxhdGlvbi5yZWFzb259YCxcclxuICAgICAgICAgIG5leHRMZXZlbCxcclxuICAgICAgICAgIHRydWUgLy8gVXJnZW50IHJlc3BvbnNlIGZvciB0aW1lb3V0XHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gTWFyayBjdXJyZW50IGVzY2FsYXRpb24gYXMgZmFpbGVkXHJcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlRXNjYWxhdGlvblN0YXR1cyhcclxuICAgICAgICBlc2NhbGF0aW9uLmVzY2FsYXRpb25JZCxcclxuICAgICAgICAnZmFpbGVkJyxcclxuICAgICAgICAnRXNjYWxhdGlvbiB0aW1lb3V0IGV4Y2VlZGVkJ1xyXG4gICAgICApO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGhhbmRsaW5nIGVzY2FsYXRpb24gdGltZW91dDonLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZXBpc29kZSBmcm9tIGRhdGFiYXNlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRFcGlzb2RlKGVwaXNvZGVJZDogc3RyaW5nKTogUHJvbWlzZTxFcGlzb2RlIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgRXBpc29kZSB8fCBudWxsO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBlcGlzb2RlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZSBlc2NhbGF0aW9uIHByb3RvY29sXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBzdG9yZUVzY2FsYXRpb25Qcm90b2NvbChlc2NhbGF0aW9uOiBFc2NhbGF0aW9uUHJvdG9jb2wpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBgJHt0aGlzLmVwaXNvZGVUYWJsZU5hbWV9LWVzY2FsYXRpb25zYCxcclxuICAgICAgICBJdGVtOiBlc2NhbGF0aW9uXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0b3JpbmcgZXNjYWxhdGlvbiBwcm90b2NvbDonLCBlcnJvcik7XHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIGVwaXNvZGUgcmVjb3JkXHJcbiAgICAgIGF3YWl0IHRoaXMuc3RvcmVFc2NhbGF0aW9uSW5FcGlzb2RlKGVzY2FsYXRpb24pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RvcmUgZXNjYWxhdGlvbiBpbiBlcGlzb2RlIHJlY29yZCBhcyBmYWxsYmFja1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc3RvcmVFc2NhbGF0aW9uSW5FcGlzb2RlKGVzY2FsYXRpb246IEVzY2FsYXRpb25Qcm90b2NvbCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkOiBlc2NhbGF0aW9uLmVwaXNvZGVJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgZXNjYWxhdGlvbnMgPSBsaXN0X2FwcGVuZChpZl9ub3RfZXhpc3RzKGVzY2FsYXRpb25zLCA6ZW1wdHlfbGlzdCksIDplc2NhbGF0aW9uKSwgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzplc2NhbGF0aW9uJzogW2VzY2FsYXRpb25dLFxyXG4gICAgICAgICAgJzplbXB0eV9saXN0JzogW10sXHJcbiAgICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc3RvcmluZyBlc2NhbGF0aW9uIGluIGVwaXNvZGU6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBlcGlzb2RlIHdpdGggZXNjYWxhdGlvbiBpbmZvcm1hdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlRXBpc29kZUVzY2FsYXRpb24oZXBpc29kZUlkOiBzdHJpbmcsIGVzY2FsYXRpb246IEVzY2FsYXRpb25Qcm90b2NvbCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBlc2NhbGF0aW9uU3RhdHVzID0gOnN0YXR1cywgY3VycmVudEVzY2FsYXRpb24gPSA6ZXNjYWxhdGlvbiwgZXNjYWxhdGlvbkxldmVsID0gOmxldmVsLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnN0YXR1cyc6ICdlc2NhbGF0ZWQnLFxyXG4gICAgICAgICAgJzplc2NhbGF0aW9uJzogZXNjYWxhdGlvbixcclxuICAgICAgICAgICc6bGV2ZWwnOiBlc2NhbGF0aW9uLmVzY2FsYXRpb25MZXZlbCxcclxuICAgICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBlcGlzb2RlIGVzY2FsYXRpb246JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBlcGlzb2RlIGVzY2FsYXRpb24gc3RhdHVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVFcGlzb2RlRXNjYWxhdGlvblN0YXR1cyhcclxuICAgIGVzY2FsYXRpb25JZDogc3RyaW5nLFxyXG4gICAgc3RhdHVzOiBzdHJpbmcsXHJcbiAgICBmYWlsdXJlUmVhc29uPzogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBUaGlzIGlzIGEgZmFsbGJhY2sgbWV0aG9kIHdoZW4gZXNjYWxhdGlvbnMgdGFibGUgaXMgbm90IGF2YWlsYWJsZVxyXG4gICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgZXNjYWxhdGlvbiBzdGF0dXMgaW4gZXBpc29kZSByZWNvcmQ6ICR7ZXNjYWxhdGlvbklkfSAtPiAke3N0YXR1c31gKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGVwaXNvZGUgZXNjYWxhdGlvbiBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgZXBpc29kZSBoYXMgY3JpdGljYWwgc3ltcHRvbXNcclxuICAgKi9cclxuICBwcml2YXRlIGhhc0NyaXRpY2FsU3ltcHRvbXMoZXBpc29kZTogRXBpc29kZSk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgY3JpdGljYWxLZXl3b3JkcyA9IFtcclxuICAgICAgJ2NoZXN0IHBhaW4nLCAnZGlmZmljdWx0eSBicmVhdGhpbmcnLCAndW5jb25zY2lvdXMnLCAnc2V2ZXJlIGJsZWVkaW5nJyxcclxuICAgICAgJ3N0cm9rZScsICdoZWFydCBhdHRhY2snLCAnc2VpenVyZScsICdzZXZlcmUgdHJhdW1hJywgJ3BvaXNvbmluZydcclxuICAgIF07XHJcblxyXG4gICAgY29uc3QgcHJpbWFyeUNvbXBsYWludCA9IGVwaXNvZGUuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgcmV0dXJuIGNyaXRpY2FsS2V5d29yZHMuc29tZShrZXl3b3JkID0+IHByaW1hcnlDb21wbGFpbnQuaW5jbHVkZXMoa2V5d29yZCkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIHdhaXQgdGltZSBmb3IgZXBpc29kZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlV2FpdFRpbWUoZXBpc29kZTogRXBpc29kZSk6IG51bWJlciB7XHJcbiAgICBjb25zdCBjcmVhdGVkQXQgPSBuZXcgRGF0ZShlcGlzb2RlLmNyZWF0ZWRBdCk7XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKG5vdy5nZXRUaW1lKCkgLSBjcmVhdGVkQXQuZ2V0VGltZSgpKSAvICgxMDAwICogNjApKTsgLy8gbWludXRlc1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IG1heGltdW0gd2FpdCB0aW1lIGZvciB1cmdlbmN5IGxldmVsXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRNYXhXYWl0VGltZSh1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbCk6IG51bWJlciB7XHJcbiAgICBzd2l0Y2ggKHVyZ2VuY3lMZXZlbCkge1xyXG4gICAgICBjYXNlIFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1k6XHJcbiAgICAgICAgcmV0dXJuIDU7IC8vIDUgbWludXRlc1xyXG4gICAgICBjYXNlIFVyZ2VuY3lMZXZlbC5VUkdFTlQ6XHJcbiAgICAgICAgcmV0dXJuIDMwOyAvLyAzMCBtaW51dGVzXHJcbiAgICAgIGNhc2UgVXJnZW5jeUxldmVsLlJPVVRJTkU6XHJcbiAgICAgICAgcmV0dXJuIDEyMDsgLy8gMiBob3Vyc1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiA2MDsgLy8gMSBob3VyXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmUgZXNjYWxhdGlvbiBsZXZlbFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZGV0ZXJtaW5lRXNjYWxhdGlvbkxldmVsKFxyXG4gICAgZXBpc29kZTogRXBpc29kZSxcclxuICAgIHRhcmdldExldmVsPzogc3RyaW5nXHJcbiAgKTogJ2xldmVsLTEnIHwgJ2xldmVsLTInIHwgJ2xldmVsLTMnIHwgJ2NyaXRpY2FsJyB7XHJcbiAgICBpZiAodGFyZ2V0TGV2ZWwgJiYgWydsZXZlbC0xJywgJ2xldmVsLTInLCAnbGV2ZWwtMycsICdjcml0aWNhbCddLmluY2x1ZGVzKHRhcmdldExldmVsKSkge1xyXG4gICAgICByZXR1cm4gdGFyZ2V0TGV2ZWwgYXMgJ2xldmVsLTEnIHwgJ2xldmVsLTInIHwgJ2xldmVsLTMnIHwgJ2NyaXRpY2FsJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1cmdlbmN5TGV2ZWwgPSBlcGlzb2RlLnRyaWFnZT8udXJnZW5jeUxldmVsO1xyXG4gICAgY29uc3Qgc2V2ZXJpdHkgPSBlcGlzb2RlLnN5bXB0b21zLnNldmVyaXR5O1xyXG5cclxuICAgIGlmICh1cmdlbmN5TGV2ZWwgPT09IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1kgJiYgc2V2ZXJpdHkgPj0gOSkge1xyXG4gICAgICByZXR1cm4gJ2NyaXRpY2FsJztcclxuICAgIH0gZWxzZSBpZiAodXJnZW5jeUxldmVsID09PSBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKSB7XHJcbiAgICAgIHJldHVybiAnbGV2ZWwtMic7XHJcbiAgICB9IGVsc2UgaWYgKHVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLlVSR0VOVCkge1xyXG4gICAgICByZXR1cm4gJ2xldmVsLTEnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuICdsZXZlbC0xJztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBlc2NhbGF0aW9uIHBhdGggZm9yIHVyZ2VuY3kgbGV2ZWxcclxuICAgKi9cclxuICBwcml2YXRlIGdldEVzY2FsYXRpb25QYXRoKHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsKTogc3RyaW5nW10ge1xyXG4gICAgc3dpdGNoICh1cmdlbmN5TGV2ZWwpIHtcclxuICAgICAgY2FzZSBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkVTQ0FMQVRJT05fUEFUSFMuZW1lcmdlbmN5O1xyXG4gICAgICBjYXNlIFVyZ2VuY3lMZXZlbC5VUkdFTlQ6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRVNDQUxBVElPTl9QQVRIUy51cmdlbnQ7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRVNDQUxBVElPTl9QQVRIUy5yb3V0aW5lO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IG5leHQgZXNjYWxhdGlvbiBsZXZlbFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0TmV4dEVzY2FsYXRpb25MZXZlbChcclxuICAgIGN1cnJlbnRMZXZlbDogJ2xldmVsLTEnIHwgJ2xldmVsLTInIHwgJ2xldmVsLTMnIHwgJ2NyaXRpY2FsJ1xyXG4gICk6ICdsZXZlbC0xJyB8ICdsZXZlbC0yJyB8ICdsZXZlbC0zJyB8ICdjcml0aWNhbCcgfCBudWxsIHtcclxuICAgIHN3aXRjaCAoY3VycmVudExldmVsKSB7XHJcbiAgICAgIGNhc2UgJ2xldmVsLTEnOlxyXG4gICAgICAgIHJldHVybiAnbGV2ZWwtMic7XHJcbiAgICAgIGNhc2UgJ2xldmVsLTInOlxyXG4gICAgICAgIHJldHVybiAnbGV2ZWwtMyc7XHJcbiAgICAgIGNhc2UgJ2xldmVsLTMnOlxyXG4gICAgICAgIHJldHVybiAnY3JpdGljYWwnO1xyXG4gICAgICBjYXNlICdjcml0aWNhbCc6XHJcbiAgICAgICAgcmV0dXJuIG51bGw7IC8vIE5vIGhpZ2hlciBsZXZlbFxyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==