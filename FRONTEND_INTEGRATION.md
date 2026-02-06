# Frontend Integration Guide

This document explains how to integrate the Progressive Web App (PWA) frontend with the existing AWS Lambda backend infrastructure.

## Overview

The frontend is a Next.js-based Progressive Web App located in the `frontend/` directory. It provides:

- **Symptom Intake Interface**: User-friendly forms for reporting symptoms
- **Multilingual Support**: Hindi and English with extensible i18n framework
- **Offline Functionality**: Works without internet and syncs when online
- **Responsive Design**: Optimized for mobile and desktop
- **PWA Features**: Installable, cached, and app-like experience

## Architecture Integration

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend PWA  │    │   API Gateway    │    │  Lambda Functions│
│   (Next.js)     │◄──►│                  │◄──►│                 │
│                 │    │  - CORS enabled  │    │ - Symptom Intake│
│ - Symptom Forms │    │  - Auth (Cognito)│    │ - Triage Engine │
│ - Offline Cache │    │  - Rate Limiting │    │ - Provider Disc.│
│ - i18n Support  │    │                  │    │ - Episode Track │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## API Integration Points

### 1. Symptom Intake
- **Frontend**: `src/components/SymptomIntake/SymptomIntakeForm.tsx`
- **Backend**: Symptom Intake Lambda function
- **Endpoint**: `POST /api/symptom-intake`
- **Payload**:
```json
{
  "primaryComplaint": "string",
  "duration": "string",
  "severity": 1-10,
  "associatedSymptoms": "string",
  "medicalHistory": "string",
  "inputMethod": "text|voice"
}
```

### 2. Episode Tracking
- **Frontend**: `src/pages/episodes.tsx`
- **Backend**: Episode Tracker Lambda function
- **Endpoint**: `GET /api/episodes`
- **Response**: Array of CareEpisode objects

### 3. Provider Discovery
- **Frontend**: Provider search components (to be implemented)
- **Backend**: Provider Discovery Lambda function
- **Endpoint**: `POST /api/providers/search`

### 4. Triage Results
- **Frontend**: Triage display components
- **Backend**: Triage Engine Lambda function
- **Endpoint**: `GET /api/triage/{episodeId}`

## Deployment Options

### Option 1: AWS Amplify (Recommended)
```bash
# 1. Install Amplify CLI
npm install -g @aws-amplify/cli

# 2. Initialize Amplify in frontend directory
cd frontend
amplify init

# 3. Add hosting
amplify add hosting

# 4. Deploy
amplify publish
```

**Benefits**:
- Automatic CI/CD from Git
- Built-in CDN and SSL
- Easy environment management
- Integrated with AWS services

### Option 2: AWS S3 + CloudFront
```bash
# 1. Build the static export
cd frontend
npm run build
npm run export

# 2. Upload to S3
aws s3 sync out/ s3://your-bucket-name --delete

# 3. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Option 3: Vercel (External)
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy from frontend directory
cd frontend
vercel
```

### Option 4: Docker Container
```bash
# 1. Build Docker image
cd frontend
docker build -t healthcare-pwa .

# 2. Run container
docker run -p 3000:3000 healthcare-pwa

# 3. Deploy to AWS ECS/Fargate (optional)
```

## Environment Configuration

### Frontend Environment Variables
Create `frontend/.env.production`:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_ENABLE_VOICE_INPUT=false
NEXT_PUBLIC_ENABLE_GEOLOCATION=true
NODE_ENV=production
```

### API Gateway CORS Configuration
Ensure your API Gateway has CORS enabled for the frontend domain:
```json
{
  "Access-Control-Allow-Origin": "https://your-frontend-domain.com",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
}
```

## CDK Integration

Add the frontend deployment to your CDK stack:

```typescript
// In your CDK stack file
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class HealthcareOrchestrationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ... existing backend resources ...

    // Frontend hosting
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: 'healthcare-pwa-frontend',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html',
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'FrontendDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: frontendBucket,
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
    });

    // Deploy frontend build
    new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
      sources: [s3deploy.Source.asset('./frontend/out')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Output the CloudFront URL
    new CfnOutput(this, 'FrontendUrl', {
      value: distribution.distributionDomainName,
      description: 'Frontend PWA URL',
    });
  }
}
```

## Authentication Integration

### AWS Cognito Setup
The frontend is prepared for Cognito authentication:

```typescript
// Add to your CDK stack
const userPool = new cognito.UserPool(this, 'UserPool', {
  userPoolName: 'healthcare-users',
  selfSignUpEnabled: true,
  signInAliases: {
    email: true,
    phone: true,
  },
  standardAttributes: {
    email: { required: true, mutable: true },
    phoneNumber: { required: true, mutable: true },
  },
});

const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
  userPool,
  generateSecret: false, // For web apps
  authFlows: {
    userPassword: true,
    userSrp: true,
  },
});
```

### Frontend Auth Configuration
Update `frontend/src/services/api.ts` with Cognito integration:
```typescript
import { Auth } from 'aws-amplify';

// Configure Amplify
Auth.configure({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
  userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
});
```

## Testing the Integration

### 1. Local Development
```bash
# Start backend (if running locally)
npm run dev

# Start frontend
cd frontend
npm run dev
```

### 2. API Connectivity Test
Visit `http://localhost:3000/test` to verify:
- PWA features are working
- Internationalization is functional
- Offline capabilities are enabled
- API connectivity (when backend is available)

### 3. Production Testing
```bash
# Build and test production build
cd frontend
npm run build
npm start
```

## Performance Optimization

### 1. Bundle Analysis
```bash
cd frontend
npm run build
npx @next/bundle-analyzer
```

### 2. Lighthouse Audit
- Run Lighthouse in Chrome DevTools
- Target scores: Performance >90, Accessibility >95, Best Practices >90, SEO >90

### 3. CDN Configuration
- Enable gzip compression
- Set appropriate cache headers
- Use CloudFront for global distribution

## Monitoring and Analytics

### 1. CloudWatch Integration
Add CloudWatch RUM for frontend monitoring:
```typescript
// In CDK stack
const rumApp = new rum.CfnAppMonitor(this, 'FrontendRUM', {
  name: 'healthcare-pwa-frontend',
  domain: distribution.distributionDomainName,
  appMonitorConfiguration: {
    allowCookies: true,
    enableXRay: true,
    sessionSampleRate: 0.1,
    telemetries: ['errors', 'performance', 'http'],
  },
});
```

### 2. Error Tracking
Consider integrating with:
- AWS CloudWatch Logs
- Sentry (external)
- LogRocket (external)

## Security Considerations

### 1. Content Security Policy
Add CSP headers in `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
];
```

### 2. API Security
- Use HTTPS only
- Implement rate limiting
- Validate all inputs
- Use Cognito for authentication

### 3. Data Privacy
- Encrypt sensitive data in localStorage
- Implement data retention policies
- Comply with Indian data protection laws

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify API Gateway CORS configuration
   - Check allowed origins and methods

2. **PWA Not Installing**
   - Ensure HTTPS is enabled
   - Verify manifest.json is accessible
   - Check service worker registration

3. **Offline Sync Issues**
   - Check localStorage availability
   - Verify service worker caching
   - Test network connectivity detection

4. **Build Failures**
   - Check Node.js version (18+)
   - Clear node_modules and reinstall
   - Verify environment variables

### Debug Commands
```bash
# Check PWA status
npx lighthouse http://localhost:3000 --view

# Analyze bundle size
npx @next/bundle-analyzer

# Test service worker
npx workbox-cli --help
```

## Next Steps

1. **Complete API Integration**: Connect all frontend components to backend Lambda functions
2. **Add Authentication**: Implement Cognito-based user authentication
3. **Enhanced Offline**: Implement more sophisticated offline data management
4. **Push Notifications**: Add web push notifications for care updates
5. **Analytics**: Implement user behavior tracking and performance monitoring
6. **Testing**: Add comprehensive E2E tests with Cypress or Playwright

## Support

For issues with the frontend integration:
1. Check the frontend README.md
2. Review the API documentation
3. Test with the `/test` page
4. Check browser console for errors
5. Verify network requests in DevTools