#!/bin/bash

# Healthcare Orchestration System Deployment Script

set -e

echo "🏥 Healthcare Orchestration System - Deployment Script"
echo "======================================================"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured or credentials are invalid"
    echo "Please run 'aws configure' to set up your credentials"
    exit 1
fi

# Get AWS account and region
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo "📋 Deployment Configuration:"
echo "   Account: $ACCOUNT"
echo "   Region: $REGION"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Bootstrap CDK if needed
echo "🚀 Bootstrapping CDK (if needed)..."
npx cdk bootstrap aws://$ACCOUNT/$REGION

# Deploy the stack
echo "🏗️  Deploying Healthcare Orchestration Stack..."
npx cdk deploy --require-approval never

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Check the AWS Console for deployed resources"
echo "   2. Note the API Gateway URL from the stack outputs"
echo "   3. Configure your frontend to use the API endpoints"
echo ""
echo "🔗 Useful commands:"
echo "   - View stack: npx cdk ls"
echo "   - Check diff: npx cdk diff"
echo "   - Destroy stack: npx cdk destroy"