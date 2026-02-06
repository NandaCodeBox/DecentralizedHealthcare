"use strict";
// Emergency Notification Service
// Handles real-time notifications for emergency situations via SNS
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyNotificationService = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
class EmergencyNotificationService {
    constructor(snsClient, emergencyAlertTopicArn, notificationTopicArn) {
        this.snsClient = snsClient;
        this.emergencyAlertTopicArn = emergencyAlertTopicArn;
        this.notificationTopicArn = notificationTopicArn;
    }
    /**
     * Send immediate emergency alert to supervisors
     */
    async sendImmediateAlert(episode, alertDetails) {
        try {
            console.log(`Sending immediate emergency alert for episode ${episode.episodeId}`);
            const message = {
                type: 'immediate_alert',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                severity: alertDetails.severity,
                timestamp: new Date(),
                supervisors: alertDetails.assignedSupervisors,
                details: {
                    alertId: alertDetails.alertId,
                    alertType: alertDetails.alertType,
                    symptoms: {
                        primaryComplaint: episode.symptoms.primaryComplaint,
                        severity: episode.symptoms.severity,
                        duration: episode.symptoms.duration,
                        associatedSymptoms: episode.symptoms.associatedSymptoms
                    },
                    triage: {
                        urgencyLevel: episode.triage.urgencyLevel,
                        ruleBasedScore: episode.triage.ruleBasedScore,
                        finalScore: episode.triage.finalScore,
                        aiUsed: episode.triage.aiAssessment.used,
                        aiConfidence: episode.triage.aiAssessment.confidence,
                        aiReasoning: episode.triage.aiAssessment.reasoning
                    },
                    additionalInfo: alertDetails.additionalInfo
                }
            };
            // Send to emergency alert topic (high priority)
            await this.sendEmergencyNotification(message, true);
            // Send individual notifications to each supervisor
            for (const supervisorId of alertDetails.assignedSupervisors) {
                await this.sendSupervisorSpecificAlert(message, supervisorId);
            }
            console.log(`Immediate emergency alert sent for episode ${episode.episodeId} to ${alertDetails.assignedSupervisors.length} supervisors`);
        }
        catch (error) {
            console.error('Error sending immediate emergency alert:', error);
            throw error;
        }
    }
    /**
     * Send escalation alert
     */
    async sendEscalationAlert(episode, escalationDetails) {
        try {
            console.log(`Sending escalation alert for episode ${episode.episodeId}, level: ${escalationDetails.escalationLevel}`);
            const message = {
                type: 'escalation_alert',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                severity: escalationDetails.escalationLevel,
                timestamp: new Date(),
                supervisors: escalationDetails.assignedSupervisors,
                details: {
                    escalationId: escalationDetails.escalationId,
                    escalationLevel: escalationDetails.escalationLevel,
                    escalationReason: escalationDetails.reason,
                    urgentResponse: escalationDetails.urgentResponse,
                    timeoutMinutes: escalationDetails.timeoutMinutes,
                    escalationPath: escalationDetails.escalationPath,
                    symptoms: {
                        primaryComplaint: episode.symptoms.primaryComplaint,
                        severity: episode.symptoms.severity,
                        duration: episode.symptoms.duration
                    },
                    waitTime: this.calculateWaitTime(episode.createdAt)
                }
            };
            // Send to emergency alert topic with escalation priority
            await this.sendEmergencyNotification(message, escalationDetails.urgentResponse);
            // Send to each assigned supervisor
            for (const supervisorId of escalationDetails.assignedSupervisors) {
                await this.sendSupervisorSpecificAlert(message, supervisorId);
            }
            console.log(`Escalation alert sent for episode ${episode.episodeId} to ${escalationDetails.assignedSupervisors.length} supervisors`);
        }
        catch (error) {
            console.error('Error sending escalation alert:', error);
            throw error;
        }
    }
    /**
     * Send response confirmation
     */
    async sendResponseConfirmation(episode, responseDetails) {
        try {
            console.log(`Sending response confirmation for episode ${episode.episodeId}`);
            const message = {
                type: 'response_confirmation',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                severity: 'medium',
                timestamp: new Date(),
                supervisors: [responseDetails.supervisorId],
                details: {
                    supervisorId: responseDetails.supervisorId,
                    responseAction: responseDetails.responseAction,
                    notes: responseDetails.notes,
                    responseTime: responseDetails.timestamp,
                    responseDelay: this.calculateWaitTime(episode.createdAt)
                }
            };
            // Send confirmation to notification topic
            await this.sendNotification(message, this.notificationTopicArn);
            console.log(`Response confirmation sent for episode ${episode.episodeId}`);
        }
        catch (error) {
            console.error('Error sending response confirmation:', error);
            throw error;
        }
    }
    /**
     * Send timeout warning
     */
    async sendTimeoutWarning(episode, alertDetails, minutesRemaining) {
        try {
            console.log(`Sending timeout warning for episode ${episode.episodeId}, ${minutesRemaining} minutes remaining`);
            const message = {
                type: 'timeout_warning',
                episodeId: episode.episodeId,
                patientId: episode.patientId,
                urgencyLevel: episode.triage.urgencyLevel,
                severity: alertDetails.severity,
                timestamp: new Date(),
                supervisors: alertDetails.assignedSupervisors,
                details: {
                    alertId: alertDetails.alertId,
                    minutesRemaining,
                    totalWaitTime: this.calculateWaitTime(episode.createdAt),
                    escalationImminent: minutesRemaining <= 2
                }
            };
            // Send urgent timeout warning
            await this.sendEmergencyNotification(message, true);
            console.log(`Timeout warning sent for episode ${episode.episodeId}`);
        }
        catch (error) {
            console.error('Error sending timeout warning:', error);
            throw error;
        }
    }
    /**
     * Send batch emergency status update
     */
    async sendEmergencyStatusUpdate(stats) {
        try {
            const message = {
                type: 'emergency_status_update',
                timestamp: new Date(),
                stats
            };
            const subject = `Emergency System Status Update - ${stats.activeEmergencies} Active Cases`;
            const messageBody = this.createStatusUpdateMessage(stats);
            const command = new client_sns_1.PublishCommand({
                TopicArn: this.emergencyAlertTopicArn,
                Subject: subject,
                Message: messageBody,
                MessageAttributes: {
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'emergency_status_update'
                    },
                    'active_emergencies': {
                        DataType: 'Number',
                        StringValue: stats.activeEmergencies.toString()
                    },
                    'critical_count': {
                        DataType: 'Number',
                        StringValue: stats.criticalCount.toString()
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Emergency status update sent. MessageId: ${result.MessageId}`);
        }
        catch (error) {
            console.error('Error sending emergency status update:', error);
            throw error;
        }
    }
    /**
     * Send emergency notification to topic
     */
    async sendEmergencyNotification(message, highPriority = false) {
        try {
            const subject = this.createNotificationSubject(message, highPriority);
            const messageBody = this.createNotificationMessage(message);
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
                        StringValue: message.urgencyLevel
                    },
                    'severity': {
                        DataType: 'String',
                        StringValue: message.severity
                    },
                    'episode_id': {
                        DataType: 'String',
                        StringValue: message.episodeId
                    },
                    'high_priority': {
                        DataType: 'String',
                        StringValue: highPriority.toString()
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Emergency notification sent. MessageId: ${result.MessageId}, Type: ${message.type}`);
        }
        catch (error) {
            console.error('Error sending emergency notification:', error);
            throw error;
        }
    }
    /**
     * Send supervisor-specific alert
     */
    async sendSupervisorSpecificAlert(message, supervisorId) {
        try {
            const subject = `[PERSONAL ALERT] ${this.createNotificationSubject(message, true)}`;
            const messageBody = `SUPERVISOR: ${supervisorId}\n\n${this.createNotificationMessage(message)}`;
            const command = new client_sns_1.PublishCommand({
                TopicArn: this.emergencyAlertTopicArn,
                Subject: subject,
                Message: messageBody,
                MessageAttributes: {
                    'notification_type': {
                        DataType: 'String',
                        StringValue: `${message.type}_personal`
                    },
                    'supervisor_id': {
                        DataType: 'String',
                        StringValue: supervisorId
                    },
                    'episode_id': {
                        DataType: 'String',
                        StringValue: message.episodeId
                    },
                    'personal_alert': {
                        DataType: 'String',
                        StringValue: 'true'
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Personal alert sent to supervisor ${supervisorId}. MessageId: ${result.MessageId}`);
        }
        catch (error) {
            console.error(`Error sending personal alert to supervisor ${supervisorId}:`, error);
            // Don't throw error for individual supervisor failures
        }
    }
    /**
     * Send notification to specified topic
     */
    async sendNotification(message, topicArn) {
        try {
            const subject = this.createNotificationSubject(message, false);
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
                    'episode_id': {
                        DataType: 'String',
                        StringValue: message.episodeId
                    }
                }
            });
            const result = await this.snsClient.send(command);
            console.log(`Notification sent to topic. MessageId: ${result.MessageId}`);
        }
        catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }
    /**
     * Create notification subject line
     */
    createNotificationSubject(message, highPriority) {
        const priorityPrefix = highPriority ? '🚨 [URGENT] ' : '';
        const severityPrefix = message.severity === 'critical' ? '[CRITICAL] ' :
            message.severity === 'high' ? '[HIGH] ' : '';
        switch (message.type) {
            case 'immediate_alert':
                return `${priorityPrefix}${severityPrefix}EMERGENCY ALERT - Episode ${message.episodeId}`;
            case 'escalation_alert':
                return `${priorityPrefix}${severityPrefix}ESCALATION REQUIRED - Episode ${message.episodeId}`;
            case 'response_confirmation':
                return `Emergency Response Confirmed - Episode ${message.episodeId}`;
            case 'timeout_warning':
                return `${priorityPrefix}TIMEOUT WARNING - Episode ${message.episodeId}`;
            default:
                return `${priorityPrefix}Emergency Notification - Episode ${message.episodeId}`;
        }
    }
    /**
     * Create notification message body
     */
    createNotificationMessage(message) {
        const baseInfo = `
🚨 EMERGENCY HEALTHCARE ALERT 🚨

Episode ID: ${message.episodeId}
Patient ID: ${message.patientId}
Urgency Level: ${message.urgencyLevel.toUpperCase()}
Severity: ${message.severity.toUpperCase()}
Timestamp: ${message.timestamp.toISOString()}
Assigned Supervisors: ${message.supervisors.join(', ')}
`;
        switch (message.type) {
            case 'immediate_alert':
                return `${baseInfo}

⚡ IMMEDIATE ATTENTION REQUIRED ⚡

Alert Type: ${message.details.alertType}
Alert ID: ${message.details.alertId}

PATIENT SYMPTOMS:
- Primary Complaint: ${message.details.symptoms.primaryComplaint}
- Severity: ${message.details.symptoms.severity}/10
- Duration: ${message.details.symptoms.duration}
- Associated Symptoms: ${message.details.symptoms.associatedSymptoms.join(', ')}

TRIAGE ASSESSMENT:
- Urgency Level: ${message.details.triage.urgencyLevel}
- Rule-based Score: ${message.details.triage.ruleBasedScore}
- Final Score: ${message.details.triage.finalScore}
- AI Assessment Used: ${message.details.triage.aiUsed ? 'Yes' : 'No'}
${message.details.triage.aiUsed ? `- AI Confidence: ${message.details.triage.aiConfidence}` : ''}
${message.details.triage.aiReasoning ? `- AI Reasoning: ${message.details.triage.aiReasoning}` : ''}

🔥 IMMEDIATE SUPERVISOR RESPONSE REQUIRED 🔥
This case requires urgent attention and immediate action.
`;
            case 'escalation_alert':
                return `${baseInfo}

📈 ESCALATION PROTOCOL ACTIVATED 📈

Escalation ID: ${message.details.escalationId}
Escalation Level: ${message.details.escalationLevel.toUpperCase()}
Escalation Reason: ${message.details.escalationReason}
Urgent Response Required: ${message.details.urgentResponse ? 'YES' : 'NO'}
Timeout: ${message.details.timeoutMinutes} minutes
Current Wait Time: ${message.details.waitTime} minutes

PATIENT SYMPTOMS:
- Primary Complaint: ${message.details.symptoms.primaryComplaint}
- Severity: ${message.details.symptoms.severity}/10
- Duration: ${message.details.symptoms.duration}

⚠️ ESCALATED CASE REQUIRES IMMEDIATE ATTENTION ⚠️
This case has been escalated due to timeout or severity concerns.
`;
            case 'response_confirmation':
                return `${baseInfo}

✅ EMERGENCY RESPONSE CONFIRMED ✅

Responding Supervisor: ${message.details.supervisorId}
Response Action: ${message.details.responseAction}
Response Time: ${message.details.responseTime}
Total Response Delay: ${message.details.responseDelay} minutes
${message.details.notes ? `Notes: ${message.details.notes}` : ''}

Emergency response has been acknowledged and is being handled.
`;
            case 'timeout_warning':
                return `${baseInfo}

⏰ TIMEOUT WARNING ⏰

Alert ID: ${message.details.alertId}
Minutes Remaining: ${message.details.minutesRemaining}
Total Wait Time: ${message.details.totalWaitTime} minutes
Escalation Imminent: ${message.details.escalationImminent ? 'YES - IMMEDIATE ACTION REQUIRED' : 'NO'}

${message.details.escalationImminent ?
                    '🚨 CRITICAL: This case will be automatically escalated in less than 2 minutes!' :
                    'This case is approaching timeout and may be escalated soon.'}
`;
            default:
                return `${baseInfo}\n${JSON.stringify(message.details, null, 2)}`;
        }
    }
    /**
     * Create status update message
     */
    createStatusUpdateMessage(stats) {
        return `
Emergency Healthcare System Status Update

📊 CURRENT STATISTICS:
- Active Emergency Cases: ${stats.activeEmergencies}
- Critical Cases: ${stats.criticalCount}
- Average Response Time: ${stats.averageResponseTime} minutes
- Overdue Cases: ${stats.overdueCount}

${stats.criticalCount > 0 ? '🚨 CRITICAL CASES REQUIRE IMMEDIATE ATTENTION' : ''}
${stats.overdueCount > 0 ? '⚠️ OVERDUE CASES NEED ESCALATION' : ''}

System Status: ${stats.activeEmergencies === 0 ? 'NORMAL' :
            stats.criticalCount > 5 ? 'CRITICAL LOAD' :
                stats.activeEmergencies > 10 ? 'HIGH LOAD' : 'ACTIVE'}
`;
    }
    /**
     * Calculate wait time in minutes
     */
    calculateWaitTime(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    }
}
exports.EmergencyNotificationService = EmergencyNotificationService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1lcmdlbmN5LW5vdGlmaWNhdGlvbi1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xhbWJkYS9lbWVyZ2VuY3ktYWxlcnQvZW1lcmdlbmN5LW5vdGlmaWNhdGlvbi1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQ0FBaUM7QUFDakMsbUVBQW1FO0FBQ25FLG9CQUFvQjs7O0FBRXBCLG9EQUFnRTtBQWdCaEUsTUFBYSw0QkFBNEI7SUFDdkMsWUFDVSxTQUFvQixFQUNwQixzQkFBOEIsRUFDOUIsb0JBQTRCO1FBRjVCLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUFRO1FBQzlCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBUTtJQUNuQyxDQUFDO0lBRUo7O09BRUc7SUFDSCxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBZ0IsRUFBRSxZQUE0QjtRQUNyRSxJQUFJLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLGlEQUFpRCxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUVsRixNQUFNLE9BQU8sR0FBaUM7Z0JBQzVDLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztnQkFDNUIsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO2dCQUM1QixZQUFZLEVBQUUsT0FBTyxDQUFDLE1BQU8sQ0FBQyxZQUFZO2dCQUMxQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7Z0JBQy9CLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRTtnQkFDckIsV0FBVyxFQUFFLFlBQVksQ0FBQyxtQkFBbUI7Z0JBQzdDLE9BQU8sRUFBRTtvQkFDUCxPQUFPLEVBQUUsWUFBWSxDQUFDLE9BQU87b0JBQzdCLFNBQVMsRUFBRSxZQUFZLENBQUMsU0FBUztvQkFDakMsUUFBUSxFQUFFO3dCQUNSLGdCQUFnQixFQUFFLE9BQU8sQ0FB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QUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLEVBQUU7O2lCQUVqRCxLQUFLLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzNDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUTtDQUNwRSxDQUFDO0lBQ0EsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCLENBQUMsU0FBd0I7UUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2RSxDQUFDO0NBQ0Y7QUE1ZUQsb0VBNGVDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gRW1lcmdlbmN5IE5vdGlmaWNhdGlvbiBTZXJ2aWNlXHJcbi8vIEhhbmRsZXMgcmVhbC10aW1lIG5vdGlmaWNhdGlvbnMgZm9yIGVtZXJnZW5jeSBzaXR1YXRpb25zIHZpYSBTTlNcclxuLy8gUmVxdWlyZW1lbnRzOiA3LjJcclxuXHJcbmltcG9ydCB7IFNOU0NsaWVudCwgUHVibGlzaENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc25zJztcclxuaW1wb3J0IHsgRXBpc29kZSwgVXJnZW5jeUxldmVsIH0gZnJvbSAnLi4vLi4vdHlwZXMnO1xyXG5pbXBvcnQgeyBFbWVyZ2VuY3lBbGVydCB9IGZyb20gJy4vZW1lcmdlbmN5LWFsZXJ0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBFc2NhbGF0aW9uUHJvdG9jb2wgfSBmcm9tICcuL2VzY2FsYXRpb24tcHJvdG9jb2wtc2VydmljZSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVtZXJnZW5jeU5vdGlmaWNhdGlvbk1lc3NhZ2Uge1xyXG4gIHR5cGU6ICdpbW1lZGlhdGVfYWxlcnQnIHwgJ2VzY2FsYXRpb25fYWxlcnQnIHwgJ3Jlc3BvbnNlX2NvbmZpcm1hdGlvbicgfCAndGltZW91dF93YXJuaW5nJztcclxuICBlcGlzb2RlSWQ6IHN0cmluZztcclxuICBwYXRpZW50SWQ6IHN0cmluZztcclxuICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbDtcclxuICBzZXZlcml0eTogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogRGF0ZTtcclxuICBzdXBlcnZpc29yczogc3RyaW5nW107XHJcbiAgZGV0YWlsczogUmVjb3JkPHN0cmluZywgYW55PjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEVtZXJnZW5jeU5vdGlmaWNhdGlvblNlcnZpY2Uge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJpdmF0ZSBzbnNDbGllbnQ6IFNOU0NsaWVudCxcclxuICAgIHByaXZhdGUgZW1lcmdlbmN5QWxlcnRUb3BpY0Fybjogc3RyaW5nLFxyXG4gICAgcHJpdmF0ZSBub3RpZmljYXRpb25Ub3BpY0Fybjogc3RyaW5nXHJcbiAgKSB7fVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIGltbWVkaWF0ZSBlbWVyZ2VuY3kgYWxlcnQgdG8gc3VwZXJ2aXNvcnNcclxuICAgKi9cclxuICBhc3luYyBzZW5kSW1tZWRpYXRlQWxlcnQoZXBpc29kZTogRXBpc29kZSwgYWxlcnREZXRhaWxzOiBFbWVyZ2VuY3lBbGVydCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYFNlbmRpbmcgaW1tZWRpYXRlIGVtZXJnZW5jeSBhbGVydCBmb3IgZXBpc29kZSAke2VwaXNvZGUuZXBpc29kZUlkfWApO1xyXG5cclxuICAgICAgY29uc3QgbWVzc2FnZTogRW1lcmdlbmN5Tm90aWZpY2F0aW9uTWVzc2FnZSA9IHtcclxuICAgICAgICB0eXBlOiAnaW1tZWRpYXRlX2FsZXJ0JyxcclxuICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgIHBhdGllbnRJZDogZXBpc29kZS5wYXRpZW50SWQsXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsLFxyXG4gICAgICAgIHNldmVyaXR5OiBhbGVydERldGFpbHMuc2V2ZXJpdHksXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN1cGVydmlzb3JzOiBhbGVydERldGFpbHMuYXNzaWduZWRTdXBlcnZpc29ycyxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBhbGVydElkOiBhbGVydERldGFpbHMuYWxlcnRJZCxcclxuICAgICAgICAgIGFsZXJ0VHlwZTogYWxlcnREZXRhaWxzLmFsZXJ0VHlwZSxcclxuICAgICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGVwaXNvZGUuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6IGVwaXNvZGUuc3ltcHRvbXMuc2V2ZXJpdHksXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiBlcGlzb2RlLnN5bXB0b21zLmR1cmF0aW9uLFxyXG4gICAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGVwaXNvZGUuc3ltcHRvbXMuYXNzb2NpYXRlZFN5bXB0b21zXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdHJpYWdlOiB7XHJcbiAgICAgICAgICAgIHVyZ2VuY3lMZXZlbDogZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgICAgICAgcnVsZUJhc2VkU2NvcmU6IGVwaXNvZGUudHJpYWdlIS5ydWxlQmFzZWRTY29yZSxcclxuICAgICAgICAgICAgZmluYWxTY29yZTogZXBpc29kZS50cmlhZ2UhLmZpbmFsU2NvcmUsXHJcbiAgICAgICAgICAgIGFpVXNlZDogZXBpc29kZS50cmlhZ2UhLmFpQXNzZXNzbWVudC51c2VkLFxyXG4gICAgICAgICAgICBhaUNvbmZpZGVuY2U6IGVwaXNvZGUudHJpYWdlIS5haUFzc2Vzc21lbnQuY29uZmlkZW5jZSxcclxuICAgICAgICAgICAgYWlSZWFzb25pbmc6IGVwaXNvZGUudHJpYWdlIS5haUFzc2Vzc21lbnQucmVhc29uaW5nXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWRkaXRpb25hbEluZm86IGFsZXJ0RGV0YWlscy5hZGRpdGlvbmFsSW5mb1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFNlbmQgdG8gZW1lcmdlbmN5IGFsZXJ0IHRvcGljIChoaWdoIHByaW9yaXR5KVxyXG4gICAgICBhd2FpdCB0aGlzLnNlbmRFbWVyZ2VuY3lOb3RpZmljYXRpb24obWVzc2FnZSwgdHJ1ZSk7XHJcblxyXG4gICAgICAvLyBTZW5kIGluZGl2aWR1YWwgbm90aWZpY2F0aW9ucyB0byBlYWNoIHN1cGVydmlzb3JcclxuICAgICAgZm9yIChjb25zdCBzdXBlcnZpc29ySWQgb2YgYWxlcnREZXRhaWxzLmFzc2lnbmVkU3VwZXJ2aXNvcnMpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnNlbmRTdXBlcnZpc29yU3BlY2lmaWNBbGVydChtZXNzYWdlLCBzdXBlcnZpc29ySWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgSW1tZWRpYXRlIGVtZXJnZW5jeSBhbGVydCBzZW50IGZvciBlcGlzb2RlICR7ZXBpc29kZS5lcGlzb2RlSWR9IHRvICR7YWxlcnREZXRhaWxzLmFzc2lnbmVkU3VwZXJ2aXNvcnMubGVuZ3RofSBzdXBlcnZpc29yc2ApO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNlbmRpbmcgaW1tZWRpYXRlIGVtZXJnZW5jeSBhbGVydDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBlc2NhbGF0aW9uIGFsZXJ0XHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZEVzY2FsYXRpb25BbGVydChlcGlzb2RlOiBFcGlzb2RlLCBlc2NhbGF0aW9uRGV0YWlsczogRXNjYWxhdGlvblByb3RvY29sKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgU2VuZGluZyBlc2NhbGF0aW9uIGFsZXJ0IGZvciBlcGlzb2RlICR7ZXBpc29kZS5lcGlzb2RlSWR9LCBsZXZlbDogJHtlc2NhbGF0aW9uRGV0YWlscy5lc2NhbGF0aW9uTGV2ZWx9YCk7XHJcblxyXG4gICAgICBjb25zdCBtZXNzYWdlOiBFbWVyZ2VuY3lOb3RpZmljYXRpb25NZXNzYWdlID0ge1xyXG4gICAgICAgIHR5cGU6ICdlc2NhbGF0aW9uX2FsZXJ0JyxcclxuICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgIHBhdGllbnRJZDogZXBpc29kZS5wYXRpZW50SWQsXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBlcGlzb2RlLnRyaWFnZSEudXJnZW5jeUxldmVsLFxyXG4gICAgICAgIHNldmVyaXR5OiBlc2NhbGF0aW9uRGV0YWlscy5lc2NhbGF0aW9uTGV2ZWwsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN1cGVydmlzb3JzOiBlc2NhbGF0aW9uRGV0YWlscy5hc3NpZ25lZFN1cGVydmlzb3JzLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGVzY2FsYXRpb25JZDogZXNjYWxhdGlvbkRldGFpbHMuZXNjYWxhdGlvbklkLFxyXG4gICAgICAgICAgZXNjYWxhdGlvbkxldmVsOiBlc2NhbGF0aW9uRGV0YWlscy5lc2NhbGF0aW9uTGV2ZWwsXHJcbiAgICAgICAgICBlc2NhbGF0aW9uUmVhc29uOiBlc2NhbGF0aW9uRGV0YWlscy5yZWFzb24sXHJcbiAgICAgICAgICB1cmdlbnRSZXNwb25zZTogZXNjYWxhdGlvbkRldGFpbHMudXJnZW50UmVzcG9uc2UsXHJcbiAgICAgICAgICB0aW1lb3V0TWludXRlczogZXNjYWxhdGlvbkRldGFpbHMudGltZW91dE1pbnV0ZXMsXHJcbiAgICAgICAgICBlc2NhbGF0aW9uUGF0aDogZXNjYWxhdGlvbkRldGFpbHMuZXNjYWxhdGlvblBhdGgsXHJcbiAgICAgICAgICBzeW1wdG9tczoge1xyXG4gICAgICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiBlcGlzb2RlLnN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQsXHJcbiAgICAgICAgICAgIHNldmVyaXR5OiBlcGlzb2RlLnN5bXB0b21zLnNldmVyaXR5LFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogZXBpc29kZS5zeW1wdG9tcy5kdXJhdGlvblxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHdhaXRUaW1lOiB0aGlzLmNhbGN1bGF0ZVdhaXRUaW1lKGVwaXNvZGUuY3JlYXRlZEF0KVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFNlbmQgdG8gZW1lcmdlbmN5IGFsZXJ0IHRvcGljIHdpdGggZXNjYWxhdGlvbiBwcmlvcml0eVxyXG4gICAgICBhd2FpdCB0aGlzLnNlbmRFbWVyZ2VuY3lOb3RpZmljYXRpb24obWVzc2FnZSwgZXNjYWxhdGlvbkRldGFpbHMudXJnZW50UmVzcG9uc2UpO1xyXG5cclxuICAgICAgLy8gU2VuZCB0byBlYWNoIGFzc2lnbmVkIHN1cGVydmlzb3JcclxuICAgICAgZm9yIChjb25zdCBzdXBlcnZpc29ySWQgb2YgZXNjYWxhdGlvbkRldGFpbHMuYXNzaWduZWRTdXBlcnZpc29ycykge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2VuZFN1cGVydmlzb3JTcGVjaWZpY0FsZXJ0KG1lc3NhZ2UsIHN1cGVydmlzb3JJZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBFc2NhbGF0aW9uIGFsZXJ0IHNlbnQgZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH0gdG8gJHtlc2NhbGF0aW9uRGV0YWlscy5hc3NpZ25lZFN1cGVydmlzb3JzLmxlbmd0aH0gc3VwZXJ2aXNvcnNgKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGVzY2FsYXRpb24gYWxlcnQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgcmVzcG9uc2UgY29uZmlybWF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZFJlc3BvbnNlQ29uZmlybWF0aW9uKGVwaXNvZGU6IEVwaXNvZGUsIHJlc3BvbnNlRGV0YWlsczogYW55KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgU2VuZGluZyByZXNwb25zZSBjb25maXJtYXRpb24gZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH1gKTtcclxuXHJcbiAgICAgIGNvbnN0IG1lc3NhZ2U6IEVtZXJnZW5jeU5vdGlmaWNhdGlvbk1lc3NhZ2UgPSB7XHJcbiAgICAgICAgdHlwZTogJ3Jlc3BvbnNlX2NvbmZpcm1hdGlvbicsXHJcbiAgICAgICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgICAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgICBzZXZlcml0eTogJ21lZGl1bScsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN1cGVydmlzb3JzOiBbcmVzcG9uc2VEZXRhaWxzLnN1cGVydmlzb3JJZF0sXHJcbiAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgc3VwZXJ2aXNvcklkOiByZXNwb25zZURldGFpbHMuc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgcmVzcG9uc2VBY3Rpb246IHJlc3BvbnNlRGV0YWlscy5yZXNwb25zZUFjdGlvbixcclxuICAgICAgICAgIG5vdGVzOiByZXNwb25zZURldGFpbHMubm90ZXMsXHJcbiAgICAgICAgICByZXNwb25zZVRpbWU6IHJlc3BvbnNlRGV0YWlscy50aW1lc3RhbXAsXHJcbiAgICAgICAgICByZXNwb25zZURlbGF5OiB0aGlzLmNhbGN1bGF0ZVdhaXRUaW1lKGVwaXNvZGUuY3JlYXRlZEF0KVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFNlbmQgY29uZmlybWF0aW9uIHRvIG5vdGlmaWNhdGlvbiB0b3BpY1xyXG4gICAgICBhd2FpdCB0aGlzLnNlbmROb3RpZmljYXRpb24obWVzc2FnZSwgdGhpcy5ub3RpZmljYXRpb25Ub3BpY0Fybik7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgUmVzcG9uc2UgY29uZmlybWF0aW9uIHNlbnQgZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH1gKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIHJlc3BvbnNlIGNvbmZpcm1hdGlvbjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCB0aW1lb3V0IHdhcm5pbmdcclxuICAgKi9cclxuICBhc3luYyBzZW5kVGltZW91dFdhcm5pbmcoZXBpc29kZTogRXBpc29kZSwgYWxlcnREZXRhaWxzOiBFbWVyZ2VuY3lBbGVydCwgbWludXRlc1JlbWFpbmluZzogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgU2VuZGluZyB0aW1lb3V0IHdhcm5pbmcgZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH0sICR7bWludXRlc1JlbWFpbmluZ30gbWludXRlcyByZW1haW5pbmdgKTtcclxuXHJcbiAgICAgIGNvbnN0IG1lc3NhZ2U6IEVtZXJnZW5jeU5vdGlmaWNhdGlvbk1lc3NhZ2UgPSB7XHJcbiAgICAgICAgdHlwZTogJ3RpbWVvdXRfd2FybmluZycsXHJcbiAgICAgICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgICAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogZXBpc29kZS50cmlhZ2UhLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgICBzZXZlcml0eTogYWxlcnREZXRhaWxzLnNldmVyaXR5LFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgICBzdXBlcnZpc29yczogYWxlcnREZXRhaWxzLmFzc2lnbmVkU3VwZXJ2aXNvcnMsXHJcbiAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgYWxlcnRJZDogYWxlcnREZXRhaWxzLmFsZXJ0SWQsXHJcbiAgICAgICAgICBtaW51dGVzUmVtYWluaW5nLFxyXG4gICAgICAgICAgdG90YWxXYWl0VGltZTogdGhpcy5jYWxjdWxhdGVXYWl0VGltZShlcGlzb2RlLmNyZWF0ZWRBdCksXHJcbiAgICAgICAgICBlc2NhbGF0aW9uSW1taW5lbnQ6IG1pbnV0ZXNSZW1haW5pbmcgPD0gMlxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFNlbmQgdXJnZW50IHRpbWVvdXQgd2FybmluZ1xyXG4gICAgICBhd2FpdCB0aGlzLnNlbmRFbWVyZ2VuY3lOb3RpZmljYXRpb24obWVzc2FnZSwgdHJ1ZSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgVGltZW91dCB3YXJuaW5nIHNlbnQgZm9yIGVwaXNvZGUgJHtlcGlzb2RlLmVwaXNvZGVJZH1gKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIHRpbWVvdXQgd2FybmluZzonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBiYXRjaCBlbWVyZ2VuY3kgc3RhdHVzIHVwZGF0ZVxyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmRFbWVyZ2VuY3lTdGF0dXNVcGRhdGUoc3RhdHM6IHtcclxuICAgIGFjdGl2ZUVtZXJnZW5jaWVzOiBudW1iZXI7XHJcbiAgICBjcml0aWNhbENvdW50OiBudW1iZXI7XHJcbiAgICBhdmVyYWdlUmVzcG9uc2VUaW1lOiBudW1iZXI7XHJcbiAgICBvdmVyZHVlQ291bnQ6IG51bWJlcjtcclxuICB9KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBtZXNzYWdlID0ge1xyXG4gICAgICAgIHR5cGU6ICdlbWVyZ2VuY3lfc3RhdHVzX3VwZGF0ZScsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHN0YXRzXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBzdWJqZWN0ID0gYEVtZXJnZW5jeSBTeXN0ZW0gU3RhdHVzIFVwZGF0ZSAtICR7c3RhdHMuYWN0aXZlRW1lcmdlbmNpZXN9IEFjdGl2ZSBDYXNlc2A7XHJcbiAgICAgIGNvbnN0IG1lc3NhZ2VCb2R5ID0gdGhpcy5jcmVhdGVTdGF0dXNVcGRhdGVNZXNzYWdlKHN0YXRzKTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHVibGlzaENvbW1hbmQoe1xyXG4gICAgICAgIFRvcGljQXJuOiB0aGlzLmVtZXJnZW5jeUFsZXJ0VG9waWNBcm4sXHJcbiAgICAgICAgU3ViamVjdDogc3ViamVjdCxcclxuICAgICAgICBNZXNzYWdlOiBtZXNzYWdlQm9keSxcclxuICAgICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xyXG4gICAgICAgICAgJ25vdGlmaWNhdGlvbl90eXBlJzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAnZW1lcmdlbmN5X3N0YXR1c191cGRhdGUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2FjdGl2ZV9lbWVyZ2VuY2llcyc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdOdW1iZXInLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogc3RhdHMuYWN0aXZlRW1lcmdlbmNpZXMudG9TdHJpbmcoKVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgICdjcml0aWNhbF9jb3VudCc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdOdW1iZXInLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogc3RhdHMuY3JpdGljYWxDb3VudC50b1N0cmluZygpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc25zQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBFbWVyZ2VuY3kgc3RhdHVzIHVwZGF0ZSBzZW50LiBNZXNzYWdlSWQ6ICR7cmVzdWx0Lk1lc3NhZ2VJZH1gKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZW5kaW5nIGVtZXJnZW5jeSBzdGF0dXMgdXBkYXRlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIGVtZXJnZW5jeSBub3RpZmljYXRpb24gdG8gdG9waWNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNlbmRFbWVyZ2VuY3lOb3RpZmljYXRpb24obWVzc2FnZTogRW1lcmdlbmN5Tm90aWZpY2F0aW9uTWVzc2FnZSwgaGlnaFByaW9yaXR5OiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHN1YmplY3QgPSB0aGlzLmNyZWF0ZU5vdGlmaWNhdGlvblN1YmplY3QobWVzc2FnZSwgaGlnaFByaW9yaXR5KTtcclxuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSB0aGlzLmNyZWF0ZU5vdGlmaWNhdGlvbk1lc3NhZ2UobWVzc2FnZSk7XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1Ymxpc2hDb21tYW5kKHtcclxuICAgICAgICBUb3BpY0FybjogdGhpcy5lbWVyZ2VuY3lBbGVydFRvcGljQXJuLFxyXG4gICAgICAgIFN1YmplY3Q6IHN1YmplY3QsXHJcbiAgICAgICAgTWVzc2FnZTogbWVzc2FnZUJvZHksXHJcbiAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICdub3RpZmljYXRpb25fdHlwZSc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogbWVzc2FnZS50eXBlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3VyZ2VuY3lfbGV2ZWwnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UudXJnZW5jeUxldmVsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3NldmVyaXR5Jzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBtZXNzYWdlLnNldmVyaXR5XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VwaXNvZGVfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UuZXBpc29kZUlkXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2hpZ2hfcHJpb3JpdHknOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IGhpZ2hQcmlvcml0eS50b1N0cmluZygpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc25zQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBFbWVyZ2VuY3kgbm90aWZpY2F0aW9uIHNlbnQuIE1lc3NhZ2VJZDogJHtyZXN1bHQuTWVzc2FnZUlkfSwgVHlwZTogJHttZXNzYWdlLnR5cGV9YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBlbWVyZ2VuY3kgbm90aWZpY2F0aW9uOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIHN1cGVydmlzb3Itc3BlY2lmaWMgYWxlcnRcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNlbmRTdXBlcnZpc29yU3BlY2lmaWNBbGVydChtZXNzYWdlOiBFbWVyZ2VuY3lOb3RpZmljYXRpb25NZXNzYWdlLCBzdXBlcnZpc29ySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgc3ViamVjdCA9IGBbUEVSU09OQUwgQUxFUlRdICR7dGhpcy5jcmVhdGVOb3RpZmljYXRpb25TdWJqZWN0KG1lc3NhZ2UsIHRydWUpfWA7XHJcbiAgICAgIGNvbnN0IG1lc3NhZ2VCb2R5ID0gYFNVUEVSVklTT1I6ICR7c3VwZXJ2aXNvcklkfVxcblxcbiR7dGhpcy5jcmVhdGVOb3RpZmljYXRpb25NZXNzYWdlKG1lc3NhZ2UpfWA7XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1Ymxpc2hDb21tYW5kKHtcclxuICAgICAgICBUb3BpY0FybjogdGhpcy5lbWVyZ2VuY3lBbGVydFRvcGljQXJuLFxyXG4gICAgICAgIFN1YmplY3Q6IHN1YmplY3QsXHJcbiAgICAgICAgTWVzc2FnZTogbWVzc2FnZUJvZHksXHJcbiAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICdub3RpZmljYXRpb25fdHlwZSc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogYCR7bWVzc2FnZS50eXBlfV9wZXJzb25hbGBcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnc3VwZXJ2aXNvcl9pZCc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogc3VwZXJ2aXNvcklkXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VwaXNvZGVfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UuZXBpc29kZUlkXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ3BlcnNvbmFsX2FsZXJ0Jzoge1xyXG4gICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAndHJ1ZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zbnNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYFBlcnNvbmFsIGFsZXJ0IHNlbnQgdG8gc3VwZXJ2aXNvciAke3N1cGVydmlzb3JJZH0uIE1lc3NhZ2VJZDogJHtyZXN1bHQuTWVzc2FnZUlkfWApO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHNlbmRpbmcgcGVyc29uYWwgYWxlcnQgdG8gc3VwZXJ2aXNvciAke3N1cGVydmlzb3JJZH06YCwgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyBlcnJvciBmb3IgaW5kaXZpZHVhbCBzdXBlcnZpc29yIGZhaWx1cmVzXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIG5vdGlmaWNhdGlvbiB0byBzcGVjaWZpZWQgdG9waWNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNlbmROb3RpZmljYXRpb24obWVzc2FnZTogRW1lcmdlbmN5Tm90aWZpY2F0aW9uTWVzc2FnZSwgdG9waWNBcm46IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgc3ViamVjdCA9IHRoaXMuY3JlYXRlTm90aWZpY2F0aW9uU3ViamVjdChtZXNzYWdlLCBmYWxzZSk7XHJcbiAgICAgIGNvbnN0IG1lc3NhZ2VCb2R5ID0gdGhpcy5jcmVhdGVOb3RpZmljYXRpb25NZXNzYWdlKG1lc3NhZ2UpO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdWJsaXNoQ29tbWFuZCh7XHJcbiAgICAgICAgVG9waWNBcm46IHRvcGljQXJuLFxyXG4gICAgICAgIFN1YmplY3Q6IHN1YmplY3QsXHJcbiAgICAgICAgTWVzc2FnZTogbWVzc2FnZUJvZHksXHJcbiAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAgICdub3RpZmljYXRpb25fdHlwZSc6IHtcclxuICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICBTdHJpbmdWYWx1ZTogbWVzc2FnZS50eXBlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgJ2VwaXNvZGVfaWQnOiB7XHJcbiAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgU3RyaW5nVmFsdWU6IG1lc3NhZ2UuZXBpc29kZUlkXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc25zQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBOb3RpZmljYXRpb24gc2VudCB0byB0b3BpYy4gTWVzc2FnZUlkOiAke3Jlc3VsdC5NZXNzYWdlSWR9YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBub3RpZmljYXRpb246JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBub3RpZmljYXRpb24gc3ViamVjdCBsaW5lXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVOb3RpZmljYXRpb25TdWJqZWN0KG1lc3NhZ2U6IEVtZXJnZW5jeU5vdGlmaWNhdGlvbk1lc3NhZ2UsIGhpZ2hQcmlvcml0eTogYm9vbGVhbik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBwcmlvcml0eVByZWZpeCA9IGhpZ2hQcmlvcml0eSA/ICfwn5qoIFtVUkdFTlRdICcgOiAnJztcclxuICAgIGNvbnN0IHNldmVyaXR5UHJlZml4ID0gbWVzc2FnZS5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJyA/ICdbQ1JJVElDQUxdICcgOiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnNldmVyaXR5ID09PSAnaGlnaCcgPyAnW0hJR0hdICcgOiAnJztcclxuXHJcbiAgICBzd2l0Y2ggKG1lc3NhZ2UudHlwZSkge1xyXG4gICAgICBjYXNlICdpbW1lZGlhdGVfYWxlcnQnOlxyXG4gICAgICAgIHJldHVybiBgJHtwcmlvcml0eVByZWZpeH0ke3NldmVyaXR5UHJlZml4fUVNRVJHRU5DWSBBTEVSVCAtIEVwaXNvZGUgJHttZXNzYWdlLmVwaXNvZGVJZH1gO1xyXG4gICAgICBjYXNlICdlc2NhbGF0aW9uX2FsZXJ0JzpcclxuICAgICAgICByZXR1cm4gYCR7cHJpb3JpdHlQcmVmaXh9JHtzZXZlcml0eVByZWZpeH1FU0NBTEFUSU9OIFJFUVVJUkVEIC0gRXBpc29kZSAke21lc3NhZ2UuZXBpc29kZUlkfWA7XHJcbiAgICAgIGNhc2UgJ3Jlc3BvbnNlX2NvbmZpcm1hdGlvbic6XHJcbiAgICAgICAgcmV0dXJuIGBFbWVyZ2VuY3kgUmVzcG9uc2UgQ29uZmlybWVkIC0gRXBpc29kZSAke21lc3NhZ2UuZXBpc29kZUlkfWA7XHJcbiAgICAgIGNhc2UgJ3RpbWVvdXRfd2FybmluZyc6XHJcbiAgICAgICAgcmV0dXJuIGAke3ByaW9yaXR5UHJlZml4fVRJTUVPVVQgV0FSTklORyAtIEVwaXNvZGUgJHttZXNzYWdlLmVwaXNvZGVJZH1gO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHJldHVybiBgJHtwcmlvcml0eVByZWZpeH1FbWVyZ2VuY3kgTm90aWZpY2F0aW9uIC0gRXBpc29kZSAke21lc3NhZ2UuZXBpc29kZUlkfWA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgbm90aWZpY2F0aW9uIG1lc3NhZ2UgYm9keVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTm90aWZpY2F0aW9uTWVzc2FnZShtZXNzYWdlOiBFbWVyZ2VuY3lOb3RpZmljYXRpb25NZXNzYWdlKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGJhc2VJbmZvID0gYFxyXG7wn5qoIEVNRVJHRU5DWSBIRUFMVEhDQVJFIEFMRVJUIPCfmqhcclxuXHJcbkVwaXNvZGUgSUQ6ICR7bWVzc2FnZS5lcGlzb2RlSWR9XHJcblBhdGllbnQgSUQ6ICR7bWVzc2FnZS5wYXRpZW50SWR9XHJcblVyZ2VuY3kgTGV2ZWw6ICR7bWVzc2FnZS51cmdlbmN5TGV2ZWwudG9VcHBlckNhc2UoKX1cclxuU2V2ZXJpdHk6ICR7bWVzc2FnZS5zZXZlcml0eS50b1VwcGVyQ2FzZSgpfVxyXG5UaW1lc3RhbXA6ICR7bWVzc2FnZS50aW1lc3RhbXAudG9JU09TdHJpbmcoKX1cclxuQXNzaWduZWQgU3VwZXJ2aXNvcnM6ICR7bWVzc2FnZS5zdXBlcnZpc29ycy5qb2luKCcsICcpfVxyXG5gO1xyXG5cclxuICAgIHN3aXRjaCAobWVzc2FnZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgJ2ltbWVkaWF0ZV9hbGVydCc6XHJcbiAgICAgICAgcmV0dXJuIGAke2Jhc2VJbmZvfVxyXG5cclxu4pqhIElNTUVESUFURSBBVFRFTlRJT04gUkVRVUlSRUQg4pqhXHJcblxyXG5BbGVydCBUeXBlOiAke21lc3NhZ2UuZGV0YWlscy5hbGVydFR5cGV9XHJcbkFsZXJ0IElEOiAke21lc3NhZ2UuZGV0YWlscy5hbGVydElkfVxyXG5cclxuUEFUSUVOVCBTWU1QVE9NUzpcclxuLSBQcmltYXJ5IENvbXBsYWludDogJHttZXNzYWdlLmRldGFpbHMuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludH1cclxuLSBTZXZlcml0eTogJHttZXNzYWdlLmRldGFpbHMuc3ltcHRvbXMuc2V2ZXJpdHl9LzEwXHJcbi0gRHVyYXRpb246ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLmR1cmF0aW9ufVxyXG4tIEFzc29jaWF0ZWQgU3ltcHRvbXM6ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLmFzc29jaWF0ZWRTeW1wdG9tcy5qb2luKCcsICcpfVxyXG5cclxuVFJJQUdFIEFTU0VTU01FTlQ6XHJcbi0gVXJnZW5jeSBMZXZlbDogJHttZXNzYWdlLmRldGFpbHMudHJpYWdlLnVyZ2VuY3lMZXZlbH1cclxuLSBSdWxlLWJhc2VkIFNjb3JlOiAke21lc3NhZ2UuZGV0YWlscy50cmlhZ2UucnVsZUJhc2VkU2NvcmV9XHJcbi0gRmluYWwgU2NvcmU6ICR7bWVzc2FnZS5kZXRhaWxzLnRyaWFnZS5maW5hbFNjb3JlfVxyXG4tIEFJIEFzc2Vzc21lbnQgVXNlZDogJHttZXNzYWdlLmRldGFpbHMudHJpYWdlLmFpVXNlZCA/ICdZZXMnIDogJ05vJ31cclxuJHttZXNzYWdlLmRldGFpbHMudHJpYWdlLmFpVXNlZCA/IGAtIEFJIENvbmZpZGVuY2U6ICR7bWVzc2FnZS5kZXRhaWxzLnRyaWFnZS5haUNvbmZpZGVuY2V9YCA6ICcnfVxyXG4ke21lc3NhZ2UuZGV0YWlscy50cmlhZ2UuYWlSZWFzb25pbmcgPyBgLSBBSSBSZWFzb25pbmc6ICR7bWVzc2FnZS5kZXRhaWxzLnRyaWFnZS5haVJlYXNvbmluZ31gIDogJyd9XHJcblxyXG7wn5SlIElNTUVESUFURSBTVVBFUlZJU09SIFJFU1BPTlNFIFJFUVVJUkVEIPCflKVcclxuVGhpcyBjYXNlIHJlcXVpcmVzIHVyZ2VudCBhdHRlbnRpb24gYW5kIGltbWVkaWF0ZSBhY3Rpb24uXHJcbmA7XHJcblxyXG4gICAgICBjYXNlICdlc2NhbGF0aW9uX2FsZXJ0JzpcclxuICAgICAgICByZXR1cm4gYCR7YmFzZUluZm99XHJcblxyXG7wn5OIIEVTQ0FMQVRJT04gUFJPVE9DT0wgQUNUSVZBVEVEIPCfk4hcclxuXHJcbkVzY2FsYXRpb24gSUQ6ICR7bWVzc2FnZS5kZXRhaWxzLmVzY2FsYXRpb25JZH1cclxuRXNjYWxhdGlvbiBMZXZlbDogJHttZXNzYWdlLmRldGFpbHMuZXNjYWxhdGlvbkxldmVsLnRvVXBwZXJDYXNlKCl9XHJcbkVzY2FsYXRpb24gUmVhc29uOiAke21lc3NhZ2UuZGV0YWlscy5lc2NhbGF0aW9uUmVhc29ufVxyXG5VcmdlbnQgUmVzcG9uc2UgUmVxdWlyZWQ6ICR7bWVzc2FnZS5kZXRhaWxzLnVyZ2VudFJlc3BvbnNlID8gJ1lFUycgOiAnTk8nfVxyXG5UaW1lb3V0OiAke21lc3NhZ2UuZGV0YWlscy50aW1lb3V0TWludXRlc30gbWludXRlc1xyXG5DdXJyZW50IFdhaXQgVGltZTogJHttZXNzYWdlLmRldGFpbHMud2FpdFRpbWV9IG1pbnV0ZXNcclxuXHJcblBBVElFTlQgU1lNUFRPTVM6XHJcbi0gUHJpbWFyeSBDb21wbGFpbnQ6ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLnByaW1hcnlDb21wbGFpbnR9XHJcbi0gU2V2ZXJpdHk6ICR7bWVzc2FnZS5kZXRhaWxzLnN5bXB0b21zLnNldmVyaXR5fS8xMFxyXG4tIER1cmF0aW9uOiAke21lc3NhZ2UuZGV0YWlscy5zeW1wdG9tcy5kdXJhdGlvbn1cclxuXHJcbuKaoO+4jyBFU0NBTEFURUQgQ0FTRSBSRVFVSVJFUyBJTU1FRElBVEUgQVRURU5USU9OIOKaoO+4j1xyXG5UaGlzIGNhc2UgaGFzIGJlZW4gZXNjYWxhdGVkIGR1ZSB0byB0aW1lb3V0IG9yIHNldmVyaXR5IGNvbmNlcm5zLlxyXG5gO1xyXG5cclxuICAgICAgY2FzZSAncmVzcG9uc2VfY29uZmlybWF0aW9uJzpcclxuICAgICAgICByZXR1cm4gYCR7YmFzZUluZm99XHJcblxyXG7inIUgRU1FUkdFTkNZIFJFU1BPTlNFIENPTkZJUk1FRCDinIVcclxuXHJcblJlc3BvbmRpbmcgU3VwZXJ2aXNvcjogJHttZXNzYWdlLmRldGFpbHMuc3VwZXJ2aXNvcklkfVxyXG5SZXNwb25zZSBBY3Rpb246ICR7bWVzc2FnZS5kZXRhaWxzLnJlc3BvbnNlQWN0aW9ufVxyXG5SZXNwb25zZSBUaW1lOiAke21lc3NhZ2UuZGV0YWlscy5yZXNwb25zZVRpbWV9XHJcblRvdGFsIFJlc3BvbnNlIERlbGF5OiAke21lc3NhZ2UuZGV0YWlscy5yZXNwb25zZURlbGF5fSBtaW51dGVzXHJcbiR7bWVzc2FnZS5kZXRhaWxzLm5vdGVzID8gYE5vdGVzOiAke21lc3NhZ2UuZGV0YWlscy5ub3Rlc31gIDogJyd9XHJcblxyXG5FbWVyZ2VuY3kgcmVzcG9uc2UgaGFzIGJlZW4gYWNrbm93bGVkZ2VkIGFuZCBpcyBiZWluZyBoYW5kbGVkLlxyXG5gO1xyXG5cclxuICAgICAgY2FzZSAndGltZW91dF93YXJuaW5nJzpcclxuICAgICAgICByZXR1cm4gYCR7YmFzZUluZm99XHJcblxyXG7ij7AgVElNRU9VVCBXQVJOSU5HIOKPsFxyXG5cclxuQWxlcnQgSUQ6ICR7bWVzc2FnZS5kZXRhaWxzLmFsZXJ0SWR9XHJcbk1pbnV0ZXMgUmVtYWluaW5nOiAke21lc3NhZ2UuZGV0YWlscy5taW51dGVzUmVtYWluaW5nfVxyXG5Ub3RhbCBXYWl0IFRpbWU6ICR7bWVzc2FnZS5kZXRhaWxzLnRvdGFsV2FpdFRpbWV9IG1pbnV0ZXNcclxuRXNjYWxhdGlvbiBJbW1pbmVudDogJHttZXNzYWdlLmRldGFpbHMuZXNjYWxhdGlvbkltbWluZW50ID8gJ1lFUyAtIElNTUVESUFURSBBQ1RJT04gUkVRVUlSRUQnIDogJ05PJ31cclxuXHJcbiR7bWVzc2FnZS5kZXRhaWxzLmVzY2FsYXRpb25JbW1pbmVudCA/IFxyXG4gICfwn5qoIENSSVRJQ0FMOiBUaGlzIGNhc2Ugd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGVzY2FsYXRlZCBpbiBsZXNzIHRoYW4gMiBtaW51dGVzIScgOlxyXG4gICdUaGlzIGNhc2UgaXMgYXBwcm9hY2hpbmcgdGltZW91dCBhbmQgbWF5IGJlIGVzY2FsYXRlZCBzb29uLidcclxufVxyXG5gO1xyXG5cclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gYCR7YmFzZUluZm99XFxuJHtKU09OLnN0cmluZ2lmeShtZXNzYWdlLmRldGFpbHMsIG51bGwsIDIpfWA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgc3RhdHVzIHVwZGF0ZSBtZXNzYWdlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVTdGF0dXNVcGRhdGVNZXNzYWdlKHN0YXRzOiBhbnkpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGBcclxuRW1lcmdlbmN5IEhlYWx0aGNhcmUgU3lzdGVtIFN0YXR1cyBVcGRhdGVcclxuXHJcbvCfk4ogQ1VSUkVOVCBTVEFUSVNUSUNTOlxyXG4tIEFjdGl2ZSBFbWVyZ2VuY3kgQ2FzZXM6ICR7c3RhdHMuYWN0aXZlRW1lcmdlbmNpZXN9XHJcbi0gQ3JpdGljYWwgQ2FzZXM6ICR7c3RhdHMuY3JpdGljYWxDb3VudH1cclxuLSBBdmVyYWdlIFJlc3BvbnNlIFRpbWU6ICR7c3RhdHMuYXZlcmFnZVJlc3BvbnNlVGltZX0gbWludXRlc1xyXG4tIE92ZXJkdWUgQ2FzZXM6ICR7c3RhdHMub3ZlcmR1ZUNvdW50fVxyXG5cclxuJHtzdGF0cy5jcml0aWNhbENvdW50ID4gMCA/ICfwn5qoIENSSVRJQ0FMIENBU0VTIFJFUVVJUkUgSU1NRURJQVRFIEFUVEVOVElPTicgOiAnJ31cclxuJHtzdGF0cy5vdmVyZHVlQ291bnQgPiAwID8gJ+KaoO+4jyBPVkVSRFVFIENBU0VTIE5FRUQgRVNDQUxBVElPTicgOiAnJ31cclxuXHJcblN5c3RlbSBTdGF0dXM6ICR7c3RhdHMuYWN0aXZlRW1lcmdlbmNpZXMgPT09IDAgPyAnTk9STUFMJyA6IFxyXG4gICAgICAgICAgICAgICAgc3RhdHMuY3JpdGljYWxDb3VudCA+IDUgPyAnQ1JJVElDQUwgTE9BRCcgOiBcclxuICAgICAgICAgICAgICAgIHN0YXRzLmFjdGl2ZUVtZXJnZW5jaWVzID4gMTAgPyAnSElHSCBMT0FEJyA6ICdBQ1RJVkUnfVxyXG5gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIHdhaXQgdGltZSBpbiBtaW51dGVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVXYWl0VGltZShjcmVhdGVkQXQ6IERhdGUgfCBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgY29uc3QgY3JlYXRlZCA9IG5ldyBEYXRlKGNyZWF0ZWRBdCk7XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoKG5vdy5nZXRUaW1lKCkgLSBjcmVhdGVkLmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwKSk7XHJcbiAgfVxyXG59Il19