# Authentication Setup Guide

## Overview

The Arogya AI Healthcare OS uses **AWS Cognito** for secure authentication and authorization. This guide explains how to configure and use authentication in both production and demo modes.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────┐
│   Frontend  │─────▶│ AWS Cognito  │─────▶│ API Gateway │─────▶│  Lambda  │
│   (React)   │      │  User Pool   │      │  (JWT Auth) │      │ Functions│
└─────────────┘      └──────────────┘      └─────────────┘      └──────────┘
       │                     │
       │                     │
       ▼                     ▼
  localStorage          JWT Tokens
  (Tokens)              (ID, Access, Refresh)
```

## Security Features

✅ **JWT Token-Based Authentication** - Secure, stateless authentication
✅ **Automatic Token Refresh** - Seamless session management
✅ **Secure Token Storage** - Tokens stored in localStorage with expiry
✅ **HTTPS Only** - All API calls use TLS encryption
✅ **No Credentials in Code** - Environment variables for sensitive data
✅ **Guest/Demo Mode** - Fallback for testing without authentication

## Configuration

### 1. AWS Cognito Setup

The backend CDK stack has already created:
- ✅ Cognito User Pool
- ✅ User Pool Client
- ✅ API Gateway Authorizer

### 2. Get Cognito Configuration

Run this command to get your Cognito details:

```bash
aws cognito-idp list-user-pools --max-results 10 --region us-east-1
```

Or check the CDK outputs:

```bash
aws cloudformation describe-stacks --stack-name HealthcareOSStack --region us-east-1 --query "Stacks[0].Outputs"
```

### 3. Environment Variables

Create or update `frontend/.env.local` for development:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1

# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-cognito-client-id-here

# Mode Selection
NEXT_PUBLIC_USE_DEMO_API=false  # Set to true for demo mode without auth
NEXT_PUBLIC_USE_MOCK_API=false  # Set to true for local mock data
```

Update `frontend/.env.production` for production:

```env
NEXT_PUBLIC_API_BASE_URL=https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-cognito-client-id-here
NEXT_PUBLIC_USE_DEMO_API=false
```

## Usage

### Authentication Service

The `authService` provides all authentication functionality:

```typescript
import { authService } from '@/services/authService';

// Sign up new user
const result = await authService.signUp(
  'username',
  'password',
  'email@example.com'
);

// Confirm sign up with verification code
await authService.confirmSignUp('username', '123456');

// Sign in
const { success, user, tokens } = await authService.signIn(
  'username',
  'password'
);

// Get current user
const user = await authService.getCurrentUser();

// Check if authenticated
const isAuth = await authService.isAuthenticated();

// Sign out
await authService.signOut();
```

### API Integration

The API service automatically uses authentication tokens:

```typescript
import { apiService } from '@/services/api';

// All API calls automatically include JWT token
const response = await apiService.submitSymptoms(symptomData);
```

### Protected Routes

Create a higher-order component for protected pages:

```typescript
// components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authService } from '@/services/authService';

export function withAuth(Component: any) {
  return function ProtectedRoute(props: any) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      checkAuth();
    }, []);

    async function checkAuth() {
      const authenticated = await authService.isAuthenticated();
      
      if (!authenticated) {
        // Check if demo mode is enabled
        const useDemo = process.env.NEXT_PUBLIC_USE_DEMO_API === 'true';
        if (!useDemo) {
          router.push('/login');
          return;
        }
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    }

    if (isLoading) {
      return <div>Loading...</div>;
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
}
```

## Operating Modes

### 1. Production Mode (Authenticated)

```env
NEXT_PUBLIC_USE_DEMO_API=false
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id
```

- ✅ Full authentication required
- ✅ Secure JWT tokens
- ✅ User management via Cognito
- ✅ Production-ready

### 2. Demo Mode (No Authentication)

```env
NEXT_PUBLIC_USE_DEMO_API=true
```

- ✅ No authentication required
- ✅ Mock data for testing
- ✅ Perfect for hackathon demos
- ✅ No backend dependency

### 3. Mock Mode (Local Development)

```env
NEXT_PUBLIC_USE_MOCK_API=true
```

- ✅ Local mock data
- ✅ No network calls
- ✅ Fast development
- ✅ Offline capable

## Security Best Practices

### ✅ Implemented

1. **Token Storage**: Tokens stored in localStorage (not cookies to avoid CSRF)
2. **Token Expiry**: Automatic token refresh before expiry
3. **HTTPS Only**: All API calls use TLS encryption
4. **No Credentials in Code**: Environment variables for sensitive data
5. **Automatic Logout**: On token expiry or 401 errors
6. **Guest Mode Fallback**: Graceful degradation when auth unavailable

### 🔒 Additional Recommendations

1. **Enable MFA**: Configure multi-factor authentication in Cognito
2. **Password Policy**: Enforce strong passwords (already configured in CDK)
3. **Rate Limiting**: API Gateway throttling (already configured)
4. **Audit Logging**: CloudWatch logs for all auth events
5. **Session Timeout**: Configure appropriate session duration

## Testing Authentication

### Create Test User

```bash
# Create user via AWS CLI
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TempPass123! \
  --region us-east-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser \
  --password SecurePass123! \
  --permanent \
  --region us-east-1
```

### Test Authentication Flow

```typescript
// Test sign in
const result = await authService.signIn('testuser', 'SecurePass123!');
console.log('Sign in result:', result);

// Test API call with auth
const response = await apiService.getProfile();
console.log('Profile:', response);

// Test token refresh
const refreshed = await authService.refreshSession();
console.log('Token refreshed:', refreshed);

// Test sign out
await authService.signOut();
```

## Troubleshooting

### Issue: "Authentication not available"

**Solution**: Check that Cognito environment variables are set:
```bash
echo $NEXT_PUBLIC_COGNITO_USER_POOL_ID
echo $NEXT_PUBLIC_COGNITO_CLIENT_ID
```

### Issue: "401 Unauthorized"

**Solutions**:
1. Check token is valid: `authService.isTokenExpired()`
2. Refresh session: `authService.refreshSession()`
3. Sign in again: `authService.signIn(username, password)`

### Issue: "CORS errors"

**Solution**: Ensure API Gateway has CORS configured:
```typescript
// Already configured in CDK stack
api.addCorsPreflight({
  allowOrigins: ['*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
});
```

### Issue: "Token expired"

**Solution**: Automatic refresh is implemented. If it fails:
```typescript
const refreshed = await authService.refreshSession();
if (!refreshed) {
  await authService.signOut();
  // Redirect to login
}
```

## Migration from Demo to Production

### Step 1: Configure Cognito

```bash
# Get Cognito details
aws cloudformation describe-stacks \
  --stack-name HealthcareOSStack \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text
```

### Step 2: Update Environment

```env
# Change from demo mode
NEXT_PUBLIC_USE_DEMO_API=false

# Add Cognito config
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id
```

### Step 3: Rebuild and Deploy

```bash
cd frontend
npm run build
aws s3 sync out/ s3://your-bucket-name --delete
```

### Step 4: Test Authentication

1. Visit your app
2. Sign up for a new account
3. Verify email
4. Sign in
5. Test API calls

## API Gateway Integration

The API Gateway is configured to validate JWT tokens:

```typescript
// Lambda authorizer validates:
1. Token signature (using Cognito public keys)
2. Token expiry
3. Token issuer (Cognito User Pool)
4. Token audience (Client ID)
```

All authenticated requests include:
```
Authorization: Bearer <JWT_TOKEN>
```

## Monitoring

### CloudWatch Logs

```bash
# View authentication logs
aws logs tail /aws/cognito/userpools/us-east-1_XXXXXXXXX --follow

# View API Gateway logs
aws logs tail /aws/apigateway/HealthcareOSAPI --follow
```

### Metrics

- Sign-in success/failure rate
- Token refresh rate
- API call authentication failures
- Session duration

## Support

For issues or questions:
1. Check CloudWatch logs
2. Verify environment variables
3. Test with demo mode first
4. Review AWS Cognito console

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [API Gateway Authorization](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)
