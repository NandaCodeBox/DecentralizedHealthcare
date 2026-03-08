/**
 * AWS Translate Lambda Function
 * Provides translation services for multi-language support
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TranslateClient, TranslateTextCommand, TranslateTextCommandInput } from '@aws-sdk/client-translate';

const translateClient = new TranslateClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface TranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface BatchTranslateRequest {
  texts: string[];
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * CORS headers for API responses
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

/**
 * Translate single text
 */
async function translateText(text: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  try {
    const params: TranslateTextCommandInput = {
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage,
    };

    const command = new TranslateTextCommand(params);
    const response = await translateClient.send(command);

    return response.TranslatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

/**
 * Main Lambda handler
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Translation request:', JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    const path = event.path;
    const body = JSON.parse(event.body || '{}');

    // Single translation endpoint
    if (path.endsWith('/translate') && event.httpMethod === 'POST') {
      const { text, sourceLanguage, targetLanguage } = body as TranslateRequest;

      if (!text || !sourceLanguage || !targetLanguage) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Missing required fields: text, sourceLanguage, targetLanguage',
          }),
        };
      }

      const translatedText = await translateText(text, sourceLanguage, targetLanguage);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          translatedText,
          sourceLanguage,
          targetLanguage,
        }),
      };
    }

    // Batch translation endpoint
    if (path.endsWith('/translate/batch') && event.httpMethod === 'POST') {
      const { texts, sourceLanguage, targetLanguage } = body as BatchTranslateRequest;

      if (!texts || !Array.isArray(texts) || !sourceLanguage || !targetLanguage) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: 'Missing required fields: texts (array), sourceLanguage, targetLanguage',
          }),
        };
      }

      // Translate all texts in parallel
      const translationPromises = texts.map(text => 
        translateText(text, sourceLanguage, targetLanguage)
      );

      const translatedTexts = await Promise.all(translationPromises);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          translatedTexts,
          sourceLanguage,
          targetLanguage,
        }),
      };
    }

    // Unknown endpoint
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Endpoint not found',
      }),
    };

  } catch (error) {
    console.error('Error processing translation request:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
