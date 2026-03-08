#!/bin/bash

# Script to retrieve AWS Cognito configuration from CloudFormation stack
# Usage: ./get-cognito-config.sh

STACK_NAME="HealthcareOSStack"
REGION="us-east-1"

echo "🔍 Retrieving Cognito configuration from AWS..."
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo ""

# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text 2>/dev/null)

# Get User Pool Client ID
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text 2>/dev/null)

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
  --output text 2>/dev/null)

if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
  echo "❌ Could not retrieve Cognito configuration from CloudFormation"
  echo ""
  echo "Trying alternative method..."
  echo ""
  
  # Try to list user pools directly
  USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --region $REGION \
    --query "UserPools[?Name=='HealthcareOSUserPool'].Id" --output text 2>/dev/null)
  
  if [ -n "$USER_POOL_ID" ]; then
    # Get client ID from user pool
    CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
      --user-pool-id $USER_POOL_ID \
      --region $REGION \
      --query "UserPoolClients[0].ClientId" \
      --output text 2>/dev/null)
  fi
fi

if [ -z "$API_URL" ]; then
  API_URL="https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1"
fi

echo "✅ Configuration Retrieved:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add these to your frontend/.env.local file:"
echo ""
echo "# API Configuration"
echo "NEXT_PUBLIC_API_BASE_URL=$API_URL"
echo ""
echo "# AWS Cognito Configuration"
echo "NEXT_PUBLIC_AWS_REGION=$REGION"
echo "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"
echo ""
echo "# Mode Selection (set to false to enable authentication)"
echo "NEXT_PUBLIC_USE_DEMO_API=false"
echo "NEXT_PUBLIC_USE_MOCK_API=false"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create .env.local file
ENV_FILE="frontend/.env.local"
echo "📝 Creating $ENV_FILE..."
echo ""

cat > $ENV_FILE << EOF
# API Configuration
NEXT_PUBLIC_API_BASE_URL=$API_URL

# AWS Cognito Configuration
NEXT_PUBLIC_AWS_REGION=$REGION
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID

# Mode Selection
NEXT_PUBLIC_USE_DEMO_API=false
NEXT_PUBLIC_USE_MOCK_API=false

# Feature Flags
NEXT_PUBLIC_ENABLE_VOICE_INPUT=false
NEXT_PUBLIC_ENABLE_GEOLOCATION=true
EOF

echo "✅ Configuration saved to $ENV_FILE"
echo ""
echo "🚀 Next Steps:"
echo "1. Install dependencies: cd frontend && npm install"
echo "2. Create a test user:"
echo "   aws cognito-idp admin-create-user \\"
echo "     --user-pool-id $USER_POOL_ID \\"
echo "     --username testuser \\"
echo "     --user-attributes Name=email,Value=test@example.com \\"
echo "     --temporary-password TempPass123! \\"
echo "     --region $REGION"
echo ""
echo "3. Set permanent password:"
echo "   aws cognito-idp admin-set-user-password \\"
echo "     --user-pool-id $USER_POOL_ID \\"
echo "     --username testuser \\"
echo "     --password SecurePass123! \\"
echo "     --permanent \\"
echo "     --region $REGION"
echo ""
echo "4. Build and test: npm run build"
echo ""
