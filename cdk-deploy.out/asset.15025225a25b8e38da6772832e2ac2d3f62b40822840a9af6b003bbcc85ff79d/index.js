"use strict";
// Human Validation Workflow Lambda Function
// Implements validation queue management for AI recommendations
// Requirements: 2.4, 7.1, 7.3, 7.4, 7.5
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_sns_1 = require("@aws-sdk/client-sns");
const types_1 = require("../../types");
const validation_1 = require("../../validation");
const validation_queue_manager_1 = require("./validation-queue-manager");
const supervisor_notification_service_1 = require("./supervisor-notification-service");
const escalation_service_1 = require("./escalation-service");
// Initialize AWS clients
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new client_sns_1.SNSClient({});
// Environment variables
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME;
const NOTIFICATION_TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN;
const EMERGENCY_ALERT_TOPIC_ARN = process.env.EMERGENCY_ALERT_TOPIC_ARN;
/**
 * Human Validation Workflow Lambda Handler
 * Manages validation queue, supervisor notifications, and approval tracking
 */
const handler = async (event) => {
    console.log('Human validation function called', JSON.stringify(event, null, 2));
    try {
        // Initialize services with clients
        const queueManager = new validation_queue_manager_1.ValidationQueueManager(docClient, EPISODE_TABLE_NAME);
        const notificationService = new supervisor_notification_service_1.SupervisorNotificationService(snsClient, NOTIFICATION_TOPIC_ARN, EMERGENCY_ALERT_TOPIC_ARN);
        const escalationService = new escalation_service_1.EscalationService(docClient, snsClient, EPISODE_TABLE_NAME, NOTIFICATION_TOPIC_ARN);
        const httpMethod = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        switch (httpMethod) {
            case 'POST':
                return await handleValidationRequest(body, docClient, queueManager, notificationService);
            case 'GET':
                if (pathParameters.episodeId) {
                    return await getValidationStatus(pathParameters.episodeId, docClient, queueManager);
                }
                else {
                    return await getValidationQueue(event.queryStringParameters || {}, queueManager);
                }
            case 'PUT':
                return await handleValidationDecision(body, docClient, queueManager, notificationService, escalationService);
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
        console.error('Error in human validation workflow:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Internal server error during validation workflow'
            }),
        };
    }
};
exports.handler = handler;
/**
 * Handle new validation request from triage engine
 */
async function handleValidationRequest(body, docClient, queueManager, notificationService) {
    const { episodeId, supervisorId } = body;
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
    // Retrieve episode from DynamoDB
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
    // Check if episode has triage assessment
    if (!episode.triage) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Episode does not have triage assessment'
            }),
        };
    }
    // Check if validation already exists
    if (episode.triage.humanValidation) {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Episode already has human validation',
                validation: episode.triage.humanValidation
            }),
        };
    }
    // Add episode to validation queue
    await queueManager.addToQueue(episode, supervisorId);
    // Send supervisor notification
    const isEmergency = episode.triage.urgencyLevel === types_1.UrgencyLevel.EMERGENCY;
    await notificationService.notifySupervisor(episode, supervisorId, isEmergency);
    // Update episode status to indicate validation pending
    await updateEpisodeValidationStatus(episodeId, 'pending', supervisorId, docClient);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            message: 'Validation request submitted successfully',
            episodeId,
            supervisorId,
            urgencyLevel: episode.triage.urgencyLevel,
            queuePosition: await queueManager.getQueuePosition(episodeId)
        }),
    };
}
/**
 * Get validation status for a specific episode
 */
async function getValidationStatus(episodeId, docClient, queueManager) {
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
    const queuePosition = await queueManager.getQueuePosition(episodeId);
    const estimatedWaitTime = await queueManager.getEstimatedWaitTime(episodeId);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            episodeId,
            validationStatus: episode.triage?.humanValidation ? 'completed' : 'pending',
            validation: episode.triage?.humanValidation,
            queuePosition,
            estimatedWaitTime
        }),
    };
}
/**
 * Get validation queue for supervisors
 */
async function getValidationQueue(queryParams, queueManager) {
    const supervisorId = queryParams.supervisorId;
    const urgencyFilter = queryParams.urgency;
    const limit = parseInt(queryParams.limit || '20');
    const queueItems = await queueManager.getQueue(supervisorId, urgencyFilter, limit);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            queue: queueItems,
            totalItems: queueItems.length,
            supervisorId
        }),
    };
}
/**
 * Handle validation decision from supervisor
 */
async function handleValidationDecision(body, docClient, queueManager, notificationService, escalationService) {
    const { episodeId, supervisorId, approved, overrideReason, notes } = body;
    if (!episodeId || !supervisorId || approved === undefined) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Missing required fields: episodeId, supervisorId, approved'
            }),
        };
    }
    // Retrieve episode from DynamoDB
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
    // Create human validation record
    const humanValidation = {
        supervisorId,
        approved,
        overrideReason,
        notes,
        timestamp: new Date()
    };
    // Validate the human validation record
    const { error } = validation_1.humanValidationSchema.validate(humanValidation);
    if (error) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: `Invalid validation data: ${error.message}`
            }),
        };
    }
    // Update episode with validation decision
    await updateEpisodeWithValidation(episodeId, humanValidation, docClient);
    // Remove from validation queue
    await queueManager.removeFromQueue(episodeId);
    // Update episode status based on approval
    const newStatus = approved ? types_1.EpisodeStatus.ACTIVE : types_1.EpisodeStatus.ESCALATED;
    await updateEpisodeStatus(episodeId, newStatus, docClient);
    // If not approved and override reason provided, handle escalation
    if (!approved && overrideReason) {
        await escalationService.handleOverride(episode, humanValidation);
    }
    // Notify care coordinator if approved
    if (approved) {
        await notificationService.notifyCareCoordinator(episode, humanValidation);
    }
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
            message: 'Validation decision recorded successfully',
            episodeId,
            approved,
            newStatus,
            validation: humanValidation
        }),
    };
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
/**
 * Update episode validation status
 */
async function updateEpisodeValidationStatus(episodeId, status, supervisorId, docClient) {
    try {
        const command = new lib_dynamodb_1.UpdateCommand({
            TableName: EPISODE_TABLE_NAME,
            Key: { episodeId },
            UpdateExpression: 'SET validationStatus = :status, assignedSupervisor = :supervisor, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':status': status,
                ':supervisor': supervisorId || null,
                ':updatedAt': new Date().toISOString()
            }
        });
        await docClient.send(command);
    }
    catch (error) {
        console.error('Error updating episode validation status:', error);
        throw error;
    }
}
/**
 * Update episode with human validation
 */
async function updateEpisodeWithValidation(episodeId, validation, docClient) {
    try {
        const command = new lib_dynamodb_1.UpdateCommand({
            TableName: EPISODE_TABLE_NAME,
            Key: { episodeId },
            UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':validation': validation,
                ':status': 'completed',
                ':updatedAt': new Date().toISOString()
            }
        });
        await docClient.send(command);
    }
    catch (error) {
        console.error('Error updating episode with validation:', error);
        throw error;
    }
}
/**
 * Update episode status
 */
async function updateEpisodeStatus(episodeId, status, docClient) {
    try {
        const command = new lib_dynamodb_1.UpdateCommand({
            TableName: EPISODE_TABLE_NAME,
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
        await docClient.send(command);
    }
    catch (error) {
        console.error('Error updating episode status:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL2h1bWFuLXZhbGlkYXRpb24vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRDQUE0QztBQUM1QyxnRUFBZ0U7QUFDaEUsd0NBQXdDOzs7QUFHeEMsOERBQTBEO0FBQzFELHdEQUFxSDtBQUNySCxvREFBZ0U7QUFDaEUsdUNBQW9GO0FBQ3BGLGlEQUF5RDtBQUN6RCx5RUFBb0U7QUFDcEUsdUZBQWtGO0FBQ2xGLDZEQUF5RDtBQUV6RCx5QkFBeUI7QUFDekIsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM1RCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFcEMsd0JBQXdCO0FBQ3hCLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBbUIsQ0FBQztBQUMzRCxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXVCLENBQUM7QUFDbkUsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUEwQixDQUFDO0FBRXpFOzs7R0FHRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFaEYsSUFBSSxDQUFDO1FBQ0gsbUNBQW1DO1FBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksaURBQXNCLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDL0UsTUFBTSxtQkFBbUIsR0FB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LENBQUM7UUFFSCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBIdW1hbiBWYWxpZGF0aW9uIFdvcmtmbG93IExhbWJkYSBGdW5jdGlvblxyXG4vLyBJbXBsZW1lbnRzIHZhbGlkYXRpb24gcXVldWUgbWFuYWdlbWVudCBmb3IgQUkgcmVjb21tZW5kYXRpb25zXHJcbi8vIFJlcXVpcmVtZW50czogMi40LCA3LjEsIDcuMywgNy40LCA3LjVcclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kLCBVcGRhdGVDb21tYW5kLCBRdWVyeUNvbW1hbmQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBIdW1hblZhbGlkYXRpb24sIFVyZ2VuY3lMZXZlbCwgRXBpc29kZVN0YXR1cyB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuaW1wb3J0IHsgaHVtYW5WYWxpZGF0aW9uU2NoZW1hIH0gZnJvbSAnLi4vLi4vdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IFZhbGlkYXRpb25RdWV1ZU1hbmFnZXIgfSBmcm9tICcuL3ZhbGlkYXRpb24tcXVldWUtbWFuYWdlcic7XHJcbmltcG9ydCB7IFN1cGVydmlzb3JOb3RpZmljYXRpb25TZXJ2aWNlIH0gZnJvbSAnLi9zdXBlcnZpc29yLW5vdGlmaWNhdGlvbi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRXNjYWxhdGlvblNlcnZpY2UgfSBmcm9tICcuL2VzY2FsYXRpb24tc2VydmljZSc7XHJcblxyXG4vLyBJbml0aWFsaXplIEFXUyBjbGllbnRzXHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XHJcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShkeW5hbW9DbGllbnQpO1xyXG5jb25zdCBzbnNDbGllbnQgPSBuZXcgU05TQ2xpZW50KHt9KTtcclxuXHJcbi8vIEVudmlyb25tZW50IHZhcmlhYmxlc1xyXG5jb25zdCBFUElTT0RFX1RBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5FUElTT0RFX1RBQkxFX05BTUUhO1xyXG5jb25zdCBOT1RJRklDQVRJT05fVE9QSUNfQVJOID0gcHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX1RPUElDX0FSTiE7XHJcbmNvbnN0IEVNRVJHRU5DWV9BTEVSVF9UT1BJQ19BUk4gPSBwcm9jZXNzLmVudi5FTUVSR0VOQ1lfQUxFUlRfVE9QSUNfQVJOITtcclxuXHJcbi8qKlxyXG4gKiBIdW1hbiBWYWxpZGF0aW9uIFdvcmtmbG93IExhbWJkYSBIYW5kbGVyXHJcbiAqIE1hbmFnZXMgdmFsaWRhdGlvbiBxdWV1ZSwgc3VwZXJ2aXNvciBub3RpZmljYXRpb25zLCBhbmQgYXBwcm92YWwgdHJhY2tpbmdcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ0h1bWFuIHZhbGlkYXRpb24gZnVuY3Rpb24gY2FsbGVkJywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEluaXRpYWxpemUgc2VydmljZXMgd2l0aCBjbGllbnRzXHJcbiAgICBjb25zdCBxdWV1ZU1hbmFnZXIgPSBuZXcgVmFsaWRhdGlvblF1ZXVlTWFuYWdlcihkb2NDbGllbnQsIEVQSVNPREVfVEFCTEVfTkFNRSk7XHJcbiAgICBjb25zdCBub3RpZmljYXRpb25TZXJ2aWNlID0gbmV3IFN1cGVydmlzb3JOb3RpZmljYXRpb25TZXJ2aWNlKHNuc0NsaWVudCwgTk9USUZJQ0FUSU9OX1RPUElDX0FSTiwgRU1FUkdFTkNZX0FMRVJUX1RPUElDX0FSTik7XHJcbiAgICBjb25zdCBlc2NhbGF0aW9uU2VydmljZSA9IG5ldyBFc2NhbGF0aW9uU2VydmljZShkb2NDbGllbnQsIHNuc0NsaWVudCwgRVBJU09ERV9UQUJMRV9OQU1FLCBOT1RJRklDQVRJT05fVE9QSUNfQVJOKTtcclxuXHJcbiAgICBjb25zdCBodHRwTWV0aG9kID0gZXZlbnQuaHR0cE1ldGhvZDtcclxuICAgIGNvbnN0IHBhdGhQYXJhbWV0ZXJzID0gZXZlbnQucGF0aFBhcmFtZXRlcnMgfHwge307XHJcbiAgICBjb25zdCBib2R5ID0gZXZlbnQuYm9keSA/IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgOiB7fTtcclxuXHJcbiAgICBzd2l0Y2ggKGh0dHBNZXRob2QpIHtcclxuICAgICAgY2FzZSAnUE9TVCc6XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZVZhbGlkYXRpb25SZXF1ZXN0KGJvZHksIGRvY0NsaWVudCwgcXVldWVNYW5hZ2VyLCBub3RpZmljYXRpb25TZXJ2aWNlKTtcclxuICAgICAgY2FzZSAnR0VUJzpcclxuICAgICAgICBpZiAocGF0aFBhcmFtZXRlcnMuZXBpc29kZUlkKSB7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgZ2V0VmFsaWRhdGlvblN0YXR1cyhwYXRoUGFyYW1ldGVycy5lcGlzb2RlSWQsIGRvY0NsaWVudCwgcXVldWVNYW5hZ2VyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGdldFZhbGlkYXRpb25RdWV1ZShldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMgfHwge30sIHF1ZXVlTWFuYWdlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICBjYXNlICdQVVQnOlxyXG4gICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVWYWxpZGF0aW9uRGVjaXNpb24oYm9keSwgZG9jQ2xpZW50LCBxdWV1ZU1hbmFnZXIsIG5vdGlmaWNhdGlvblNlcnZpY2UsIGVzY2FsYXRpb25TZXJ2aWNlKTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDA1LFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gaHVtYW4gdmFsaWRhdGlvbiB3b3JrZmxvdzonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvciBkdXJpbmcgdmFsaWRhdGlvbiB3b3JrZmxvdydcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgbmV3IHZhbGlkYXRpb24gcmVxdWVzdCBmcm9tIHRyaWFnZSBlbmdpbmVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVZhbGlkYXRpb25SZXF1ZXN0KFxyXG4gIGJvZHk6IGFueSxcclxuICBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsXHJcbiAgcXVldWVNYW5hZ2VyOiBWYWxpZGF0aW9uUXVldWVNYW5hZ2VyLFxyXG4gIG5vdGlmaWNhdGlvblNlcnZpY2U6IFN1cGVydmlzb3JOb3RpZmljYXRpb25TZXJ2aWNlXHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgY29uc3QgeyBlcGlzb2RlSWQsIHN1cGVydmlzb3JJZCB9ID0gYm9keTtcclxuXHJcbiAgaWYgKCFlcGlzb2RlSWQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBmaWVsZDogZXBpc29kZUlkJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBSZXRyaWV2ZSBlcGlzb2RlIGZyb20gRHluYW1vREJcclxuICBjb25zdCBlcGlzb2RlID0gYXdhaXQgZ2V0RXBpc29kZShlcGlzb2RlSWQsIGRvY0NsaWVudCk7XHJcbiAgaWYgKCFlcGlzb2RlKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0VwaXNvZGUgbm90IGZvdW5kJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiBlcGlzb2RlIGhhcyB0cmlhZ2UgYXNzZXNzbWVudFxyXG4gIGlmICghZXBpc29kZS50cmlhZ2UpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRXBpc29kZSBkb2VzIG5vdCBoYXZlIHRyaWFnZSBhc3Nlc3NtZW50J1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiB2YWxpZGF0aW9uIGFscmVhZHkgZXhpc3RzXHJcbiAgaWYgKGVwaXNvZGUudHJpYWdlLmh1bWFuVmFsaWRhdGlvbikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgbWVzc2FnZTogJ0VwaXNvZGUgYWxyZWFkeSBoYXMgaHVtYW4gdmFsaWRhdGlvbicsXHJcbiAgICAgICAgdmFsaWRhdGlvbjogZXBpc29kZS50cmlhZ2UuaHVtYW5WYWxpZGF0aW9uXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIEFkZCBlcGlzb2RlIHRvIHZhbGlkYXRpb24gcXVldWVcclxuICBhd2FpdCBxdWV1ZU1hbmFnZXIuYWRkVG9RdWV1ZShlcGlzb2RlLCBzdXBlcnZpc29ySWQpO1xyXG5cclxuICAvLyBTZW5kIHN1cGVydmlzb3Igbm90aWZpY2F0aW9uXHJcbiAgY29uc3QgaXNFbWVyZ2VuY3kgPSBlcGlzb2RlLnRyaWFnZS51cmdlbmN5TGV2ZWwgPT09IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1k7XHJcbiAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlTdXBlcnZpc29yKGVwaXNvZGUsIHN1cGVydmlzb3JJZCwgaXNFbWVyZ2VuY3kpO1xyXG5cclxuICAvLyBVcGRhdGUgZXBpc29kZSBzdGF0dXMgdG8gaW5kaWNhdGUgdmFsaWRhdGlvbiBwZW5kaW5nXHJcbiAgYXdhaXQgdXBkYXRlRXBpc29kZVZhbGlkYXRpb25TdGF0dXMoZXBpc29kZUlkLCAncGVuZGluZycsIHN1cGVydmlzb3JJZCwgZG9jQ2xpZW50KTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIG1lc3NhZ2U6ICdWYWxpZGF0aW9uIHJlcXVlc3Qgc3VibWl0dGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgIGVwaXNvZGVJZCxcclxuICAgICAgc3VwZXJ2aXNvcklkLFxyXG4gICAgICB1cmdlbmN5TGV2ZWw6IGVwaXNvZGUudHJpYWdlLnVyZ2VuY3lMZXZlbCxcclxuICAgICAgcXVldWVQb3NpdGlvbjogYXdhaXQgcXVldWVNYW5hZ2VyLmdldFF1ZXVlUG9zaXRpb24oZXBpc29kZUlkKVxyXG4gICAgfSksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB2YWxpZGF0aW9uIHN0YXR1cyBmb3IgYSBzcGVjaWZpYyBlcGlzb2RlXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZXRWYWxpZGF0aW9uU3RhdHVzKFxyXG4gIGVwaXNvZGVJZDogc3RyaW5nLFxyXG4gIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCxcclxuICBxdWV1ZU1hbmFnZXI6IFZhbGlkYXRpb25RdWV1ZU1hbmFnZXJcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBjb25zdCBlcGlzb2RlID0gYXdhaXQgZ2V0RXBpc29kZShlcGlzb2RlSWQsIGRvY0NsaWVudCk7XHJcbiAgaWYgKCFlcGlzb2RlKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0VwaXNvZGUgbm90IGZvdW5kJ1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCBxdWV1ZVBvc2l0aW9uID0gYXdhaXQgcXVldWVNYW5hZ2VyLmdldFF1ZXVlUG9zaXRpb24oZXBpc29kZUlkKTtcclxuICBjb25zdCBlc3RpbWF0ZWRXYWl0VGltZSA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRFc3RpbWF0ZWRXYWl0VGltZShlcGlzb2RlSWQpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXBpc29kZUlkLFxyXG4gICAgICB2YWxpZGF0aW9uU3RhdHVzOiBlcGlzb2RlLnRyaWFnZT8uaHVtYW5WYWxpZGF0aW9uID8gJ2NvbXBsZXRlZCcgOiAncGVuZGluZycsXHJcbiAgICAgIHZhbGlkYXRpb246IGVwaXNvZGUudHJpYWdlPy5odW1hblZhbGlkYXRpb24sXHJcbiAgICAgIHF1ZXVlUG9zaXRpb24sXHJcbiAgICAgIGVzdGltYXRlZFdhaXRUaW1lXHJcbiAgICB9KSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHZhbGlkYXRpb24gcXVldWUgZm9yIHN1cGVydmlzb3JzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZXRWYWxpZGF0aW9uUXVldWUoXHJcbiAgcXVlcnlQYXJhbXM6IGFueSxcclxuICBxdWV1ZU1hbmFnZXI6IFZhbGlkYXRpb25RdWV1ZU1hbmFnZXJcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBjb25zdCBzdXBlcnZpc29ySWQgPSBxdWVyeVBhcmFtcy5zdXBlcnZpc29ySWQ7XHJcbiAgY29uc3QgdXJnZW5jeUZpbHRlciA9IHF1ZXJ5UGFyYW1zLnVyZ2VuY3k7XHJcbiAgY29uc3QgbGltaXQgPSBwYXJzZUludChxdWVyeVBhcmFtcy5saW1pdCB8fCAnMjAnKTtcclxuXHJcbiAgY29uc3QgcXVldWVJdGVtcyA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRRdWV1ZShzdXBlcnZpc29ySWQsIHVyZ2VuY3lGaWx0ZXIsIGxpbWl0KTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIHF1ZXVlOiBxdWV1ZUl0ZW1zLFxyXG4gICAgICB0b3RhbEl0ZW1zOiBxdWV1ZUl0ZW1zLmxlbmd0aCxcclxuICAgICAgc3VwZXJ2aXNvcklkXHJcbiAgICB9KSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIHZhbGlkYXRpb24gZGVjaXNpb24gZnJvbSBzdXBlcnZpc29yXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVWYWxpZGF0aW9uRGVjaXNpb24oXHJcbiAgYm9keTogYW55LFxyXG4gIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCxcclxuICBxdWV1ZU1hbmFnZXI6IFZhbGlkYXRpb25RdWV1ZU1hbmFnZXIsXHJcbiAgbm90aWZpY2F0aW9uU2VydmljZTogU3VwZXJ2aXNvck5vdGlmaWNhdGlvblNlcnZpY2UsXHJcbiAgZXNjYWxhdGlvblNlcnZpY2U6IEVzY2FsYXRpb25TZXJ2aWNlXHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgY29uc3QgeyBlcGlzb2RlSWQsIHN1cGVydmlzb3JJZCwgYXBwcm92ZWQsIG92ZXJyaWRlUmVhc29uLCBub3RlcyB9ID0gYm9keTtcclxuXHJcbiAgaWYgKCFlcGlzb2RlSWQgfHwgIXN1cGVydmlzb3JJZCB8fCBhcHByb3ZlZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBlcGlzb2RlSWQsIHN1cGVydmlzb3JJZCwgYXBwcm92ZWQnXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIFJldHJpZXZlIGVwaXNvZGUgZnJvbSBEeW5hbW9EQlxyXG4gIGNvbnN0IGVwaXNvZGUgPSBhd2FpdCBnZXRFcGlzb2RlKGVwaXNvZGVJZCwgZG9jQ2xpZW50KTtcclxuICBpZiAoIWVwaXNvZGUpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRXBpc29kZSBub3QgZm91bmQnXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZSBodW1hbiB2YWxpZGF0aW9uIHJlY29yZFxyXG4gIGNvbnN0IGh1bWFuVmFsaWRhdGlvbjogSHVtYW5WYWxpZGF0aW9uID0ge1xyXG4gICAgc3VwZXJ2aXNvcklkLFxyXG4gICAgYXBwcm92ZWQsXHJcbiAgICBvdmVycmlkZVJlYXNvbixcclxuICAgIG5vdGVzLFxyXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpXHJcbiAgfTtcclxuXHJcbiAgLy8gVmFsaWRhdGUgdGhlIGh1bWFuIHZhbGlkYXRpb24gcmVjb3JkXHJcbiAgY29uc3QgeyBlcnJvciB9ID0gaHVtYW5WYWxpZGF0aW9uU2NoZW1hLnZhbGlkYXRlKGh1bWFuVmFsaWRhdGlvbik7XHJcbiAgaWYgKGVycm9yKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogYEludmFsaWQgdmFsaWRhdGlvbiBkYXRhOiAke2Vycm9yLm1lc3NhZ2V9YFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBVcGRhdGUgZXBpc29kZSB3aXRoIHZhbGlkYXRpb24gZGVjaXNpb25cclxuICBhd2FpdCB1cGRhdGVFcGlzb2RlV2l0aFZhbGlkYXRpb24oZXBpc29kZUlkLCBodW1hblZhbGlkYXRpb24sIGRvY0NsaWVudCk7XHJcblxyXG4gIC8vIFJlbW92ZSBmcm9tIHZhbGlkYXRpb24gcXVldWVcclxuICBhd2FpdCBxdWV1ZU1hbmFnZXIucmVtb3ZlRnJvbVF1ZXVlKGVwaXNvZGVJZCk7XHJcblxyXG4gIC8vIFVwZGF0ZSBlcGlzb2RlIHN0YXR1cyBiYXNlZCBvbiBhcHByb3ZhbFxyXG4gIGNvbnN0IG5ld1N0YXR1cyA9IGFwcHJvdmVkID8gRXBpc29kZVN0YXR1cy5BQ1RJVkUgOiBFcGlzb2RlU3RhdHVzLkVTQ0FMQVRFRDtcclxuICBhd2FpdCB1cGRhdGVFcGlzb2RlU3RhdHVzKGVwaXNvZGVJZCwgbmV3U3RhdHVzLCBkb2NDbGllbnQpO1xyXG5cclxuICAvLyBJZiBub3QgYXBwcm92ZWQgYW5kIG92ZXJyaWRlIHJlYXNvbiBwcm92aWRlZCwgaGFuZGxlIGVzY2FsYXRpb25cclxuICBpZiAoIWFwcHJvdmVkICYmIG92ZXJyaWRlUmVhc29uKSB7XHJcbiAgICBhd2FpdCBlc2NhbGF0aW9uU2VydmljZS5oYW5kbGVPdmVycmlkZShlcGlzb2RlLCBodW1hblZhbGlkYXRpb24pO1xyXG4gIH1cclxuXHJcbiAgLy8gTm90aWZ5IGNhcmUgY29vcmRpbmF0b3IgaWYgYXBwcm92ZWRcclxuICBpZiAoYXBwcm92ZWQpIHtcclxuICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5Q2FyZUNvb3JkaW5hdG9yKGVwaXNvZGUsIGh1bWFuVmFsaWRhdGlvbik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgbWVzc2FnZTogJ1ZhbGlkYXRpb24gZGVjaXNpb24gcmVjb3JkZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgZXBpc29kZUlkLFxyXG4gICAgICBhcHByb3ZlZCxcclxuICAgICAgbmV3U3RhdHVzLFxyXG4gICAgICB2YWxpZGF0aW9uOiBodW1hblZhbGlkYXRpb25cclxuICAgIH0pLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXRyaWV2ZSBlcGlzb2RlIGZyb20gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEVwaXNvZGUoZXBpc29kZUlkOiBzdHJpbmcsIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCk6IFByb21pc2U8RXBpc29kZSB8IG51bGw+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBFUElTT0RFX1RBQkxFX05BTUUsXHJcbiAgICAgIEtleTogeyBlcGlzb2RlSWQgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgRXBpc29kZSB8fCBudWxsO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXRyaWV2aW5nIGVwaXNvZGU6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGVwaXNvZGUgdmFsaWRhdGlvbiBzdGF0dXNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUVwaXNvZGVWYWxpZGF0aW9uU3RhdHVzKFxyXG4gIGVwaXNvZGVJZDogc3RyaW5nLFxyXG4gIHN0YXR1czogc3RyaW5nLFxyXG4gIHN1cGVydmlzb3JJZDogc3RyaW5nIHwgdW5kZWZpbmVkLFxyXG4gIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBFUElTT0RFX1RBQkxFX05BTUUsXHJcbiAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCB2YWxpZGF0aW9uU3RhdHVzID0gOnN0YXR1cywgYXNzaWduZWRTdXBlcnZpc29yID0gOnN1cGVydmlzb3IsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgJzpzdGF0dXMnOiBzdGF0dXMsXHJcbiAgICAgICAgJzpzdXBlcnZpc29yJzogc3VwZXJ2aXNvcklkIHx8IG51bGwsXHJcbiAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGVwaXNvZGUgdmFsaWRhdGlvbiBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGVwaXNvZGUgd2l0aCBodW1hbiB2YWxpZGF0aW9uXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVFcGlzb2RlV2l0aFZhbGlkYXRpb24oXHJcbiAgZXBpc29kZUlkOiBzdHJpbmcsXHJcbiAgdmFsaWRhdGlvbjogSHVtYW5WYWxpZGF0aW9uLFxyXG4gIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBFUElTT0RFX1RBQkxFX05BTUUsXHJcbiAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCB0cmlhZ2UuaHVtYW5WYWxpZGF0aW9uID0gOnZhbGlkYXRpb24sIHZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6dmFsaWRhdGlvbic6IHZhbGlkYXRpb24sXHJcbiAgICAgICAgJzpzdGF0dXMnOiAnY29tcGxldGVkJyxcclxuICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZXBpc29kZSB3aXRoIHZhbGlkYXRpb246JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGVwaXNvZGUgc3RhdHVzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVFcGlzb2RlU3RhdHVzKFxyXG4gIGVwaXNvZGVJZDogc3RyaW5nLFxyXG4gIHN0YXR1czogRXBpc29kZVN0YXR1cyxcclxuICBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogRVBJU09ERV9UQUJMRV9OQU1FLFxyXG4gICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgI3N0YXR1cyA9IDpzdGF0dXMsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnN0YXR1cyc6IHN0YXR1cyxcclxuICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZXBpc29kZSBzdGF0dXM6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59Il19