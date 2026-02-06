// Symptom Intake Lambda Function
// Handles patient symptom data processing with validation, voice input, and DynamoDB storage

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateEpisodeInput, 
  Episode, 
  Patient, 
  EpisodeStatus, 
  InputMethod 
} from '../../types';
import { 
  createEpisodeInputSchema, 
  symptomsSchema 
} from '../../validation/episode-validation';
import { 
  validateOrThrow, 
  ValidationError 
} from '../../validation/validation-utils';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from '../../utils/response-utils';
import { 
  processVoiceInput, 
  AudioFileInfo, 
  VoiceInputResult,
  createPresignedUploadUrl
} from './voice-input-service';
import {
  analyzeDataCompleteness,
  generateStructuredPrompts,
  validateDataCompletenessOrThrow,
  DataCompletenessResult,
  StructuredPromptResponse
} from './incomplete-data-service';
import { LanguageCode } from '@aws-sdk/client-transcribe';

// Environment variables
const PATIENT_TABLE_NAME = process.env.PATIENT_TABLE_NAME!;
const EPISODE_TABLE_NAME = process.env.EPISODE_TABLE_NAME!;
const AUDIO_UPLOAD_BUCKET = process.env.AUDIO_UPLOAD_BUCKET!;

// Initialize DynamoDB client (lazy initialization for testing)
let docClient: DynamoDBDocumentClient;

function getDynamoClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

// Export for testing
export function setDynamoClient(client: DynamoDBDocumentClient): void {
  docClient = client;
}

/**
 * Data completeness check request interface
 */
interface DataCompletenessRequest {
  symptoms: {
    primaryComplaint?: string;
    duration?: string;
    severity?: number;
    associatedSymptoms?: string[];
    inputMethod?: string;
  };
}

/**
 * Voice input request interface
 */
interface VoiceInputRequest {
  patientId: string;
  audioData: string; // Base64 encoded audio data
  mimeType: string;
  language?: 'en' | 'hi';
}

/**
 * Presigned URL request interface
 */
interface PresignedUrlRequest {
  patientId: string;
  mimeType: string;
}

/**
 * Lambda handler for symptom intake
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
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
    } else if (path.endsWith('/presigned-url') && method === 'POST') {
      return await handlePresignedUrlRequest(event, context);
    } else if (path.endsWith('/check-completeness') && method === 'POST') {
      return await handleDataCompletenessCheck(event, context);
    } else if (method === 'POST') {
      return await handleTextSymptomIntake(event, context);
    } else {
      return createErrorResponse(405, 'Method not allowed');
    }

  } catch (error) {
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
        completenessScore: (error as any).completenessResult?.completenessScore,
        missingFieldsCount: (error as any).completenessResult?.missingFields?.length,
        criticalMissing: (error as any).completenessResult?.criticalMissing
      });
      
      return createIncompleteDataResponse(
        (error as any).completenessResult,
        (error as any).structuredPrompts
      );
    }

    // Log specific error types for monitoring
    if (error instanceof ValidationError) {
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

/**
 * Handle data completeness check without storing data
 */
async function handleDataCompletenessCheck(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createErrorResponse(400, 'Request body is required');
  }

  const requestBody = JSON.parse(event.body) as DataCompletenessRequest;
  
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
    const completenessResult = analyzeDataCompleteness({
      ...requestBody.symptoms,
      inputMethod: requestBody.symptoms.inputMethod as InputMethod
    });
    
    console.log('Data completeness analysis completed', {
      requestId: context.awsRequestId,
      isComplete: completenessResult.isComplete,
      completenessScore: completenessResult.completenessScore,
      missingFieldsCount: completenessResult.missingFields.length,
      criticalMissing: completenessResult.criticalMissing
    });

    // Generate structured prompts if data is incomplete
    let structuredPrompts: StructuredPromptResponse | undefined;
    if (!completenessResult.isComplete) {
      structuredPrompts = generateStructuredPrompts(completenessResult.missingFields);
    }

    return createSuccessResponse({
      completeness: completenessResult,
      prompts: structuredPrompts,
      message: completenessResult.isComplete 
        ? 'Symptom data is complete and ready for submission'
        : 'Additional information needed to complete your symptom report',
      canProceed: completenessResult.isComplete || !completenessResult.criticalMissing
    });

  } catch (error) {
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
async function handleVoiceInput(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createErrorResponse(400, 'Request body is required');
  }

  const requestBody = JSON.parse(event.body) as VoiceInputRequest;
  
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
    
    const audioFile: AudioFileInfo = {
      buffer: audioBuffer,
      mimeType: requestBody.mimeType,
      size: audioBuffer.length
    };

    // Determine language code
    const languageCode = requestBody.language === 'hi' ? LanguageCode.HI_IN : LanguageCode.EN_IN;

    // Process voice input
    const voiceResult = await processVoiceInput(audioFile, requestBody.patientId, languageCode);

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

  } catch (error) {
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
async function handlePresignedUrlRequest(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return createErrorResponse(400, 'Request body is required');
  }

  const requestBody = JSON.parse(event.body) as PresignedUrlRequest;
  
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
    const { uploadUrl, s3Key } = await createPresignedUploadUrl(
      requestBody.patientId,
      requestBody.mimeType
    );

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

  } catch (error) {
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
async function handleTextSymptomIntake(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
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
  const validatedInput = validateOrThrow<CreateEpisodeInput>(
    createEpisodeInputSchema,
    requestBody
  );

  console.log('Input validation successful', {
    requestId: context.awsRequestId,
    patientId: validatedInput.patientId,
    severity: validatedInput.symptoms.severity,
    inputMethod: validatedInput.symptoms.inputMethod
  });

  // Additional symptom data validation with enhanced completeness checking
  try {
    validateDataCompletenessOrThrow(validatedInput.symptoms);
  } catch (error) {
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
function validateSymptomCompleteness(symptoms: any): void {
  const missingFields: string[] = [];

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
  if (symptoms.inputMethod && !Object.values(InputMethod).includes(symptoms.inputMethod)) {
    missingFields.push('Invalid input method. Must be "text" or "voice"');
  }

  if (missingFields.length > 0) {
    throw new ValidationError(missingFields);
  }
}

/**
 * Get patient from DynamoDB
 */
async function getPatient(patientId: string): Promise<Patient | null> {
  try {
    const command = new GetCommand({
      TableName: PATIENT_TABLE_NAME,
      Key: { patientId }
    });

    const result = await getDynamoClient().send(command);
    return result.Item as Patient || null;
  } catch (error) {
    console.error('Error retrieving patient', { patientId, error });
    throw new Error('Failed to retrieve patient information');
  }
}

/**
 * Create new episode from validated input
 */
async function createEpisode(input: CreateEpisodeInput, patient: Patient): Promise<Episode> {
  const now = new Date();
  const episodeId = uuidv4();

  // Sanitize symptom data for security
  const sanitizedSymptoms = sanitizeSymptomData(input.symptoms);

  const episode: Episode = {
    episodeId,
    patientId: input.patientId,
    status: EpisodeStatus.ACTIVE,
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
async function storeEpisode(episode: Episode): Promise<void> {
  try {
    const command = new PutCommand({
      TableName: EPISODE_TABLE_NAME,
      Item: episode,
      ConditionExpression: 'attribute_not_exists(episodeId)' // Prevent overwrites
    });

    await getDynamoClient().send(command);
  } catch (error) {
    console.error('Error storing episode', { episodeId: episode.episodeId, error });
    throw new Error('Failed to store episode data');
  }
}

/**
 * Sanitize text input to prevent XSS and other security issues
 */
function sanitizeText(text: string): string {
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
function sanitizeSymptomData(symptoms: any): any {
  return {
    ...symptoms,
    primaryComplaint: sanitizeText(symptoms.primaryComplaint),
    duration: sanitizeText(symptoms.duration),
    associatedSymptoms: symptoms.associatedSymptoms.map((symptom: string) => sanitizeText(symptom))
  };
}

/**
 * Analyze symptoms for urgency indicators
 */
function analyzeUrgencyIndicators(symptoms: any): string[] {
  const urgencyIndicators: string[] = [];

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

  symptoms.associatedSymptoms.forEach((symptom: string) => {
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
function createIncompleteDataResponse(
  completenessResult: DataCompletenessResult,
  structuredPrompts: StructuredPromptResponse
): APIGatewayProxyResult {
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