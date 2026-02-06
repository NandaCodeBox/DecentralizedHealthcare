import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class HealthcareOrchestrationStack extends cdk.Stack {
  private userPool: cognito.UserPool;
  private authorizer: apigateway.CognitoUserPoolsAuthorizer;
  private audioUploadBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const patientTable = this.createPatientTable();
    const episodeTable = this.createEpisodeTable();
    const providerTable = this.createProviderTable();
    const referralTable = this.createReferralTable();

    // Cognito User Pool for Authentication
    this.userPool = this.createUserPool();
    const userPoolClient = this.createUserPoolClient(this.userPool);

    // Create Cognito authorizer for API Gateway
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'HealthcareAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: 'healthcare-orchestration-authorizer',
    });

    // SNS Topics for Notifications
    const notificationTopic = this.createNotificationTopic();
    const emergencyAlertTopic = this.createEmergencyAlertTopic();

    // S3 Bucket for audio file uploads
    this.audioUploadBucket = this.createAudioUploadBucket();

    // API Gateway
    const api = this.createApiGateway();

    // Lambda Functions with enhanced configuration
    const symptomIntakeFunction = this.createSymptomIntakeFunction(patientTable, episodeTable, this.audioUploadBucket);
    const triageEngineFunction = this.createTriageEngineFunction(episodeTable);
    const humanValidationFunction = this.createHumanValidationFunction(episodeTable, notificationTopic, emergencyAlertTopic);
    const emergencyAlertFunction = this.createEmergencyAlertFunction(episodeTable, emergencyAlertTopic, notificationTopic);
    const providerDiscoveryFunction = this.createProviderDiscoveryFunction(providerTable);
    const careCoordinatorFunction = this.createCareCoordinatorFunction(episodeTable, providerTable, notificationTopic);
    const referralManagerFunction = this.createReferralManagerFunction(referralTable, episodeTable, notificationTopic);
    const episodeTrackerFunction = this.createEpisodeTrackerFunction(episodeTable);

    // API Gateway Routes (basic structure)
    this.createApiRoutes(api, {
      symptomIntake: symptomIntakeFunction,
      triage: triageEngineFunction,
      validation: humanValidationFunction,
      emergencyAlert: emergencyAlertFunction,
      providers: providerDiscoveryFunction,
      coordinator: careCoordinatorFunction,
      referrals: referralManagerFunction,
      episodes: episodeTrackerFunction,
    });

    // CloudWatch Monitoring and Alarms
    this.createMonitoringAndAlarms(api, [
      symptomIntakeFunction,
      triageEngineFunction,
      humanValidationFunction,
      emergencyAlertFunction,
      providerDiscoveryFunction,
      careCoordinatorFunction,
      referralManagerFunction,
      episodeTrackerFunction,
    ]);

    // CloudWatch Log Groups
    this.createLogGroups();

    // Output important values
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL for the healthcare orchestration system',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'SNS Topic ARN for notifications',
    });

    new cdk.CfnOutput(this, 'EmergencyAlertTopicArn', {
      value: emergencyAlertTopic.topicArn,
      description: 'SNS Topic ARN for emergency alerts',
    });

    new cdk.CfnOutput(this, 'AudioUploadBucketName', {
      value: this.audioUploadBucket.bucketName,
      description: 'S3 Bucket name for audio file uploads',
    });
  }

  private createPatientTable(): dynamodb.Table {
    const table = new dynamodb.Table(this, 'PatientTable', {
      tableName: 'healthcare-patients',
      partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for location-based patient searches
    table.addGlobalSecondaryIndex({
      indexName: 'PatientLocationIndex',
      partitionKey: { name: 'state', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'district', type: dynamodb.AttributeType.STRING },
    });

    // GSI for insurance provider searches
    table.addGlobalSecondaryIndex({
      indexName: 'InsuranceProviderIndex',
      partitionKey: { name: 'insuranceProvider', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    return table;
  }

  private createEpisodeTable(): dynamodb.Table {
    const table = new dynamodb.Table(this, 'EpisodeTable', {
      tableName: 'healthcare-episodes',
      partitionKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for patient episodes
    table.addGlobalSecondaryIndex({
      indexName: 'PatientEpisodesIndex',
      partitionKey: { name: 'patientId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // GSI for episode status
    table.addGlobalSecondaryIndex({
      indexName: 'EpisodeStatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    // GSI for urgency level queries
    table.addGlobalSecondaryIndex({
      indexName: 'UrgencyLevelIndex',
      partitionKey: { name: 'urgencyLevel', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // GSI for human validation status
    table.addGlobalSecondaryIndex({
      indexName: 'ValidationStatusIndex',
      partitionKey: { name: 'validationStatus', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    return table;
  }

  private createProviderTable(): dynamodb.Table {
    const table = new dynamodb.Table(this, 'ProviderTable', {
      tableName: 'healthcare-providers',
      partitionKey: { name: 'providerId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for location-based searches
    table.addGlobalSecondaryIndex({
      indexName: 'LocationIndex',
      partitionKey: { name: 'state', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'district', type: dynamodb.AttributeType.STRING },
    });

    // GSI for specialty searches
    table.addGlobalSecondaryIndex({
      indexName: 'SpecialtyIndex',
      partitionKey: { name: 'primarySpecialty', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'rating', type: dynamodb.AttributeType.NUMBER },
    });

    // GSI for provider type and availability
    table.addGlobalSecondaryIndex({
      indexName: 'TypeAvailabilityIndex',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'isActive', type: dynamodb.AttributeType.STRING },
    });

    // GSI for capacity management
    table.addGlobalSecondaryIndex({
      indexName: 'CapacityIndex',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'currentLoad', type: dynamodb.AttributeType.NUMBER },
    });

    return table;
  }

  private createReferralTable(): dynamodb.Table {
    const table = new dynamodb.Table(this, 'ReferralTable', {
      tableName: 'healthcare-referrals',
      partitionKey: { name: 'referralId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for episode referrals
    table.addGlobalSecondaryIndex({
      indexName: 'EpisodeReferralsIndex',
      partitionKey: { name: 'episodeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'requestedAt', type: dynamodb.AttributeType.STRING },
    });

    // GSI for provider referrals
    table.addGlobalSecondaryIndex({
      indexName: 'ProviderReferralsIndex',
      partitionKey: { name: 'toProvider', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });

    // GSI for urgency-based referral queries
    table.addGlobalSecondaryIndex({
      indexName: 'UrgencyStatusIndex',
      partitionKey: { name: 'urgency', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
    });

    return table;
  }

  private createUserPool(): cognito.UserPool {
    return new cognito.UserPool(this, 'HealthcareUserPool', {
      userPoolName: 'healthcare-orchestration-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 50, mutable: true }),
        organization: new cognito.StringAttribute({ minLen: 1, maxLen: 100, mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }

  private createUserPoolClient(userPool: cognito.UserPool): cognito.UserPoolClient {
    return new cognito.UserPoolClient(this, 'HealthcareUserPoolClient', {
      userPool,
      userPoolClientName: 'healthcare-orchestration-client',
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    });
  }

  private createNotificationTopic(): sns.Topic {
    return new sns.Topic(this, 'NotificationTopic', {
      topicName: 'healthcare-notifications',
      displayName: 'Healthcare Orchestration Notifications',
    });
  }

  private createEmergencyAlertTopic(): sns.Topic {
    return new sns.Topic(this, 'EmergencyAlertTopic', {
      topicName: 'healthcare-emergency-alerts',
      displayName: 'Healthcare Emergency Alerts',
    });
  }

  private createAudioUploadBucket(): s3.Bucket {
    return new s3.Bucket(this, 'AudioUploadBucket', {
      bucketName: `healthcare-audio-uploads-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteAudioFilesAfter7Days',
          enabled: true,
          expiration: cdk.Duration.days(7), // Audio files are deleted after 7 days for privacy
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // In production, restrict to specific domains
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change to RETAIN in production
    });
  }

  private createApiGateway(): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'HealthcareApi', {
      restApiName: 'Healthcare Orchestration API',
      description: 'API for AI-enabled decentralized care orchestration system',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Network-Quality',
          'X-Data-Saver',
          'X-Content-Compressed',
          'Accept',
          'Accept-Language',
          'Cache-Control',
          'Pragma',
          'User-Agent'
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.seconds(86400), // 24 hours
      },
      deployOptions: {
        stageName: 'v1',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    return api;
  }

  private createSymptomIntakeFunction(patientTable: dynamodb.Table, episodeTable: dynamodb.Table, audioUploadBucket: s3.Bucket): lambda.Function {
    const func = new lambda.Function(this, 'SymptomIntakeFunction', {
      functionName: 'healthcare-symptom-intake',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda/symptom-intake'),
      timeout: cdk.Duration.seconds(60), // Increased timeout for audio processing
      memorySize: 512, // Increased memory for audio processing
      environment: {
        PATIENT_TABLE_NAME: patientTable.tableName,
        EPISODE_TABLE_NAME: episodeTable.tableName,
        AUDIO_UPLOAD_BUCKET: audioUploadBucket.bucketName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    patientTable.grantReadWriteData(func);
    episodeTable.grantReadWriteData(func);
    audioUploadBucket.grantReadWrite(func);

    // Add Transcribe permissions for voice-to-text conversion
    func.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'transcribe:StartTranscriptionJob',
        'transcribe:GetTranscriptionJob',
        'transcribe:ListTranscriptionJobs',
      ],
      resources: ['*'],
    }));

    return func;
  }

  private createTriageEngineFunction(episodeTable: dynamodb.Table): lambda.Function {
    const func = new lambda.Function(this, 'TriageEngineFunction', {
      functionName: 'healthcare-triage-engine',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda/triage-engine'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        EPISODE_TABLE_NAME: episodeTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    episodeTable.grantReadWriteData(func);

    // Add Bedrock permissions for AI assessment
    func.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    return func;
  }

  private createHumanValidationFunction(episodeTable: dynamodb.Table, notificationTopic: sns.Topic, emergencyAlertTopic: sns.Topic): lambda.Function {
    const func = new lambda.Function(this, 'HumanValidationFunction', {
      functionName: 'healthcare-human-validation',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda/human-validation'),
      timeout: cdk.Duration.seconds(60), // Increased timeout for complex validation workflows
      memorySize: 512, // Increased memory for queue management
      environment: {
        EPISODE_TABLE_NAME: episodeTable.tableName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
        EMERGENCY_ALERT_TOPIC_ARN: emergencyAlertTopic.topicArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    episodeTable.grantReadWriteData(func);
    notificationTopic.grantPublish(func);
    emergencyAlertTopic.grantPublish(func);

    return func;
  }

  private createEmergencyAlertFunction(episodeTable: dynamodb.Table, emergencyAlertTopic: sns.Topic, notificationTopic: sns.Topic): lambda.Function {
    const func = new lambda.Function(this, 'EmergencyAlertFunction', {
      functionName: 'healthcare-emergency-alert',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda/emergency-alert'),
      timeout: cdk.Duration.seconds(90), // Increased timeout for emergency processing
      memorySize: 1024, // Increased memory for complex emergency workflows
      environment: {
        EPISODE_TABLE_NAME: episodeTable.tableName,
        EMERGENCY_ALERT_TOPIC_ARN: emergencyAlertTopic.topicArn,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    episodeTable.grantReadWriteData(func);
    emergencyAlertTopic.grantPublish(func);
    notificationTopic.grantPublish(func);

    // Grant permissions to create and manage emergency alert tables
    func.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:CreateTable',
        'dynamodb:DescribeTable',
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        `${episodeTable.tableArn}-alerts`,
        `${episodeTable.tableArn}-escalations`,
        `${episodeTable.tableArn}-alerts/*`,
        `${episodeTable.tableArn}-escalations/*`,
      ],
    }));

    return func;
  }

  private createProviderDiscoveryFunction(providerTable: dynamodb.Table): lambda.Function {
    const func = new lambda.Function(this, 'ProviderDiscoveryFunction', {
      functionName: 'healthcare-provider-discovery',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda/provider-discovery'),
      timeout: cdk.Duration.seconds(60), // Increased timeout for complex searches
      memorySize: 512, // Increased memory for ranking algorithms
      environment: {
        PROVIDER_TABLE_NAME: providerTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    providerTable.grantReadWriteData(func);

    return func;
  }

  private createCareCoordinatorFunction(episodeTable: dynamodb.Table, providerTable: dynamodb.Table, notificationTopic: sns.Topic): lambda.Function {
    const func = new lambda.Function(this, 'CareCoordinatorFunction', {
      functionName: 'healthcare-care-coordinator',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Care coordinator function called', JSON.stringify(event, null, 2));
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Care coordinator function - placeholder implementation',
              carePathway: 'routine'
            }),
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        EPISODE_TABLE_NAME: episodeTable.tableName,
        PROVIDER_TABLE_NAME: providerTable.tableName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    episodeTable.grantReadWriteData(func);
    providerTable.grantReadData(func);
    notificationTopic.grantPublish(func);

    return func;
  }

  private createReferralManagerFunction(referralTable: dynamodb.Table, episodeTable: dynamodb.Table, notificationTopic: sns.Topic): lambda.Function {
    const func = new lambda.Function(this, 'ReferralManagerFunction', {
      functionName: 'healthcare-referral-manager',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Referral manager function called', JSON.stringify(event, null, 2));
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Referral manager function - placeholder implementation',
              referralId: 'placeholder-referral-id'
            }),
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        REFERRAL_TABLE_NAME: referralTable.tableName,
        EPISODE_TABLE_NAME: episodeTable.tableName,
        NOTIFICATION_TOPIC_ARN: notificationTopic.topicArn,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    referralTable.grantReadWriteData(func);
    episodeTable.grantReadWriteData(func);
    notificationTopic.grantPublish(func);

    return func;
  }

  private createEpisodeTrackerFunction(episodeTable: dynamodb.Table): lambda.Function {
    const func = new lambda.Function(this, 'EpisodeTrackerFunction', {
      functionName: 'healthcare-episode-tracker',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Episode tracker function called', JSON.stringify(event, null, 2));
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              message: 'Episode tracker function - placeholder implementation',
              episodes: []
            }),
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        EPISODE_TABLE_NAME: episodeTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    episodeTable.grantReadWriteData(func);

    return func;
  }

  private createApiRoutes(api: apigateway.RestApi, functions: Record<string, lambda.Function>) {
    // Health check endpoint - no authentication required
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'healthcare-orchestration-api'
          })
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Network-Quality,X-Data-Saver,X-Content-Compressed'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
        }
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': apigateway.Model.EMPTY_MODEL
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Test endpoint - no authentication required for testing
    const testResource = api.root.addResource('test');
    testResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            message: 'Test endpoint working',
            timestamp: new Date().toISOString(),
            authenticated: false
          })
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Network-Quality,X-Data-Saver,X-Content-Compressed'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
        }
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': apigateway.Model.EMPTY_MODEL
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Demo symptoms endpoint - no authentication required for testing
    const demoSymptomsResource = api.root.addResource('demo');
    const demoSymptomSubmitResource = demoSymptomsResource.addResource('symptoms');
    demoSymptomSubmitResource.addMethod('POST', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            success: true,
            message: 'Demo symptom submission received',
            episodeId: 'demo-episode-' + Date.now(),
            timestamp: new Date().toISOString()
          })
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': "'*'",
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Network-Quality,X-Data-Saver,X-Content-Compressed'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'"
        }
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}'
      }
    }), {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [{
        statusCode: '200',
        responseModels: {
          'application/json': apigateway.Model.EMPTY_MODEL
        },
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Symptoms endpoint - requires authentication
    const symptomsResource = api.root.addResource('symptoms');
    symptomsResource.addMethod('POST', new apigateway.LambdaIntegration(functions.symptomIntake), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }, {
        statusCode: '401',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    });

    // Voice input endpoints - requires authentication
    const voiceInputResource = symptomsResource.addResource('voice-input');
    voiceInputResource.addMethod('POST', new apigateway.LambdaIntegration(functions.symptomIntake), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const presignedUrlResource = symptomsResource.addResource('presigned-url');
    presignedUrlResource.addMethod('POST', new apigateway.LambdaIntegration(functions.symptomIntake), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Triage endpoint - requires authentication
    const triageResource = api.root.addResource('triage');
    triageResource.addMethod('POST', new apigateway.LambdaIntegration(functions.triage), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Validation endpoint - requires authentication (healthcare supervisors only)
    const validationResource = api.root.addResource('validation');
    validationResource.addMethod('POST', new apigateway.LambdaIntegration(functions.validation), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    validationResource.addMethod('GET', new apigateway.LambdaIntegration(functions.validation), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    validationResource.addMethod('PUT', new apigateway.LambdaIntegration(functions.validation), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Emergency Alert endpoint - requires authentication (emergency supervisors only)
    const emergencyResource = api.root.addResource('emergency');
    emergencyResource.addMethod('POST', new apigateway.LambdaIntegration(functions.emergencyAlert), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    emergencyResource.addMethod('GET', new apigateway.LambdaIntegration(functions.emergencyAlert), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    emergencyResource.addMethod('PUT', new apigateway.LambdaIntegration(functions.emergencyAlert), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Emergency Alert sub-resources
    const alertResource = emergencyResource.addResource('alert');
    alertResource.addMethod('POST', new apigateway.LambdaIntegration(functions.emergencyAlert), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const escalateResource = emergencyResource.addResource('escalate');
    escalateResource.addMethod('POST', new apigateway.LambdaIntegration(functions.emergencyAlert), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const emergencyEpisodeResource = emergencyResource.addResource('{episodeId}');
    emergencyEpisodeResource.addMethod('GET', new apigateway.LambdaIntegration(functions.emergencyAlert), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Providers endpoint - requires authentication
    const providersResource = api.root.addResource('providers');
    providersResource.addMethod('GET', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Provider search endpoint
    const providerSearchResource = providersResource.addResource('search');
    providerSearchResource.addMethod('GET', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Provider registration endpoint
    const providerRegisterResource = providersResource.addResource('register');
    providerRegisterResource.addMethod('POST', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Provider capacity endpoints
    const providerCapacityResource = providersResource.addResource('capacity');
    providerCapacityResource.addMethod('GET', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const providerCapacityUpdateResource = providerCapacityResource.addResource('update');
    providerCapacityUpdateResource.addMethod('POST', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Individual provider endpoint
    const providerResource = providersResource.addResource('{providerId}');
    providerResource.addMethod('GET', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    providerResource.addMethod('PUT', new apigateway.LambdaIntegration(functions.providers), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Care coordination endpoint - requires authentication
    const careResource = api.root.addResource('care');
    careResource.addMethod('POST', new apigateway.LambdaIntegration(functions.coordinator), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Referrals endpoint - requires authentication
    const referralsResource = api.root.addResource('referrals');
    referralsResource.addMethod('POST', new apigateway.LambdaIntegration(functions.referrals), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    referralsResource.addMethod('GET', new apigateway.LambdaIntegration(functions.referrals), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Episodes endpoint - requires authentication
    const episodesResource = api.root.addResource('episodes');
    episodesResource.addMethod('GET', new apigateway.LambdaIntegration(functions.episodes), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    const episodeResource = episodesResource.addResource('{episodeId}');
    episodeResource.addMethod('GET', new apigateway.LambdaIntegration(functions.episodes), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
  }

  private createLogGroups() {
    // Create log groups for better organization
    new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: '/aws/apigateway/healthcare-orchestration',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: '/aws/lambda/healthcare-orchestration',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private createMonitoringAndAlarms(api: apigateway.RestApi, functions: lambda.Function[]) {
    // Create CloudWatch alarms for API Gateway
    new cloudwatch.Alarm(this, 'ApiGateway4xxAlarm', {
      alarmName: 'healthcare-api-4xx-errors',
      alarmDescription: 'API Gateway 4xx errors',
      metric: api.metricClientError(),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      alarmName: 'healthcare-api-5xx-errors',
      alarmDescription: 'API Gateway 5xx errors',
      metric: api.metricServerError(),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Alarm(this, 'ApiGatewayLatencyAlarm', {
      alarmName: 'healthcare-api-high-latency',
      alarmDescription: 'API Gateway high latency',
      metric: api.metricLatency(),
      threshold: 3000, // 3 seconds as per requirement 10.2
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Create CloudWatch alarms for Lambda functions
    functions.forEach((func, index) => {
      new cloudwatch.Alarm(this, `Lambda${index}ErrorAlarm`, {
        alarmName: `${func.functionName}-errors`,
        alarmDescription: `Lambda function ${func.functionName} errors`,
        metric: func.metricErrors(),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      new cloudwatch.Alarm(this, `Lambda${index}DurationAlarm`, {
        alarmName: `${func.functionName}-duration`,
        alarmDescription: `Lambda function ${func.functionName} duration`,
        metric: func.metricDuration(),
        threshold: func.timeout?.toMilliseconds() || 30000,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      new cloudwatch.Alarm(this, `Lambda${index}ThrottleAlarm`, {
        alarmName: `${func.functionName}-throttles`,
        alarmDescription: `Lambda function ${func.functionName} throttles`,
        metric: func.metricThrottles(),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    });
  }
}