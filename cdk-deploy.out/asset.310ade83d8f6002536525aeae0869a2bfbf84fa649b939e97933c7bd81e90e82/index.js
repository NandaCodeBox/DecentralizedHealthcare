"use strict";
// Triage Engine Lambda Function
// Implements clinical rule engine for symptom urgency assessment
// Requirements: 2.1, 2.3
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const types_1 = require("../../types");
const validation_1 = require("../../validation");
const triage_rule_engine_1 = require("./triage-rule-engine");
const ai_triage_service_1 = require("./ai-triage-service");
// Initialize AWS clients
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
// Environment variables
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME;
// Initialize services
const ruleEngine = new triage_rule_engine_1.TriageRuleEngine();
const aiService = new ai_triage_service_1.AITriageService(bedrockClient);
/**
 * Triage Engine Lambda Handler
 * Processes symptom data and generates urgency assessment
 */
const handler = async (event) => {
    console.log('Triage engine function called', JSON.stringify(event, null, 2));
    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
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
        // Retrieve episode from DynamoDB
        const episode = await getEpisode(episodeId);
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
        // Check if episode already has triage assessment
        if (episode.triage) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: 'Episode already has triage assessment',
                    triage: episode.triage
                }),
            };
        }
        // Perform triage assessment
        const triageAssessment = await performTriageAssessment(episode);
        // Update episode with triage results
        await updateEpisodeWithTriage(episodeId, triageAssessment);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Triage assessment completed successfully',
                episodeId,
                triage: triageAssessment,
                nextSteps: getNextSteps(triageAssessment.urgencyLevel)
            }),
        };
    }
    catch (error) {
        console.error('Error in triage engine:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Internal server error during triage assessment'
            }),
        };
    }
};
exports.handler = handler;
/**
 * Retrieve episode from DynamoDB
 */
async function getEpisode(episodeId) {
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
 * Perform comprehensive triage assessment
 */
async function performTriageAssessment(episode) {
    // Step 1: Apply rule-based assessment
    const ruleBasedResult = ruleEngine.assessSymptoms(episode.symptoms);
    // Step 2: Determine if AI assistance is needed
    const needsAIAssessment = ruleEngine.needsAIAssistance(ruleBasedResult, episode.symptoms);
    let aiAssessment = { used: false };
    // Step 3: Apply AI assessment if needed (limited to one call per episode)
    // Cost control: Only call AI if episode doesn't already have AI assessment
    if (needsAIAssessment && !hasExistingAIAssessment(episode)) {
        try {
            aiAssessment = await aiService.assessSymptoms(episode.symptoms, ruleBasedResult);
        }
        catch (error) {
            console.error('AI assessment failed, falling back to rule-based assessment:', error);
            // Continue with rule-based assessment only
        }
    }
    else if (hasExistingAIAssessment(episode)) {
        console.log('AI assessment already exists for this episode, skipping to maintain cost control');
    }
    // Step 4: Combine assessments to determine final urgency level
    const finalUrgencyLevel = determineFinalUrgencyLevel(ruleBasedResult, aiAssessment);
    const finalScore = calculateFinalScore(ruleBasedResult, aiAssessment);
    const triageAssessment = {
        urgencyLevel: finalUrgencyLevel,
        ruleBasedScore: ruleBasedResult.score,
        aiAssessment,
        finalScore
    };
    // Validate the assessment
    const { error } = validation_1.triageAssessmentSchema.validate(triageAssessment);
    if (error) {
        throw new Error(`Invalid triage assessment: ${error.message}`);
    }
    return triageAssessment;
}
/**
 * Check if episode already has an AI assessment to enforce cost control
 */
function hasExistingAIAssessment(episode) {
    return episode.triage?.aiAssessment?.used === true;
}
/**
 * Determine final urgency level combining rule-based and AI assessments
 */
function determineFinalUrgencyLevel(ruleBasedResult, aiAssessment) {
    // If AI was not used, return rule-based result
    if (!aiAssessment.used) {
        return ruleBasedResult.urgencyLevel;
    }
    // If AI assessment exists, use it as primary with rule-based as validation
    // For safety, if there's disagreement, choose the higher urgency level
    const urgencyPriority = {
        [types_1.UrgencyLevel.EMERGENCY]: 4,
        [types_1.UrgencyLevel.URGENT]: 3,
        [types_1.UrgencyLevel.ROUTINE]: 2,
        [types_1.UrgencyLevel.SELF_CARE]: 1
    };
    // AI assessment should include urgency level in reasoning
    // For now, we'll use rule-based as primary and AI as validation
    // In a full implementation, AI would provide structured output
    return ruleBasedResult.urgencyLevel;
}
/**
 * Calculate final triage score
 */
function calculateFinalScore(ruleBasedResult, aiAssessment) {
    if (!aiAssessment.used || !aiAssessment.confidence) {
        return ruleBasedResult.score;
    }
    // Weight the scores: 70% rule-based, 30% AI confidence
    return Math.round(ruleBasedResult.score * 0.7 + aiAssessment.confidence * 100 * 0.3);
}
/**
 * Update episode with triage assessment
 */
async function updateEpisodeWithTriage(episodeId, triage) {
    try {
        const command = new lib_dynamodb_1.UpdateCommand({
            TableName: EPISODE_TABLE_NAME,
            Key: { episodeId },
            UpdateExpression: 'SET triage = :triage, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':triage': triage,
                ':updatedAt': new Date().toISOString()
            }
        });
        await docClient.send(command);
    }
    catch (error) {
        console.error('Error updating episode with triage:', error);
        throw error;
    }
}
/**
 * Get next steps based on urgency level
 */
function getNextSteps(urgencyLevel) {
    switch (urgencyLevel) {
        case types_1.UrgencyLevel.EMERGENCY:
            return 'Immediate medical attention required. Proceed to emergency care routing.';
        case types_1.UrgencyLevel.URGENT:
            return 'Urgent care needed within 24 hours. Proceed to urgent care provider discovery.';
        case types_1.UrgencyLevel.ROUTINE:
            return 'Routine care recommended. Proceed to provider discovery and scheduling.';
        case types_1.UrgencyLevel.SELF_CARE:
            return 'Self-care guidance provided. Monitor symptoms and seek care if condition worsens.';
        default:
            return 'Assessment complete. Proceed to human validation.';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL3RyaWFnZS1lbmdpbmUvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGdDQUFnQztBQUNoQyxpRUFBaUU7QUFDakUseUJBQXlCOzs7QUFHekIsOERBQTBEO0FBQzFELHdEQUEwRjtBQUMxRiw0RUFBMkY7QUFDM0YsdUNBQW9GO0FBQ3BGLGlEQUEwRDtBQUMxRCw2REFBd0Q7QUFDeEQsMkRBQXNEO0FBRXRELHlCQUF5QjtBQUN6QixNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzVELE1BQU0sYUFBYSxHQUFHLElBQUksNkNBQW9CLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUVsRyx3QkFBd0I7QUFDeEIsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFtQixDQUFDO0FBRTNELHNCQUFzQjtBQUN0QixNQUFNLFVBQVUsR0FBRyxJQUFJLHFDQUFnQixFQUFFLENBQUM7QUFDMUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxtQ0FBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBRXJEOzs7R0FHRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFN0UsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRTNCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsbUNBQW1DO2lCQUMzQyxDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxpQ0FBaUM7UUFDakMsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSxtQkFBbUI7aUJBQzNCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELGlEQUFpRDtRQUNqRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLHVDQUF1QztvQkFDaEQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2lCQUN2QixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWhFLHFDQUFxQztRQUNyQyxNQUFNLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBRTNELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSwwQ0FBMEM7Z0JBQ25ELFNBQVM7Z0JBQ1QsTUFBTSxFQUFFLGdCQUFnQjtnQkFDeEIsU0FBUyxFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7YUFDdkQsQ0FBQztTQUNILENBQUM7SUFFSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLGdEQUFnRDthQUN4RCxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFwRlcsUUFBQSxPQUFPLFdBb0ZsQjtBQUVGOztHQUVHO0FBQ0gsS0FBSyxVQUFVLFVBQVUsQ0FBQyxTQUFpQjtJQUN6QyxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7WUFDN0IsU0FBUyxFQUFFLGtCQUFrQjtZQUM3QixHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUU7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLE9BQU8sTUFBTSxDQUFDLElBQWUsSUFBSSxJQUFJLENBQUM7SUFDeEMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILEtBQUssVUFBVSx1QkFBdUIsQ0FBQyxPQUFnQjtJQUNyRCxzQ0FBc0M7SUFDdEMsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFcEUsK0NBQStDO0lBQy9DLE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFMUYsSUFBSSxZQUFZLEdBQWlCLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBRWpELDBFQUEwRTtJQUMxRSwyRUFBMkU7SUFDM0UsSUFBSSxpQkFBaUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDM0QsSUFBSSxDQUFDO1lBQ0gsWUFBWSxHQUFHLE1BQU0sU0FBUyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ25GLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw4REFBOEQsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRiwyQ0FBMkM7UUFDN0MsQ0FBQztJQUNILENBQUM7U0FBTSxJQUFJLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrRkFBa0YsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7SUFFRCwrREFBK0Q7SUFDL0QsTUFBTSxpQkFBaUIsR0FBRywwQkFBMEIsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDcEYsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBRXRFLE1BQU0sZ0JBQWdCLEdBQXFCO1FBQ3pDLFlBQVksRUFBRSxpQkFBaUI7UUFDL0IsY0FBYyxFQUFFLGVBQWUsQ0FBQyxLQUFLO1FBQ3JDLFlBQVk7UUFDWixVQUFVO0tBQ1gsQ0FBQztJQUVGLDBCQUEwQjtJQUMxQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsbUNBQXNCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDcEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRCxPQUFPLGdCQUFnQixDQUFDO0FBQzFCLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsdUJBQXVCLENBQUMsT0FBZ0I7SUFDL0MsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEtBQUssSUFBSSxDQUFDO0FBQ3JELENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsMEJBQTBCLENBQ2pDLGVBQThELEVBQzlELFlBQTBCO0lBRTFCLCtDQUErQztJQUMvQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sZUFBZSxDQUFDLFlBQVksQ0FBQztJQUN0QyxDQUFDO0lBRUQsMkVBQTJFO0lBQzNFLHVFQUF1RTtJQUN2RSxNQUFNLGVBQWUsR0FBRztRQUN0QixDQUFDLG9CQUFZLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUMzQixDQUFDLG9CQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN4QixDQUFDLG9CQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN6QixDQUFDLG9CQUFZLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztLQUM1QixDQUFDO0lBRUYsMERBQTBEO0lBQzFELGdFQUFnRTtJQUNoRSwrREFBK0Q7SUFDL0QsT0FBTyxlQUFlLENBQUMsWUFBWSxDQUFDO0FBQ3RDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsbUJBQW1CLENBQzFCLGVBQThELEVBQzlELFlBQTBCO0lBRTFCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ25ELE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FBQztJQUMvQixDQUFDO0lBRUQsdURBQXVEO0lBQ3ZELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxZQUFZLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUN2RixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsdUJBQXVCLENBQUMsU0FBaUIsRUFBRSxNQUF3QjtJQUNoRixJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUFhLENBQUM7WUFDaEMsU0FBUyxFQUFFLGtCQUFrQjtZQUM3QixHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUU7WUFDbEIsZ0JBQWdCLEVBQUUsOENBQThDO1lBQ2hFLHlCQUF5QixFQUFFO2dCQUN6QixTQUFTLEVBQUUsTUFBTTtnQkFDakIsWUFBWSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3ZDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxNQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLFlBQVksQ0FBQyxZQUEwQjtJQUM5QyxRQUFRLFlBQVksRUFBRSxDQUFDO1FBQ3JCLEtBQUssb0JBQVksQ0FBQyxTQUFTO1lBQ3pCLE9BQU8sMEVBQTBFLENBQUM7UUFDcEYsS0FBSyxvQkFBWSxDQUFDLE1BQU07WUFDdEIsT0FBTyxnRkFBZ0YsQ0FBQztRQUMxRixLQUFLLG9CQUFZLENBQUMsT0FBTztZQUN2QixPQUFPLHlFQUF5RSxDQUFDO1FBQ25GLEtBQUssb0JBQVksQ0FBQyxTQUFTO1lBQ3pCLE9BQU8sbUZBQW1GLENBQUM7UUFDN0Y7WUFDRSxPQUFPLG1EQUFtRCxDQUFDO0lBQy9ELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVHJpYWdlIEVuZ2luZSBMYW1iZGEgRnVuY3Rpb25cclxuLy8gSW1wbGVtZW50cyBjbGluaWNhbCBydWxlIGVuZ2luZSBmb3Igc3ltcHRvbSB1cmdlbmN5IGFzc2Vzc21lbnRcclxuLy8gUmVxdWlyZW1lbnRzOiAyLjEsIDIuM1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFVwZGF0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBCZWRyb2NrUnVudGltZUNsaWVudCwgSW52b2tlTW9kZWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWJlZHJvY2stcnVudGltZSc7XHJcbmltcG9ydCB7IEVwaXNvZGUsIFRyaWFnZUFzc2Vzc21lbnQsIFVyZ2VuY3lMZXZlbCwgQUlBc3Nlc3NtZW50IH0gZnJvbSAnLi4vLi4vdHlwZXMnO1xyXG5pbXBvcnQgeyB0cmlhZ2VBc3Nlc3NtZW50U2NoZW1hIH0gZnJvbSAnLi4vLi4vdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IFRyaWFnZVJ1bGVFbmdpbmUgfSBmcm9tICcuL3RyaWFnZS1ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFJVHJpYWdlU2VydmljZSB9IGZyb20gJy4vYWktdHJpYWdlLXNlcnZpY2UnO1xyXG5cclxuLy8gSW5pdGlhbGl6ZSBBV1MgY2xpZW50c1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50KTtcclxuY29uc3QgYmVkcm9ja0NsaWVudCA9IG5ldyBCZWRyb2NrUnVudGltZUNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbi8vIEVudmlyb25tZW50IHZhcmlhYmxlc1xyXG5jb25zdCBFUElTT0RFX1RBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5FUElTT0RFX1RBQkxFX05BTUUhO1xyXG5cclxuLy8gSW5pdGlhbGl6ZSBzZXJ2aWNlc1xyXG5jb25zdCBydWxlRW5naW5lID0gbmV3IFRyaWFnZVJ1bGVFbmdpbmUoKTtcclxuY29uc3QgYWlTZXJ2aWNlID0gbmV3IEFJVHJpYWdlU2VydmljZShiZWRyb2NrQ2xpZW50KTtcclxuXHJcbi8qKlxyXG4gKiBUcmlhZ2UgRW5naW5lIExhbWJkYSBIYW5kbGVyXHJcbiAqIFByb2Nlc3NlcyBzeW1wdG9tIGRhdGEgYW5kIGdlbmVyYXRlcyB1cmdlbmN5IGFzc2Vzc21lbnRcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1RyaWFnZSBlbmdpbmUgZnVuY3Rpb24gY2FsbGVkJywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcclxuICAgIGNvbnN0IHsgZXBpc29kZUlkIH0gPSBib2R5O1xyXG5cclxuICAgIGlmICghZXBpc29kZUlkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiBlcGlzb2RlSWQnXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmV0cmlldmUgZXBpc29kZSBmcm9tIER5bmFtb0RCXHJcbiAgICBjb25zdCBlcGlzb2RlID0gYXdhaXQgZ2V0RXBpc29kZShlcGlzb2RlSWQpO1xyXG4gICAgaWYgKCFlcGlzb2RlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdFcGlzb2RlIG5vdCBmb3VuZCdcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBlcGlzb2RlIGFscmVhZHkgaGFzIHRyaWFnZSBhc3Nlc3NtZW50XHJcbiAgICBpZiAoZXBpc29kZS50cmlhZ2UpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBtZXNzYWdlOiAnRXBpc29kZSBhbHJlYWR5IGhhcyB0cmlhZ2UgYXNzZXNzbWVudCcsXHJcbiAgICAgICAgICB0cmlhZ2U6IGVwaXNvZGUudHJpYWdlXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGVyZm9ybSB0cmlhZ2UgYXNzZXNzbWVudFxyXG4gICAgY29uc3QgdHJpYWdlQXNzZXNzbWVudCA9IGF3YWl0IHBlcmZvcm1UcmlhZ2VBc3Nlc3NtZW50KGVwaXNvZGUpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBlcGlzb2RlIHdpdGggdHJpYWdlIHJlc3VsdHNcclxuICAgIGF3YWl0IHVwZGF0ZUVwaXNvZGVXaXRoVHJpYWdlKGVwaXNvZGVJZCwgdHJpYWdlQXNzZXNzbWVudCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgbWVzc2FnZTogJ1RyaWFnZSBhc3Nlc3NtZW50IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIGVwaXNvZGVJZCxcclxuICAgICAgICB0cmlhZ2U6IHRyaWFnZUFzc2Vzc21lbnQsXHJcbiAgICAgICAgbmV4dFN0ZXBzOiBnZXROZXh0U3RlcHModHJpYWdlQXNzZXNzbWVudC51cmdlbmN5TGV2ZWwpXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHRyaWFnZSBlbmdpbmU6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IgZHVyaW5nIHRyaWFnZSBhc3Nlc3NtZW50J1xyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHJpZXZlIGVwaXNvZGUgZnJvbSBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0RXBpc29kZShlcGlzb2RlSWQ6IHN0cmluZyk6IFByb21pc2U8RXBpc29kZSB8IG51bGw+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBFUElTT0RFX1RBQkxFX05BTUUsXHJcbiAgICAgIEtleTogeyBlcGlzb2RlSWQgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgRXBpc29kZSB8fCBudWxsO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXRyaWV2aW5nIGVwaXNvZGU6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUGVyZm9ybSBjb21wcmVoZW5zaXZlIHRyaWFnZSBhc3Nlc3NtZW50XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtVHJpYWdlQXNzZXNzbWVudChlcGlzb2RlOiBFcGlzb2RlKTogUHJvbWlzZTxUcmlhZ2VBc3Nlc3NtZW50PiB7XHJcbiAgLy8gU3RlcCAxOiBBcHBseSBydWxlLWJhc2VkIGFzc2Vzc21lbnRcclxuICBjb25zdCBydWxlQmFzZWRSZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKGVwaXNvZGUuc3ltcHRvbXMpO1xyXG4gIFxyXG4gIC8vIFN0ZXAgMjogRGV0ZXJtaW5lIGlmIEFJIGFzc2lzdGFuY2UgaXMgbmVlZGVkXHJcbiAgY29uc3QgbmVlZHNBSUFzc2Vzc21lbnQgPSBydWxlRW5naW5lLm5lZWRzQUlBc3Npc3RhbmNlKHJ1bGVCYXNlZFJlc3VsdCwgZXBpc29kZS5zeW1wdG9tcyk7XHJcbiAgXHJcbiAgbGV0IGFpQXNzZXNzbWVudDogQUlBc3Nlc3NtZW50ID0geyB1c2VkOiBmYWxzZSB9O1xyXG4gIFxyXG4gIC8vIFN0ZXAgMzogQXBwbHkgQUkgYXNzZXNzbWVudCBpZiBuZWVkZWQgKGxpbWl0ZWQgdG8gb25lIGNhbGwgcGVyIGVwaXNvZGUpXHJcbiAgLy8gQ29zdCBjb250cm9sOiBPbmx5IGNhbGwgQUkgaWYgZXBpc29kZSBkb2Vzbid0IGFscmVhZHkgaGF2ZSBBSSBhc3Nlc3NtZW50XHJcbiAgaWYgKG5lZWRzQUlBc3Nlc3NtZW50ICYmICFoYXNFeGlzdGluZ0FJQXNzZXNzbWVudChlcGlzb2RlKSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYWlBc3Nlc3NtZW50ID0gYXdhaXQgYWlTZXJ2aWNlLmFzc2Vzc1N5bXB0b21zKGVwaXNvZGUuc3ltcHRvbXMsIHJ1bGVCYXNlZFJlc3VsdCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdBSSBhc3Nlc3NtZW50IGZhaWxlZCwgZmFsbGluZyBiYWNrIHRvIHJ1bGUtYmFzZWQgYXNzZXNzbWVudDonLCBlcnJvcik7XHJcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggcnVsZS1iYXNlZCBhc3Nlc3NtZW50IG9ubHlcclxuICAgIH1cclxuICB9IGVsc2UgaWYgKGhhc0V4aXN0aW5nQUlBc3Nlc3NtZW50KGVwaXNvZGUpKSB7XHJcbiAgICBjb25zb2xlLmxvZygnQUkgYXNzZXNzbWVudCBhbHJlYWR5IGV4aXN0cyBmb3IgdGhpcyBlcGlzb2RlLCBza2lwcGluZyB0byBtYWludGFpbiBjb3N0IGNvbnRyb2wnKTtcclxuICB9XHJcblxyXG4gIC8vIFN0ZXAgNDogQ29tYmluZSBhc3Nlc3NtZW50cyB0byBkZXRlcm1pbmUgZmluYWwgdXJnZW5jeSBsZXZlbFxyXG4gIGNvbnN0IGZpbmFsVXJnZW5jeUxldmVsID0gZGV0ZXJtaW5lRmluYWxVcmdlbmN5TGV2ZWwocnVsZUJhc2VkUmVzdWx0LCBhaUFzc2Vzc21lbnQpO1xyXG4gIGNvbnN0IGZpbmFsU2NvcmUgPSBjYWxjdWxhdGVGaW5hbFNjb3JlKHJ1bGVCYXNlZFJlc3VsdCwgYWlBc3Nlc3NtZW50KTtcclxuXHJcbiAgY29uc3QgdHJpYWdlQXNzZXNzbWVudDogVHJpYWdlQXNzZXNzbWVudCA9IHtcclxuICAgIHVyZ2VuY3lMZXZlbDogZmluYWxVcmdlbmN5TGV2ZWwsXHJcbiAgICBydWxlQmFzZWRTY29yZTogcnVsZUJhc2VkUmVzdWx0LnNjb3JlLFxyXG4gICAgYWlBc3Nlc3NtZW50LFxyXG4gICAgZmluYWxTY29yZVxyXG4gIH07XHJcblxyXG4gIC8vIFZhbGlkYXRlIHRoZSBhc3Nlc3NtZW50XHJcbiAgY29uc3QgeyBlcnJvciB9ID0gdHJpYWdlQXNzZXNzbWVudFNjaGVtYS52YWxpZGF0ZSh0cmlhZ2VBc3Nlc3NtZW50KTtcclxuICBpZiAoZXJyb3IpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0cmlhZ2UgYXNzZXNzbWVudDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRyaWFnZUFzc2Vzc21lbnQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiBlcGlzb2RlIGFscmVhZHkgaGFzIGFuIEFJIGFzc2Vzc21lbnQgdG8gZW5mb3JjZSBjb3N0IGNvbnRyb2xcclxuICovXHJcbmZ1bmN0aW9uIGhhc0V4aXN0aW5nQUlBc3Nlc3NtZW50KGVwaXNvZGU6IEVwaXNvZGUpOiBib29sZWFuIHtcclxuICByZXR1cm4gZXBpc29kZS50cmlhZ2U/LmFpQXNzZXNzbWVudD8udXNlZCA9PT0gdHJ1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBmaW5hbCB1cmdlbmN5IGxldmVsIGNvbWJpbmluZyBydWxlLWJhc2VkIGFuZCBBSSBhc3Nlc3NtZW50c1xyXG4gKi9cclxuZnVuY3Rpb24gZGV0ZXJtaW5lRmluYWxVcmdlbmN5TGV2ZWwoXHJcbiAgcnVsZUJhc2VkUmVzdWx0OiB7IHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsOyBzY29yZTogbnVtYmVyIH0sXHJcbiAgYWlBc3Nlc3NtZW50OiBBSUFzc2Vzc21lbnRcclxuKTogVXJnZW5jeUxldmVsIHtcclxuICAvLyBJZiBBSSB3YXMgbm90IHVzZWQsIHJldHVybiBydWxlLWJhc2VkIHJlc3VsdFxyXG4gIGlmICghYWlBc3Nlc3NtZW50LnVzZWQpIHtcclxuICAgIHJldHVybiBydWxlQmFzZWRSZXN1bHQudXJnZW5jeUxldmVsO1xyXG4gIH1cclxuXHJcbiAgLy8gSWYgQUkgYXNzZXNzbWVudCBleGlzdHMsIHVzZSBpdCBhcyBwcmltYXJ5IHdpdGggcnVsZS1iYXNlZCBhcyB2YWxpZGF0aW9uXHJcbiAgLy8gRm9yIHNhZmV0eSwgaWYgdGhlcmUncyBkaXNhZ3JlZW1lbnQsIGNob29zZSB0aGUgaGlnaGVyIHVyZ2VuY3kgbGV2ZWxcclxuICBjb25zdCB1cmdlbmN5UHJpb3JpdHkgPSB7XHJcbiAgICBbVXJnZW5jeUxldmVsLkVNRVJHRU5DWV06IDQsXHJcbiAgICBbVXJnZW5jeUxldmVsLlVSR0VOVF06IDMsXHJcbiAgICBbVXJnZW5jeUxldmVsLlJPVVRJTkVdOiAyLFxyXG4gICAgW1VyZ2VuY3lMZXZlbC5TRUxGX0NBUkVdOiAxXHJcbiAgfTtcclxuXHJcbiAgLy8gQUkgYXNzZXNzbWVudCBzaG91bGQgaW5jbHVkZSB1cmdlbmN5IGxldmVsIGluIHJlYXNvbmluZ1xyXG4gIC8vIEZvciBub3csIHdlJ2xsIHVzZSBydWxlLWJhc2VkIGFzIHByaW1hcnkgYW5kIEFJIGFzIHZhbGlkYXRpb25cclxuICAvLyBJbiBhIGZ1bGwgaW1wbGVtZW50YXRpb24sIEFJIHdvdWxkIHByb3ZpZGUgc3RydWN0dXJlZCBvdXRwdXRcclxuICByZXR1cm4gcnVsZUJhc2VkUmVzdWx0LnVyZ2VuY3lMZXZlbDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBmaW5hbCB0cmlhZ2Ugc2NvcmVcclxuICovXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZUZpbmFsU2NvcmUoXHJcbiAgcnVsZUJhc2VkUmVzdWx0OiB7IHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsOyBzY29yZTogbnVtYmVyIH0sXHJcbiAgYWlBc3Nlc3NtZW50OiBBSUFzc2Vzc21lbnRcclxuKTogbnVtYmVyIHtcclxuICBpZiAoIWFpQXNzZXNzbWVudC51c2VkIHx8ICFhaUFzc2Vzc21lbnQuY29uZmlkZW5jZSkge1xyXG4gICAgcmV0dXJuIHJ1bGVCYXNlZFJlc3VsdC5zY29yZTtcclxuICB9XHJcblxyXG4gIC8vIFdlaWdodCB0aGUgc2NvcmVzOiA3MCUgcnVsZS1iYXNlZCwgMzAlIEFJIGNvbmZpZGVuY2VcclxuICByZXR1cm4gTWF0aC5yb3VuZChydWxlQmFzZWRSZXN1bHQuc2NvcmUgKiAwLjcgKyBhaUFzc2Vzc21lbnQuY29uZmlkZW5jZSAqIDEwMCAqIDAuMyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgZXBpc29kZSB3aXRoIHRyaWFnZSBhc3Nlc3NtZW50XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVFcGlzb2RlV2l0aFRyaWFnZShlcGlzb2RlSWQ6IHN0cmluZywgdHJpYWdlOiBUcmlhZ2VBc3Nlc3NtZW50KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogRVBJU09ERV9UQUJMRV9OQU1FLFxyXG4gICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgdHJpYWdlID0gOnRyaWFnZSwgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnRyaWFnZSc6IHRyaWFnZSxcclxuICAgICAgICAnOnVwZGF0ZWRBdCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZXBpc29kZSB3aXRoIHRyaWFnZTonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgbmV4dCBzdGVwcyBiYXNlZCBvbiB1cmdlbmN5IGxldmVsXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXROZXh0U3RlcHModXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwpOiBzdHJpbmcge1xyXG4gIHN3aXRjaCAodXJnZW5jeUxldmVsKSB7XHJcbiAgICBjYXNlIFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1k6XHJcbiAgICAgIHJldHVybiAnSW1tZWRpYXRlIG1lZGljYWwgYXR0ZW50aW9uIHJlcXVpcmVkLiBQcm9jZWVkIHRvIGVtZXJnZW5jeSBjYXJlIHJvdXRpbmcuJztcclxuICAgIGNhc2UgVXJnZW5jeUxldmVsLlVSR0VOVDpcclxuICAgICAgcmV0dXJuICdVcmdlbnQgY2FyZSBuZWVkZWQgd2l0aGluIDI0IGhvdXJzLiBQcm9jZWVkIHRvIHVyZ2VudCBjYXJlIHByb3ZpZGVyIGRpc2NvdmVyeS4nO1xyXG4gICAgY2FzZSBVcmdlbmN5TGV2ZWwuUk9VVElORTpcclxuICAgICAgcmV0dXJuICdSb3V0aW5lIGNhcmUgcmVjb21tZW5kZWQuIFByb2NlZWQgdG8gcHJvdmlkZXIgZGlzY292ZXJ5IGFuZCBzY2hlZHVsaW5nLic7XHJcbiAgICBjYXNlIFVyZ2VuY3lMZXZlbC5TRUxGX0NBUkU6XHJcbiAgICAgIHJldHVybiAnU2VsZi1jYXJlIGd1aWRhbmNlIHByb3ZpZGVkLiBNb25pdG9yIHN5bXB0b21zIGFuZCBzZWVrIGNhcmUgaWYgY29uZGl0aW9uIHdvcnNlbnMuJztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHJldHVybiAnQXNzZXNzbWVudCBjb21wbGV0ZS4gUHJvY2VlZCB0byBodW1hbiB2YWxpZGF0aW9uLic7XHJcbiAgfVxyXG59Il19