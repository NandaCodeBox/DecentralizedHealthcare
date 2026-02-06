"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const healthcare_orchestration_stack_1 = require("../../src/infrastructure/healthcare-orchestration-stack");
describe('HealthcareOrchestrationStack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        app = new cdk.App();
        stack = new healthcare_orchestration_stack_1.HealthcareOrchestrationStack(app, 'TestStack', {
            env: {
                account: '123456789012',
                region: 'us-east-1',
            },
        });
        template = assertions_1.Template.fromStack(stack);
    });
    test('creates DynamoDB tables with correct configuration', () => {
        // Patient table
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'healthcare-patients',
            BillingMode: 'PAY_PER_REQUEST',
            SSESpecification: {
                SSEEnabled: true,
            },
            PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true,
            },
        });
        // Episode table
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
            ],
        });
        // Provider table
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'healthcare-providers',
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'LocationIndex',
                },
                {
                    IndexName: 'SpecialtyIndex',
                },
            ],
        });
        // Referral table
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'healthcare-referrals',
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'EpisodeReferralsIndex',
                },
                {
                    IndexName: 'ProviderReferralsIndex',
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
            UserPoolId: {
                Ref: expect.any(String),
            },
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
    test('creates API Gateway with CORS configuration', () => {
        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: 'Healthcare Orchestration API',
            Description: 'API for AI-enabled decentralized care orchestration system',
        });
        // Check for CORS configuration
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'OPTIONS',
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
                Runtime: 'nodejs18.x',
                Timeout: expect.any(Number),
                MemorySize: expect.any(Number),
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
        // Check that Lambda functions have DynamoDB permissions
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: expect.arrayContaining([
                    expect.objectContaining({
                        Effect: 'Allow',
                        Action: expect.arrayContaining([
                            'dynamodb:BatchGetItem',
                            'dynamodb:GetRecords',
                            'dynamodb:GetShardIterator',
                            'dynamodb:Query',
                            'dynamodb:GetItem',
                            'dynamodb:Scan',
                            'dynamodb:ConditionCheckItem',
                            'dynamodb:BatchWriteItem',
                            'dynamodb:PutItem',
                            'dynamodb:UpdateItem',
                            'dynamodb:DeleteItem',
                        ]),
                    }),
                ]),
            },
        });
        // Check that triage engine has Bedrock permissions
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: expect.arrayContaining([
                    expect.objectContaining({
                        Effect: 'Allow',
                        Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                        Resource: '*',
                    }),
                ]),
            },
        });
    });
    test('outputs important values', () => {
        template.hasOutput('ApiGatewayUrl', {
            Description: 'API Gateway URL for the healthcare orchestration system',
        });
        template.hasOutput('UserPoolId', {
            Description: 'Cognito User Pool ID',
        });
        template.hasOutput('UserPoolClientId', {
            Description: 'Cognito User Pool Client ID',
        });
    });
    test('stack synthesizes without errors', () => {
        expect(() => {
            app.synth();
        }).not.toThrow();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhbHRoY2FyZS1vcmNoZXN0cmF0aW9uLXN0YWNrLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJoZWFsdGhjYXJlLW9yY2hlc3RyYXRpb24tc3RhY2sudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx1REFBa0Q7QUFDbEQsNEdBQXVHO0FBRXZHLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDNUMsSUFBSSxHQUFZLENBQUM7SUFDakIsSUFBSSxLQUFtQyxDQUFDO0lBQ3hDLElBQUksUUFBa0IsQ0FBQztJQUV2QixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLDZEQUE0QixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUU7WUFDekQsR0FBRyxFQUFFO2dCQUNILE9BQU8sRUFBRSxjQUFjO2dCQUN2QixNQUFNLEVBQUUsV0FBVzthQUNwQjtTQUNGLENBQUMsQ0FBQztRQUNILFFBQVEsR0FBRyxxQkFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFDOUQsZ0JBQWdCO1FBQ2hCLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtZQUNyRCxTQUFTLEVBQUUscUJBQXFCO1lBQ2hDLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsZ0JBQWdCLEVBQUU7Z0JBQ2hCLFVBQVUsRUFBRSxJQUFJO2FBQ2pCO1lBQ0QsZ0NBQWdDLEVBQUU7Z0JBQ2hDLDBCQUEwQixFQUFFLElBQUk7YUFDakM7U0FDRixDQUFDLENBQUM7UUFFSCxnQkFBZ0I7UUFDaEIsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFF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Q0FBQztRQUVILG1EQUFtRDtRQUNuRCxRQUFRLENBQUMscUJBQXFCLENBQUMsa0JBQWtCLEVBQUU7WUFDakQsY0FBYyxFQUFFO2dCQUNkLFNBQVMsRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDO29CQUNoQyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7d0JBQ3RCLE1BQU0sRUFBRSxPQUFPO3dCQUNmLE1BQU0sRUFBRSxDQUFDLHFCQUFxQixFQUFFLHVDQUF1QyxDQUFDO3dCQUN4RSxRQUFRLEVBQUUsR0FBRztxQkFDZCxDQUFDO2lCQUNILENBQUM7YUFDSDtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNwQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRTtZQUNsQyxXQUFXLEVBQUUseURBQXlEO1NBQ3ZFLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFO1lBQy9CLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRTtZQUNyQyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ1YsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBUZW1wbGF0ZSB9IGZyb20gJ2F3cy1jZGstbGliL2Fzc2VydGlvbnMnO1xyXG5pbXBvcnQgeyBIZWFsdGhjYXJlT3JjaGVzdHJhdGlvblN0YWNrIH0gZnJvbSAnLi4vLi4vc3JjL2luZnJhc3RydWN0dXJlL2hlYWx0aGNhcmUtb3JjaGVzdHJhdGlvbi1zdGFjayc7XHJcblxyXG5kZXNjcmliZSgnSGVhbHRoY2FyZU9yY2hlc3RyYXRpb25TdGFjaycsICgpID0+IHtcclxuICBsZXQgYXBwOiBjZGsuQXBwO1xyXG4gIGxldCBzdGFjazogSGVhbHRoY2FyZU9yY2hlc3RyYXRpb25TdGFjaztcclxuICBsZXQgdGVtcGxhdGU6IFRlbXBsYXRlO1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XHJcbiAgICBzdGFjayA9IG5ldyBIZWFsdGhjYXJlT3JjaGVzdHJhdGlvblN0YWNrKGFwcCwgJ1Rlc3RTdGFjaycsIHtcclxuICAgICAgZW52OiB7XHJcbiAgICAgICAgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsXHJcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIER5bmFtb0RCIHRhYmxlcyB3aXRoIGNvcnJlY3QgY29uZmlndXJhdGlvbicsICgpID0+IHtcclxuICAgIC8vIFBhdGllbnQgdGFibGVcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XHJcbiAgICAgIFRhYmxlTmFtZTogJ2hlYWx0aGNhcmUtcGF0aWVudHMnLFxyXG4gICAgICBCaWxsaW5nTW9kZTogJ1BBWV9QRVJfUkVRVUVTVCcsXHJcbiAgICAgIFNTRVNwZWNpZmljYXRpb246IHtcclxuICAgICAgICBTU0VFbmFibGVkOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBQb2ludEluVGltZVJlY292ZXJ5U3BlY2lmaWNhdGlvbjoge1xyXG4gICAgICAgIFBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXBpc29kZSB0YWJsZVxyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcclxuICAgICAgVGFibGVOYW1lOiAnaGVhbHRoY2FyZS1lcGlzb2RlcycsXHJcbiAgICAgIEJpbGxpbmdNb2RlOiAnUEFZX1BFUl9SRVFVRVNUJyxcclxuICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIEluZGV4TmFtZTogJ1BhdGllbnRFcGlzb2Rlc0luZGV4JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIEluZGV4TmFtZTogJ0VwaXNvZGVTdGF0dXNJbmRleCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb3ZpZGVyIHRhYmxlXHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xyXG4gICAgICBUYWJsZU5hbWU6ICdoZWFsdGhjYXJlLXByb3ZpZGVycycsXHJcbiAgICAgIEdsb2JhbFNlY29uZGFyeUluZGV4ZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdMb2NhdGlvbkluZGV4JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIEluZGV4TmFtZTogJ1NwZWNpYWx0eUluZGV4JyxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVmZXJyYWwgdGFibGVcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCB7XHJcbiAgICAgIFRhYmxlTmFtZTogJ2hlYWx0aGNhcmUtcmVmZXJyYWxzJyxcclxuICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIEluZGV4TmFtZTogJ0VwaXNvZGVSZWZlcnJhbHNJbmRleCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdQcm92aWRlclJlZmVycmFsc0luZGV4JyxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2NyZWF0ZXMgQ29nbml0byBVc2VyIFBvb2wgd2l0aCBjb3JyZWN0IGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6Q29nbml0bzo6VXNlclBvb2wnLCB7XHJcbiAgICAgIFVzZXJQb29sTmFtZTogJ2hlYWx0aGNhcmUtb3JjaGVzdHJhdGlvbi11c2VycycsXHJcbiAgICAgIEF1dG9WZXJpZmllZEF0dHJpYnV0ZXM6IFsnZW1haWwnLCAncGhvbmVfbnVtYmVyJ10sXHJcbiAgICAgIFVzZXJuYW1lQXR0cmlidXRlczogWydlbWFpbCcsICdwaG9uZV9udW1iZXInXSxcclxuICAgICAgUG9saWNpZXM6IHtcclxuICAgICAgICBQYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgICAgTWluaW11bUxlbmd0aDogOCxcclxuICAgICAgICAgIFJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgICBSZXF1aXJlTnVtYmVyczogdHJ1ZSxcclxuICAgICAgICAgIFJlcXVpcmVTeW1ib2xzOiB0cnVlLFxyXG4gICAgICAgICAgUmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICBVc2VyUG9vbElkOiB7XHJcbiAgICAgICAgUmVmOiBleHBlY3QuYW55KFN0cmluZyksXHJcbiAgICAgIH0sXHJcbiAgICAgIEdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIFNOUyB0b3BpY3MgZm9yIG5vdGlmaWNhdGlvbnMnLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U05TOjpUb3BpYycsIHtcclxuICAgICAgVG9waWNOYW1lOiAnaGVhbHRoY2FyZS1ub3RpZmljYXRpb25zJyxcclxuICAgICAgRGlzcGxheU5hbWU6ICdIZWFsdGhjYXJlIE9yY2hlc3RyYXRpb24gTm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6U05TOjpUb3BpYycsIHtcclxuICAgICAgVG9waWNOYW1lOiAnaGVhbHRoY2FyZS1lbWVyZ2VuY3ktYWxlcnRzJyxcclxuICAgICAgRGlzcGxheU5hbWU6ICdIZWFsdGhjYXJlIEVtZXJnZW5jeSBBbGVydHMnLFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2NyZWF0ZXMgQVBJIEdhdGV3YXkgd2l0aCBDT1JTIGNvbmZpZ3VyYXRpb24nLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6QXBpR2F0ZXdheTo6UmVzdEFwaScsIHtcclxuICAgICAgTmFtZTogJ0hlYWx0aGNhcmUgT3JjaGVzdHJhdGlvbiBBUEknLFxyXG4gICAgICBEZXNjcmlwdGlvbjogJ0FQSSBmb3IgQUktZW5hYmxlZCBkZWNlbnRyYWxpemVkIGNhcmUgb3JjaGVzdHJhdGlvbiBzeXN0ZW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIENPUlMgY29uZmlndXJhdGlvblxyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkFwaUdhdGV3YXk6Ok1ldGhvZCcsIHtcclxuICAgICAgSHR0cE1ldGhvZDogJ09QVElPTlMnLFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ2NyZWF0ZXMgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIGNvcnJlY3QgY29uZmlndXJhdGlvbicsICgpID0+IHtcclxuICAgIGNvbnN0IGV4cGVjdGVkRnVuY3Rpb25zID0gW1xyXG4gICAgICAnaGVhbHRoY2FyZS1zeW1wdG9tLWludGFrZScsXHJcbiAgICAgICdoZWFsdGhjYXJlLXRyaWFnZS1lbmdpbmUnLFxyXG4gICAgICAnaGVhbHRoY2FyZS1odW1hbi12YWxpZGF0aW9uJyxcclxuICAgICAgJ2hlYWx0aGNhcmUtcHJvdmlkZXItZGlzY292ZXJ5JyxcclxuICAgICAgJ2hlYWx0aGNhcmUtY2FyZS1jb29yZGluYXRvcicsXHJcbiAgICAgICdoZWFsdGhjYXJlLXJlZmVycmFsLW1hbmFnZXInLFxyXG4gICAgICAnaGVhbHRoY2FyZS1lcGlzb2RlLXRyYWNrZXInLFxyXG4gICAgXTtcclxuXHJcbiAgICBleHBlY3RlZEZ1bmN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uTmFtZSA9PiB7XHJcbiAgICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xyXG4gICAgICAgIEZ1bmN0aW9uTmFtZTogZnVuY3Rpb25OYW1lLFxyXG4gICAgICAgIFJ1bnRpbWU6ICdub2RlanMxOC54JyxcclxuICAgICAgICBUaW1lb3V0OiBleHBlY3QuYW55KE51bWJlciksXHJcbiAgICAgICAgTWVtb3J5U2l6ZTogZXhwZWN0LmFueShOdW1iZXIpLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIENsb3VkV2F0Y2ggbG9nIGdyb3VwcycsICgpID0+IHtcclxuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMb2dzOjpMb2dHcm91cCcsIHtcclxuICAgICAgTG9nR3JvdXBOYW1lOiAnL2F3cy9hcGlnYXRld2F5L2hlYWx0aGNhcmUtb3JjaGVzdHJhdGlvbicsXHJcbiAgICAgIFJldGVudGlvbkluRGF5czogMzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCB7XHJcbiAgICAgIExvZ0dyb3VwTmFtZTogJy9hd3MvbGFtYmRhL2hlYWx0aGNhcmUtb3JjaGVzdHJhdGlvbicsXHJcbiAgICAgIFJldGVudGlvbkluRGF5czogMzAsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnZ3JhbnRzIGFwcHJvcHJpYXRlIHBlcm1pc3Npb25zIHRvIExhbWJkYSBmdW5jdGlvbnMnLCAoKSA9PiB7XHJcbiAgICAvLyBDaGVjayB0aGF0IExhbWJkYSBmdW5jdGlvbnMgaGF2ZSBEeW5hbW9EQiBwZXJtaXNzaW9uc1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OklBTTo6UG9saWN5Jywge1xyXG4gICAgICBQb2xpY3lEb2N1bWVudDoge1xyXG4gICAgICAgIFN0YXRlbWVudDogZXhwZWN0LmFycmF5Q29udGFpbmluZyhbXHJcbiAgICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIEVmZmVjdDogJ0FsbG93JyxcclxuICAgICAgICAgICAgQWN0aW9uOiBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hHZXRJdGVtJyxcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0UmVjb3JkcycsXHJcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldFNoYXJkSXRlcmF0b3InLFxyXG4gICAgICAgICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICAgICAgICdkeW5hbW9kYjpTY2FuJyxcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6Q29uZGl0aW9uQ2hlY2tJdGVtJyxcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6QmF0Y2hXcml0ZUl0ZW0nLFxyXG4gICAgICAgICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICAgICBdKSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0pLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgdGhhdCB0cmlhZ2UgZW5naW5lIGhhcyBCZWRyb2NrIHBlcm1pc3Npb25zXHJcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6SUFNOjpQb2xpY3knLCB7XHJcbiAgICAgIFBvbGljeURvY3VtZW50OiB7XHJcbiAgICAgICAgU3RhdGVtZW50OiBleHBlY3QuYXJyYXlDb250YWluaW5nKFtcclxuICAgICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgRWZmZWN0OiAnQWxsb3cnLFxyXG4gICAgICAgICAgICBBY3Rpb246IFsnYmVkcm9jazpJbnZva2VNb2RlbCcsICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJ10sXHJcbiAgICAgICAgICAgIFJlc291cmNlOiAnKicsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdvdXRwdXRzIGltcG9ydGFudCB2YWx1ZXMnLCAoKSA9PiB7XHJcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ0FwaUdhdGV3YXlVcmwnLCB7XHJcbiAgICAgIERlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMIGZvciB0aGUgaGVhbHRoY2FyZSBvcmNoZXN0cmF0aW9uIHN5c3RlbScsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0ZW1wbGF0ZS5oYXNPdXRwdXQoJ1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIERlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGVtcGxhdGUuaGFzT3V0cHV0KCdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICBEZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnc3RhY2sgc3ludGhlc2l6ZXMgd2l0aG91dCBlcnJvcnMnLCAoKSA9PiB7XHJcbiAgICBleHBlY3QoKCkgPT4ge1xyXG4gICAgICBhcHAuc3ludGgoKTtcclxuICAgIH0pLm5vdC50b1Rocm93KCk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==