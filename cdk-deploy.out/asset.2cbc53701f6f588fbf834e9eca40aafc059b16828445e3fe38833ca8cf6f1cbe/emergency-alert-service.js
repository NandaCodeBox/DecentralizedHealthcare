"use strict";
// Emergency Alert Service
// Handles immediate supervisor alerting for emergency situations
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyAlertService = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const types_1 = require("../../types");
const uuid_1 = require("uuid");
class EmergencyAlertService {
    constructor(docClient, snsClient, episodeTableName, emergencyAlertTopicArn) {
        this.docClient = docClient;
        this.snsClient = snsClient;
        this.episodeTableName = episodeTableName;
        this.emergencyAlertTopicArn = emergencyAlertTopicArn;
        this.EMERGENCY_SUPERVISORS = [
            'emergency-supervisor-1',
            'emergency-supervisor-2',
            'emergency-supervisor-3'
        ];
        this.CRITICAL_RESPONSE_TIME = 2; // minutes
        this.HIGH_RESPONSE_TIME = 5; // minutes
        this.MEDIUM_RESPONSE_TIME = 10; // minutes
    }
    /**
     * Process emergency alert for an episode
     */
    async processEmergencyAlert(episodeId, alertType, severity = 'high', additionalInfo) {
        try {
            console.log(`Processing emergency alert for episode ${episodeId}, type: ${alertType}, severity: ${severity}`);
            // Get episode details
            const episode = await this.getEpisode(episodeId);
            if (!episode) {
                throw new Error(`Episode ${episodeId} not found`);
            }
            // Create emergency alert record
            const alertId = (0, uuid_1.v4)();
            const alert = {
                alertId,
                episodeId,
                alertType,
                severity,
                createdAt: new Date(),
                status: 'active',
                assignedSupervisors: this.selectEmergencySupervisors(severity),
                additionalInfo
            };
            // Store alert in database
            await this.storeEmergencyAlert(alert);
            // Update episode with emergency status
            await this.updateEpisodeEmergencyStatus(episodeId, alert);
            // Calculate estimated response time
            const estimatedResponseTime = this.calculateResponseTime(severity);
            // Send immediate notifications (count will be updated by notification service)
            const notificationsSent = alert.assignedSupervisors.length;
            const result = {
                alertId,
                episode,
                alertDetails: alert,
                notificationsSent,
                estimatedResponseTime,
                severity
            };
            console.log(`Emergency alert ${alertId} processed successfully for episode ${episodeId}`);
            return result;
        }
        catch (error) {
            console.error('Error processing emergency alert:', error);
            throw error;
        }
    }
    /**
     * Get emergency status for an episode
     */
    async getEmergencyStatus(episodeId) {
        try {
            const episode = await this.getEpisode(episodeId);
            if (!episode) {
                throw new Error(`Episode ${episodeId} not found`);
            }
            const activeAlerts = await this.getActiveAlerts(episodeId);
            const isEmergency = episode.triage?.urgencyLevel === types_1.UrgencyLevel.EMERGENCY || activeAlerts.length > 0;
            const lastAlert = activeAlerts.length > 0 ?
                activeAlerts.reduce((latest, alert) => alert.createdAt > latest.createdAt ? alert : latest) : undefined;
            const assignedSupervisors = lastAlert ? lastAlert.assignedSupervisors : [];
            const estimatedResponseTime = lastAlert ?
                this.calculateResponseTime(lastAlert.severity) : 0;
            const responseStatus = this.determineResponseStatus(activeAlerts);
            return {
                episodeId,
                isEmergency,
                activeAlerts,
                lastAlertTime: lastAlert?.createdAt,
                responseStatus,
                assignedSupervisors,
                estimatedResponseTime
            };
        }
        catch (error) {
            console.error('Error getting emergency status:', error);
            throw error;
        }
    }
    /**
     * Get emergency queue for supervisors
     */
    async getEmergencyQueue(supervisorId, limit = 20) {
        try {
            // Query for active emergency episodes
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.episodeTableName,
                IndexName: 'EmergencyStatusIndex',
                KeyConditionExpression: 'emergencyStatus = :status',
                ExpressionAttributeValues: {
                    ':status': 'active'
                },
                ScanIndexForward: false, // Most recent first
                Limit: limit * 2 // Get more to filter
            });
            const result = await this.docClient.send(command);
            const episodes = result.Items;
            // Convert to queue items and filter by supervisor if specified
            let queueItems = [];
            for (const episode of episodes) {
                const activeAlerts = await this.getActiveAlerts(episode.episodeId);
                for (const alert of activeAlerts) {
                    // Filter by supervisor if specified
                    if (supervisorId && !alert.assignedSupervisors.includes(supervisorId)) {
                        continue;
                    }
                    const waitTime = Math.floor((new Date().getTime() - alert.createdAt.getTime()) / (1000 * 60));
                    queueItems.push({
                        episodeId: episode.episodeId,
                        patientId: episode.patientId,
                        alertId: alert.alertId,
                        alertType: alert.alertType,
                        severity: alert.severity,
                        createdAt: alert.createdAt,
                        waitTime,
                        assignedSupervisors: alert.assignedSupervisors,
                        symptoms: {
                            primaryComplaint: episode.symptoms.primaryComplaint,
                            severity: episode.symptoms.severity
                        },
                        status: alert.status
                    });
                }
            }
            // Sort by severity and wait time
            queueItems.sort((a, b) => {
                const severityOrder = { 'critical': 3, 'high': 2, 'medium': 1 };
                const severityDiff = severityOrder[b.severity] -
                    severityOrder[a.severity];
                if (severityDiff !== 0)
                    return severityDiff;
                return b.waitTime - a.waitTime; // Longer wait time first
            });
            return queueItems.slice(0, limit);
        }
        catch (error) {
            console.error('Error getting emergency queue:', error);
            throw error;
        }
    }
    /**
     * Update emergency response
     */
    async updateEmergencyResponse(episodeId, supervisorId, responseAction, notes) {
        try {
            const episode = await this.getEpisode(episodeId);
            if (!episode) {
                throw new Error(`Episode ${episodeId} not found`);
            }
            const timestamp = new Date();
            const responseDetails = {
                supervisorId,
                responseAction,
                notes,
                timestamp
            };
            // Update episode with response information
            await this.updateEpisodeResponse(episodeId, responseDetails);
            // Update alert status based on response action
            if (responseAction === 'acknowledge') {
                await this.updateAlertStatus(episodeId, 'acknowledged');
            }
            else if (responseAction === 'resolve') {
                await this.updateAlertStatus(episodeId, 'resolved');
            }
            return {
                episode,
                responseDetails,
                timestamp
            };
        }
        catch (error) {
            console.error('Error updating emergency response:', error);
            throw error;
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
     * Store emergency alert in database
     */
    async storeEmergencyAlert(alert) {
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: `${this.episodeTableName}-alerts`,
                Item: alert
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error storing emergency alert:', error);
            // If alerts table doesn't exist, store in episode record
            await this.storeAlertInEpisode(alert);
        }
    }
    /**
     * Store alert in episode record as fallback
     */
    async storeAlertInEpisode(alert) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId: alert.episodeId },
                UpdateExpression: 'SET emergencyAlerts = list_append(if_not_exists(emergencyAlerts, :empty_list), :alert), updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':alert': [alert],
                    ':empty_list': [],
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error storing alert in episode:', error);
            throw error;
        }
    }
    /**
     * Update episode emergency status
     */
    async updateEpisodeEmergencyStatus(episodeId, alert) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET emergencyStatus = :status, lastEmergencyAlert = :alert, assignedEmergencySupervisors = :supervisors, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':status': 'active',
                    ':alert': alert,
                    ':supervisors': alert.assignedSupervisors,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode emergency status:', error);
            throw error;
        }
    }
    /**
     * Get active alerts for an episode
     */
    async getActiveAlerts(episodeId) {
        try {
            // Try to get from alerts table first
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: `${this.episodeTableName}-alerts`,
                KeyConditionExpression: 'episodeId = :episodeId',
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':episodeId': episodeId,
                    ':status': 'active'
                }
            });
            const result = await this.docClient.send(command);
            return result.Items;
        }
        catch (error) {
            // Fallback to episode record
            const episode = await this.getEpisode(episodeId);
            const emergencyAlerts = episode?.emergencyAlerts || [];
            return emergencyAlerts.filter((alert) => alert.status === 'active');
        }
    }
    /**
     * Update episode response information
     */
    async updateEpisodeResponse(episodeId, responseDetails) {
        try {
            const command = new lib_dynamodb_1.UpdateCommand({
                TableName: this.episodeTableName,
                Key: { episodeId },
                UpdateExpression: 'SET emergencyResponse = :response, updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':response': responseDetails,
                    ':updatedAt': new Date().toISOString()
                }
            });
            await this.docClient.send(command);
        }
        catch (error) {
            console.error('Error updating episode response:', error);
            throw error;
        }
    }
    /**
     * Update alert status
     */
    async updateAlertStatus(episodeId, status) {
        try {
            // Update in alerts table
            const activeAlerts = await this.getActiveAlerts(episodeId);
            for (const alert of activeAlerts) {
                const command = new lib_dynamodb_1.UpdateCommand({
                    TableName: `${this.episodeTableName}-alerts`,
                    Key: { alertId: alert.alertId },
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
            // Update episode emergency status if resolved
            if (status === 'resolved') {
                await this.updateEpisodeEmergencyStatus(episodeId, {
                    ...activeAlerts[0],
                    status: 'resolved'
                });
            }
        }
        catch (error) {
            console.error('Error updating alert status:', error);
            throw error;
        }
    }
    /**
     * Select emergency supervisors based on severity
     */
    selectEmergencySupervisors(severity) {
        switch (severity) {
            case 'critical':
                return this.EMERGENCY_SUPERVISORS; // All supervisors for critical
            case 'high':
                return this.EMERGENCY_SUPERVISORS.slice(0, 2); // First 2 supervisors
            case 'medium':
                return this.EMERGENCY_SUPERVISORS.slice(0, 1); // First supervisor
            default:
                return this.EMERGENCY_SUPERVISORS.slice(0, 1);
        }
    }
    /**
     * Calculate expected response time based on severity
     */
    calculateResponseTime(severity) {
        switch (severity) {
            case 'critical':
                return this.CRITICAL_RESPONSE_TIME;
            case 'high':
                return this.HIGH_RESPONSE_TIME;
            case 'medium':
                return this.MEDIUM_RESPONSE_TIME;
            default:
                return this.HIGH_RESPONSE_TIME;
        }
    }
    /**
     * Determine response status based on active alerts
     */
    determineResponseStatus(alerts) {
        if (alerts.length === 0)
            return 'resolved';
        const hasAcknowledged = alerts.some(alert => alert.status === 'acknowledged');
        const hasResolved = alerts.every(alert => alert.status === 'resolved');
        if (hasResolved)
            return 'resolved';
        if (hasAcknowledged)
            return 'acknowledged';
        return 'pending';
    }
}
exports.EmergencyAlertService = EmergencyAlertService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1lcmdlbmN5LWFsZXJ0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL2VtZXJnZW5jeS1hbGVydC9lbWVyZ2VuY3ktYWxlcnQtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMEJBQTBCO0FBQzFCLGlFQUFpRTtBQUNqRSxvQkFBb0I7OztBQUVwQix3REFBb0g7QUFFcEgsdUNBQW1FO0FBQ25FLCtCQUFvQztBQTZEcEMsTUFBYSxxQkFBcUI7SUFXaEMsWUFDVSxTQUFpQyxFQUNqQyxTQUFvQixFQUNwQixnQkFBd0IsRUFDeEIsc0JBQThCO1FBSDlCLGNBQVMsR0FBVCxTQUFTLENBQXdCO1FBQ2pDLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFRO1FBQ3hCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBUTtRQWR2QiwwQkFBcUIsR0FBRztZQUN2Qyx3QkFBd0I7WUFDeEIsd0JBQXdCO1lBQ3hCLHdCQUF3QjtTQUN6QixDQUFDO1FBRWUsMkJBQXNCLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVTtRQUN0Qyx1QkFBa0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVO1FBQ2xDLHlCQUFvQixHQUFHLEVBQUUsQ0FBQyxDQUFDLFVBQVU7SUFPbkQsQ0FBQztJQUVKOztPQUVHO0lBQ0gsS0FBSyxDQUFDLHFCQUFxQixDQUN6QixTQUFpQixFQUNqQixTQUFpQixFQUNqQixXQUEyQyxNQUFNLEVBQ2pELGNBQW9DO1FBRXBDLElBQUksQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLFNBQVMsV0FBVyxTQUFTLGVBQWUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUU5RyxzQkFBc0I7WUFDdEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxPQUFPLEVBQUUs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Y3kgQWxlcnQgU2VydmljZVxyXG4vLyBIYW5kbGVzIGltbWVkaWF0ZSBzdXBlcnZpc29yIGFsZXJ0aW5nIGZvciBlbWVyZ2VuY3kgc2l0dWF0aW9uc1xyXG4vLyBSZXF1aXJlbWVudHM6IDcuMlxyXG5cclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgR2V0Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCwgUXVlcnlDb21tYW5kLCBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBVcmdlbmN5TGV2ZWwsIEVwaXNvZGVTdGF0dXMgfSBmcm9tICcuLi8uLi90eXBlcyc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWVyZ2VuY3lBbGVydCB7XHJcbiAgYWxlcnRJZDogc3RyaW5nO1xyXG4gIGVwaXNvZGVJZDogc3RyaW5nO1xyXG4gIGFsZXJ0VHlwZTogc3RyaW5nO1xyXG4gIHNldmVyaXR5OiAnY3JpdGljYWwnIHwgJ2hpZ2gnIHwgJ21lZGl1bSc7XHJcbiAgY3JlYXRlZEF0OiBEYXRlO1xyXG4gIHN0YXR1czogJ2FjdGl2ZScgfCAnYWNrbm93bGVkZ2VkJyB8ICdyZXNvbHZlZCc7XHJcbiAgYXNzaWduZWRTdXBlcnZpc29yczogc3RyaW5nW107XHJcbiAgcmVzcG9uc2VUaW1lPzogRGF0ZTtcclxuICByZXNvbHZlZEF0PzogRGF0ZTtcclxuICBhZGRpdGlvbmFsSW5mbz86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1lcmdlbmN5QWxlcnRSZXN1bHQge1xyXG4gIGFsZXJ0SWQ6IHN0cmluZztcclxuICBlcGlzb2RlOiBFcGlzb2RlO1xyXG4gIGFsZXJ0RGV0YWlsczogRW1lcmdlbmN5QWxlcnQ7XHJcbiAgbm90aWZpY2F0aW9uc1NlbnQ6IG51bWJlcjtcclxuICBlc3RpbWF0ZWRSZXNwb25zZVRpbWU6IG51bWJlcjsgLy8gaW4gbWludXRlc1xyXG4gIHNldmVyaXR5OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW1lcmdlbmN5U3RhdHVzIHtcclxuICBlcGlzb2RlSWQ6IHN0cmluZztcclxuICBpc0VtZXJnZW5jeTogYm9vbGVhbjtcclxuICBhY3RpdmVBbGVydHM6IEVtZXJnZW5jeUFsZXJ0W107XHJcbiAgbGFzdEFsZXJ0VGltZT86IERhdGU7XHJcbiAgcmVzcG9uc2VTdGF0dXM6ICdwZW5kaW5nJyB8ICdhY2tub3dsZWRnZWQnIHwgJ3Jlc3BvbmRpbmcnIHwgJ3Jlc29sdmVkJztcclxuICBhc3NpZ25lZFN1cGVydmlzb3JzOiBzdHJpbmdbXTtcclxuICBlc3RpbWF0ZWRSZXNwb25zZVRpbWU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWVyZ2VuY3lRdWV1ZUl0ZW0ge1xyXG4gIGVwaXNvZGVJZDogc3RyaW5nO1xyXG4gIHBhdGllbnRJZDogc3RyaW5nO1xyXG4gIGFsZXJ0SWQ6IHN0cmluZztcclxuICBhbGVydFR5cGU6IHN0cmluZztcclxuICBzZXZlcml0eTogc3RyaW5nO1xyXG4gIGNyZWF0ZWRBdDogRGF0ZTtcclxuICB3YWl0VGltZTogbnVtYmVyOyAvLyBpbiBtaW51dGVzXHJcbiAgYXNzaWduZWRTdXBlcnZpc29yczogc3RyaW5nW107XHJcbiAgc3ltcHRvbXM6IHtcclxuICAgIHByaW1hcnlDb21wbGFpbnQ6IHN0cmluZztcclxuICAgIHNldmVyaXR5OiBudW1iZXI7XHJcbiAgfTtcclxuICBzdGF0dXM6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFbWVyZ2VuY3lSZXNwb25zZVVwZGF0ZSB7XHJcbiAgZXBpc29kZTogRXBpc29kZTtcclxuICByZXNwb25zZURldGFpbHM6IHtcclxuICAgIHN1cGVydmlzb3JJZDogc3RyaW5nO1xyXG4gICAgcmVzcG9uc2VBY3Rpb246IHN0cmluZztcclxuICAgIG5vdGVzPzogc3RyaW5nO1xyXG4gICAgdGltZXN0YW1wOiBEYXRlO1xyXG4gIH07XHJcbiAgdGltZXN0YW1wOiBEYXRlO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRW1lcmdlbmN5QWxlcnRTZXJ2aWNlIHtcclxuICBwcml2YXRlIHJlYWRvbmx5IEVNRVJHRU5DWV9TVVBFUlZJU09SUyA9IFtcclxuICAgICdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0xJyxcclxuICAgICdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0yJyxcclxuICAgICdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0zJ1xyXG4gIF07XHJcblxyXG4gIHByaXZhdGUgcmVhZG9ubHkgQ1JJVElDQUxfUkVTUE9OU0VfVElNRSA9IDI7IC8vIG1pbnV0ZXNcclxuICBwcml2YXRlIHJlYWRvbmx5IEhJR0hfUkVTUE9OU0VfVElNRSA9IDU7IC8vIG1pbnV0ZXNcclxuICBwcml2YXRlIHJlYWRvbmx5IE1FRElVTV9SRVNQT05TRV9USU1FID0gMTA7IC8vIG1pbnV0ZXNcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBwcml2YXRlIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCxcclxuICAgIHByaXZhdGUgc25zQ2xpZW50OiBTTlNDbGllbnQsXHJcbiAgICBwcml2YXRlIGVwaXNvZGVUYWJsZU5hbWU6IHN0cmluZyxcclxuICAgIHByaXZhdGUgZW1lcmdlbmN5QWxlcnRUb3BpY0Fybjogc3RyaW5nXHJcbiAgKSB7fVxyXG5cclxuICAvKipcclxuICAgKiBQcm9jZXNzIGVtZXJnZW5jeSBhbGVydCBmb3IgYW4gZXBpc29kZVxyXG4gICAqL1xyXG4gIGFzeW5jIHByb2Nlc3NFbWVyZ2VuY3lBbGVydChcclxuICAgIGVwaXNvZGVJZDogc3RyaW5nLFxyXG4gICAgYWxlcnRUeXBlOiBzdHJpbmcsXHJcbiAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyB8ICdoaWdoJyB8ICdtZWRpdW0nID0gJ2hpZ2gnLFxyXG4gICAgYWRkaXRpb25hbEluZm8/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XHJcbiAgKTogUHJvbWlzZTxFbWVyZ2VuY3lBbGVydFJlc3VsdD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYFByb2Nlc3NpbmcgZW1lcmdlbmN5IGFsZXJ0IGZvciBlcGlzb2RlICR7ZXBpc29kZUlkfSwgdHlwZTogJHthbGVydFR5cGV9LCBzZXZlcml0eTogJHtzZXZlcml0eX1gKTtcclxuXHJcbiAgICAgIC8vIEdldCBlcGlzb2RlIGRldGFpbHNcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGF3YWl0IHRoaXMuZ2V0RXBpc29kZShlcGlzb2RlSWQpO1xyXG4gICAgICBpZiAoIWVwaXNvZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVwaXNvZGUgJHtlcGlzb2RlSWR9IG5vdCBmb3VuZGApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDcmVhdGUgZW1lcmdlbmN5IGFsZXJ0IHJlY29yZFxyXG4gICAgICBjb25zdCBhbGVydElkID0gdXVpZHY0KCk7XHJcbiAgICAgIGNvbnN0IGFsZXJ0OiBFbWVyZ2VuY3lBbGVydCA9IHtcclxuICAgICAgICBhbGVydElkLFxyXG4gICAgICAgIGVwaXNvZGVJZCxcclxuICAgICAgICBhbGVydFR5cGUsXHJcbiAgICAgICAgc2V2ZXJpdHksXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN0YXR1czogJ2FjdGl2ZScsXHJcbiAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogdGhpcy5zZWxlY3RFbWVyZ2VuY3lTdXBlcnZpc29ycyhzZXZlcml0eSksXHJcbiAgICAgICAgYWRkaXRpb25hbEluZm9cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFN0b3JlIGFsZXJ0IGluIGRhdGFiYXNlXHJcbiAgICAgIGF3YWl0IHRoaXMuc3RvcmVFbWVyZ2VuY3lBbGVydChhbGVydCk7XHJcblxyXG4gICAgICAvLyBVcGRhdGUgZXBpc29kZSB3aXRoIGVtZXJnZW5jeSBzdGF0dXNcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVFcGlzb2RlRW1lcmdlbmN5U3RhdHVzKGVwaXNvZGVJZCwgYWxlcnQpO1xyXG5cclxuICAgICAgLy8gQ2FsY3VsYXRlIGVzdGltYXRlZCByZXNwb25zZSB0aW1lXHJcbiAgICAgIGNvbnN0IGVzdGltYXRlZFJlc3BvbnNlVGltZSA9IHRoaXMuY2FsY3VsYXRlUmVzcG9uc2VUaW1lKHNldmVyaXR5KTtcclxuXHJcbiAgICAgIC8vIFNlbmQgaW1tZWRpYXRlIG5vdGlmaWNhdGlvbnMgKGNvdW50IHdpbGwgYmUgdXBkYXRlZCBieSBub3RpZmljYXRpb24gc2VydmljZSlcclxuICAgICAgY29uc3Qgbm90aWZpY2F0aW9uc1NlbnQgPSBhbGVydC5hc3NpZ25lZFN1cGVydmlzb3JzLmxlbmd0aDtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdDogRW1lcmdlbmN5QWxlcnRSZXN1bHQgPSB7XHJcbiAgICAgICAgYWxlcnRJZCxcclxuICAgICAgICBlcGlzb2RlLFxyXG4gICAgICAgIGFsZXJ0RGV0YWlsczogYWxlcnQsXHJcbiAgICAgICAgbm90aWZpY2F0aW9uc1NlbnQsXHJcbiAgICAgICAgZXN0aW1hdGVkUmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIHNldmVyaXR5XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgRW1lcmdlbmN5IGFsZXJ0ICR7YWxlcnRJZH0gcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseSBmb3IgZXBpc29kZSAke2VwaXNvZGVJZH1gKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIGVtZXJnZW5jeSBhbGVydDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGVtZXJnZW5jeSBzdGF0dXMgZm9yIGFuIGVwaXNvZGVcclxuICAgKi9cclxuICBhc3luYyBnZXRFbWVyZ2VuY3lTdGF0dXMoZXBpc29kZUlkOiBzdHJpbmcpOiBQcm9taXNlPEVtZXJnZW5jeVN0YXR1cz4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGF3YWl0IHRoaXMuZ2V0RXBpc29kZShlcGlzb2RlSWQpO1xyXG4gICAgICBpZiAoIWVwaXNvZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVwaXNvZGUgJHtlcGlzb2RlSWR9IG5vdCBmb3VuZGApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBhY3RpdmVBbGVydHMgPSBhd2FpdCB0aGlzLmdldEFjdGl2ZUFsZXJ0cyhlcGlzb2RlSWQpO1xyXG4gICAgICBjb25zdCBpc0VtZXJnZW5jeSA9IGVwaXNvZGUudHJpYWdlPy51cmdlbmN5TGV2ZWwgPT09IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1kgfHwgYWN0aXZlQWxlcnRzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICBjb25zdCBsYXN0QWxlcnQgPSBhY3RpdmVBbGVydHMubGVuZ3RoID4gMCA/IFxyXG4gICAgICAgIGFjdGl2ZUFsZXJ0cy5yZWR1Y2UoKGxhdGVzdCwgYWxlcnQpID0+IFxyXG4gICAgICAgICAgYWxlcnQuY3JlYXRlZEF0ID4gbGF0ZXN0LmNyZWF0ZWRBdCA/IGFsZXJ0IDogbGF0ZXN0XHJcbiAgICAgICAgKSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgIGNvbnN0IGFzc2lnbmVkU3VwZXJ2aXNvcnMgPSBsYXN0QWxlcnQgPyBsYXN0QWxlcnQuYXNzaWduZWRTdXBlcnZpc29ycyA6IFtdO1xyXG4gICAgICBjb25zdCBlc3RpbWF0ZWRSZXNwb25zZVRpbWUgPSBsYXN0QWxlcnQgPyBcclxuICAgICAgICB0aGlzLmNhbGN1bGF0ZVJlc3BvbnNlVGltZShsYXN0QWxlcnQuc2V2ZXJpdHkpIDogMDtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlU3RhdHVzID0gdGhpcy5kZXRlcm1pbmVSZXNwb25zZVN0YXR1cyhhY3RpdmVBbGVydHMpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBlcGlzb2RlSWQsXHJcbiAgICAgICAgaXNFbWVyZ2VuY3ksXHJcbiAgICAgICAgYWN0aXZlQWxlcnRzLFxyXG4gICAgICAgIGxhc3RBbGVydFRpbWU6IGxhc3RBbGVydD8uY3JlYXRlZEF0LFxyXG4gICAgICAgIHJlc3BvbnNlU3RhdHVzLFxyXG4gICAgICAgIGFzc2lnbmVkU3VwZXJ2aXNvcnMsXHJcbiAgICAgICAgZXN0aW1hdGVkUmVzcG9uc2VUaW1lXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBlbWVyZ2VuY3kgc3RhdHVzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZW1lcmdlbmN5IHF1ZXVlIGZvciBzdXBlcnZpc29yc1xyXG4gICAqL1xyXG4gIGFzeW5jIGdldEVtZXJnZW5jeVF1ZXVlKHN1cGVydmlzb3JJZD86IHN0cmluZywgbGltaXQ6IG51bWJlciA9IDIwKTogUHJvbWlzZTxFbWVyZ2VuY3lRdWV1ZUl0ZW1bXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUXVlcnkgZm9yIGFjdGl2ZSBlbWVyZ2VuY3kgZXBpc29kZXNcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ0VtZXJnZW5jeVN0YXR1c0luZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZW1lcmdlbmN5U3RhdHVzID0gOnN0YXR1cycsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdGF0dXMnOiAnYWN0aXZlJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UsIC8vIE1vc3QgcmVjZW50IGZpcnN0XHJcbiAgICAgICAgTGltaXQ6IGxpbWl0ICogMiAvLyBHZXQgbW9yZSB0byBmaWx0ZXJcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zdCBlcGlzb2RlcyA9IHJlc3VsdC5JdGVtcyBhcyBFcGlzb2RlW107XHJcblxyXG4gICAgICAvLyBDb252ZXJ0IHRvIHF1ZXVlIGl0ZW1zIGFuZCBmaWx0ZXIgYnkgc3VwZXJ2aXNvciBpZiBzcGVjaWZpZWRcclxuICAgICAgbGV0IHF1ZXVlSXRlbXM6IEVtZXJnZW5jeVF1ZXVlSXRlbVtdID0gW107XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IGVwaXNvZGUgb2YgZXBpc29kZXMpIHtcclxuICAgICAgICBjb25zdCBhY3RpdmVBbGVydHMgPSBhd2FpdCB0aGlzLmdldEFjdGl2ZUFsZXJ0cyhlcGlzb2RlLmVwaXNvZGVJZCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChjb25zdCBhbGVydCBvZiBhY3RpdmVBbGVydHMpIHtcclxuICAgICAgICAgIC8vIEZpbHRlciBieSBzdXBlcnZpc29yIGlmIHNwZWNpZmllZFxyXG4gICAgICAgICAgaWYgKHN1cGVydmlzb3JJZCAmJiAhYWxlcnQuYXNzaWduZWRTdXBlcnZpc29ycy5pbmNsdWRlcyhzdXBlcnZpc29ySWQpKSB7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGNvbnN0IHdhaXRUaW1lID0gTWF0aC5mbG9vcigobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBhbGVydC5jcmVhdGVkQXQuZ2V0VGltZSgpKSAvICgxMDAwICogNjApKTtcclxuXHJcbiAgICAgICAgICBxdWV1ZUl0ZW1zLnB1c2goe1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICAgICAgICBhbGVydElkOiBhbGVydC5hbGVydElkLFxyXG4gICAgICAgICAgICBhbGVydFR5cGU6IGFsZXJ0LmFsZXJ0VHlwZSxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6IGFsZXJ0LnNldmVyaXR5LFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IGFsZXJ0LmNyZWF0ZWRBdCxcclxuICAgICAgICAgICAgd2FpdFRpbWUsXHJcbiAgICAgICAgICAgIGFzc2lnbmVkU3VwZXJ2aXNvcnM6IGFsZXJ0LmFzc2lnbmVkU3VwZXJ2aXNvcnMsXHJcbiAgICAgICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogZXBpc29kZS5zeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LFxyXG4gICAgICAgICAgICAgIHNldmVyaXR5OiBlcGlzb2RlLnN5bXB0b21zLnNldmVyaXR5XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXR1czogYWxlcnQuc3RhdHVzXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNvcnQgYnkgc2V2ZXJpdHkgYW5kIHdhaXQgdGltZVxyXG4gICAgICBxdWV1ZUl0ZW1zLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgICBjb25zdCBzZXZlcml0eU9yZGVyID0geyAnY3JpdGljYWwnOiAzLCAnaGlnaCc6IDIsICdtZWRpdW0nOiAxIH07XHJcbiAgICAgICAgY29uc3Qgc2V2ZXJpdHlEaWZmID0gc2V2ZXJpdHlPcmRlcltiLnNldmVyaXR5IGFzIGtleW9mIHR5cGVvZiBzZXZlcml0eU9yZGVyXSAtIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eU9yZGVyW2Euc2V2ZXJpdHkgYXMga2V5b2YgdHlwZW9mIHNldmVyaXR5T3JkZXJdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChzZXZlcml0eURpZmYgIT09IDApIHJldHVybiBzZXZlcml0eURpZmY7XHJcbiAgICAgICAgcmV0dXJuIGIud2FpdFRpbWUgLSBhLndhaXRUaW1lOyAvLyBMb25nZXIgd2FpdCB0aW1lIGZpcnN0XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHF1ZXVlSXRlbXMuc2xpY2UoMCwgbGltaXQpO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZW1lcmdlbmN5IHF1ZXVlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgZW1lcmdlbmN5IHJlc3BvbnNlXHJcbiAgICovXHJcbiAgYXN5bmMgdXBkYXRlRW1lcmdlbmN5UmVzcG9uc2UoXHJcbiAgICBlcGlzb2RlSWQ6IHN0cmluZyxcclxuICAgIHN1cGVydmlzb3JJZDogc3RyaW5nLFxyXG4gICAgcmVzcG9uc2VBY3Rpb246IHN0cmluZyxcclxuICAgIG5vdGVzPzogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxFbWVyZ2VuY3lSZXNwb25zZVVwZGF0ZT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGF3YWl0IHRoaXMuZ2V0RXBpc29kZShlcGlzb2RlSWQpO1xyXG4gICAgICBpZiAoIWVwaXNvZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVwaXNvZGUgJHtlcGlzb2RlSWR9IG5vdCBmb3VuZGApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICBjb25zdCByZXNwb25zZURldGFpbHMgPSB7XHJcbiAgICAgICAgc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgIHJlc3BvbnNlQWN0aW9uLFxyXG4gICAgICAgIG5vdGVzLFxyXG4gICAgICAgIHRpbWVzdGFtcFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gVXBkYXRlIGVwaXNvZGUgd2l0aCByZXNwb25zZSBpbmZvcm1hdGlvblxyXG4gICAgICBhd2FpdCB0aGlzLnVwZGF0ZUVwaXNvZGVSZXNwb25zZShlcGlzb2RlSWQsIHJlc3BvbnNlRGV0YWlscyk7XHJcblxyXG4gICAgICAvLyBVcGRhdGUgYWxlcnQgc3RhdHVzIGJhc2VkIG9uIHJlc3BvbnNlIGFjdGlvblxyXG4gICAgICBpZiAocmVzcG9uc2VBY3Rpb24gPT09ICdhY2tub3dsZWRnZScpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUFsZXJ0U3RhdHVzKGVwaXNvZGVJZCwgJ2Fja25vd2xlZGdlZCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlQWN0aW9uID09PSAncmVzb2x2ZScpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUFsZXJ0U3RhdHVzKGVwaXNvZGVJZCwgJ3Jlc29sdmVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgZXBpc29kZSxcclxuICAgICAgICByZXNwb25zZURldGFpbHMsXHJcbiAgICAgICAgdGltZXN0YW1wXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZW1lcmdlbmN5IHJlc3BvbnNlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZXBpc29kZSBmcm9tIGRhdGFiYXNlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRFcGlzb2RlKGVwaXNvZGVJZDogc3RyaW5nKTogUHJvbWlzZTxFcGlzb2RlIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuZXBpc29kZVRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgRXBpc29kZSB8fCBudWxsO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBlcGlzb2RlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZSBlbWVyZ2VuY3kgYWxlcnQgaW4gZGF0YWJhc2VcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHN0b3JlRW1lcmdlbmN5QWxlcnQoYWxlcnQ6IEVtZXJnZW5jeUFsZXJ0KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogYCR7dGhpcy5lcGlzb2RlVGFibGVOYW1lfS1hbGVydHNgLFxyXG4gICAgICAgIEl0ZW06IGFsZXJ0XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0b3JpbmcgZW1lcmdlbmN5IGFsZXJ0OicsIGVycm9yKTtcclxuICAgICAgLy8gSWYgYWxlcnRzIHRhYmxlIGRvZXNuJ3QgZXhpc3QsIHN0b3JlIGluIGVwaXNvZGUgcmVjb3JkXHJcbiAgICAgIGF3YWl0IHRoaXMuc3RvcmVBbGVydEluRXBpc29kZShhbGVydCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZSBhbGVydCBpbiBlcGlzb2RlIHJlY29yZCBhcyBmYWxsYmFja1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc3RvcmVBbGVydEluRXBpc29kZShhbGVydDogRW1lcmdlbmN5QWxlcnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IGVwaXNvZGVJZDogYWxlcnQuZXBpc29kZUlkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBlbWVyZ2VuY3lBbGVydHMgPSBsaXN0X2FwcGVuZChpZl9ub3RfZXhpc3RzKGVtZXJnZW5jeUFsZXJ0cywgOmVtcHR5X2xpc3QpLCA6YWxlcnQpLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmFsZXJ0JzogW2FsZXJ0XSxcclxuICAgICAgICAgICc6ZW1wdHlfbGlzdCc6IFtdLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0b3JpbmcgYWxlcnQgaW4gZXBpc29kZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGVwaXNvZGUgZW1lcmdlbmN5IHN0YXR1c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlRXBpc29kZUVtZXJnZW5jeVN0YXR1cyhlcGlzb2RlSWQ6IHN0cmluZywgYWxlcnQ6IEVtZXJnZW5jeUFsZXJ0KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy5lcGlzb2RlVGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGVtZXJnZW5jeVN0YXR1cyA9IDpzdGF0dXMsIGxhc3RFbWVyZ2VuY3lBbGVydCA9IDphbGVydCwgYXNzaWduZWRFbWVyZ2VuY3lTdXBlcnZpc29ycyA9IDpzdXBlcnZpc29ycywgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdGF0dXMnOiAnYWN0aXZlJyxcclxuICAgICAgICAgICc6YWxlcnQnOiBhbGVydCxcclxuICAgICAgICAgICc6c3VwZXJ2aXNvcnMnOiBhbGVydC5hc3NpZ25lZFN1cGVydmlzb3JzLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGVwaXNvZGUgZW1lcmdlbmN5IHN0YXR1czonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFjdGl2ZSBhbGVydHMgZm9yIGFuIGVwaXNvZGVcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGdldEFjdGl2ZUFsZXJ0cyhlcGlzb2RlSWQ6IHN0cmluZyk6IFByb21pc2U8RW1lcmdlbmN5QWxlcnRbXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGFsZXJ0cyB0YWJsZSBmaXJzdFxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBgJHt0aGlzLmVwaXNvZGVUYWJsZU5hbWV9LWFsZXJ0c2AsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2VwaXNvZGVJZCA9IDplcGlzb2RlSWQnLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjc3RhdHVzID0gOnN0YXR1cycsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmVwaXNvZGVJZCc6IGVwaXNvZGVJZCxcclxuICAgICAgICAgICc6c3RhdHVzJzogJ2FjdGl2ZSdcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtcyBhcyBFbWVyZ2VuY3lBbGVydFtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgLy8gRmFsbGJhY2sgdG8gZXBpc29kZSByZWNvcmRcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGF3YWl0IHRoaXMuZ2V0RXBpc29kZShlcGlzb2RlSWQpO1xyXG4gICAgICBjb25zdCBlbWVyZ2VuY3lBbGVydHMgPSAoZXBpc29kZSBhcyBhbnkpPy5lbWVyZ2VuY3lBbGVydHMgfHwgW107XHJcbiAgICAgIHJldHVybiBlbWVyZ2VuY3lBbGVydHMuZmlsdGVyKChhbGVydDogRW1lcmdlbmN5QWxlcnQpID0+IGFsZXJ0LnN0YXR1cyA9PT0gJ2FjdGl2ZScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGVwaXNvZGUgcmVzcG9uc2UgaW5mb3JtYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZUVwaXNvZGVSZXNwb25zZShlcGlzb2RlSWQ6IHN0cmluZywgcmVzcG9uc2VEZXRhaWxzOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLmVwaXNvZGVUYWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IGVwaXNvZGVJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgZW1lcmdlbmN5UmVzcG9uc2UgPSA6cmVzcG9uc2UsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6cmVzcG9uc2UnOiByZXNwb25zZURldGFpbHMsXHJcbiAgICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZXBpc29kZSByZXNwb25zZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGFsZXJ0IHN0YXR1c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlQWxlcnRTdGF0dXMoZXBpc29kZUlkOiBzdHJpbmcsIHN0YXR1czogJ2Fja25vd2xlZGdlZCcgfCAncmVzb2x2ZWQnKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBVcGRhdGUgaW4gYWxlcnRzIHRhYmxlXHJcbiAgICAgIGNvbnN0IGFjdGl2ZUFsZXJ0cyA9IGF3YWl0IHRoaXMuZ2V0QWN0aXZlQWxlcnRzKGVwaXNvZGVJZCk7XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IGFsZXJ0IG9mIGFjdGl2ZUFsZXJ0cykge1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IGAke3RoaXMuZXBpc29kZVRhYmxlTmFtZX0tYWxlcnRzYCxcclxuICAgICAgICAgIEtleTogeyBhbGVydElkOiBhbGVydC5hbGVydElkIH0sXHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNzdGF0dXMgPSA6c3RhdHVzLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOnN0YXR1cyc6IHN0YXR1cyxcclxuICAgICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXBkYXRlIGVwaXNvZGUgZW1lcmdlbmN5IHN0YXR1cyBpZiByZXNvbHZlZFxyXG4gICAgICBpZiAoc3RhdHVzID09PSAncmVzb2x2ZWQnKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVFcGlzb2RlRW1lcmdlbmN5U3RhdHVzKGVwaXNvZGVJZCwge1xyXG4gICAgICAgICAgLi4uYWN0aXZlQWxlcnRzWzBdLFxyXG4gICAgICAgICAgc3RhdHVzOiAncmVzb2x2ZWQnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBhbGVydCBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbGVjdCBlbWVyZ2VuY3kgc3VwZXJ2aXNvcnMgYmFzZWQgb24gc2V2ZXJpdHlcclxuICAgKi9cclxuICBwcml2YXRlIHNlbGVjdEVtZXJnZW5jeVN1cGVydmlzb3JzKHNldmVyaXR5OiAnY3JpdGljYWwnIHwgJ2hpZ2gnIHwgJ21lZGl1bScpOiBzdHJpbmdbXSB7XHJcbiAgICBzd2l0Y2ggKHNldmVyaXR5KSB7XHJcbiAgICAgIGNhc2UgJ2NyaXRpY2FsJzpcclxuICAgICAgICByZXR1cm4gdGhpcy5FTUVSR0VOQ1lfU1VQRVJWSVNPUlM7IC8vIEFsbCBzdXBlcnZpc29ycyBmb3IgY3JpdGljYWxcclxuICAgICAgY2FzZSAnaGlnaCc6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRU1FUkdFTkNZX1NVUEVSVklTT1JTLnNsaWNlKDAsIDIpOyAvLyBGaXJzdCAyIHN1cGVydmlzb3JzXHJcbiAgICAgIGNhc2UgJ21lZGl1bSc6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRU1FUkdFTkNZX1NVUEVSVklTT1JTLnNsaWNlKDAsIDEpOyAvLyBGaXJzdCBzdXBlcnZpc29yXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRU1FUkdFTkNZX1NVUEVSVklTT1JTLnNsaWNlKDAsIDEpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIGV4cGVjdGVkIHJlc3BvbnNlIHRpbWUgYmFzZWQgb24gc2V2ZXJpdHlcclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZVJlc3BvbnNlVGltZShzZXZlcml0eTogJ2NyaXRpY2FsJyB8ICdoaWdoJyB8ICdtZWRpdW0nKTogbnVtYmVyIHtcclxuICAgIHN3aXRjaCAoc2V2ZXJpdHkpIHtcclxuICAgICAgY2FzZSAnY3JpdGljYWwnOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkNSSVRJQ0FMX1JFU1BPTlNFX1RJTUU7XHJcbiAgICAgIGNhc2UgJ2hpZ2gnOlxyXG4gICAgICAgIHJldHVybiB0aGlzLkhJR0hfUkVTUE9OU0VfVElNRTtcclxuICAgICAgY2FzZSAnbWVkaXVtJzpcclxuICAgICAgICByZXR1cm4gdGhpcy5NRURJVU1fUkVTUE9OU0VfVElNRTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gdGhpcy5ISUdIX1JFU1BPTlNFX1RJTUU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmUgcmVzcG9uc2Ugc3RhdHVzIGJhc2VkIG9uIGFjdGl2ZSBhbGVydHNcclxuICAgKi9cclxuICBwcml2YXRlIGRldGVybWluZVJlc3BvbnNlU3RhdHVzKGFsZXJ0czogRW1lcmdlbmN5QWxlcnRbXSk6ICdwZW5kaW5nJyB8ICdhY2tub3dsZWRnZWQnIHwgJ3Jlc3BvbmRpbmcnIHwgJ3Jlc29sdmVkJyB7XHJcbiAgICBpZiAoYWxlcnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICdyZXNvbHZlZCc7XHJcbiAgICBcclxuICAgIGNvbnN0IGhhc0Fja25vd2xlZGdlZCA9IGFsZXJ0cy5zb21lKGFsZXJ0ID0+IGFsZXJ0LnN0YXR1cyA9PT0gJ2Fja25vd2xlZGdlZCcpO1xyXG4gICAgY29uc3QgaGFzUmVzb2x2ZWQgPSBhbGVydHMuZXZlcnkoYWxlcnQgPT4gYWxlcnQuc3RhdHVzID09PSAncmVzb2x2ZWQnKTtcclxuICAgIFxyXG4gICAgaWYgKGhhc1Jlc29sdmVkKSByZXR1cm4gJ3Jlc29sdmVkJztcclxuICAgIGlmIChoYXNBY2tub3dsZWRnZWQpIHJldHVybiAnYWNrbm93bGVkZ2VkJztcclxuICAgIFxyXG4gICAgcmV0dXJuICdwZW5kaW5nJztcclxuICB9XHJcbn0iXX0=