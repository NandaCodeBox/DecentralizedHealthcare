// Jest setup file for healthcare orchestration system tests

// Set test timeout
jest.setTimeout(30000);

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-lambda');
jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-transcribe');
jest.mock('@aws-sdk/client-cognito-identity-provider');

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.PATIENT_TABLE_NAME = 'test-healthcare-patients';
process.env.EPISODE_TABLE_NAME = 'test-healthcare-episodes';
process.env.PROVIDER_TABLE_NAME = 'test-healthcare-providers';
process.env.REFERRAL_TABLE_NAME = 'test-healthcare-referrals';
process.env.NOTIFICATION_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-notifications';