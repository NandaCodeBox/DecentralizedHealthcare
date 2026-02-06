"use strict";
// Emergency Alert System Lambda Function
// Implements immediate supervisor alerting for emergency situations
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_sns_1 = require("@aws-sdk/client-sns");
const types_1 = require("../../types");
const emergency_alert_service_1 = require("./emergency-alert-service");
const escalation_protocol_service_1 = require("./escalation-protocol-service");
const emergency_notification_service_1 = require("./emergency-notification-service");
// Initialize AWS clients
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new client_sns_1.SNSClient({});
// Environment variables
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME;
const EMERGENCY_ALERT_TOPIC_ARN = process.env.EMERGENCY_ALERT_TOPIC_ARN;
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN;
/**
 * Emergency Alert System Lambda Handler
 * Handles immediate supervisor alerting for emergency situations
 */
const handler = async (event) => {
    console.log('Emergency alert function called', JSON.stringify(event, null, 2));
    try {
        // Initialize services
        const alertService = new emergency_alert_service_1.EmergencyAlertService(docClient, snsClient, EPISODE_TABLE_NAME, EMERGENCY_ALERT_TOPIC_ARN);
        const escalationService = new escalation_protocol_service_1.EscalationProtocolService(docClient, snsClient, EPISODE_TABLE_NAME, EMERGENCY_ALERT_TOPIC_ARN);
        const notificationService = new emergency_notification_service_1.EmergencyNotificationService(snsClient, EMERGENCY_ALERT_TOPIC_ARN, NOTIFICATION_TOPIC_ARN);
        const httpMethod = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        switch (httpMethod) {
            case 'POST':
                if (event.path?.includes('/alert')) {
                    return await handleEmergencyAlert(body, alertService, notificationService);
                }
                else if (event.path?.includes('/escalate')) {
                    return await handleEmergencyEscalation(body, escalationService, notificationService);
                }
                else {
                    return await processEmergencyCase(body, alertService, escalationService, notificationService);
                }
            case 'GET':
                if (pathParameters.episodeId) {
                    return await getEmergencyStatus(pathParameters.episodeId, alertService);
                }
                else {
                    return await getEmergencyQueue(event.queryStringParameters || {}, alertService);
                }
            case 'PUT':
                return await updateEmergencyResponse(body, alertService, notificationService);
            default:
                return {
                    statusCode: 405,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: 'Method not allowed'
                    }),
                };
        }
    }
    catch (error) {
        console.error('Error in emergency alert system:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Internal server error in emergency alert system'
            }),
        };
    }
};
exports.handler = handler;
/**
 * Handle emergency alert request
 */
async function handleEmergencyAlert(body, alertService, notificationService) {
    const { episodeId, alertType, severity, additionalInfo } = body;
    if (!episodeId || !alertType) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Missing required fields: episodeId, alertType'
            }),
        };
    }
    try {
        // Process emergency alert
        const alertResult = await alertService.processEmergencyAlert(episodeId, alertType, severity, additionalInfo);
        // Send immediate notifications
        await notificationService.sendImmediateAlert(alertResult.episode, alertResult.alertDetails);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Emergency alert processed successfully',
                alertId: alertResult.alertId,
                episodeId,
                alertType,
                severity: alertResult.severity,
                notificationsSent: alertResult.notificationsSent,
                estimatedResponseTime: alertResult.estimatedResponseTime
            }),
        };
    }
    catch (error) {
        console.error('Error processing emergency alert:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to process emergency alert'
            }),
        };
    }
}
/**
 * Handle emergency escalation
 */
async function handleEmergencyEscalation(body, escalationService, notificationService) {
    const { episodeId, escalationReason, targetLevel, urgentResponse } = body;
    if (!episodeId || !escalationReason) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Missing required fields: episodeId, escalationReason'
            }),
        };
    }
    try {
        // Process escalation
        const escalationResult = await escalationService.processEscalation(episodeId, escalationReason, targetLevel, urgentResponse);
        // Send escalation notifications
        await notificationService.sendEscalationAlert(escalationResult.episode, escalationResult.escalationDetails);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Emergency escalation processed successfully',
                escalationId: escalationResult.escalationId,
                episodeId,
                targetLevel: escalationResult.targetLevel,
                assignedSupervisors: escalationResult.assignedSupervisors,
                expectedResponseTime: escalationResult.expectedResponseTime
            }),
        };
    }
    catch (error) {
        console.error('Error processing emergency escalation:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to process emergency escalation'
            }),
        };
    }
}
/**
 * Process emergency case (main entry point)
 */
async function processEmergencyCase(body, alertService, escalationService, notificationService) {
    const { episodeId } = body;
    if (!episodeId) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Missing required field: episodeId'
            }),
        };
    }
    try {
        // Get episode details
        const episode = await getEpisode(episodeId, docClient);
        if (!episode) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Episode not found'
                }),
            };
        }
        // Check if this is an emergency case
        const isEmergency = episode.triage?.urgencyLevel === types_1.UrgencyLevel.EMERGENCY;
        if (!isEmergency) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Episode is not classified as emergency'
                }),
            };
        }
        // Process emergency alert
        const alertResult = await alertService.processEmergencyAlert(episodeId, 'emergency_case', 'high', {
            symptoms: episode.symptoms,
            triage: episode.triage
        });
        // Send immediate notifications
        await notificationService.sendImmediateAlert(episode, alertResult.alertDetails);
        // Check if escalation is needed
        const needsEscalation = await escalationService.assessEscalationNeed(episode);
        if (needsEscalation.required) {
            const escalationResult = await escalationService.processEscalation(episodeId, needsEscalation.reason, needsEscalation.targetLevel, true);
            await notificationService.sendEscalationAlert(episode, escalationResult.escalationDetails);
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Emergency case processed successfully',
                episodeId,
                alertId: alertResult.alertId,
                escalated: needsEscalation.required,
                notificationsSent: alertResult.notificationsSent,
                estimatedResponseTime: alertResult.estimatedResponseTime
            }),
        };
    }
    catch (error) {
        console.error('Error processing emergency case:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to process emergency case'
            }),
        };
    }
}
/**
 * Get emergency status for episode
 */
async function getEmergencyStatus(episodeId, alertService) {
    try {
        const status = await alertService.getEmergencyStatus(episodeId);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(status),
        };
    }
    catch (error) {
        console.error('Error getting emergency status:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to get emergency status'
            }),
        };
    }
}
/**
 * Get emergency queue
 */
async function getEmergencyQueue(queryParams, alertService) {
    try {
        const supervisorId = queryParams.supervisorId;
        const limit = parseInt(queryParams.limit || '20');
        const queue = await alertService.getEmergencyQueue(supervisorId, limit);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                queue,
                totalItems: queue.length,
                supervisorId
            }),
        };
    }
    catch (error) {
        console.error('Error getting emergency queue:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to get emergency queue'
            }),
        };
    }
}
/**
 * Update emergency response
 */
async function updateEmergencyResponse(body, alertService, notificationService) {
    const { episodeId, supervisorId, responseAction, notes } = body;
    if (!episodeId || !supervisorId || !responseAction) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Missing required fields: episodeId, supervisorId, responseAction'
            }),
        };
    }
    try {
        const updateResult = await alertService.updateEmergencyResponse(episodeId, supervisorId, responseAction, notes);
        // Send response confirmation
        await notificationService.sendResponseConfirmation(updateResult.episode, updateResult.responseDetails);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Emergency response updated successfully',
                episodeId,
                responseAction,
                supervisorId,
                timestamp: updateResult.timestamp
            }),
        };
    }
    catch (error) {
        console.error('Error updating emergency response:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to update emergency response'
            }),
        };
    }
}
/**
 * Retrieve episode from DynamoDB
 */
async function getEpisode(episodeId, docClient) {
    try {
        const command = new lib_dynamodb_1.GetCommand({
            TableName: EPISODE_TABLE_NAME,
            Key: { episodeId }
        });
        const result = await docClient.send(command);
        return result.Item || null;
    }
    catch (error) {
        console.error('Error retrieving episode:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL2VtZXJnZW5jeS1hbGVydC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEseUNBQXlDO0FBQ3pDLG9FQUFvRTtBQUNwRSxvQkFBb0I7OztBQUdwQiw4REFBMEQ7QUFDMUQsd0RBQXdHO0FBQ3hHLG9EQUFnRTtBQUNoRSx1Q0FBbUU7QUFDbkUsdUVBQWtFO0FBQ2xFLCtFQUEwRTtBQUMxRSxxRkFBZ0Y7QUFFaEYseUJBQXlCO0FBQ3pCLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDNUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRXBDLHdCQUF3QjtBQUN4QixNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQW1CLENBQUM7QUFDM0QsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUEwQixDQUFDO0FBQ3pFLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBdUIsQ0FBQztBQUVuRTs7O0dBR0c7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRS9FLElBQUksQ0FBQztRQUNILHNCQUFzQjtRQUN0QixNQUFNLFlBQVksR0FBRyxJQUFJLCtDQUFxQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNwSCxNQUFNLGlC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QUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEVtZXJnZW5jeSBBbGVydCBTeXN0ZW0gTGFtYmRhIEZ1bmN0aW9uXHJcbi8vIEltcGxlbWVudHMgaW1tZWRpYXRlIHN1cGVydmlzb3IgYWxlcnRpbmcgZm9yIGVtZXJnZW5jeSBzaXR1YXRpb25zXHJcbi8vIFJlcXVpcmVtZW50czogNy4yXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgR2V0Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBVcmdlbmN5TGV2ZWwsIEVwaXNvZGVTdGF0dXMgfSBmcm9tICcuLi8uLi90eXBlcyc7XHJcbmltcG9ydCB7IEVtZXJnZW5jeUFsZXJ0U2VydmljZSB9IGZyb20gJy4vZW1lcmdlbmN5LWFsZXJ0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBFc2NhbGF0aW9uUHJvdG9jb2xTZXJ2aWNlIH0gZnJvbSAnLi9lc2NhbGF0aW9uLXByb3RvY29sLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBFbWVyZ2VuY3lOb3RpZmljYXRpb25TZXJ2aWNlIH0gZnJvbSAnLi9lbWVyZ2VuY3ktbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5cclxuLy8gSW5pdGlhbGl6ZSBBV1MgY2xpZW50c1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50KTtcclxuY29uc3Qgc25zQ2xpZW50ID0gbmV3IFNOU0NsaWVudCh7fSk7XHJcblxyXG4vLyBFbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuY29uc3QgRVBJU09ERV9UQUJMRV9OQU1FID0gcHJvY2Vzcy5lbnYuRVBJU09ERV9UQUJMRV9OQU1FITtcclxuY29uc3QgRU1FUkdFTkNZX0FMRVJUX1RPUElDX0FSTiA9IHByb2Nlc3MuZW52LkVNRVJHRU5DWV9BTEVSVF9UT1BJQ19BUk4hO1xyXG5jb25zdCBOT1RJRklDQVRJT05fVE9QSUNfQVJOID0gcHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX1RPUElDX0FSTiE7XHJcblxyXG4vKipcclxuICogRW1lcmdlbmN5IEFsZXJ0IFN5c3RlbSBMYW1iZGEgSGFuZGxlclxyXG4gKiBIYW5kbGVzIGltbWVkaWF0ZSBzdXBlcnZpc29yIGFsZXJ0aW5nIGZvciBlbWVyZ2VuY3kgc2l0dWF0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnRW1lcmdlbmN5IGFsZXJ0IGZ1bmN0aW9uIGNhbGxlZCcsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBJbml0aWFsaXplIHNlcnZpY2VzXHJcbiAgICBjb25zdCBhbGVydFNlcnZpY2UgPSBuZXcgRW1lcmdlbmN5QWxlcnRTZXJ2aWNlKGRvY0NsaWVudCwgc25zQ2xpZW50LCBFUElTT0RFX1RBQkxFX05BTUUsIEVNRVJHRU5DWV9BTEVSVF9UT1BJQ19BUk4pO1xyXG4gICAgY29uc3QgZXNjYWxhdGlvblNlcnZpY2UgPSBuZXcgRXNjYWxhdGlvblByb3RvY29sU2VydmljZShkb2NDbGllbnQsIHNuc0NsaWVudCwgRVBJU09ERV9UQUJMRV9OQU1FLCBFTUVSR0VOQ1lfQUxFUlRfVE9QSUNfQVJOKTtcclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblNlcnZpY2UgPSBuZXcgRW1lcmdlbmN5Tm90aWZpY2F0aW9uU2VydmljZShzbnNDbGllbnQsIEVNRVJHRU5DWV9BTEVSVF9UT1BJQ19BUk4sIE5PVElGSUNBVElPTl9UT1BJQ19BUk4pO1xyXG5cclxuICAgIGNvbnN0IGh0dHBNZXRob2QgPSBldmVudC5odHRwTWV0aG9kO1xyXG4gICAgY29uc3QgcGF0aFBhcmFtZXRlcnMgPSBldmVudC5wYXRoUGFyYW1ldGVycyB8fCB7fTtcclxuICAgIGNvbnN0IGJvZHkgPSBldmVudC5ib2R5ID8gSlNPTi5wYXJzZShldmVudC5ib2R5KSA6IHt9O1xyXG5cclxuICAgIHN3aXRjaCAoaHR0cE1ldGhvZCkge1xyXG4gICAgICBjYXNlICdQT1NUJzpcclxuICAgICAgICBpZiAoZXZlbnQucGF0aD8uaW5jbHVkZXMoJy9hbGVydCcpKSB7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlRW1lcmdlbmN5QWxlcnQoYm9keSwgYWxlcnRTZXJ2aWNlLCBub3RpZmljYXRpb25TZXJ2aWNlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LnBhdGg/LmluY2x1ZGVzKCcvZXNjYWxhdGUnKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZUVtZXJnZW5jeUVzY2FsYXRpb24oYm9keSwgZXNjYWxhdGlvblNlcnZpY2UsIG5vdGlmaWNhdGlvblNlcnZpY2UpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgcHJvY2Vzc0VtZXJnZW5jeUNhc2UoYm9keSwgYWxlcnRTZXJ2aWNlLCBlc2NhbGF0aW9uU2VydmljZSwgbm90aWZpY2F0aW9uU2VydmljZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICBjYXNlICdHRVQnOlxyXG4gICAgICAgIGlmIChwYXRoUGFyYW1ldGVycy5lcGlzb2RlSWQpIHtcclxuICAgICAgICAgIHJldHVybiBhd2FpdCBnZXRFbWVyZ2VuY3lTdGF0dXMocGF0aFBhcmFtZXRlcnMuZXBpc29kZUlkLCBhbGVydFNlcnZpY2UpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0RW1lcmdlbmN5UXVldWUoZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9LCBhbGVydFNlcnZpY2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgY2FzZSAnUFVUJzpcclxuICAgICAgICByZXR1cm4gYXdhaXQgdXBkYXRlRW1lcmdlbmN5UmVzcG9uc2UoYm9keSwgYWxlcnRTZXJ2aWNlLCBub3RpZmljYXRpb25TZXJ2aWNlKTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDA1LFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gZW1lcmdlbmN5IGFsZXJ0IHN5c3RlbTonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvciBpbiBlbWVyZ2VuY3kgYWxlcnQgc3lzdGVtJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBlbWVyZ2VuY3kgYWxlcnQgcmVxdWVzdFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRW1lcmdlbmN5QWxlcnQoXHJcbiAgYm9keTogYW55LFxyXG4gIGFsZXJ0U2VydmljZTogRW1lcmdlbmN5QWxlcnRTZXJ2aWNlLFxyXG4gIG5vdGlmaWNhdGlvblNlcnZpY2U6IEVtZXJnZW5jeU5vdGlmaWNhdGlvblNlcnZpY2VcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBjb25zdCB7IGVwaXNvZGVJZCwgYWxlcnRUeXBlLCBzZXZlcml0eSwgYWRkaXRpb25hbEluZm8gfSA9IGJvZHk7XHJcblxyXG4gIGlmICghZXBpc29kZUlkIHx8ICFhbGVydFR5cGUpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6IGVwaXNvZGVJZCwgYWxlcnRUeXBlJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgLy8gUHJvY2VzcyBlbWVyZ2VuY3kgYWxlcnRcclxuICAgIGNvbnN0IGFsZXJ0UmVzdWx0ID0gYXdhaXQgYWxlcnRTZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydChlcGlzb2RlSWQsIGFsZXJ0VHlwZSwgc2V2ZXJpdHksIGFkZGl0aW9uYWxJbmZvKTtcclxuXHJcbiAgICAvLyBTZW5kIGltbWVkaWF0ZSBub3RpZmljYXRpb25zXHJcbiAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLnNlbmRJbW1lZGlhdGVBbGVydChhbGVydFJlc3VsdC5lcGlzb2RlLCBhbGVydFJlc3VsdC5hbGVydERldGFpbHMpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIG1lc3NhZ2U6ICdFbWVyZ2VuY3kgYWxlcnQgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgYWxlcnRJZDogYWxlcnRSZXN1bHQuYWxlcnRJZCxcclxuICAgICAgICBlcGlzb2RlSWQsXHJcbiAgICAgICAgYWxlcnRUeXBlLFxyXG4gICAgICAgIHNldmVyaXR5OiBhbGVydFJlc3VsdC5zZXZlcml0eSxcclxuICAgICAgICBub3RpZmljYXRpb25zU2VudDogYWxlcnRSZXN1bHQubm90aWZpY2F0aW9uc1NlbnQsXHJcbiAgICAgICAgZXN0aW1hdGVkUmVzcG9uc2VUaW1lOiBhbGVydFJlc3VsdC5lc3RpbWF0ZWRSZXNwb25zZVRpbWVcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIGVtZXJnZW5jeSBhbGVydDonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBwcm9jZXNzIGVtZXJnZW5jeSBhbGVydCdcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBlbWVyZ2VuY3kgZXNjYWxhdGlvblxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRW1lcmdlbmN5RXNjYWxhdGlvbihcclxuICBib2R5OiBhbnksXHJcbiAgZXNjYWxhdGlvblNlcnZpY2U6IEVzY2FsYXRpb25Qcm90b2NvbFNlcnZpY2UsXHJcbiAgbm90aWZpY2F0aW9uU2VydmljZTogRW1lcmdlbmN5Tm90aWZpY2F0aW9uU2VydmljZVxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIGNvbnN0IHsgZXBpc29kZUlkLCBlc2NhbGF0aW9uUmVhc29uLCB0YXJnZXRMZXZlbCwgdXJnZW50UmVzcG9uc2UgfSA9IGJvZHk7XHJcblxyXG4gIGlmICghZXBpc29kZUlkIHx8ICFlc2NhbGF0aW9uUmVhc29uKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBlcGlzb2RlSWQsIGVzY2FsYXRpb25SZWFzb24nXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBQcm9jZXNzIGVzY2FsYXRpb25cclxuICAgIGNvbnN0IGVzY2FsYXRpb25SZXN1bHQgPSBhd2FpdCBlc2NhbGF0aW9uU2VydmljZS5wcm9jZXNzRXNjYWxhdGlvbihlcGlzb2RlSWQsIGVzY2FsYXRpb25SZWFzb24sIHRhcmdldExldmVsLCB1cmdlbnRSZXNwb25zZSk7XHJcblxyXG4gICAgLy8gU2VuZCBlc2NhbGF0aW9uIG5vdGlmaWNhdGlvbnNcclxuICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uuc2VuZEVzY2FsYXRpb25BbGVydChlc2NhbGF0aW9uUmVzdWx0LmVwaXNvZGUsIGVzY2FsYXRpb25SZXN1bHQuZXNjYWxhdGlvbkRldGFpbHMpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIG1lc3NhZ2U6ICdFbWVyZ2VuY3kgZXNjYWxhdGlvbiBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBlc2NhbGF0aW9uSWQ6IGVzY2FsYXRpb25SZXN1bHQuZXNjYWxhdGlvbklkLFxyXG4gICAgICAgIGVwaXNvZGVJZCxcclxuICAgICAgICB0YXJnZXRMZXZlbDogZXNjYWxhdGlvblJlc3VsdC50YXJnZXRMZXZlbCxcclxuICAgICAgICBhc3NpZ25lZFN1cGVydmlzb3JzOiBlc2NhbGF0aW9uUmVzdWx0LmFzc2lnbmVkU3VwZXJ2aXNvcnMsXHJcbiAgICAgICAgZXhwZWN0ZWRSZXNwb25zZVRpbWU6IGVzY2FsYXRpb25SZXN1bHQuZXhwZWN0ZWRSZXNwb25zZVRpbWVcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIGVtZXJnZW5jeSBlc2NhbGF0aW9uOicsIGVycm9yKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIHByb2Nlc3MgZW1lcmdlbmN5IGVzY2FsYXRpb24nXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGVtZXJnZW5jeSBjYXNlIChtYWluIGVudHJ5IHBvaW50KVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0VtZXJnZW5jeUNhc2UoXHJcbiAgYm9keTogYW55LFxyXG4gIGFsZXJ0U2VydmljZTogRW1lcmdlbmN5QWxlcnRTZXJ2aWNlLFxyXG4gIGVzY2FsYXRpb25TZXJ2aWNlOiBFc2NhbGF0aW9uUHJvdG9jb2xTZXJ2aWNlLFxyXG4gIG5vdGlmaWNhdGlvblNlcnZpY2U6IEVtZXJnZW5jeU5vdGlmaWNhdGlvblNlcnZpY2VcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBjb25zdCB7IGVwaXNvZGVJZCB9ID0gYm9keTtcclxuXHJcbiAgaWYgKCFlcGlzb2RlSWQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBmaWVsZDogZXBpc29kZUlkJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IGVwaXNvZGUgZGV0YWlsc1xyXG4gICAgY29uc3QgZXBpc29kZSA9IGF3YWl0IGdldEVwaXNvZGUoZXBpc29kZUlkLCBkb2NDbGllbnQpO1xyXG4gICAgaWYgKCFlcGlzb2RlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdFcGlzb2RlIG5vdCBmb3VuZCdcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGFuIGVtZXJnZW5jeSBjYXNlXHJcbiAgICBjb25zdCBpc0VtZXJnZW5jeSA9IGVwaXNvZGUudHJpYWdlPy51cmdlbmN5TGV2ZWwgPT09IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1k7XHJcbiAgICBpZiAoIWlzRW1lcmdlbmN5KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdFcGlzb2RlIGlzIG5vdCBjbGFzc2lmaWVkIGFzIGVtZXJnZW5jeSdcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcm9jZXNzIGVtZXJnZW5jeSBhbGVydFxyXG4gICAgY29uc3QgYWxlcnRSZXN1bHQgPSBhd2FpdCBhbGVydFNlcnZpY2UucHJvY2Vzc0VtZXJnZW5jeUFsZXJ0KGVwaXNvZGVJZCwgJ2VtZXJnZW5jeV9jYXNlJywgJ2hpZ2gnLCB7XHJcbiAgICAgIHN5bXB0b21zOiBlcGlzb2RlLnN5bXB0b21zLFxyXG4gICAgICB0cmlhZ2U6IGVwaXNvZGUudHJpYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZW5kIGltbWVkaWF0ZSBub3RpZmljYXRpb25zXHJcbiAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLnNlbmRJbW1lZGlhdGVBbGVydChlcGlzb2RlLCBhbGVydFJlc3VsdC5hbGVydERldGFpbHMpO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGVzY2FsYXRpb24gaXMgbmVlZGVkXHJcbiAgICBjb25zdCBuZWVkc0VzY2FsYXRpb24gPSBhd2FpdCBlc2NhbGF0aW9uU2VydmljZS5hc3Nlc3NFc2NhbGF0aW9uTmVlZChlcGlzb2RlKTtcclxuICAgIGlmIChuZWVkc0VzY2FsYXRpb24ucmVxdWlyZWQpIHtcclxuICAgICAgY29uc3QgZXNjYWxhdGlvblJlc3VsdCA9IGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLnByb2Nlc3NFc2NhbGF0aW9uKFxyXG4gICAgICAgIGVwaXNvZGVJZCwgXHJcbiAgICAgICAgbmVlZHNFc2NhbGF0aW9uLnJlYXNvbiwgXHJcbiAgICAgICAgbmVlZHNFc2NhbGF0aW9uLnRhcmdldExldmVsLCBcclxuICAgICAgICB0cnVlXHJcbiAgICAgICk7XHJcbiAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uuc2VuZEVzY2FsYXRpb25BbGVydChlcGlzb2RlLCBlc2NhbGF0aW9uUmVzdWx0LmVzY2FsYXRpb25EZXRhaWxzKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBtZXNzYWdlOiAnRW1lcmdlbmN5IGNhc2UgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgZXBpc29kZUlkLFxyXG4gICAgICAgIGFsZXJ0SWQ6IGFsZXJ0UmVzdWx0LmFsZXJ0SWQsXHJcbiAgICAgICAgZXNjYWxhdGVkOiBuZWVkc0VzY2FsYXRpb24ucmVxdWlyZWQsXHJcbiAgICAgICAgbm90aWZpY2F0aW9uc1NlbnQ6IGFsZXJ0UmVzdWx0Lm5vdGlmaWNhdGlvbnNTZW50LFxyXG4gICAgICAgIGVzdGltYXRlZFJlc3BvbnNlVGltZTogYWxlcnRSZXN1bHQuZXN0aW1hdGVkUmVzcG9uc2VUaW1lXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBlbWVyZ2VuY3kgY2FzZTonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBwcm9jZXNzIGVtZXJnZW5jeSBjYXNlJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IGVtZXJnZW5jeSBzdGF0dXMgZm9yIGVwaXNvZGVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEVtZXJnZW5jeVN0YXR1cyhcclxuICBlcGlzb2RlSWQ6IHN0cmluZyxcclxuICBhbGVydFNlcnZpY2U6IEVtZXJnZW5jeUFsZXJ0U2VydmljZVxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBhbGVydFNlcnZpY2UuZ2V0RW1lcmdlbmN5U3RhdHVzKGVwaXNvZGVJZCk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoc3RhdHVzKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZW1lcmdlbmN5IHN0YXR1czonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgZW1lcmdlbmN5IHN0YXR1cydcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBlbWVyZ2VuY3kgcXVldWVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEVtZXJnZW5jeVF1ZXVlKFxyXG4gIHF1ZXJ5UGFyYW1zOiBhbnksXHJcbiAgYWxlcnRTZXJ2aWNlOiBFbWVyZ2VuY3lBbGVydFNlcnZpY2VcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3Qgc3VwZXJ2aXNvcklkID0gcXVlcnlQYXJhbXMuc3VwZXJ2aXNvcklkO1xyXG4gICAgY29uc3QgbGltaXQgPSBwYXJzZUludChxdWVyeVBhcmFtcy5saW1pdCB8fCAnMjAnKTtcclxuICAgIFxyXG4gICAgY29uc3QgcXVldWUgPSBhd2FpdCBhbGVydFNlcnZpY2UuZ2V0RW1lcmdlbmN5UXVldWUoc3VwZXJ2aXNvcklkLCBsaW1pdCk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHF1ZXVlLFxyXG4gICAgICAgIHRvdGFsSXRlbXM6IHF1ZXVlLmxlbmd0aCxcclxuICAgICAgICBzdXBlcnZpc29ySWRcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGVtZXJnZW5jeSBxdWV1ZTonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgZW1lcmdlbmN5IHF1ZXVlJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGVtZXJnZW5jeSByZXNwb25zZVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlRW1lcmdlbmN5UmVzcG9uc2UoXHJcbiAgYm9keTogYW55LFxyXG4gIGFsZXJ0U2VydmljZTogRW1lcmdlbmN5QWxlcnRTZXJ2aWNlLFxyXG4gIG5vdGlmaWNhdGlvblNlcnZpY2U6IEVtZXJnZW5jeU5vdGlmaWNhdGlvblNlcnZpY2VcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBjb25zdCB7IGVwaXNvZGVJZCwgc3VwZXJ2aXNvcklkLCByZXNwb25zZUFjdGlvbiwgbm90ZXMgfSA9IGJvZHk7XHJcblxyXG4gIGlmICghZXBpc29kZUlkIHx8ICFzdXBlcnZpc29ySWQgfHwgIXJlc3BvbnNlQWN0aW9uKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBlcGlzb2RlSWQsIHN1cGVydmlzb3JJZCwgcmVzcG9uc2VBY3Rpb24nXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB1cGRhdGVSZXN1bHQgPSBhd2FpdCBhbGVydFNlcnZpY2UudXBkYXRlRW1lcmdlbmN5UmVzcG9uc2UoZXBpc29kZUlkLCBzdXBlcnZpc29ySWQsIHJlc3BvbnNlQWN0aW9uLCBub3Rlcyk7XHJcbiAgICBcclxuICAgIC8vIFNlbmQgcmVzcG9uc2UgY29uZmlybWF0aW9uXHJcbiAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLnNlbmRSZXNwb25zZUNvbmZpcm1hdGlvbih1cGRhdGVSZXN1bHQuZXBpc29kZSwgdXBkYXRlUmVzdWx0LnJlc3BvbnNlRGV0YWlscyk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgbWVzc2FnZTogJ0VtZXJnZW5jeSByZXNwb25zZSB1cGRhdGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgZXBpc29kZUlkLFxyXG4gICAgICAgIHJlc3BvbnNlQWN0aW9uLFxyXG4gICAgICAgIHN1cGVydmlzb3JJZCxcclxuICAgICAgICB0aW1lc3RhbXA6IHVwZGF0ZVJlc3VsdC50aW1lc3RhbXBcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBlbWVyZ2VuY3kgcmVzcG9uc2U6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gdXBkYXRlIGVtZXJnZW5jeSByZXNwb25zZSdcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJpZXZlIGVwaXNvZGUgZnJvbSBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0RXBpc29kZShlcGlzb2RlSWQ6IHN0cmluZywgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50KTogUHJvbWlzZTxFcGlzb2RlIHwgbnVsbD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IEVQSVNPREVfVEFCTEVfTkFNRSxcclxuICAgICAgS2V5OiB7IGVwaXNvZGVJZCB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBFcGlzb2RlIHx8IG51bGw7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJldHJpZXZpbmcgZXBpc29kZTonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn0iXX0=