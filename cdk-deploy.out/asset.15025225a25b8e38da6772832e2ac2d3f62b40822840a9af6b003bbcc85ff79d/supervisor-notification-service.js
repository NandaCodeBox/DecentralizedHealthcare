"use strict";
// Supervisor Notification Service
// Handles notifications to healthcare supervisors via SNS
// Requirements: 7.1, 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisorNotificationService = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const types_1 = require("../../types");
class SupervisorNotificationService {
    constructor(snsClient, notificationTopicArn, emergencyAlertTopicArn) {
        this.snsClient = snsClient;
        this.notificationTopicArn = notificationTopicArn;
        this.emergencyAlertTopicArn = emergencyAlertTopicArn;
    }
    /**
     * Notify supervisor about validation requirement
     */
    async notifySupervisor(episode, supervisorId, isEmergency = false) {
        try {
            const message = {
                type: isEmergency ? 'emergency_alert' : 'validation_required',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                supervisorId,
                timestamp: new Date(),
                details: {
                    symptoms: {
                        primaryComplaint: episode.symptoms.primaryComplaint,
                        severity: episode.symptoms.severity,
                        duration: episode.symptoms.duration
                    },
                    triage: {
                        ruleBasedScore: episode.triage.ruleBasedScore,
                        finalScore: episode.triage.finalScore,
                        aiUsed: episode.triage.aiAssessment.used,
                        aiConfidence: episode.triage.aiAssessment.confidence,
                        aiReasoning: episode.triage.aiAssessment.reasoning
                    }
                }
            };
            const topicArn = isEmergency ? this.emergencyAlertTopicArn : this.notificationTopicArn;
            const subject = this.createNotificationSubject(message);
            const messageBody = this.createNotificationMessage(message);
            const command = new client_sns_1.PublishCommand({
                TopicArn: topicArn,
                Subject: subject,
                Message: messageBody,
                MessageAttributes: {
                    'notification_type': {
                        DataType: 'String',
                        StringValue: message.type
                    },
                    'urgency_level': {
                        DataType: 'String',
                        StringValue: episode.triage.urgencyLevel
                    },
                    'episode_id': {
                        DataType: 'String',
                        StringValue: episode.episodeId
                    },
                    'supervisor_id': {
                        DataType: 'String',
                        StringValue: supervisorId || 'unassigned'
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Notification sent to supervisor. MessageId: ${result.MessageId}`);
            // Log notification for audit trail
            this.logNotification(message, result.MessageId);
        }
        catch (error) {
            console.error('Error sending supervisor notification:', error);
            throw error;
        }
    }
    /**
     * Notify care coordinator about completed validation
     */
    async notifyCareCoordinator(episode, validation) {
        try {
            const message = {
                type: 'validation_completed',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                supervisorId: validation.supervisorId,
                timestamp: new Date(),
                details: {
                    approved: validation.approved,
                    overrideReason: validation.overrideReason,
                    notes: validation.notes,
                    validationTimestamp: validation.timestamp,
                    finalUrgencyLevel: episode.triage.urgencyLevel
                }
            };
            const subject = this.createNotificationSubject(message);
            const messageBody = this.createNotificationMessage(message);
            const command = new client_sns_1.PublishCommand({
                TopicArn: this.notificationTopicArn,
                Subject: subject,
                Message: messageBody,
                MessageAttributes: {
                    'notification_type': {
                        DataType: 'String',
                        StringValue: message.type
                    },
                    'urgency_level': {
                        DataType: 'String',
                        StringValue: episode.triage.urgencyLevel
                    },
                    'episode_id': {
                        DataType: 'String',
                        StringValue: episode.episodeId
                    },
                    'approved': {
                        DataType: 'String',
                        StringValue: validation.approved.toString()
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Care coordinator notification sent. MessageId: ${result.MessageId}`);
            this.logNotification(message, result.MessageId);
        }
        catch (error) {
            console.error('Error sending care coordinator notification:', error);
            throw error;
        }
    }
    /**
     * Send escalation notification when supervisor is unavailable
     */
    async sendEscalationNotification(episode, reason, backupSupervisors) {
        try {
            const message = {
                type: 'escalation_required',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                timestamp: new Date(),
                details: {
                    escalationReason: reason,
                    backupSupervisors,
                    originalAssignment: episode.assignedSupervisor,
                    queuedAt: episode.queuedAt,
                    waitTime: this.calculateWaitTime(episode.queuedAt)
                }
            };
            const subject = this.createNotificationSubject(message);
            const messageBody = this.createNotificationMessage(message);
            // Send to emergency alert topic for escalations
            const command = new client_sns_1.PublishCommand({
                TopicArn: this.emergencyAlertTopicArn,
                Subject: subject,
                Message: messageBody,
                MessageAttributes: {
                    'notification_type': {
                        DataType: 'String',
                        StringValue: message.type
                    },
                    'urgency_level': {
                        DataType: 'String',
                        StringValue: episode.triage.urgencyLevel
                    },
                    'episode_id': {
                        DataType: 'String',
                        StringValue: episode.episodeId
                    },
                    'escalation_reason': {
                        DataType: 'String',
                        StringValue: reason
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Escalation notification sent. MessageId: ${result.MessageId}`);
            this.logNotification(message, result.MessageId);
        }
        catch (error) {
            console.error('Error sending escalation notification:', error);
            throw error;
        }
    }
    /**
     * Send batch notifications for queue status updates
     */
    async sendQueueStatusUpdate(queueStats) {
        try {
            const message = {
                type: 'queue_status_update',
                timestamp: new Date(),
                stats: queueStats
            };
            const subject = 'Healthcare Validation Queue Status Update';
            const messageBody = JSON.stringify(message, null, 2);
            const command = new client_sns_1.PublishCommand({
                TopicArn: this.notificationTopicArn,
                Subject: subject,
                Message: messageBody,
                MessageAttributes: {
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'queue_status_update'
                    },
                    'total_pending': {
                        DataType: 'Number',
                        StringValue: queueStats.totalPending.toString()
                    },
                    'emergency_count': {
                        DataType: 'Number',
                        StringValue: queueStats.emergencyCount.toString()
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Queue status update sent. MessageId: ${result.MessageId}`);
        }
        catch (error) {
            console.error('Error sending queue status update:', error);
            throw error;
        }
    }
    /**
     * Create notification subject line
     */
    createNotificationSubject(message) {
        const urgencyPrefix = message.urgencyLevel === types_1.UrgencyLevel.EMERGENCY ? '[EMERGENCY] ' :
            message.urgencyLevel === types_1.UrgencyLevel.URGENT ? '[URGENT] ' : '';
        switch (message.type) {
            case 'validation_required':
                return `${urgencyPrefix}Healthcare Validation Required - Episode ${message.episodeId}`;
            case 'emergency_alert':
                return `[EMERGENCY ALERT] Immediate Validation Required - Episode ${message.episodeId}`;
            case 'validation_completed':
                return `Validation Completed - Episode ${message.episodeId}`;
            case 'escalation_required':
                return `${urgencyPrefix}Validation Escalation Required - Episode ${message.episodeId}`;
            default:
                return `Healthcare Notification - Episode ${message.episodeId}`;
        }
    }
    /**
     * Create notification message body
     */
    createNotificationMessage(message) {
        const baseInfo = `
Episode ID: ${message.episodeId}
Patient ID: ${message.patientId}
Urgency Level: ${message.urgencyLevel}
Timestamp: ${message.timestamp.toISOString()}
${message.supervisorId ? `Assigned Supervisor: ${message.supervisorId}` : ''}
`;
        switch (message.type) {
            case 'validation_required':
                return `${baseInfo}
Primary Complaint: ${message.details.symptoms.primaryComplaint}
Symptom Severity: ${message.details.symptoms.severity}/10
Duration: ${message.details.symptoms.duration}

Triage Assessment:
- Rule-based Score: ${message.details.triage.ruleBasedScore}
- Final Score: ${message.details.triage.finalScore}
- AI Assessment Used: ${message.details.triage.aiUsed ? 'Yes' : 'No'}
${message.details.triage.aiUsed ? `- AI Confidence: ${message.details.triage.aiConfidence}` : ''}
${message.details.triage.aiReasoning ? `- AI Reasoning: ${message.details.triage.aiReasoning}` : ''}

Please review and validate this triage assessment.
`;
            case 'emergency_alert':
                return `${baseInfo}
🚨 EMERGENCY SITUATION DETECTED 🚨

Primary Complaint: ${message.details.symptoms.primaryComplaint}
Symptom Severity: ${message.details.symptoms.severity}/10
Duration: ${message.details.symptoms.duration}

IMMEDIATE VALIDATION REQUIRED
This case requires urgent supervisor attention.
`;
            case 'validation_completed':
                return `${baseInfo}
Validation Decision: ${message.details.approved ? 'APPROVED' : 'NOT APPROVED'}
Supervisor: ${message.supervisorId}
Validation Time: ${message.details.validationTimestamp}

${message.details.overrideReason ? `Override Reason: ${message.details.overrideReason}` : ''}
${message.details.notes ? `Notes: ${message.details.notes}` : ''}

The episode is now ready for care coordination.
`;
            case 'escalation_required':
                return `${baseInfo}
Escalation Reason: ${message.details.escalationReason}
Original Assignment: ${message.details.originalAssignment || 'Unassigned'}
Wait Time: ${message.details.waitTime} minutes
Backup Supervisors: ${message.details.backupSupervisors.join(', ')}

This case requires immediate attention due to supervisor unavailability.
`;
            default:
                return `${baseInfo}\n${JSON.stringify(message.details, null, 2)}`;
        }
    }
    /**
     * Calculate wait time in minutes
     */
    calculateWaitTime(queuedAt) {
        const queueTime = new Date(queuedAt);
        const now = new Date();
        return Math.floor((now.getTime() - queueTime.getTime()) / (1000 * 60));
    }
    /**
     * Log notification for audit trail
     */
    logNotification(message, messageId) {
        console.log('Notification sent:', {
            messageId,
            type: message.type,
            episodeId: message.episodeId,
            urgencyLevel: message.urgencyLevel,
            supervisorId: message.supervisorId,
            timestamp: message.timestamp
        });
    }
}
exports.SupervisorNotificationService = SupervisorNotificationService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwZXJ2aXNvci1ub3RpZmljYXRpb24tc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9sYW1iZGEvaHVtYW4tdmFsaWRhdGlvbi9zdXBlcnZpc29yLW5vdGlmaWNhdGlvbi1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsMERBQTBEO0FBQzFELHlCQUF5Qjs7O0FBRXpCLG9EQUFnRTtBQUNoRSx1Q0FBcUU7QUFZckUsTUFBYSw2QkFBNkI7SUFDeEMsWUFDVSxTQUFvQixFQUNwQixvQkFBNEIsRUFDNUIsc0JBQThCO1FBRjlCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFRO1FBQzVCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBUTtJQUNyQyxDQUFDO0lBRUo7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBZ0IsRUFBRSxZQUFxQixFQUFFLGNBQXVCLEtBQUs7UUFDMUYsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQXdCO2dCQUNuQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMscUJBQXFCO2dCQUM3RCxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7Z0JBQzVCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztnQkFDNUIsWUFBWSxFQUFFLE9BQU8sQ0FBQyxNQUFPLENBQUMsWUFBWTtnQkFDMUMsWUFBWTtnQkFDWixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRTtvQkFDUCxRQUFRLEVBQUU7d0JBQ1IsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0I7d0JBQ25ELFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVE7d0JBQ25DLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVE7cUJBQ3BD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O3NCQUNmLE9BQU8sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzs7O0NBR2pFLENBQUM7WUFFSTtnQkFDRSxPQUFPLEdBQUcsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUN0RSxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCLENBQUMsUUFBZ0I7UUFDeEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlLENBQUMsT0FBNEIsRUFBRSxTQUFrQjtRQUN0RSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFO1lBQ2hDLFNBQVM7WUFDVCxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1lBQzVCLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtZQUNsQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7WUFDbEMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1NBQzdCLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhXRCxzRUFnV0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBTdXBlcnZpc29yIE5vdGlmaWNhdGlvbiBTZXJ2aWNlXHJcbi8vIEhhbmRsZXMgbm90aWZpY2F0aW9ucyB0byBoZWFsdGhjYXJlIHN1cGVydmlzb3JzIHZpYSBTTlNcclxuLy8gUmVxdWlyZW1lbnRzOiA3LjEsIDcuMlxyXG5cclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBIdW1hblZhbGlkYXRpb24sIFVyZ2VuY3lMZXZlbCB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTm90aWZpY2F0aW9uTWVzc2FnZSB7XHJcbiAgdHlwZTogJ3ZhbGlkYXRpb25fcmVxdWlyZWQnIHwgJ2VtZXJnZW5jeV9hbGVydCcgfCAndmFsaWRhdGlvbl9jb21wbGV0ZWQnIHwgJ2VzY2FsYXRpb25fcmVxdWlyZWQnO1xyXG4gIGVwaXNvZGVJZDogc3RyaW5nO1xyXG4gIHBhdGllbnRJZDogc3RyaW5nO1xyXG4gIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsO1xyXG4gIHN1cGVydmlzb3JJZD86IHN0cmluZztcclxuICB0aW1lc3RhbXA6IERhdGU7XHJcbiAgZGV0YWlsczogUmVjb3JkPHN0cmluZywgYW55PjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN1cGVydmlzb3JOb3RpZmljYXRpb25TZXJ2aWNlIHtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByaXZhdGUgc25zQ2xpZW50OiBTTlNDbGllbnQsXHJcbiAgICBwcml2YXRlIG5vdGlmaWNhdGlvblRvcGljQXJuOiBzdHJpbmcsXHJcbiAgICBwcml2YXRlIGVtZXJnZW5jeUFsZXJ0VG9waWNBcm46IHN0cmluZ1xyXG4gICkge31cclxuXHJcbiAgLyoqXHJcbiAgICogTm90aWZ5IHN1cGVydmlzb3IgYWJvdXQgdmFsaWRhdGlvbiByZXF1aXJlbWVudFxyXG4gICAqL1xyXG4gIGFzeW5jIG5vdGlmeVN1cGVydmlzb3IoZXBpc29kZTogRXBpc29kZSwgc3VwZXJ2aXNvcklkPzogc3RyaW5nLCBpc0VtZXJnZW5jeTogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBtZXNzYWdlOiBOb3RpZmljYXRpb25NZXNzYWdlID0ge1xyXG4gICAgICAgIHR5cGU6IGlzRW1lcmdlbmN5ID8gJ2VtZXJnZW5jeV9hbGVydCcgOiAndmFsaWRhdGlvbl9yZXF1aXJlZCcsXHJcbiAgICAgICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgICAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgICBzdXBlcnZpc29ySWQsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGVwaXNvZGUuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6IGVwaXNvZGUuc3ltcHRvbXMuc2V2ZXJpdHksXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiBlcGlzb2RlLnN5bXB0b21zLmR1cmF0aW9uXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdHJpYWdlOiB7XHJcbiAgICAgICAgICAgIHJ1bGVCYXNlZFNjb3JlOiBlcGlzb2RlLnRyaWFnZSEucnVsZUJhc2VkU2NvcmUsXHJcbiAgICAgICAgICAgIGZpbmFsU2NvcmU6IGVwaXNvZGUudHJpYWdlIS5maW5hbFNjb3JlLFxyXG4gICAgICAgICAgICBhaVVzZWQ6IGVwaXNvZGUudHJpYWdlIS5haUFzc2Vzc21lbnQudXNlZCxcclxuICAgICAgICAgICAgYWlDb25maWRlbmNlOiBlcGlzb2RlLnRyaWFnZSEuYWlBc3Nlc3NtZW50LmNvbmZpZGVuY2UsXHJcbiAgICAgICAgICAgIGFpUmVhc29uaW5nOiBlcGlzb2RlLnRyaWFnZSEuYWlBc3Nlc3NtZW50LnJlYXNvbmluZ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHRvcGljQXJuID0gaXNFbWVyZ2VuY3kgPyB0aGlzLmVtZXJnZW5jeUFsZXJ0VG9waWNBcm4gOiB0aGlzLm5vdGlmaWNhdGlvblRvcGljQXJuO1xyXG4gICAgICBjb25zdCBzdWJqZWN0ID0gdGhpcy5jcmVhdGVOb3RpZmljYXRpb25TdWJqZWN0KG1lc3NhZ2UpO1xyXG4gICAgICBjb25zdCBtZXNzYWdlQm9keSA9IHRoaXMuY3JlYXRlTm90aWZpY2F0aW9uTWVzc2FnZShtZXNzYWdlKTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHVibGlzaENvbW1hbmQoe1xyXG4gICAgICAgIFRvcGljQXJuOiB0b3BpY0FybixcclxuICAgICAgICBTdWJqZWN0OiBzdWJqZWN0LFxyXG4gICAgICAgIE1lc3NhZ2U6IG1lc3NhZ2VCb2R5LFxyXG4gICAgICAgIE1lc3NhZ2VBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAnbm90aWZpY2F0aW9uX3R5cGUnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UudHlwZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICd1cmdlbmN5X2xldmVsJzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VwaXNvZGVfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGVwaXNvZGUuZXBpc29kZUlkXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3N1cGVydmlzb3JfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IHN1cGVydmlzb3JJZCB8fCAndW5hc3NpZ25lZCdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zbnNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYE5vdGlmaWNhdGlvbiBzZW50IHRvIHN1cGVydmlzb3IuIE1lc3NhZ2VJZDogJHtyZXN1bHQuTWVzc2FnZUlkfWApO1xyXG5cclxuICAgICAgLy8gTG9nIG5vdGlmaWNhdGlvbiBmb3IgYXVkaXQgdHJhaWxcclxuICAgICAgdGhpcy5sb2dOb3RpZmljYXRpb24obWVzc2FnZSwgcmVzdWx0Lk1lc3NhZ2VJZCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBzdXBlcnZpc29yIG5vdGlmaWNhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTm90aWZ5IGNhcmUgY29vcmRpbmF0b3IgYWJvdXQgY29tcGxldGVkIHZhbGlkYXRpb25cclxuICAgKi9cclxuICBhc3luYyBub3RpZnlDYXJlQ29vcmRpbmF0b3IoZXBpc29kZTogRXBpc29kZSwgdmFsaWRhdGlvbjogSHVtYW5WYWxpZGF0aW9uKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBtZXNzYWdlOiBOb3RpZmljYXRpb25NZXNzYWdlID0ge1xyXG4gICAgICAgIHR5cGU6ICd2YWxpZGF0aW9uX2NvbXBsZXRlZCcsXHJcbiAgICAgICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgICAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgICBzdXBlcnZpc29ySWQ6IHZhbGlkYXRpb24uc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBhcHByb3ZlZDogdmFsaWRhdGlvbi5hcHByb3ZlZCxcclxuICAgICAgICAgIG92ZXJyaWRlUmVhc29uOiB2YWxpZGF0aW9uLm92ZXJyaWRlUmVhc29uLFxyXG4gICAgICAgICAgbm90ZXM6IHZhbGlkYXRpb24ubm90ZXMsXHJcbiAgICAgICAgICB2YWxpZGF0aW9uVGltZXN0YW1wOiB2YWxpZGF0aW9uLnRpbWVzdGFtcCxcclxuICAgICAgICAgIGZpbmFsVXJnZW5jeUxldmVsOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3Qgc3ViamVjdCA9IHRoaXMuY3JlYXRlTm90aWZpY2F0aW9uU3ViamVjdChtZXNzYWdlKTtcclxuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSB0aGlzLmNyZWF0ZU5vdGlmaWNhdGlvbk1lc3NhZ2UobWVzc2FnZSk7XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1Ymxpc2hDb21tYW5kKHtcclxuICAgICAgICBUb3BpY0FybjogdGhpcy5ub3RpZmljYXRpb25Ub3BpY0FybixcclxuICAgICAgICBTdWJqZWN0OiBzdWJqZWN0LFxyXG4gICAgICAgIE1lc3NhZ2U6IG1lc3NhZ2VCb2R5LFxyXG4gICAgICAgIE1lc3NhZ2VBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAnbm90aWZpY2F0aW9uX3R5cGUnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UudHlwZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICd1cmdlbmN5X2xldmVsJzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VwaXNvZGVfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGVwaXNvZGUuZXBpc29kZUlkXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2FwcHJvdmVkJzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiB2YWxpZGF0aW9uLmFwcHJvdmVkLnRvU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zbnNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYENhcmUgY29vcmRpbmF0b3Igbm90aWZpY2F0aW9uIHNlbnQuIE1lc3NhZ2VJZDogJHtyZXN1bHQuTWVzc2FnZUlkfWApO1xyXG5cclxuICAgICAgdGhpcy5sb2dOb3RpZmljYXRpb24obWVzc2FnZSwgcmVzdWx0Lk1lc3NhZ2VJZCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBjYXJlIGNvb3JkaW5hdG9yIG5vdGlmaWNhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBlc2NhbGF0aW9uIG5vdGlmaWNhdGlvbiB3aGVuIHN1cGVydmlzb3IgaXMgdW5hdmFpbGFibGVcclxuICAgKi9cclxuICBhc3luYyBzZW5kRXNjYWxhdGlvbk5vdGlmaWNhdGlvbihlcGlzb2RlOiBFcGlzb2RlLCByZWFzb246IHN0cmluZywgYmFja3VwU3VwZXJ2aXNvcnM6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBtZXNzYWdlOiBOb3RpZmljYXRpb25NZXNzYWdlID0ge1xyXG4gICAgICAgIHR5cGU6ICdlc2NhbGF0aW9uX3JlcXVpcmVkJyxcclxuICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgIHBhdGllbnRJZDogZXBpc29kZS5wYXRpZW50SWQsXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBlc2NhbGF0aW9uUmVhc29uOiByZWFzb24sXHJcbiAgICAgICAgICBiYWNrdXBTdXBlcnZpc29ycyxcclxuICAgICAgICAgIG9yaWdpbmFsQXNzaWdubWVudDogKGVwaXNvZGUgYXMgYW55KS5hc3NpZ25lZFN1cGVydmlzb3IsXHJcbiAgICAgICAgICBxdWV1ZWRBdDogKGVwaXNvZGUgYXMgYW55KS5xdWV1ZWRBdCxcclxuICAgICAgICAgIHdhaXRUaW1lOiB0aGlzLmNhbGN1bGF0ZVdhaXRUaW1lKChlcGlzb2RlIGFzIGFueSkucXVldWVkQXQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3Qgc3ViamVjdCA9IHRoaXMuY3JlYXRlTm90aWZpY2F0aW9uU3ViamVjdChtZXNzYWdlKTtcclxuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSB0aGlzLmNyZWF0ZU5vdGlmaWNhdGlvbk1lc3NhZ2UobWVzc2FnZSk7XHJcblxyXG4gICAgICAvLyBTZW5kIHRvIGVtZXJnZW5jeSBhbGVydCB0b3BpYyBmb3IgZXNjYWxhdGlvbnNcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdWJsaXNoQ29tbWFuZCh7XHJcbiAgICAgICAgVG9waWNBcm46IHRoaXMuZW1lcmdlbmN5QWxlcnRUb3BpY0FybixcclxuICAgICAgICBTdWJqZWN0OiBzdWJqZWN0LFxyXG4gICAgICAgIE1lc3NhZ2U6IG1lc3NhZ2VCb2R5LFxyXG4gICAgICAgIE1lc3NhZ2VBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgICAnbm90aWZpY2F0aW9uX3R5cGUnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UudHlwZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICd1cmdlbmN5X2xldmVsJzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VwaXNvZGVfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGVwaXNvZGUuZXBpc29kZUlkXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VzY2FsYXRpb25fcmVhc29uJzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiByZWFzb25cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zbnNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYEVzY2FsYXRpb24gbm90aWZpY2F0aW9uIHNlbnQuIE1lc3NhZ2VJZDogJHtyZXN1bHQuTWVzc2FnZUlkfWApO1xyXG5cclxuICAgICAgdGhpcy5sb2dOb3RpZmljYXRpb24obWVzc2FnZSwgcmVzdWx0Lk1lc3NhZ2VJZCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBlc2NhbGF0aW9uIG5vdGlmaWNhdGlvbjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBiYXRjaCBub3RpZmljYXRpb25zIGZvciBxdWV1ZSBzdGF0dXMgdXBkYXRlc1xyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmRRdWV1ZVN0YXR1c1VwZGF0ZShxdWV1ZVN0YXRzOiB7XHJcbiAgICB0b3RhbFBlbmRpbmc6IG51bWJlcjtcclxuICAgIGVtZXJnZW5jeUNvdW50OiBudW1iZXI7XHJcbiAgICB1cmdlbnRDb3VudDogbnVtYmVyO1xyXG4gICAgYXZlcmFnZVdhaXRUaW1lOiBudW1iZXI7XHJcbiAgfSk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgbWVzc2FnZSA9IHtcclxuICAgICAgICB0eXBlOiAncXVldWVfc3RhdHVzX3VwZGF0ZScsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN0YXRzOiBxdWV1ZVN0YXRzXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBzdWJqZWN0ID0gJ0hlYWx0aGNhcmUgVmFsaWRhdGlvbiBRdWV1ZSBTdGF0dXMgVXBkYXRlJztcclxuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlLCBudWxsLCAyKTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHVibGlzaENvbW1hbmQoe1xyXG4gICAgICAgIFRvcGljQXJuOiB0aGlzLm5vdGlmaWNhdGlvblRvcGljQXJuLFxyXG4gICAgICAgIFN1YmplY3Q6IHN1YmplY3QsXHJcbiAgICAgICAgTWVzc2FnZTogbWVzc2FnZUJvZHksXHJcbiAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICdub3RpZmljYXRpb25fdHlwZSc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogJ3F1ZXVlX3N0YXR1c191cGRhdGUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3RvdGFsX3BlbmRpbmcnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnTnVtYmVyJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IHF1ZXVlU3RhdHMudG90YWxQZW5kaW5nLnRvU3RyaW5nKClcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnZW1lcmdlbmN5X2NvdW50Jzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ051bWJlcicsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBxdWV1ZVN0YXRzLmVtZXJnZW5jeUNvdW50LnRvU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zbnNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYFF1ZXVlIHN0YXR1cyB1cGRhdGUgc2VudC4gTWVzc2FnZUlkOiAke3Jlc3VsdC5NZXNzYWdlSWR9YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBxdWV1ZSBzdGF0dXMgdXBkYXRlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgbm90aWZpY2F0aW9uIHN1YmplY3QgbGluZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTm90aWZpY2F0aW9uU3ViamVjdChtZXNzYWdlOiBOb3RpZmljYXRpb25NZXNzYWdlKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHVyZ2VuY3lQcmVmaXggPSBtZXNzYWdlLnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSA/ICdbRU1FUkdFTkNZXSAnIDogXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLlVSR0VOVCA/ICdbVVJHRU5UXSAnIDogJyc7XHJcblxyXG4gICAgc3dpdGNoIChtZXNzYWdlLnR5cGUpIHtcclxuICAgICAgY2FzZSAndmFsaWRhdGlvbl9yZXF1aXJlZCc6XHJcbiAgICAgICAgcmV0dXJuIGAke3VyZ2VuY3lQcmVmaXh9SGVhbHRoY2FyZSBWYWxpZGF0aW9uIFJlcXVpcmVkIC0gRXBpc29kZSAke21lc3NhZ2UuZXBpc29kZUlkfWA7XHJcbiAgICAgIGNhc2UgJ2VtZXJnZW5jeV9hbGVydCc6XHJcbiAgICAgICAgcmV0dXJuIGBbRU1FUkdFTkNZIEFMRVJUXSBJbW1lZGlhdGUgVmFsaWRhdGlvbiBSZXF1aXJlZCAtIEVwaXNvZGUgJHttZXNzYWdlLmVwaXNvZGVJZH1gO1xyXG4gICAgICBjYXNlICd2YWxpZGF0aW9uX2NvbXBsZXRlZCc6XHJcbiAgICAgICAgcmV0dXJuIGBWYWxpZGF0aW9uIENvbXBsZXRlZCAtIEVwaXNvZGUgJHttZXNzYWdlLmVwaXNvZGVJZH1gO1xyXG4gICAgICBjYXNlICdlc2NhbGF0aW9uX3JlcXVpcmVkJzpcclxuICAgICAgICByZXR1cm4gYCR7dXJnZW5jeVByZWZpeH1WYWxpZGF0aW9uIEVzY2FsYXRpb24gUmVxdWlyZWQgLSBFcGlzb2RlICR7bWVzc2FnZS5lcGlzb2RlSWR9YDtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gYEhlYWx0aGNhcmUgTm90aWZpY2F0aW9uIC0gRXBpc29kZSAke21lc3NhZ2UuZXBpc29kZUlkfWA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgbm90aWZpY2F0aW9uIG1lc3NhZ2UgYm9keVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTm90aWZpY2F0aW9uTWVzc2FnZShtZXNzYWdlOiBOb3RpZmljYXRpb25NZXNzYWdlKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGJhc2VJbmZvID0gYFxyXG5FcGlzb2RlIElEOiAke21lc3NhZ2UuZXBpc29kZUlkfVxyXG5QYXRpZW50IElEOiAke21lc3NhZ2UucGF0aWVudElkfVxyXG5VcmdlbmN5IExldmVsOiAke21lc3NhZ2UudXJnZW5jeUxldmVsfVxyXG5UaW1lc3RhbXA6ICR7bWVzc2FnZS50aW1lc3RhbXAudG9JU09TdHJpbmcoKX1cclxuJHttZXNzYWdlLnN1cGVydmlzb3JJZCA/IGBBc3NpZ25lZCBTdXBlcnZpc29yOiAke21lc3NhZ2Uuc3VwZXJ2aXNvcklkfWAgOiAnJ31cclxuYDtcclxuXHJcbiAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xyXG4gICAgICBjYXNlICd2YWxpZGF0aW9uX3JlcXVpcmVkJzpcclxuICAgICAgICByZXR1cm4gYCR7YmFzZUluZm99XHJcblByaW1hcnkgQ29tcGxhaW50OiAke21lc3NhZ2UuZGV0YWlscy5zeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50fVxyXG5TeW1wdG9tIFNldmVyaXR5OiAke21lc3NhZ2UuZGV0YWlscy5zeW1wdG9tcy5zZXZlcml0eX0vMTBcclxuRHVyYXRpb246ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLmR1cmF0aW9ufVxyXG5cclxuVHJpYWdlIEFzc2Vzc21lbnQ6XHJcbi0gUnVsZS1iYXNlZCBTY29yZTogJHttZXNzYWdlLmRldGFpbHMudHJpYWdlLnJ1bGVCYXNlZFNjb3JlfVxyXG4tIEZpbmFsIFNjb3JlOiAke21lc3NhZ2UuZGV0YWlscy50cmlhZ2UuZmluYWxTY29yZX1cclxuLSBBSSBBc3Nlc3NtZW50IFVzZWQ6ICR7bWVzc2FnZS5kZXRhaWxzLnRyaWFnZS5haVVzZWQgPyAnWWVzJyA6ICdObyd9XHJcbiR7bWVzc2FnZS5kZXRhaWxzLnRyaWFnZS5haVVzZWQgPyBgLSBBSSBDb25maWRlbmNlOiAke21lc3NhZ2UuZGV0YWlscy50cmlhZ2UuYWlDb25maWRlbmNlfWAgOiAnJ31cclxuJHttZXNzYWdlLmRldGFpbHMudHJpYWdlLmFpUmVhc29uaW5nID8gYC0gQUkgUmVhc29uaW5nOiAke21lc3NhZ2UuZGV0YWlscy50cmlhZ2UuYWlSZWFzb25pbmd9YCA6ICcnfVxyXG5cclxuUGxlYXNlIHJldmlldyBhbmQgdmFsaWRhdGUgdGhpcyB0cmlhZ2UgYXNzZXNzbWVudC5cclxuYDtcclxuXHJcbiAgICAgIGNhc2UgJ2VtZXJnZW5jeV9hbGVydCc6XHJcbiAgICAgICAgcmV0dXJuIGAke2Jhc2VJbmZvfVxyXG7wn5qoIEVNRVJHRU5DWSBTSVRVQVRJT04gREVURUNURUQg8J+aqFxyXG5cclxuUHJpbWFyeSBDb21wbGFpbnQ6ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLnByaW1hcnlDb21wbGFpbnR9XHJcblN5bXB0b20gU2V2ZXJpdHk6ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLnNldmVyaXR5fS8xMFxyXG5EdXJhdGlvbjogJHttZXNzYWdlLmRldGFpbHMuc3ltcHRvbXMuZHVyYXRpb259XHJcblxyXG5JTU1FRElBVEUgVkFMSURBVElPTiBSRVFVSVJFRFxyXG5UaGlzIGNhc2UgcmVxdWlyZXMgdXJnZW50IHN1cGVydmlzb3IgYXR0ZW50aW9uLlxyXG5gO1xyXG5cclxuICAgICAgY2FzZSAndmFsaWRhdGlvbl9jb21wbGV0ZWQnOlxyXG4gICAgICAgIHJldHVybiBgJHtiYXNlSW5mb31cclxuVmFsaWRhdGlvbiBEZWNpc2lvbjogJHttZXNzYWdlLmRldGFpbHMuYXBwcm92ZWQgPyAnQVBQUk9WRUQnIDogJ05PVCBBUFBST1ZFRCd9XHJcblN1cGVydmlzb3I6ICR7bWVzc2FnZS5zdXBlcnZpc29ySWR9XHJcblZhbGlkYXRpb24gVGltZTogJHttZXNzYWdlLmRldGFpbHMudmFsaWRhdGlvblRpbWVzdGFtcH1cclxuXHJcbiR7bWVzc2FnZS5kZXRhaWxzLm92ZXJyaWRlUmVhc29uID8gYE92ZXJyaWRlIFJlYXNvbjogJHttZXNzYWdlLmRldGFpbHMub3ZlcnJpZGVSZWFzb259YCA6ICcnfVxyXG4ke21lc3NhZ2UuZGV0YWlscy5ub3RlcyA/IGBOb3RlczogJHttZXNzYWdlLmRldGFpbHMubm90ZXN9YCA6ICcnfVxyXG5cclxuVGhlIGVwaXNvZGUgaXMgbm93IHJlYWR5IGZvciBjYXJlIGNvb3JkaW5hdGlvbi5cclxuYDtcclxuXHJcbiAgICAgIGNhc2UgJ2VzY2FsYXRpb25fcmVxdWlyZWQnOlxyXG4gICAgICAgIHJldHVybiBgJHtiYXNlSW5mb31cclxuRXNjYWxhdGlvbiBSZWFzb246ICR7bWVzc2FnZS5kZXRhaWxzLmVzY2FsYXRpb25SZWFzb259XHJcbk9yaWdpbmFsIEFzc2lnbm1lbnQ6ICR7bWVzc2FnZS5kZXRhaWxzLm9yaWdpbmFsQXNzaWdubWVudCB8fCAnVW5hc3NpZ25lZCd9XHJcbldhaXQgVGltZTogJHttZXNzYWdlLmRldGFpbHMud2FpdFRpbWV9IG1pbnV0ZXNcclxuQmFja3VwIFN1cGVydmlzb3JzOiAke21lc3NhZ2UuZGV0YWlscy5iYWNrdXBTdXBlcnZpc29ycy5qb2luKCcsICcpfVxyXG5cclxuVGhpcyBjYXNlIHJlcXVpcmVzIGltbWVkaWF0ZSBhdHRlbnRpb24gZHVlIHRvIHN1cGVydmlzb3IgdW5hdmFpbGFiaWxpdHkuXHJcbmA7XHJcblxyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBgJHtiYXNlSW5mb31cXG4ke0pTT04uc3RyaW5naWZ5KG1lc3NhZ2UuZGV0YWlscywgbnVsbCwgMil9YDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSB3YWl0IHRpbWUgaW4gbWludXRlc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlV2FpdFRpbWUocXVldWVkQXQ6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBxdWV1ZVRpbWUgPSBuZXcgRGF0ZShxdWV1ZWRBdCk7XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKG5vdy5nZXRUaW1lKCkgLSBxdWV1ZVRpbWUuZ2V0VGltZSgpKSAvICgxMDAwICogNjApKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBub3RpZmljYXRpb24gZm9yIGF1ZGl0IHRyYWlsXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBsb2dOb3RpZmljYXRpb24obWVzc2FnZTogTm90aWZpY2F0aW9uTWVzc2FnZSwgbWVzc2FnZUlkPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zb2xlLmxvZygnTm90aWZpY2F0aW9uIHNlbnQ6Jywge1xyXG4gICAgICBtZXNzYWdlSWQsXHJcbiAgICAgIHR5cGU6IG1lc3NhZ2UudHlwZSxcclxuICAgICAgZXBpc29kZUlkOiBtZXNzYWdlLmVwaXNvZGVJZCxcclxuICAgICAgdXJnZW5jeUxldmVsOiBtZXNzYWdlLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgc3VwZXJ2aXNvcklkOiBtZXNzYWdlLnN1cGVydmlzb3JJZCxcclxuICAgICAgdGltZXN0YW1wOiBtZXNzYWdlLnRpbWVzdGFtcFxyXG4gICAgfSk7XHJcbiAgfVxyXG59Il19