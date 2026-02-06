import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HealthcareOrchestrationStack } from '../../src/infrastructure/healthcare-orchestration-stack';

describe('HealthcareOrchestrationStack', () => {
  let app: cdk.App;
  let stack: HealthcareOrchestrationStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new HealthcareOrchestrationStack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  test('creates enhanced DynamoDB tables with proper indexes', () => {
    // Patient table with additional indexes
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'healthcare-patients',
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: {
        SSEEnabled: true,
      },
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: 'PatientLocationIndex',
        },
        {
          IndexName: 'InsuranceProviderIndex',
        },
      ],
    });

    // Episode table with enhanced indexes
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'healthcare-episodes',
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'PatientEpisodesIndex',
        },
        {
          IndexName: 'EpisodeStatusIndex',
        },
        {
          IndexName: 'UrgencyLevelIndex',
        },
        {
          IndexName: 'ValidationStatusIndex',
        },
      ],
    });

    // Provider table with enhanced indexes
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'healthcare-providers',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'LocationIndex',
        },
        {
          IndexName: 'SpecialtyIndex',
        },
        {
          IndexName: 'TypeAvailabilityIndex',
        },
        {
          IndexName: 'CapacityIndex',
        },
      ],
    });

    // Referral table with enhanced indexes
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'healthcare-referrals',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'EpisodeReferralsIndex',
        },
        {
          IndexName: 'ProviderReferralsIndex',
        },
        {
          IndexName: 'UrgencyStatusIndex',
        },
      ],
    });
  });

  test('creates Cognito User Pool with correct configuration', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'healthcare-orchestration-users',
      AutoVerifiedAttributes: ['email', 'phone_number'],
      UsernameAttributes: ['email', 'phone_number'],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
          RequireUppercase: true,
        },
      },
    });

    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'healthcare-orchestration-client',
      GenerateSecret: false,
    });
  });

  test('creates SNS topics for notifications', () => {
    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'healthcare-notifications',
      DisplayName: 'Healthcare Orchestration Notifications',
    });

    template.hasResourceProperties('AWS::SNS::Topic', {
      TopicName: 'healthcare-emergency-alerts',
      DisplayName: 'Healthcare Emergency Alerts',
    });
  });

  test('creates API Gateway with CORS and authentication configuration', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Healthcare Orchestration API',
      Description: 'API for AI-enabled decentralized care orchestration system',
    });

    // Check for CORS configuration
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'OPTIONS',
    });

    // Check for Cognito authorizer
    template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
      Name: 'healthcare-orchestration-authorizer',
      Type: 'COGNITO_USER_POOLS',
    });

    // Check for health check endpoint
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'GET',
      AuthorizationType: 'NONE',
    });
  });

  test('creates Lambda functions with correct configuration', () => {
    const expectedFunctions = [
      'healthcare-symptom-intake',
      'healthcare-triage-engine',
      'healthcare-human-validation',
      'healthcare-provider-discovery',
      'healthcare-care-coordinator',
      'healthcare-referral-manager',
      'healthcare-episode-tracker',
    ];

    expectedFunctions.forEach(functionName => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: functionName,
        Runtime: 'nodejs20.x',
        TracingConfig: {
          Mode: 'Active'
        }
      });
    });
  });

  test('creates CloudWatch log groups', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/apigateway/healthcare-orchestration',
      RetentionInDays: 30,
    });

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/lambda/healthcare-orchestration',
      RetentionInDays: 30,
    });
  });

  test('grants appropriate permissions to Lambda functions', () => {
    // Check that Lambda functions have IAM policies
    template.resourceCountIs('AWS::IAM::Policy', 7);
    
    // Check that at least one policy contains DynamoDB permissions
    const policies = template.findResources('AWS::IAM::Policy');
    const hasDynamoDBPolicy = Object.values(policies).some((policy: any) => {
      const statements = policy.Properties.PolicyDocument.Statement;
      return statements.some((statement: any) => 
        statement.Action && 
        Array.isArray(statement.Action) && 
        statement.Action.some((action: string) => action.startsWith('dynamodb:'))
      );
    });
    expect(hasDynamoDBPolicy).toBe(true);

    // Check that at least one policy contains Bedrock permissions
    const hasBedrockPolicy = Object.values(policies).some((policy: any) => {
      const statements = policy.Properties.PolicyDocument.Statement;
      return statements.some((statement: any) => 
        statement.Action && 
        Array.isArray(statement.Action) && 
        statement.Action.some((action: string) => action.startsWith('bedrock:'))
      );
    });
    expect(hasBedrockPolicy).toBe(true);
  });

  test('creates CloudWatch monitoring and alarms', () => {
    // Check for CloudWatch alarms
    template.resourceCountIs('AWS::CloudWatch::Alarm', 24); // 3 API Gateway + 7*3 Lambda alarms

    // Check for API Gateway alarms
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'healthcare-api-4xx-errors',
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'healthcare-api-5xx-errors',
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'healthcare-api-high-latency',
    });
  });

  test('outputs enhanced values', () => {
    template.hasOutput('ApiGatewayUrl', {
      Description: 'API Gateway URL for the healthcare orchestration system',
    });

    template.hasOutput('UserPoolId', {
      Description: 'Cognito User Pool ID',
    });

    template.hasOutput('UserPoolClientId', {
      Description: 'Cognito User Pool Client ID',
    });

    template.hasOutput('NotificationTopicArn', {
      Description: 'SNS Topic ARN for notifications',
    });

    template.hasOutput('EmergencyAlertTopicArn', {
      Description: 'SNS Topic ARN for emergency alerts',
    });
  });

  test('stack synthesizes without errors', () => {
    expect(() => {
      app.synth();
    }).not.toThrow();
  });
});