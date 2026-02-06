"use strict";
// Symptom Intake Lambda Function
// Handles patient symptom data processing with validation, voice input, and DynamoDB storage
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
exports.setDynamoClient = setDynamoClient;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const types_1 = require("../../types");
const episode_validation_1 = require("../../validation/episode-validation");
const validation_utils_1 = require("../../validation/validation-utils");
const voice_input_service_1 = require("./voice-input-service");
const incomplete_data_service_1 = require("./incomplete-data-service");
const client_transcribe_1 = require("@aws-sdk/client-transcribe");
// Environment variables
const PATIENT_TABLE_NAME = process.env.PATIENT_TABLE_NAME;
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME;
const AUDIO_UPLOAD_BUCKET = process.env.AUDIO_UPLOAD_BUCKET;
// Initialize DynamoDB client (lazy initialization for testing)
let docClient;
function getDynamoClient() {
    if (!docClient) {
        const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
        docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
    }
    return docClient;
}
// Export for testing
function setDynamoClient(client) {
    docClient = client;
}
/**
 * Lambda handler for symptom intake
 */
const handler = async (event, context) => {
    // Enhanced CloudWatch logging
    console.log('Symptom intake function started', {
        requestId: context.awsRequestId,
        functionName: context.functionName,
        functionVersion: context.functionVersion,
        remainingTimeInMillis: context.getRemainingTimeInMillis(),
        httpMethod: event.httpMethod,
        path: event.path,
        userAgent: event.headers?.['User-Agent'] || 'unknown',
        sourceIp: event.requestContext?.identity?.sourceIp || 'unknown'
    });
    try {
        // Route based on path and method
        const path = event.path;
        const method = event.httpMethod;
        // Handle different endpoints
        if (path.endsWith('/voice-input') && method === 'POST') {
            return await handleVoiceInput(event, context);
        }
        else if (path.endsWith('/presigned-url') && method === 'POST') {
            return await handlePresignedUrlRequest(event, context);
        }
        else if (path.endsWith('/check-completeness') && method === 'POST') {
            return await handleDataCompletenessCheck(event, context);
        }
        else if (method === 'POST') {
            return await handleTextSymptomIntake(event, context);
        }
        else {
            return createErrorResponse(405, 'Method not allowed');
        }
    }
    catch (error) {
        // Enhanced error logging with context
        const errorDetails = {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            requestId: context.awsRequestId,
            functionName: context.functionName,
            remainingTimeInMillis: context.getRemainingTimeInMillis(),
            eventPath: event.path,
            eventMethod: event.httpMethod
        };
        console.error('Error in symptom intake function', errorDetails);
        // Handle incomplete data errors specially
        if (error instanceof Error && error.name === 'IncompleteDataError') {
            console.warn('Incomplete data provided', {
                requestId: context.awsRequestId,
                completenessScore: error.completenessResult?.completenessScore,
                missingFieldsCount: error.completenessResult?.missingFields?.length,
                criticalMissing: error.completenessResult?.criticalMissing
            });
            return createIncompleteDataResponse(error.completenessResult, error.structuredPrompts);
        }
        // Log specific error types for monitoring
        if (error instanceof validation_utils_1.ValidationError) {
            console.warn('Validation error occurred', {
                requestId: context.awsRequestId,
                validationErrors: error.errors,
                errorCount: error.errors.length
            });
            return createErrorResponse(400, 'Validation failed', error.errors);
        }
        if (error instanceof SyntaxError) {
            console.warn('JSON parsing error', {
                requestId: context.awsRequestId,
                errorMessage: error.message
            });
            return createErrorResponse(400, 'Invalid JSON in request body');
        }
        // Log unexpected errors for alerting
        console.error('Unexpected error in symptom intake', {
            requestId: context.awsRequestId,
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error)
        });
        return createErrorResponse(500, 'Internal server error');
    }
};
exports.handler = handler;
/**
 * Handle data completeness check without storing data
 */
async function handleDataCompletenessCheck(event, context) {
    if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
    }
    const requestBody = JSON.parse(event.body);
    console.log('Data completeness check request received', {
        requestId: context.awsRequestId,
        hasSymptoms: !!requestBody.symptoms,
        inputMethod: requestBody.symptoms?.inputMethod
    });
    // Validate required structure
    if (!requestBody.symptoms) {
        return createErrorResponse(400, 'Symptoms data is required');
    }
    try {
        // Analyze data completeness
        const completenessResult = (0, incomplete_data_service_1.analyzeDataCompleteness)({
            ...requestBody.symptoms,
            inputMethod: requestBody.symptoms.inputMethod
        });
        console.log('Data completeness analysis completed', {
            requestId: context.awsRequestId,
            isComplete: completenessResult.isComplete,
            completenessScore: completenessResult.completenessScore,
            missingFieldsCount: completenessResult.missingFields.length,
            criticalMissing: completenessResult.criticalMissing
        });
        // Generate structured prompts if data is incomplete
        let structuredPrompts;
        if (!completenessResult.isComplete) {
            structuredPrompts = (0, incomplete_data_service_1.generateStructuredPrompts)(completenessResult.missingFields);
        }
        return createSuccessResponse({
            completeness: completenessResult,
            prompts: structuredPrompts,
            message: completenessResult.isComplete
                ? 'Symptom data is complete and ready for submission'
                : 'Additional information needed to complete your symptom report',
            canProceed: completenessResult.isComplete || !completenessResult.criticalMissing
        });
    }
    catch (error) {
        console.error('Error checking data completeness', {
            requestId: context.awsRequestId,
            error: error instanceof Error ? error.message : String(error)
        });
        return createErrorResponse(500, 'Failed to check data completeness');
    }
}
/**
 * Handle voice input processing
 */
async function handleVoiceInput(event, context) {
    if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
    }
    const requestBody = JSON.parse(event.body);
    console.log('Voice input request received', {
        requestId: context.awsRequestId,
        patientId: requestBody.patientId,
        mimeType: requestBody.mimeType,
        language: requestBody.language,
        audioDataLength: requestBody.audioData?.length || 0
    });
    // Validate required fields
    if (!requestBody.patientId || !requestBody.audioData || !requestBody.mimeType) {
        return createErrorResponse(400, 'Missing required fields: patientId, audioData, mimeType');
    }
    // Verify patient exists
    const patient = await getPatient(requestBody.patientId);
    if (!patient) {
        return createErrorResponse(404, 'Patient not found');
    }
    try {
        // Convert base64 audio data to buffer
        const audioBuffer = Buffer.from(requestBody.audioData, 'base64');
        const audioFile = {
            buffer: audioBuffer,
            mimeType: requestBody.mimeType,
            size: audioBuffer.length
        };
        // Determine language code
        const languageCode = requestBody.language === 'hi' ? client_transcribe_1.LanguageCode.HI_IN : client_transcribe_1.LanguageCode.EN_IN;
        // Process voice input
        const voiceResult = await (0, voice_input_service_1.processVoiceInput)(audioFile, requestBody.patientId, languageCode);
        if (!voiceResult.success) {
            console.warn('Voice processing failed', {
                requestId: context.awsRequestId,
                patientId: requestBody.patientId,
                error: voiceResult.error,
                fallbackUsed: voiceResult.fallbackUsed
            });
            return createErrorResponse(422, 'Voice processing failed', [
                voiceResult.error || 'Unknown voice processing error',
                'Please try again or use text input instead'
            ]);
        }
        console.log('Voice processing successful', {
            requestId: context.awsRequestId,
            patientId: requestBody.patientId,
            transcribedLength: voiceResult.transcribedText?.length || 0,
            confidence: voiceResult.confidence,
            fallbackUsed: voiceResult.fallbackUsed,
            processingTimeMs: voiceResult.processingTimeMs
        });
        return createSuccessResponse({
            transcribedText: voiceResult.transcribedText,
            confidence: voiceResult.confidence,
            language: voiceResult.language,
            fallbackUsed: voiceResult.fallbackUsed,
            processingTimeMs: voiceResult.processingTimeMs,
            message: 'Voice input processed successfully',
            nextSteps: 'Please review the transcribed text and submit your symptoms'
        });
    }
    catch (error) {
        console.error('Error processing voice input', {
            requestId: context.awsRequestId,
            patientId: requestBody.patientId,
            error: error instanceof Error ? error.message : String(error)
        });
        return createErrorResponse(500, 'Voice processing failed', [
            'Unable to process voice input at this time',
            'Please try again or use text input instead'
        ]);
    }
}
/**
 * Handle presigned URL request for direct audio upload
 */
async function handlePresignedUrlRequest(event, context) {
    if (!event.body) {
        return createErrorResponse(400, 'Request body is required');
    }
    const requestBody = JSON.parse(event.body);
    console.log('Presigned URL request received', {
        requestId: context.awsRequestId,
        patientId: requestBody.patientId,
        mimeType: requestBody.mimeType
    });
    // Validate required fields
    if (!requestBody.patientId || !requestBody.mimeType) {
        return createErrorResponse(400, 'Missing required fields: patientId, mimeType');
    }
    // Verify patient exists
    const patient = await getPatient(requestBody.patientId);
    if (!patient) {
        return createErrorResponse(404, 'Patient not found');
    }
    try {
        const { uploadUrl, s3Key } = await (0, voice_input_service_1.createPresignedUploadUrl)(requestBody.patientId, requestBody.mimeType);
        console.log('Presigned URL created successfully', {
            requestId: context.awsRequestId,
            patientId: requestBody.patientId,
            s3Key
        });
        return createSuccessResponse({
            uploadUrl,
            s3Key,
            message: 'Presigned URL created successfully',
            expiresIn: '15 minutes'
        });
    }
    catch (error) {
        console.error('Error creating presigned URL', {
            requestId: context.awsRequestId,
            patientId: requestBody.patientId,
            error: error instanceof Error ? error.message : String(error)
        });
        return createErrorResponse(500, 'Failed to create upload URL');
    }
}
/**
 * Handle text-based symptom intake (original functionality)
 */
async function handleTextSymptomIntake(event, context) {
    // Parse and validate request body
    if (!event.body) {
        console.warn('Request received without body', {
            requestId: context.awsRequestId,
            headers: event.headers
        });
        return createErrorResponse(400, 'Request body is required');
    }
    const requestBody = JSON.parse(event.body);
    console.log('Request body parsed successfully', {
        requestId: context.awsRequestId,
        patientId: requestBody.patientId,
        hasSymptoms: !!requestBody.symptoms,
        inputMethod: requestBody.symptoms?.inputMethod
    });
    // Validate input data
    const validatedInput = (0, validation_utils_1.validateOrThrow)(episode_validation_1.createEpisodeInputSchema, requestBody);
    console.log('Input validation successful', {
        requestId: context.awsRequestId,
        patientId: validatedInput.patientId,
        severity: validatedInput.symptoms.severity,
        inputMethod: validatedInput.symptoms.inputMethod
    });
    // Additional symptom data validation with enhanced completeness checking
    try {
        (0, incomplete_data_service_1.validateDataCompletenessOrThrow)(validatedInput.symptoms);
    }
    catch (error) {
        // This will be caught by the main error handler and converted to appropriate response
        throw error;
    }
    // Verify patient exists
    const patient = await getPatient(validatedInput.patientId);
    if (!patient) {
        console.warn('Patient not found', {
            requestId: context.awsRequestId,
            patientId: validatedInput.patientId
        });
        return createErrorResponse(404, 'Patient not found');
    }
    console.log('Patient retrieved successfully', {
        requestId: context.awsRequestId,
        patientId: patient.patientId,
        patientAge: patient.demographics.age,
        patientLocation: `${patient.demographics.location.district}, ${patient.demographics.location.state}`
    });
    // Create new episode
    const episode = await createEpisode(validatedInput, patient);
    // Store episode in DynamoDB
    await storeEpisode(episode);
    // Analyze urgency indicators for logging and monitoring
    const urgencyIndicators = analyzeUrgencyIndicators(episode.symptoms);
    // Log successful intake with detailed metrics
    console.log('Symptom intake completed successfully', {
        requestId: context.awsRequestId,
        episodeId: episode.episodeId,
        patientId: episode.patientId,
        severity: episode.symptoms.severity,
        urgencyIndicators,
        urgencyIndicatorCount: urgencyIndicators.length,
        processingTimeMs: Date.now() - new Date(episode.createdAt).getTime(),
        inputMethod: episode.symptoms.inputMethod
    });
    // Create CloudWatch custom metrics for monitoring
    if (urgencyIndicators.length > 0) {
        console.log('High urgency case detected', {
            requestId: context.awsRequestId,
            episodeId: episode.episodeId,
            urgencyIndicators,
            severity: episode.symptoms.severity,
            primaryComplaint: episode.symptoms.primaryComplaint.substring(0, 100) // Truncate for logging
        });
    }
    return createSuccessResponse({
        episodeId: episode.episodeId,
        status: episode.status,
        message: 'Symptom intake completed successfully',
        nextSteps: 'Episode created and queued for triage assessment',
        urgencyIndicators: urgencyIndicators.length > 0 ? urgencyIndicators : undefined
    });
}
/**
 * Validate symptom data completeness and prompt for missing information
 */
function validateSymptomCompleteness(symptoms) {
    const missingFields = [];
    // Check for essential symptom information
    if (!symptoms.primaryComplaint || symptoms.primaryComplaint.trim().length === 0) {
        missingFields.push('Primary complaint is required');
    }
    if (!symptoms.duration || symptoms.duration.trim().length === 0) {
        missingFields.push('Symptom duration is required');
    }
    if (symptoms.severity === undefined || symptoms.severity === null) {
        missingFields.push('Symptom severity (1-10 scale) is required');
    }
    if (!symptoms.inputMethod) {
        missingFields.push('Input method is required');
    }
    // Validate severity range
    if (symptoms.severity && (symptoms.severity < 1 || symptoms.severity > 10)) {
        missingFields.push('Severity must be between 1 and 10');
    }
    // Validate input method
    if (symptoms.inputMethod && !Object.values(types_1.InputMethod).includes(symptoms.inputMethod)) {
        missingFields.push('Invalid input method. Must be "text" or "voice"');
    }
    if (missingFields.length > 0) {
        throw new validation_utils_1.ValidationError(missingFields);
    }
}
/**
 * Get patient from DynamoDB
 */
async function getPatient(patientId) {
    try {
        const command = new lib_dynamodb_1.GetCommand({
            TableName: PATIENT_TABLE_NAME,
            Key: { patientId }
        });
        const result = await getDynamoClient().send(command);
        return result.Item || null;
    }
    catch (error) {
        console.error('Error retrieving patient', { patientId, error });
        throw new Error('Failed to retrieve patient information');
    }
}
/**
 * Create new episode from validated input
 */
async function createEpisode(input, patient) {
    const now = new Date();
    const episodeId = (0, uuid_1.v4)();
    // Sanitize symptom data for security
    const sanitizedSymptoms = sanitizeSymptomData(input.symptoms);
    const episode = {
        episodeId,
        patientId: input.patientId,
        status: types_1.EpisodeStatus.ACTIVE,
        symptoms: sanitizedSymptoms,
        interactions: [
            {
                timestamp: now,
                type: 'symptom_intake',
                actor: 'system',
                details: {
                    inputMethod: sanitizedSymptoms.inputMethod,
                    severity: sanitizedSymptoms.severity,
                    duration: sanitizedSymptoms.duration,
                    associatedSymptomsCount: sanitizedSymptoms.associatedSymptoms.length,
                    patientLocation: `${patient.demographics.location.district}, ${patient.demographics.location.state}`,
                    patientAge: patient.demographics.age
                }
            }
        ],
        createdAt: now,
        updatedAt: now
    };
    return episode;
}
/**
 * Store episode in DynamoDB
 */
async function storeEpisode(episode) {
    try {
        const command = new lib_dynamodb_1.PutCommand({
            TableName: EPISODE_TABLE_NAME,
            Item: episode,
            ConditionExpression: 'attribute_not_exists(episodeId)' // Prevent overwrites
        });
        await getDynamoClient().send(command);
    }
    catch (error) {
        console.error('Error storing episode', { episodeId: episode.episodeId, error });
        throw new Error('Failed to store episode data');
    }
}
/**
 * Sanitize text input to prevent XSS and other security issues
 */
function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    return text
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .substring(0, 1000); // Limit length
}
/**
 * Enhanced symptom data sanitization
 */
function sanitizeSymptomData(symptoms) {
    return {
        ...symptoms,
        primaryComplaint: sanitizeText(symptoms.primaryComplaint),
        duration: sanitizeText(symptoms.duration),
        associatedSymptoms: symptoms.associatedSymptoms.map((symptom) => sanitizeText(symptom))
    };
}
/**
 * Analyze symptoms for urgency indicators
 */
function analyzeUrgencyIndicators(symptoms) {
    const urgencyIndicators = [];
    // High severity symptoms
    if (symptoms.severity >= 8) {
        urgencyIndicators.push('high_severity');
    }
    // Critical severity symptoms
    if (symptoms.severity >= 9) {
        urgencyIndicators.push('critical_severity');
    }
    // Emergency keywords in primary complaint
    const emergencyKeywords = [
        'chest pain', 'difficulty breathing', 'unconscious', 'bleeding',
        'severe pain', 'heart attack', 'stroke', 'emergency', 'can\'t breathe',
        'choking', 'seizure', 'overdose', 'suicide', 'severe bleeding',
        'head injury', 'broken bone', 'severe burn'
    ];
    const complaint = symptoms.primaryComplaint.toLowerCase();
    emergencyKeywords.forEach(keyword => {
        if (complaint.includes(keyword)) {
            urgencyIndicators.push(`emergency_keyword_${keyword.replace(/[^a-z0-9]/g, '_')}`);
        }
    });
    // Duration-based indicators
    if (symptoms.duration.toLowerCase().includes('sudden') ||
        symptoms.duration.toLowerCase().includes('immediate') ||
        symptoms.duration.toLowerCase().includes('just now')) {
        urgencyIndicators.push('sudden_onset');
    }
    // Associated symptoms that indicate urgency
    const urgentAssociatedSymptoms = [
        'difficulty breathing', 'chest pain', 'dizziness', 'fainting',
        'severe headache', 'confusion', 'vomiting blood', 'severe nausea'
    ];
    symptoms.associatedSymptoms.forEach((symptom) => {
        const lowerSymptom = symptom.toLowerCase();
        urgentAssociatedSymptoms.forEach(urgentSymptom => {
            if (lowerSymptom.includes(urgentSymptom)) {
                urgencyIndicators.push(`urgent_associated_${urgentSymptom.replace(/[^a-z0-9]/g, '_')}`);
            }
        });
    });
    // Combination indicators
    if (symptoms.severity >= 7 && urgencyIndicators.some(indicator => indicator.startsWith('emergency_keyword'))) {
        urgencyIndicators.push('high_severity_with_emergency_keywords');
    }
    return urgencyIndicators;
}
/**
 * Create incomplete data response with structured prompts
 */
function createIncompleteDataResponse(completenessResult, structuredPrompts) {
    return {
        statusCode: 422, // Unprocessable Entity
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
            error: 'Incomplete symptom data',
            message: 'Additional information is required to complete your symptom report',
            completeness: {
                score: completenessResult.completenessScore,
                isComplete: completenessResult.isComplete,
                criticalMissing: completenessResult.criticalMissing,
                missingFieldsCount: completenessResult.missingFields.length
            },
            prompts: structuredPrompts,
            suggestions: completenessResult.suggestions,
            canProceedWithIncompleteData: !completenessResult.criticalMissing,
            timestamp: new Date().toISOString()
        })
    };
}
/**
 * Create success response
 */
function createSuccessResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify(data)
    };
}
/**
 * Create error response
 */
function createErrorResponse(statusCode, message, details) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        body: JSON.stringify({
            error: message,
            details: details || [],
            timestamp: new Date().toISOString()
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL3N5bXB0b20taW50YWtlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQ0FBaUM7QUFDakMsNkZBQTZGOzs7QUFxRDdGLDBDQUVDO0FBcERELDhEQUEwRDtBQUMxRCx3REFBdUY7QUFDdkYsK0JBQW9DO0FBQ3BDLHVDQU1xQjtBQUNyQiw0RUFHNkM7QUFDN0Msd0VBRzJDO0FBQzNDLCtEQUsrQjtBQUMvQix1RUFNbUM7QUFDbkMsa0VBQTBEO0FBRTFELHdCQUF3QjtBQUN4QixNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQW1CLENBQUM7QUFDM0QsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFtQixDQUFDO0FBQzNELE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBb0IsQ0FBQztBQUU3RCwrREFBK0Q7QUFDL0QsSUFBSSxTQUFpQyxDQUFDO0FBRXRDLFNBQVMsZUFBZTtJQUN0QixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDZixNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUMsU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUVELHFCQUFxQjtBQUNyQixTQUFnQixlQUFlLENBQUMsTUFBOEI7SUFDNUQsU0FBUyxHQUFHLE1BQU0sQ0FBQztBQUNyQixDQUFDO0FBaUNEOztHQUVHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUMzQixPQUFnQixFQUNnQixFQUFFO0lBQ2xDLDhCQUE4QjtJQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFO1FBQzdDLFNB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WUFDdEIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1NBQ3BDLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFN5bXB0b20gSW50YWtlIExhbWJkYSBGdW5jdGlvblxyXG4vLyBIYW5kbGVzIHBhdGllbnQgc3ltcHRvbSBkYXRhIHByb2Nlc3Npbmcgd2l0aCB2YWxpZGF0aW9uLCB2b2ljZSBpbnB1dCwgYW5kIER5bmFtb0RCIHN0b3JhZ2VcclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kLCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCB7IFxyXG4gIENyZWF0ZUVwaXNvZGVJbnB1dCwgXHJcbiAgRXBpc29kZSwgXHJcbiAgUGF0aWVudCwgXHJcbiAgRXBpc29kZVN0YXR1cywgXHJcbiAgSW5wdXRNZXRob2QgXHJcbn0gZnJvbSAnLi4vLi4vdHlwZXMnO1xyXG5pbXBvcnQgeyBcclxuICBjcmVhdGVFcGlzb2RlSW5wdXRTY2hlbWEsIFxyXG4gIHN5bXB0b21zU2NoZW1hIFxyXG59IGZyb20gJy4uLy4uL3ZhbGlkYXRpb24vZXBpc29kZS12YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgXHJcbiAgdmFsaWRhdGVPclRocm93LCBcclxuICBWYWxpZGF0aW9uRXJyb3IgXHJcbn0gZnJvbSAnLi4vLi4vdmFsaWRhdGlvbi92YWxpZGF0aW9uLXV0aWxzJztcclxuaW1wb3J0IHsgXHJcbiAgcHJvY2Vzc1ZvaWNlSW5wdXQsIFxyXG4gIEF1ZGlvRmlsZUluZm8sIFxyXG4gIFZvaWNlSW5wdXRSZXN1bHQsXHJcbiAgY3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsXHJcbn0gZnJvbSAnLi92b2ljZS1pbnB1dC1zZXJ2aWNlJztcclxuaW1wb3J0IHtcclxuICBhbmFseXplRGF0YUNvbXBsZXRlbmVzcyxcclxuICBnZW5lcmF0ZVN0cnVjdHVyZWRQcm9tcHRzLFxyXG4gIHZhbGlkYXRlRGF0YUNvbXBsZXRlbmVzc09yVGhyb3csXHJcbiAgRGF0YUNvbXBsZXRlbmVzc1Jlc3VsdCxcclxuICBTdHJ1Y3R1cmVkUHJvbXB0UmVzcG9uc2VcclxufSBmcm9tICcuL2luY29tcGxldGUtZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgTGFuZ3VhZ2VDb2RlIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXRyYW5zY3JpYmUnO1xyXG5cclxuLy8gRW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbmNvbnN0IFBBVElFTlRfVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LlBBVElFTlRfVEFCTEVfTkFNRSE7XHJcbmNvbnN0IEVQSVNPREVfVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LkVQSVNPREVfVEFCTEVfTkFNRSE7XHJcbmNvbnN0IEFVRElPX1VQTE9BRF9CVUNLRVQgPSBwcm9jZXNzLmVudi5BVURJT19VUExPQURfQlVDS0VUITtcclxuXHJcbi8vIEluaXRpYWxpemUgRHluYW1vREIgY2xpZW50IChsYXp5IGluaXRpYWxpemF0aW9uIGZvciB0ZXN0aW5nKVxyXG5sZXQgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG5cclxuZnVuY3Rpb24gZ2V0RHluYW1vQ2xpZW50KCk6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQge1xyXG4gIGlmICghZG9jQ2xpZW50KSB7XHJcbiAgICBjb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG4gICAgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGR5bmFtb0NsaWVudCk7XHJcbiAgfVxyXG4gIHJldHVybiBkb2NDbGllbnQ7XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBmb3IgdGVzdGluZ1xyXG5leHBvcnQgZnVuY3Rpb24gc2V0RHluYW1vQ2xpZW50KGNsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCk6IHZvaWQge1xyXG4gIGRvY0NsaWVudCA9IGNsaWVudDtcclxufVxyXG5cclxuLyoqXHJcbiAqIERhdGEgY29tcGxldGVuZXNzIGNoZWNrIHJlcXVlc3QgaW50ZXJmYWNlXHJcbiAqL1xyXG5pbnRlcmZhY2UgRGF0YUNvbXBsZXRlbmVzc1JlcXVlc3Qge1xyXG4gIHN5bXB0b21zOiB7XHJcbiAgICBwcmltYXJ5Q29tcGxhaW50Pzogc3RyaW5nO1xyXG4gICAgZHVyYXRpb24/OiBzdHJpbmc7XHJcbiAgICBzZXZlcml0eT86IG51bWJlcjtcclxuICAgIGFzc29jaWF0ZWRTeW1wdG9tcz86IHN0cmluZ1tdO1xyXG4gICAgaW5wdXRNZXRob2Q/OiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZvaWNlIGlucHV0IHJlcXVlc3QgaW50ZXJmYWNlXHJcbiAqL1xyXG5pbnRlcmZhY2UgVm9pY2VJbnB1dFJlcXVlc3Qge1xyXG4gIHBhdGllbnRJZDogc3RyaW5nO1xyXG4gIGF1ZGlvRGF0YTogc3RyaW5nOyAvLyBCYXNlNjQgZW5jb2RlZCBhdWRpbyBkYXRhXHJcbiAgbWltZVR5cGU6IHN0cmluZztcclxuICBsYW5ndWFnZT86ICdlbicgfCAnaGknO1xyXG59XHJcblxyXG4vKipcclxuICogUHJlc2lnbmVkIFVSTCByZXF1ZXN0IGludGVyZmFjZVxyXG4gKi9cclxuaW50ZXJmYWNlIFByZXNpZ25lZFVybFJlcXVlc3Qge1xyXG4gIHBhdGllbnRJZDogc3RyaW5nO1xyXG4gIG1pbWVUeXBlOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgaGFuZGxlciBmb3Igc3ltcHRvbSBpbnRha2VcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgLy8gRW5oYW5jZWQgQ2xvdWRXYXRjaCBsb2dnaW5nXHJcbiAgY29uc29sZS5sb2coJ1N5bXB0b20gaW50YWtlIGZ1bmN0aW9uIHN0YXJ0ZWQnLCB7XHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIGZ1bmN0aW9uVmVyc2lvbjogY29udGV4dC5mdW5jdGlvblZlcnNpb24sXHJcbiAgICByZW1haW5pbmdUaW1lSW5NaWxsaXM6IGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCksXHJcbiAgICBodHRwTWV0aG9kOiBldmVudC5odHRwTWV0aG9kLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIHVzZXJBZ2VudDogZXZlbnQuaGVhZGVycz8uWydVc2VyLUFnZW50J10gfHwgJ3Vua25vd24nLFxyXG4gICAgc291cmNlSXA6IGV2ZW50LnJlcXVlc3RDb250ZXh0Py5pZGVudGl0eT8uc291cmNlSXAgfHwgJ3Vua25vd24nXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBSb3V0ZSBiYXNlZCBvbiBwYXRoIGFuZCBtZXRob2RcclxuICAgIGNvbnN0IHBhdGggPSBldmVudC5wYXRoO1xyXG4gICAgY29uc3QgbWV0aG9kID0gZXZlbnQuaHR0cE1ldGhvZDtcclxuXHJcbiAgICAvLyBIYW5kbGUgZGlmZmVyZW50IGVuZHBvaW50c1xyXG4gICAgaWYgKHBhdGguZW5kc1dpdGgoJy92b2ljZS1pbnB1dCcpICYmIG1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVWb2ljZUlucHV0KGV2ZW50LCBjb250ZXh0KTtcclxuICAgIH0gZWxzZSBpZiAocGF0aC5lbmRzV2l0aCgnL3ByZXNpZ25lZC11cmwnKSAmJiBtZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICByZXR1cm4gYXdhaXQgaGFuZGxlUHJlc2lnbmVkVXJsUmVxdWVzdChldmVudCwgY29udGV4dCk7XHJcbiAgICB9IGVsc2UgaWYgKHBhdGguZW5kc1dpdGgoJy9jaGVjay1jb21wbGV0ZW5lc3MnKSAmJiBtZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICByZXR1cm4gYXdhaXQgaGFuZGxlRGF0YUNvbXBsZXRlbmVzc0NoZWNrKGV2ZW50LCBjb250ZXh0KTtcclxuICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZVRleHRTeW1wdG9tSW50YWtlKGV2ZW50LCBjb250ZXh0KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNSwgJ01ldGhvZCBub3QgYWxsb3dlZCcpO1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gRW5oYW5jZWQgZXJyb3IgbG9nZ2luZyB3aXRoIGNvbnRleHRcclxuICAgIGNvbnN0IGVycm9yRGV0YWlscyA9IHtcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcclxuICAgICAgc3RhY2s6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6IHVuZGVmaW5lZCxcclxuICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgICAgcmVtYWluaW5nVGltZUluTWlsbGlzOiBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpLFxyXG4gICAgICBldmVudFBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgIGV2ZW50TWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHN5bXB0b20gaW50YWtlIGZ1bmN0aW9uJywgZXJyb3JEZXRhaWxzKTtcclxuXHJcbiAgICAvLyBIYW5kbGUgaW5jb21wbGV0ZSBkYXRhIGVycm9ycyBzcGVjaWFsbHlcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmIGVycm9yLm5hbWUgPT09ICdJbmNvbXBsZXRlRGF0YUVycm9yJykge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0luY29tcGxldGUgZGF0YSBwcm92aWRlZCcsIHtcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgICAgIGNvbXBsZXRlbmVzc1Njb3JlOiAoZXJyb3IgYXMgYW55KS5jb21wbGV0ZW5lc3NSZXN1bHQ/LmNvbXBsZXRlbmVzc1Njb3JlLFxyXG4gICAgICAgIG1pc3NpbmdGaWVsZHNDb3VudDogKGVycm9yIGFzIGFueSkuY29tcGxldGVuZXNzUmVzdWx0Py5taXNzaW5nRmllbGRzPy5sZW5ndGgsXHJcbiAgICAgICAgY3JpdGljYWxNaXNzaW5nOiAoZXJyb3IgYXMgYW55KS5jb21wbGV0ZW5lc3NSZXN1bHQ/LmNyaXRpY2FsTWlzc2luZ1xyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiBjcmVhdGVJbmNvbXBsZXRlRGF0YVJlc3BvbnNlKFxyXG4gICAgICAgIChlcnJvciBhcyBhbnkpLmNvbXBsZXRlbmVzc1Jlc3VsdCxcclxuICAgICAgICAoZXJyb3IgYXMgYW55KS5zdHJ1Y3R1cmVkUHJvbXB0c1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIExvZyBzcGVjaWZpYyBlcnJvciB0eXBlcyBmb3IgbW9uaXRvcmluZ1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgVmFsaWRhdGlvbkVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignVmFsaWRhdGlvbiBlcnJvciBvY2N1cnJlZCcsIHtcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgICAgIHZhbGlkYXRpb25FcnJvcnM6IGVycm9yLmVycm9ycyxcclxuICAgICAgICBlcnJvckNvdW50OiBlcnJvci5lcnJvcnMubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdWYWxpZGF0aW9uIGZhaWxlZCcsIGVycm9yLmVycm9ycyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdKU09OIHBhcnNpbmcgZXJyb3InLCB7XHJcbiAgICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgICBlcnJvck1lc3NhZ2U6IGVycm9yLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBMb2cgdW5leHBlY3RlZCBlcnJvcnMgZm9yIGFsZXJ0aW5nXHJcbiAgICBjb25zb2xlLmVycm9yKCdVbmV4cGVjdGVkIGVycm9yIGluIHN5bXB0b20gaW50YWtlJywge1xyXG4gICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgICBlcnJvclR5cGU6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5jb25zdHJ1Y3Rvci5uYW1lIDogJ1Vua25vd24nLFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBkYXRhIGNvbXBsZXRlbmVzcyBjaGVjayB3aXRob3V0IHN0b3JpbmcgZGF0YVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlRGF0YUNvbXBsZXRlbmVzc0NoZWNrKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KSBhcyBEYXRhQ29tcGxldGVuZXNzUmVxdWVzdDtcclxuICBcclxuICBjb25zb2xlLmxvZygnRGF0YSBjb21wbGV0ZW5lc3MgY2hlY2sgcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICBoYXNTeW1wdG9tczogISFyZXF1ZXN0Qm9keS5zeW1wdG9tcyxcclxuICAgIGlucHV0TWV0aG9kOiByZXF1ZXN0Qm9keS5zeW1wdG9tcz8uaW5wdXRNZXRob2RcclxuICB9KTtcclxuXHJcbiAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgc3RydWN0dXJlXHJcbiAgaWYgKCFyZXF1ZXN0Qm9keS5zeW1wdG9tcykge1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnU3ltcHRvbXMgZGF0YSBpcyByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEFuYWx5emUgZGF0YSBjb21wbGV0ZW5lc3NcclxuICAgIGNvbnN0IGNvbXBsZXRlbmVzc1Jlc3VsdCA9IGFuYWx5emVEYXRhQ29tcGxldGVuZXNzKHtcclxuICAgICAgLi4ucmVxdWVzdEJvZHkuc3ltcHRvbXMsXHJcbiAgICAgIGlucHV0TWV0aG9kOiByZXF1ZXN0Qm9keS5zeW1wdG9tcy5pbnB1dE1ldGhvZCBhcyBJbnB1dE1ldGhvZFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKCdEYXRhIGNvbXBsZXRlbmVzcyBhbmFseXNpcyBjb21wbGV0ZWQnLCB7XHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgIGlzQ29tcGxldGU6IGNvbXBsZXRlbmVzc1Jlc3VsdC5pc0NvbXBsZXRlLFxyXG4gICAgICBjb21wbGV0ZW5lc3NTY29yZTogY29tcGxldGVuZXNzUmVzdWx0LmNvbXBsZXRlbmVzc1Njb3JlLFxyXG4gICAgICBtaXNzaW5nRmllbGRzQ291bnQ6IGNvbXBsZXRlbmVzc1Jlc3VsdC5taXNzaW5nRmllbGRzLmxlbmd0aCxcclxuICAgICAgY3JpdGljYWxNaXNzaW5nOiBjb21wbGV0ZW5lc3NSZXN1bHQuY3JpdGljYWxNaXNzaW5nXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBzdHJ1Y3R1cmVkIHByb21wdHMgaWYgZGF0YSBpcyBpbmNvbXBsZXRlXHJcbiAgICBsZXQgc3RydWN0dXJlZFByb21wdHM6IFN0cnVjdHVyZWRQcm9tcHRSZXNwb25zZSB8IHVuZGVmaW5lZDtcclxuICAgIGlmICghY29tcGxldGVuZXNzUmVzdWx0LmlzQ29tcGxldGUpIHtcclxuICAgICAgc3RydWN0dXJlZFByb21wdHMgPSBnZW5lcmF0ZVN0cnVjdHVyZWRQcm9tcHRzKGNvbXBsZXRlbmVzc1Jlc3VsdC5taXNzaW5nRmllbGRzKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgY29tcGxldGVuZXNzOiBjb21wbGV0ZW5lc3NSZXN1bHQsXHJcbiAgICAgIHByb21wdHM6IHN0cnVjdHVyZWRQcm9tcHRzLFxyXG4gICAgICBtZXNzYWdlOiBjb21wbGV0ZW5lc3NSZXN1bHQuaXNDb21wbGV0ZSBcclxuICAgICAgICA/ICdTeW1wdG9tIGRhdGEgaXMgY29tcGxldGUgYW5kIHJlYWR5IGZvciBzdWJtaXNzaW9uJ1xyXG4gICAgICAgIDogJ0FkZGl0aW9uYWwgaW5mb3JtYXRpb24gbmVlZGVkIHRvIGNvbXBsZXRlIHlvdXIgc3ltcHRvbSByZXBvcnQnLFxyXG4gICAgICBjYW5Qcm9jZWVkOiBjb21wbGV0ZW5lc3NSZXN1bHQuaXNDb21wbGV0ZSB8fCAhY29tcGxldGVuZXNzUmVzdWx0LmNyaXRpY2FsTWlzc2luZ1xyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyBkYXRhIGNvbXBsZXRlbmVzcycsIHtcclxuICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGNoZWNrIGRhdGEgY29tcGxldGVuZXNzJyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIHZvaWNlIGlucHV0IHByb2Nlc3NpbmdcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVZvaWNlSW5wdXQoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVxdWVzdEJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIGFzIFZvaWNlSW5wdXRSZXF1ZXN0O1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKCdWb2ljZSBpbnB1dCByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIHBhdGllbnRJZDogcmVxdWVzdEJvZHkucGF0aWVudElkLFxyXG4gICAgbWltZVR5cGU6IHJlcXVlc3RCb2R5Lm1pbWVUeXBlLFxyXG4gICAgbGFuZ3VhZ2U6IHJlcXVlc3RCb2R5Lmxhbmd1YWdlLFxyXG4gICAgYXVkaW9EYXRhTGVuZ3RoOiByZXF1ZXN0Qm9keS5hdWRpb0RhdGE/Lmxlbmd0aCB8fCAwXHJcbiAgfSk7XHJcblxyXG4gIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gIGlmICghcmVxdWVzdEJvZHkucGF0aWVudElkIHx8ICFyZXF1ZXN0Qm9keS5hdWRpb0RhdGEgfHwgIXJlcXVlc3RCb2R5Lm1pbWVUeXBlKSB7XHJcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogcGF0aWVudElkLCBhdWRpb0RhdGEsIG1pbWVUeXBlJyk7XHJcbiAgfVxyXG5cclxuICAvLyBWZXJpZnkgcGF0aWVudCBleGlzdHNcclxuICBjb25zdCBwYXRpZW50ID0gYXdhaXQgZ2V0UGF0aWVudChyZXF1ZXN0Qm9keS5wYXRpZW50SWQpO1xyXG4gIGlmICghcGF0aWVudCkge1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnUGF0aWVudCBub3QgZm91bmQnKTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBDb252ZXJ0IGJhc2U2NCBhdWRpbyBkYXRhIHRvIGJ1ZmZlclxyXG4gICAgY29uc3QgYXVkaW9CdWZmZXIgPSBCdWZmZXIuZnJvbShyZXF1ZXN0Qm9keS5hdWRpb0RhdGEsICdiYXNlNjQnKTtcclxuICAgIFxyXG4gICAgY29uc3QgYXVkaW9GaWxlOiBBdWRpb0ZpbGVJbmZvID0ge1xyXG4gICAgICBidWZmZXI6IGF1ZGlvQnVmZmVyLFxyXG4gICAgICBtaW1lVHlwZTogcmVxdWVzdEJvZHkubWltZVR5cGUsXHJcbiAgICAgIHNpemU6IGF1ZGlvQnVmZmVyLmxlbmd0aFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBEZXRlcm1pbmUgbGFuZ3VhZ2UgY29kZVxyXG4gICAgY29uc3QgbGFuZ3VhZ2VDb2RlID0gcmVxdWVzdEJvZHkubGFuZ3VhZ2UgPT09ICdoaScgPyBMYW5ndWFnZUNvZGUuSElfSU4gOiBMYW5ndWFnZUNvZGUuRU5fSU47XHJcblxyXG4gICAgLy8gUHJvY2VzcyB2b2ljZSBpbnB1dFxyXG4gICAgY29uc3Qgdm9pY2VSZXN1bHQgPSBhd2FpdCBwcm9jZXNzVm9pY2VJbnB1dChhdWRpb0ZpbGUsIHJlcXVlc3RCb2R5LnBhdGllbnRJZCwgbGFuZ3VhZ2VDb2RlKTtcclxuXHJcbiAgICBpZiAoIXZvaWNlUmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdWb2ljZSBwcm9jZXNzaW5nIGZhaWxlZCcsIHtcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgICAgIHBhdGllbnRJZDogcmVxdWVzdEJvZHkucGF0aWVudElkLFxyXG4gICAgICAgIGVycm9yOiB2b2ljZVJlc3VsdC5lcnJvcixcclxuICAgICAgICBmYWxsYmFja1VzZWQ6IHZvaWNlUmVzdWx0LmZhbGxiYWNrVXNlZFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQyMiwgJ1ZvaWNlIHByb2Nlc3NpbmcgZmFpbGVkJywgW1xyXG4gICAgICAgIHZvaWNlUmVzdWx0LmVycm9yIHx8ICdVbmtub3duIHZvaWNlIHByb2Nlc3NpbmcgZXJyb3InLFxyXG4gICAgICAgICdQbGVhc2UgdHJ5IGFnYWluIG9yIHVzZSB0ZXh0IGlucHV0IGluc3RlYWQnXHJcbiAgICAgIF0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKCdWb2ljZSBwcm9jZXNzaW5nIHN1Y2Nlc3NmdWwnLCB7XHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgIHBhdGllbnRJZDogcmVxdWVzdEJvZHkucGF0aWVudElkLFxyXG4gICAgICB0cmFuc2NyaWJlZExlbmd0aDogdm9pY2VSZXN1bHQudHJhbnNjcmliZWRUZXh0Py5sZW5ndGggfHwgMCxcclxuICAgICAgY29uZmlkZW5jZTogdm9pY2VSZXN1bHQuY29uZmlkZW5jZSxcclxuICAgICAgZmFsbGJhY2tVc2VkOiB2b2ljZVJlc3VsdC5mYWxsYmFja1VzZWQsXHJcbiAgICAgIHByb2Nlc3NpbmdUaW1lTXM6IHZvaWNlUmVzdWx0LnByb2Nlc3NpbmdUaW1lTXNcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICB0cmFuc2NyaWJlZFRleHQ6IHZvaWNlUmVzdWx0LnRyYW5zY3JpYmVkVGV4dCxcclxuICAgICAgY29uZmlkZW5jZTogdm9pY2VSZXN1bHQuY29uZmlkZW5jZSxcclxuICAgICAgbGFuZ3VhZ2U6IHZvaWNlUmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICBmYWxsYmFja1VzZWQ6IHZvaWNlUmVzdWx0LmZhbGxiYWNrVXNlZCxcclxuICAgICAgcHJvY2Vzc2luZ1RpbWVNczogdm9pY2VSZXN1bHQucHJvY2Vzc2luZ1RpbWVNcyxcclxuICAgICAgbWVzc2FnZTogJ1ZvaWNlIGlucHV0IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICBuZXh0U3RlcHM6ICdQbGVhc2UgcmV2aWV3IHRoZSB0cmFuc2NyaWJlZCB0ZXh0IGFuZCBzdWJtaXQgeW91ciBzeW1wdG9tcydcclxuICAgIH0pO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyB2b2ljZSBpbnB1dCcsIHtcclxuICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgcGF0aWVudElkOiByZXF1ZXN0Qm9keS5wYXRpZW50SWQsXHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ1ZvaWNlIHByb2Nlc3NpbmcgZmFpbGVkJywgW1xyXG4gICAgICAnVW5hYmxlIHRvIHByb2Nlc3Mgdm9pY2UgaW5wdXQgYXQgdGhpcyB0aW1lJyxcclxuICAgICAgJ1BsZWFzZSB0cnkgYWdhaW4gb3IgdXNlIHRleHQgaW5wdXQgaW5zdGVhZCdcclxuICAgIF0pO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBwcmVzaWduZWQgVVJMIHJlcXVlc3QgZm9yIGRpcmVjdCBhdWRpbyB1cGxvYWRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVByZXNpZ25lZFVybFJlcXVlc3QoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVxdWVzdEJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIGFzIFByZXNpZ25lZFVybFJlcXVlc3Q7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1ByZXNpZ25lZCBVUkwgcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICBwYXRpZW50SWQ6IHJlcXVlc3RCb2R5LnBhdGllbnRJZCxcclxuICAgIG1pbWVUeXBlOiByZXF1ZXN0Qm9keS5taW1lVHlwZVxyXG4gIH0pO1xyXG5cclxuICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICBpZiAoIXJlcXVlc3RCb2R5LnBhdGllbnRJZCB8fCAhcmVxdWVzdEJvZHkubWltZVR5cGUpIHtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBwYXRpZW50SWQsIG1pbWVUeXBlJyk7XHJcbiAgfVxyXG5cclxuICAvLyBWZXJpZnkgcGF0aWVudCBleGlzdHNcclxuICBjb25zdCBwYXRpZW50ID0gYXdhaXQgZ2V0UGF0aWVudChyZXF1ZXN0Qm9keS5wYXRpZW50SWQpO1xyXG4gIGlmICghcGF0aWVudCkge1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnUGF0aWVudCBub3QgZm91bmQnKTtcclxuICB9XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IHVwbG9hZFVybCwgczNLZXkgfSA9IGF3YWl0IGNyZWF0ZVByZXNpZ25lZFVwbG9hZFVybChcclxuICAgICAgcmVxdWVzdEJvZHkucGF0aWVudElkLFxyXG4gICAgICByZXF1ZXN0Qm9keS5taW1lVHlwZVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnUHJlc2lnbmVkIFVSTCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgICAgcGF0aWVudElkOiByZXF1ZXN0Qm9keS5wYXRpZW50SWQsXHJcbiAgICAgIHMzS2V5XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgdXBsb2FkVXJsLFxyXG4gICAgICBzM0tleSxcclxuICAgICAgbWVzc2FnZTogJ1ByZXNpZ25lZCBVUkwgY3JlYXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICBleHBpcmVzSW46ICcxNSBtaW51dGVzJ1xyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyBwcmVzaWduZWQgVVJMJywge1xyXG4gICAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgICBwYXRpZW50SWQ6IHJlcXVlc3RCb2R5LnBhdGllbnRJZCxcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGNyZWF0ZSB1cGxvYWQgVVJMJyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIHRleHQtYmFzZWQgc3ltcHRvbSBpbnRha2UgKG9yaWdpbmFsIGZ1bmN0aW9uYWxpdHkpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVUZXh0U3ltcHRvbUludGFrZShcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsXHJcbiAgY29udGV4dDogQ29udGV4dFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIC8vIFBhcnNlIGFuZCB2YWxpZGF0ZSByZXF1ZXN0IGJvZHlcclxuICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgIGNvbnNvbGUud2FybignUmVxdWVzdCByZWNlaXZlZCB3aXRob3V0IGJvZHknLCB7XHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgIGhlYWRlcnM6IGV2ZW50LmhlYWRlcnNcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgfVxyXG5cclxuICBjb25zdCByZXF1ZXN0Qm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgXHJcbiAgY29uc29sZS5sb2coJ1JlcXVlc3QgYm9keSBwYXJzZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIHBhdGllbnRJZDogcmVxdWVzdEJvZHkucGF0aWVudElkLFxyXG4gICAgaGFzU3ltcHRvbXM6ICEhcmVxdWVzdEJvZHkuc3ltcHRvbXMsXHJcbiAgICBpbnB1dE1ldGhvZDogcmVxdWVzdEJvZHkuc3ltcHRvbXM/LmlucHV0TWV0aG9kXHJcbiAgfSk7XHJcbiAgXHJcbiAgLy8gVmFsaWRhdGUgaW5wdXQgZGF0YVxyXG4gIGNvbnN0IHZhbGlkYXRlZElucHV0ID0gdmFsaWRhdGVPclRocm93PENyZWF0ZUVwaXNvZGVJbnB1dD4oXHJcbiAgICBjcmVhdGVFcGlzb2RlSW5wdXRTY2hlbWEsXHJcbiAgICByZXF1ZXN0Qm9keVxyXG4gICk7XHJcblxyXG4gIGNvbnNvbGUubG9nKCdJbnB1dCB2YWxpZGF0aW9uIHN1Y2Nlc3NmdWwnLCB7XHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgcGF0aWVudElkOiB2YWxpZGF0ZWRJbnB1dC5wYXRpZW50SWQsXHJcbiAgICBzZXZlcml0eTogdmFsaWRhdGVkSW5wdXQuc3ltcHRvbXMuc2V2ZXJpdHksXHJcbiAgICBpbnB1dE1ldGhvZDogdmFsaWRhdGVkSW5wdXQuc3ltcHRvbXMuaW5wdXRNZXRob2RcclxuICB9KTtcclxuXHJcbiAgLy8gQWRkaXRpb25hbCBzeW1wdG9tIGRhdGEgdmFsaWRhdGlvbiB3aXRoIGVuaGFuY2VkIGNvbXBsZXRlbmVzcyBjaGVja2luZ1xyXG4gIHRyeSB7XHJcbiAgICB2YWxpZGF0ZURhdGFDb21wbGV0ZW5lc3NPclRocm93KHZhbGlkYXRlZElucHV0LnN5bXB0b21zKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gVGhpcyB3aWxsIGJlIGNhdWdodCBieSB0aGUgbWFpbiBlcnJvciBoYW5kbGVyIGFuZCBjb252ZXJ0ZWQgdG8gYXBwcm9wcmlhdGUgcmVzcG9uc2VcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxuXHJcbiAgLy8gVmVyaWZ5IHBhdGllbnQgZXhpc3RzXHJcbiAgY29uc3QgcGF0aWVudCA9IGF3YWl0IGdldFBhdGllbnQodmFsaWRhdGVkSW5wdXQucGF0aWVudElkKTtcclxuICBpZiAoIXBhdGllbnQpIHtcclxuICAgIGNvbnNvbGUud2FybignUGF0aWVudCBub3QgZm91bmQnLCB7XHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgIHBhdGllbnRJZDogdmFsaWRhdGVkSW5wdXQucGF0aWVudElkXHJcbiAgICB9KTtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1BhdGllbnQgbm90IGZvdW5kJyk7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZygnUGF0aWVudCByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIHBhdGllbnRJZDogcGF0aWVudC5wYXRpZW50SWQsXHJcbiAgICBwYXRpZW50QWdlOiBwYXRpZW50LmRlbW9ncmFwaGljcy5hZ2UsXHJcbiAgICBwYXRpZW50TG9jYXRpb246IGAke3BhdGllbnQuZGVtb2dyYXBoaWNzLmxvY2F0aW9uLmRpc3RyaWN0fSwgJHtwYXRpZW50LmRlbW9ncmFwaGljcy5sb2NhdGlvbi5zdGF0ZX1gXHJcbiAgfSk7XHJcblxyXG4gIC8vIENyZWF0ZSBuZXcgZXBpc29kZVxyXG4gIGNvbnN0IGVwaXNvZGUgPSBhd2FpdCBjcmVhdGVFcGlzb2RlKHZhbGlkYXRlZElucHV0LCBwYXRpZW50KTtcclxuXHJcbiAgLy8gU3RvcmUgZXBpc29kZSBpbiBEeW5hbW9EQlxyXG4gIGF3YWl0IHN0b3JlRXBpc29kZShlcGlzb2RlKTtcclxuXHJcbiAgLy8gQW5hbHl6ZSB1cmdlbmN5IGluZGljYXRvcnMgZm9yIGxvZ2dpbmcgYW5kIG1vbml0b3JpbmdcclxuICBjb25zdCB1cmdlbmN5SW5kaWNhdG9ycyA9IGFuYWx5emVVcmdlbmN5SW5kaWNhdG9ycyhlcGlzb2RlLnN5bXB0b21zKTtcclxuXHJcbiAgLy8gTG9nIHN1Y2Nlc3NmdWwgaW50YWtlIHdpdGggZGV0YWlsZWQgbWV0cmljc1xyXG4gIGNvbnNvbGUubG9nKCdTeW1wdG9tIGludGFrZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICAgIGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQsXHJcbiAgICBwYXRpZW50SWQ6IGVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgc2V2ZXJpdHk6IGVwaXNvZGUuc3ltcHRvbXMuc2V2ZXJpdHksXHJcbiAgICB1cmdlbmN5SW5kaWNhdG9ycyxcclxuICAgIHVyZ2VuY3lJbmRpY2F0b3JDb3VudDogdXJnZW5jeUluZGljYXRvcnMubGVuZ3RoLFxyXG4gICAgcHJvY2Vzc2luZ1RpbWVNczogRGF0ZS5ub3coKSAtIG5ldyBEYXRlKGVwaXNvZGUuY3JlYXRlZEF0KS5nZXRUaW1lKCksXHJcbiAgICBpbnB1dE1ldGhvZDogZXBpc29kZS5zeW1wdG9tcy5pbnB1dE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBjdXN0b20gbWV0cmljcyBmb3IgbW9uaXRvcmluZ1xyXG4gIGlmICh1cmdlbmN5SW5kaWNhdG9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICBjb25zb2xlLmxvZygnSGlnaCB1cmdlbmN5IGNhc2UgZGV0ZWN0ZWQnLCB7XHJcbiAgICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICAgIGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQsXHJcbiAgICAgIHVyZ2VuY3lJbmRpY2F0b3JzLFxyXG4gICAgICBzZXZlcml0eTogZXBpc29kZS5zeW1wdG9tcy5zZXZlcml0eSxcclxuICAgICAgcHJpbWFyeUNvbXBsYWludDogZXBpc29kZS5zeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LnN1YnN0cmluZygwLCAxMDApIC8vIFRydW5jYXRlIGZvciBsb2dnaW5nXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgIHN0YXR1czogZXBpc29kZS5zdGF0dXMsXHJcbiAgICBtZXNzYWdlOiAnU3ltcHRvbSBpbnRha2UgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICBuZXh0U3RlcHM6ICdFcGlzb2RlIGNyZWF0ZWQgYW5kIHF1ZXVlZCBmb3IgdHJpYWdlIGFzc2Vzc21lbnQnLFxyXG4gICAgdXJnZW5jeUluZGljYXRvcnM6IHVyZ2VuY3lJbmRpY2F0b3JzLmxlbmd0aCA+IDAgPyB1cmdlbmN5SW5kaWNhdG9ycyA6IHVuZGVmaW5lZFxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgc3ltcHRvbSBkYXRhIGNvbXBsZXRlbmVzcyBhbmQgcHJvbXB0IGZvciBtaXNzaW5nIGluZm9ybWF0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiB2YWxpZGF0ZVN5bXB0b21Db21wbGV0ZW5lc3Moc3ltcHRvbXM6IGFueSk6IHZvaWQge1xyXG4gIGNvbnN0IG1pc3NpbmdGaWVsZHM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIC8vIENoZWNrIGZvciBlc3NlbnRpYWwgc3ltcHRvbSBpbmZvcm1hdGlvblxyXG4gIGlmICghc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCB8fCBzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LnRyaW0oKS5sZW5ndGggPT09IDApIHtcclxuICAgIG1pc3NpbmdGaWVsZHMucHVzaCgnUHJpbWFyeSBjb21wbGFpbnQgaXMgcmVxdWlyZWQnKTtcclxuICB9XHJcblxyXG4gIGlmICghc3ltcHRvbXMuZHVyYXRpb24gfHwgc3ltcHRvbXMuZHVyYXRpb24udHJpbSgpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgbWlzc2luZ0ZpZWxkcy5wdXNoKCdTeW1wdG9tIGR1cmF0aW9uIGlzIHJlcXVpcmVkJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoc3ltcHRvbXMuc2V2ZXJpdHkgPT09IHVuZGVmaW5lZCB8fCBzeW1wdG9tcy5zZXZlcml0eSA9PT0gbnVsbCkge1xyXG4gICAgbWlzc2luZ0ZpZWxkcy5wdXNoKCdTeW1wdG9tIHNldmVyaXR5ICgxLTEwIHNjYWxlKSBpcyByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFzeW1wdG9tcy5pbnB1dE1ldGhvZCkge1xyXG4gICAgbWlzc2luZ0ZpZWxkcy5wdXNoKCdJbnB1dCBtZXRob2QgaXMgcmVxdWlyZWQnKTtcclxuICB9XHJcblxyXG4gIC8vIFZhbGlkYXRlIHNldmVyaXR5IHJhbmdlXHJcbiAgaWYgKHN5bXB0b21zLnNldmVyaXR5ICYmIChzeW1wdG9tcy5zZXZlcml0eSA8IDEgfHwgc3ltcHRvbXMuc2V2ZXJpdHkgPiAxMCkpIHtcclxuICAgIG1pc3NpbmdGaWVsZHMucHVzaCgnU2V2ZXJpdHkgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDEwJyk7XHJcbiAgfVxyXG5cclxuICAvLyBWYWxpZGF0ZSBpbnB1dCBtZXRob2RcclxuICBpZiAoc3ltcHRvbXMuaW5wdXRNZXRob2QgJiYgIU9iamVjdC52YWx1ZXMoSW5wdXRNZXRob2QpLmluY2x1ZGVzKHN5bXB0b21zLmlucHV0TWV0aG9kKSkge1xyXG4gICAgbWlzc2luZ0ZpZWxkcy5wdXNoKCdJbnZhbGlkIGlucHV0IG1ldGhvZC4gTXVzdCBiZSBcInRleHRcIiBvciBcInZvaWNlXCInKTtcclxuICB9XHJcblxyXG4gIGlmIChtaXNzaW5nRmllbGRzLmxlbmd0aCA+IDApIHtcclxuICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IobWlzc2luZ0ZpZWxkcyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IHBhdGllbnQgZnJvbSBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0UGF0aWVudChwYXRpZW50SWQ6IHN0cmluZyk6IFByb21pc2U8UGF0aWVudCB8IG51bGw+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBQQVRJRU5UX1RBQkxFX05BTUUsXHJcbiAgICAgIEtleTogeyBwYXRpZW50SWQgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RHluYW1vQ2xpZW50KCkuc2VuZChjb21tYW5kKTtcclxuICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBQYXRpZW50IHx8IG51bGw7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJldHJpZXZpbmcgcGF0aWVudCcsIHsgcGF0aWVudElkLCBlcnJvciB9KTtcclxuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIHBhdGllbnQgaW5mb3JtYXRpb24nKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgbmV3IGVwaXNvZGUgZnJvbSB2YWxpZGF0ZWQgaW5wdXRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUVwaXNvZGUoaW5wdXQ6IENyZWF0ZUVwaXNvZGVJbnB1dCwgcGF0aWVudDogUGF0aWVudCk6IFByb21pc2U8RXBpc29kZT4ge1xyXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgY29uc3QgZXBpc29kZUlkID0gdXVpZHY0KCk7XHJcblxyXG4gIC8vIFNhbml0aXplIHN5bXB0b20gZGF0YSBmb3Igc2VjdXJpdHlcclxuICBjb25zdCBzYW5pdGl6ZWRTeW1wdG9tcyA9IHNhbml0aXplU3ltcHRvbURhdGEoaW5wdXQuc3ltcHRvbXMpO1xyXG5cclxuICBjb25zdCBlcGlzb2RlOiBFcGlzb2RlID0ge1xyXG4gICAgZXBpc29kZUlkLFxyXG4gICAgcGF0aWVudElkOiBpbnB1dC5wYXRpZW50SWQsXHJcbiAgICBzdGF0dXM6IEVwaXNvZGVTdGF0dXMuQUNUSVZFLFxyXG4gICAgc3ltcHRvbXM6IHNhbml0aXplZFN5bXB0b21zLFxyXG4gICAgaW50ZXJhY3Rpb25zOiBbXHJcbiAgICAgIHtcclxuICAgICAgICB0aW1lc3RhbXA6IG5vdyxcclxuICAgICAgICB0eXBlOiAnc3ltcHRvbV9pbnRha2UnLFxyXG4gICAgICAgIGFjdG9yOiAnc3lzdGVtJyxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBpbnB1dE1ldGhvZDogc2FuaXRpemVkU3ltcHRvbXMuaW5wdXRNZXRob2QsXHJcbiAgICAgICAgICBzZXZlcml0eTogc2FuaXRpemVkU3ltcHRvbXMuc2V2ZXJpdHksXHJcbiAgICAgICAgICBkdXJhdGlvbjogc2FuaXRpemVkU3ltcHRvbXMuZHVyYXRpb24sXHJcbiAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXNDb3VudDogc2FuaXRpemVkU3ltcHRvbXMuYXNzb2NpYXRlZFN5bXB0b21zLmxlbmd0aCxcclxuICAgICAgICAgIHBhdGllbnRMb2NhdGlvbjogYCR7cGF0aWVudC5kZW1vZ3JhcGhpY3MubG9jYXRpb24uZGlzdHJpY3R9LCAke3BhdGllbnQuZGVtb2dyYXBoaWNzLmxvY2F0aW9uLnN0YXRlfWAsXHJcbiAgICAgICAgICBwYXRpZW50QWdlOiBwYXRpZW50LmRlbW9ncmFwaGljcy5hZ2VcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBjcmVhdGVkQXQ6IG5vdyxcclxuICAgIHVwZGF0ZWRBdDogbm93XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIGVwaXNvZGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdG9yZSBlcGlzb2RlIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzdG9yZUVwaXNvZGUoZXBpc29kZTogRXBpc29kZSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IEVQSVNPREVfVEFCTEVfTkFNRSxcclxuICAgICAgSXRlbTogZXBpc29kZSxcclxuICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogJ2F0dHJpYnV0ZV9ub3RfZXhpc3RzKGVwaXNvZGVJZCknIC8vIFByZXZlbnQgb3ZlcndyaXRlc1xyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZ2V0RHluYW1vQ2xpZW50KCkuc2VuZChjb21tYW5kKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc3RvcmluZyBlcGlzb2RlJywgeyBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLCBlcnJvciB9KTtcclxuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHN0b3JlIGVwaXNvZGUgZGF0YScpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplIHRleHQgaW5wdXQgdG8gcHJldmVudCBYU1MgYW5kIG90aGVyIHNlY3VyaXR5IGlzc3Vlc1xyXG4gKi9cclxuZnVuY3Rpb24gc2FuaXRpemVUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgaWYgKCF0ZXh0IHx8IHR5cGVvZiB0ZXh0ICE9PSAnc3RyaW5nJykge1xyXG4gICAgcmV0dXJuICcnO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gdGV4dFxyXG4gICAgLnRyaW0oKVxyXG4gICAgLnJlcGxhY2UoL1s8Pl0vZywgJycpIC8vIFJlbW92ZSBwb3RlbnRpYWwgSFRNTCB0YWdzXHJcbiAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpIC8vIE5vcm1hbGl6ZSB3aGl0ZXNwYWNlXHJcbiAgICAucmVwbGFjZSgvW1xceDAwLVxceDFGXFx4N0ZdL2csICcnKSAvLyBSZW1vdmUgY29udHJvbCBjaGFyYWN0ZXJzXHJcbiAgICAuc3Vic3RyaW5nKDAsIDEwMDApOyAvLyBMaW1pdCBsZW5ndGhcclxufVxyXG5cclxuLyoqXHJcbiAqIEVuaGFuY2VkIHN5bXB0b20gZGF0YSBzYW5pdGl6YXRpb25cclxuICovXHJcbmZ1bmN0aW9uIHNhbml0aXplU3ltcHRvbURhdGEoc3ltcHRvbXM6IGFueSk6IGFueSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIC4uLnN5bXB0b21zLFxyXG4gICAgcHJpbWFyeUNvbXBsYWludDogc2FuaXRpemVUZXh0KHN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQpLFxyXG4gICAgZHVyYXRpb246IHNhbml0aXplVGV4dChzeW1wdG9tcy5kdXJhdGlvbiksXHJcbiAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IHN5bXB0b21zLmFzc29jaWF0ZWRTeW1wdG9tcy5tYXAoKHN5bXB0b206IHN0cmluZykgPT4gc2FuaXRpemVUZXh0KHN5bXB0b20pKVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBbmFseXplIHN5bXB0b21zIGZvciB1cmdlbmN5IGluZGljYXRvcnNcclxuICovXHJcbmZ1bmN0aW9uIGFuYWx5emVVcmdlbmN5SW5kaWNhdG9ycyhzeW1wdG9tczogYW55KTogc3RyaW5nW10ge1xyXG4gIGNvbnN0IHVyZ2VuY3lJbmRpY2F0b3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAvLyBIaWdoIHNldmVyaXR5IHN5bXB0b21zXHJcbiAgaWYgKHN5bXB0b21zLnNldmVyaXR5ID49IDgpIHtcclxuICAgIHVyZ2VuY3lJbmRpY2F0b3JzLnB1c2goJ2hpZ2hfc2V2ZXJpdHknKTtcclxuICB9XHJcblxyXG4gIC8vIENyaXRpY2FsIHNldmVyaXR5IHN5bXB0b21zXHJcbiAgaWYgKHN5bXB0b21zLnNldmVyaXR5ID49IDkpIHtcclxuICAgIHVyZ2VuY3lJbmRpY2F0b3JzLnB1c2goJ2NyaXRpY2FsX3NldmVyaXR5Jyk7XHJcbiAgfVxyXG5cclxuICAvLyBFbWVyZ2VuY3kga2V5d29yZHMgaW4gcHJpbWFyeSBjb21wbGFpbnRcclxuICBjb25zdCBlbWVyZ2VuY3lLZXl3b3JkcyA9IFtcclxuICAgICdjaGVzdCBwYWluJywgJ2RpZmZpY3VsdHkgYnJlYXRoaW5nJywgJ3VuY29uc2Npb3VzJywgJ2JsZWVkaW5nJyxcclxuICAgICdzZXZlcmUgcGFpbicsICdoZWFydCBhdHRhY2snLCAnc3Ryb2tlJywgJ2VtZXJnZW5jeScsICdjYW5cXCd0IGJyZWF0aGUnLFxyXG4gICAgJ2Nob2tpbmcnLCAnc2VpenVyZScsICdvdmVyZG9zZScsICdzdWljaWRlJywgJ3NldmVyZSBibGVlZGluZycsXHJcbiAgICAnaGVhZCBpbmp1cnknLCAnYnJva2VuIGJvbmUnLCAnc2V2ZXJlIGJ1cm4nXHJcbiAgXTtcclxuXHJcbiAgY29uc3QgY29tcGxhaW50ID0gc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludC50b0xvd2VyQ2FzZSgpO1xyXG4gIGVtZXJnZW5jeUtleXdvcmRzLmZvckVhY2goa2V5d29yZCA9PiB7XHJcbiAgICBpZiAoY29tcGxhaW50LmluY2x1ZGVzKGtleXdvcmQpKSB7XHJcbiAgICAgIHVyZ2VuY3lJbmRpY2F0b3JzLnB1c2goYGVtZXJnZW5jeV9rZXl3b3JkXyR7a2V5d29yZC5yZXBsYWNlKC9bXmEtejAtOV0vZywgJ18nKX1gKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgLy8gRHVyYXRpb24tYmFzZWQgaW5kaWNhdG9yc1xyXG4gIGlmIChzeW1wdG9tcy5kdXJhdGlvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdzdWRkZW4nKSB8fCBcclxuICAgICAgc3ltcHRvbXMuZHVyYXRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnaW1tZWRpYXRlJykgfHxcclxuICAgICAgc3ltcHRvbXMuZHVyYXRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnanVzdCBub3cnKSkge1xyXG4gICAgdXJnZW5jeUluZGljYXRvcnMucHVzaCgnc3VkZGVuX29uc2V0Jyk7XHJcbiAgfVxyXG5cclxuICAvLyBBc3NvY2lhdGVkIHN5bXB0b21zIHRoYXQgaW5kaWNhdGUgdXJnZW5jeVxyXG4gIGNvbnN0IHVyZ2VudEFzc29jaWF0ZWRTeW1wdG9tcyA9IFtcclxuICAgICdkaWZmaWN1bHR5IGJyZWF0aGluZycsICdjaGVzdCBwYWluJywgJ2RpenppbmVzcycsICdmYWludGluZycsXHJcbiAgICAnc2V2ZXJlIGhlYWRhY2hlJywgJ2NvbmZ1c2lvbicsICd2b21pdGluZyBibG9vZCcsICdzZXZlcmUgbmF1c2VhJ1xyXG4gIF07XHJcblxyXG4gIHN5bXB0b21zLmFzc29jaWF0ZWRTeW1wdG9tcy5mb3JFYWNoKChzeW1wdG9tOiBzdHJpbmcpID0+IHtcclxuICAgIGNvbnN0IGxvd2VyU3ltcHRvbSA9IHN5bXB0b20udG9Mb3dlckNhc2UoKTtcclxuICAgIHVyZ2VudEFzc29jaWF0ZWRTeW1wdG9tcy5mb3JFYWNoKHVyZ2VudFN5bXB0b20gPT4ge1xyXG4gICAgICBpZiAobG93ZXJTeW1wdG9tLmluY2x1ZGVzKHVyZ2VudFN5bXB0b20pKSB7XHJcbiAgICAgICAgdXJnZW5jeUluZGljYXRvcnMucHVzaChgdXJnZW50X2Fzc29jaWF0ZWRfJHt1cmdlbnRTeW1wdG9tLnJlcGxhY2UoL1teYS16MC05XS9nLCAnXycpfWApO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLy8gQ29tYmluYXRpb24gaW5kaWNhdG9yc1xyXG4gIGlmIChzeW1wdG9tcy5zZXZlcml0eSA+PSA3ICYmIHVyZ2VuY3lJbmRpY2F0b3JzLnNvbWUoaW5kaWNhdG9yID0+IGluZGljYXRvci5zdGFydHNXaXRoKCdlbWVyZ2VuY3lfa2V5d29yZCcpKSkge1xyXG4gICAgdXJnZW5jeUluZGljYXRvcnMucHVzaCgnaGlnaF9zZXZlcml0eV93aXRoX2VtZXJnZW5jeV9rZXl3b3JkcycpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHVyZ2VuY3lJbmRpY2F0b3JzO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGluY29tcGxldGUgZGF0YSByZXNwb25zZSB3aXRoIHN0cnVjdHVyZWQgcHJvbXB0c1xyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlSW5jb21wbGV0ZURhdGFSZXNwb25zZShcclxuICBjb21wbGV0ZW5lc3NSZXN1bHQ6IERhdGFDb21wbGV0ZW5lc3NSZXN1bHQsXHJcbiAgc3RydWN0dXJlZFByb21wdHM6IFN0cnVjdHVyZWRQcm9tcHRSZXNwb25zZVxyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlOiA0MjIsIC8vIFVucHJvY2Vzc2FibGUgRW50aXR5XHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxYLUFtei1EYXRlLEF1dGhvcml6YXRpb24sWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCxPUFRJT05TJ1xyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6ICdJbmNvbXBsZXRlIHN5bXB0b20gZGF0YScsXHJcbiAgICAgIG1lc3NhZ2U6ICdBZGRpdGlvbmFsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIHRvIGNvbXBsZXRlIHlvdXIgc3ltcHRvbSByZXBvcnQnLFxyXG4gICAgICBjb21wbGV0ZW5lc3M6IHtcclxuICAgICAgICBzY29yZTogY29tcGxldGVuZXNzUmVzdWx0LmNvbXBsZXRlbmVzc1Njb3JlLFxyXG4gICAgICAgIGlzQ29tcGxldGU6IGNvbXBsZXRlbmVzc1Jlc3VsdC5pc0NvbXBsZXRlLFxyXG4gICAgICAgIGNyaXRpY2FsTWlzc2luZzogY29tcGxldGVuZXNzUmVzdWx0LmNyaXRpY2FsTWlzc2luZyxcclxuICAgICAgICBtaXNzaW5nRmllbGRzQ291bnQ6IGNvbXBsZXRlbmVzc1Jlc3VsdC5taXNzaW5nRmllbGRzLmxlbmd0aFxyXG4gICAgICB9LFxyXG4gICAgICBwcm9tcHRzOiBzdHJ1Y3R1cmVkUHJvbXB0cyxcclxuICAgICAgc3VnZ2VzdGlvbnM6IGNvbXBsZXRlbmVzc1Jlc3VsdC5zdWdnZXN0aW9ucyxcclxuICAgICAgY2FuUHJvY2VlZFdpdGhJbmNvbXBsZXRlRGF0YTogIWNvbXBsZXRlbmVzc1Jlc3VsdC5jcml0aWNhbE1pc3NpbmcsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgc3VjY2VzcyByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKGRhdGE6IGFueSk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULE9QVElPTlMnXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSlcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVFcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlciwgXHJcbiAgbWVzc2FnZTogc3RyaW5nLCBcclxuICBkZXRhaWxzPzogc3RyaW5nW11cclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLFgtQW16LURhdGUsQXV0aG9yaXphdGlvbixYLUFwaS1LZXksWC1BbXotU2VjdXJpdHktVG9rZW4nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULE9QVElPTlMnXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjogbWVzc2FnZSxcclxuICAgICAgZGV0YWlsczogZGV0YWlscyB8fCBbXSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgIH0pXHJcbiAgfTtcclxufSJdfQ==