# AI-Enabled Decentralized Care Orchestration System

A serverless healthcare orchestration system built on AWS that intelligently routes patients to appropriate care levels while maintaining strict human oversight. Designed specifically for India's healthcare network with cost efficiency, scalability, and responsible AI practices.

## Architecture Overview

The system uses a serverless microservices architecture with the following key components:

- **Patient Portal**: Progressive Web App for symptom intake
- **Triage Engine**: AI-assisted symptom assessment with human validation
- **Provider Network**: Real-time provider discovery and capacity management
- **Care Coordination**: Intelligent patient routing and care pathway execution
- **Referral System**: Automated escalation workflows between care levels
- **Episode Tracking**: Comprehensive care continuity and history management

## Technology Stack

- **Infrastructure**: AWS CDK (TypeScript)
- **Compute**: AWS Lambda (Node.js 18.x)
- **Database**: Amazon DynamoDB
- **API**: Amazon API Gateway
- **Authentication**: Amazon Cognito
- **AI**: Amazon Bedrock (Claude 3 Haiku)
- **Notifications**: Amazon SNS
- **Monitoring**: Amazon CloudWatch
- **Testing**: Jest + fast-check (property-based testing)

## Key Features

- **Human-in-the-Loop**: All AI recommendations require human validation
- **Cost-Efficient AI**: Limited to one LLM call per care episode
- **India-Specific**: Multilingual support, low-bandwidth optimization, cost-conscious routing
- **Secure**: End-to-end encryption, RBAC, comprehensive audit trails
- **Scalable**: Auto-scaling serverless architecture
- **Resilient**: Graceful degradation and fault tolerance

## Getting Started

### Prerequisites

- Node.js 18.x or later
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed globally

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Deploy the infrastructure:
   ```bash
   npm run deploy
   ```

### Development

- **Build**: `npm run build`
- **Watch**: `npm run watch`
- **Test**: `npm run test`
- **Test with coverage**: `npm run test:coverage`
- **Lint**: `npm run lint`
- **Format**: `npm run format`

### Testing

The project uses a dual testing approach:

- **Unit Tests**: Specific examples and integration points
- **Property-Based Tests**: Universal properties with randomized inputs using fast-check

Run tests:
```bash
npm test
```

Run property-based tests with extended iterations:
```bash
npm run test -- --testNamePattern="Property"
```

## Project Structure

```
src/
├── app.ts                          # CDK app entry point
├── infrastructure/                 # CDK infrastructure code
│   └── healthcare-orchestration-stack.ts
├── lambda/                         # Lambda function implementations
│   ├── symptom-intake/
│   ├── triage-engine/
│   ├── human-validation/
│   ├── provider-discovery/
│   ├── care-coordinator/
│   ├── referral-manager/
│   └── episode-tracker/
├── shared/                         # Shared utilities and types
│   ├── types/
│   ├── utils/
│   └── validation/
└── test/                          # Test files
    ├── unit/
    ├── property/
    └── integration/
```

## API Endpoints

- `POST /symptoms` - Submit patient symptoms
- `POST /triage` - Trigger triage assessment
- `GET /validation` - Get pending validations
- `POST /validation` - Submit validation decision
- `GET /providers` - Search healthcare providers
- `POST /care` - Initiate care coordination
- `POST /referrals` - Create referral request
- `GET /referrals` - Get referral status
- `GET /episodes` - Get episode history
- `GET /episodes/{id}` - Get specific episode

## Environment Variables

- `AWS_REGION` - AWS region for deployment
- `ENVIRONMENT` - Environment name (development/staging/production)
- `CDK_DEFAULT_ACCOUNT` - AWS account ID
- `CDK_DEFAULT_REGION` - Default AWS region

## Security

- All data encrypted at rest and in transit
- Cognito-based authentication and authorization
- Comprehensive audit logging
- Role-based access control (RBAC)
- API rate limiting and throttling

## Monitoring

- CloudWatch metrics and alarms
- Distributed tracing with X-Ray
- Custom dashboards for system health
- SNS notifications for critical alerts

## Contributing

1. Follow the existing code style and patterns
2. Write both unit and property-based tests
3. Ensure all tests pass before submitting
4. Update documentation as needed

## License

MIT License - see LICENSE file for details.