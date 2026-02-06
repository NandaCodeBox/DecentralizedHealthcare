# AWS Frontend Deployment Guide

This guide will help you deploy the Healthcare OS frontend to AWS using AWS Amplify or S3 + CloudFront.

## Option 1: AWS Amplify (Recommended - Easiest)

### Prerequisites
- AWS Account
- GitHub repository with your code
- AWS CLI installed (optional)

### Step 1: Prepare the Build
First, let's ensure the frontend is ready for production deployment:

```bash
cd frontend
npm install
npm run build
```

### Step 2: Deploy with AWS Amplify

#### Method A: Using AWS Console (Easiest)

1. **Go to AWS Amplify Console**:
   - Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"

2. **Connect Repository**:
   - Choose "GitHub" as your repository service
   - Authorize AWS Amplify to access your GitHub account
   - Select your repository and branch (usually `main`)

3. **Configure Build Settings**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: frontend/out
       files:
         - '**/*'
     cache:
       paths:
         - frontend/node_modules/**/*
   ```

4. **Environment Variables**:
   Add these environment variables in Amplify:
   ```
   NEXT_PUBLIC_API_BASE_URL=https://your-aws-api-gateway-url.com/v1
   NEXT_PUBLIC_APP_ENV=production
   NODE_ENV=production
   ```

5. **Deploy**:
   - Review settings and click "Save and deploy"
   - Wait for deployment to complete (5-10 minutes)

#### Method B: Using Amplify CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
cd frontend
amplify init

# Add hosting
amplify add hosting
# Choose: Amazon CloudFront and S3
# Choose: DEV (S3 only with HTTP) or PROD (S3 with CloudFront over HTTPS)

# Publish
amplify publish
```

## Option 2: S3 + CloudFront (Manual Setup)

### Step 1: Build for Production
```bash
cd frontend
npm run build
```

### Step 2: Create S3 Bucket
```bash
# Create bucket (replace with unique name)
aws s3 mb s3://healthcare-os-frontend-your-unique-id

# Enable static website hosting
aws s3 website s3://healthcare-os-frontend-your-unique-id \
  --index-document index.html \
  --error-document index.html
```

### Step 3: Upload Files
```bash
# Upload build files
aws s3 sync out/ s3://healthcare-os-frontend-your-unique-id --delete

# Set public read permissions
aws s3api put-bucket-policy \
  --bucket healthcare-os-frontend-your-unique-id \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::healthcare-os-frontend-your-unique-id/*"
      }
    ]
  }'
```

### Step 4: Create CloudFront Distribution
```bash
# Create distribution (replace bucket name)
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "healthcare-os-'$(date +%s)'",
    "Comment": "Healthcare OS Frontend",
    "DefaultRootObject": "index.html",
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "S3-healthcare-os-frontend",
          "DomainName": "healthcare-os-frontend-your-unique-id.s3.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": ""
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-healthcare-os-frontend",
      "ViewerProtocolPolicy": "redirect-to-https",
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {
          "Forward": "none"
        }
      },
      "MinTTL": 0
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
  }'
```

## Quick Deploy Script

I'll create a deployment script for you:

```bash
#!/bin/bash
# deploy-aws.sh

set -e

echo "🚀 Deploying Healthcare OS Frontend to AWS..."

# Build the application
echo "📦 Building application..."
cd frontend
npm install
npm run build

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Create unique bucket name
BUCKET_NAME="healthcare-os-frontend-$(date +%s)"
REGION="us-east-1"

echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION

echo "🌐 Enabling static website hosting..."
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

echo "📤 Uploading files..."
aws s3 sync out/ s3://$BUCKET_NAME --delete

echo "🔓 Setting public read permissions..."
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Sid\": \"PublicReadGetObject\",
        \"Effect\": \"Allow\",
        \"Principal\": \"*\",
        \"Action\": \"s3:GetObject\",
        \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
      }
    ]
  }"

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

echo "✅ Deployment complete!"
echo "🌍 Website URL: $WEBSITE_URL"
echo ""
echo "📝 Next steps:"
echo "1. Visit: $WEBSITE_URL"
echo "2. For HTTPS and custom domain, set up CloudFront"
echo "3. Update API endpoints if needed"

# Save deployment info
echo "BUCKET_NAME=$BUCKET_NAME" > deployment-info.txt
echo "WEBSITE_URL=$WEBSITE_URL" >> deployment-info.txt
echo "REGION=$REGION" >> deployment-info.txt

echo "💾 Deployment info saved to deployment-info.txt"
```

## Environment Configuration

Make sure your environment variables are set correctly:

### For Production API (AWS API Gateway)
```bash
# In your deployment environment
export NEXT_PUBLIC_API_BASE_URL=https://gm858vl0lh.execute-api.us-east-1.amazonaws.com/v1
export NEXT_PUBLIC_APP_ENV=production
```

### For Development/Testing (Mock API)
```bash
# For testing without backend
export NEXT_PUBLIC_API_BASE_URL=mock
export NEXT_PUBLIC_APP_ENV=development
```

## Testing the Deployment

After deployment, test these key features:

1. **Homepage**: Should load without errors
2. **Symptom Intake**: Form should submit (will use mock data if API not available)
3. **Episodes**: Should show cached/mock episodes
4. **Profile**: Should allow editing and saving locally
5. **Settings**: Should work with local storage
6. **Help**: Should display FAQ and support info
7. **Mobile**: Test on mobile devices for responsiveness

## Troubleshooting

### Common Issues:

1. **Build Errors**:
   ```bash
   # Clear cache and rebuild
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **API Connection Issues**:
   - Check CORS settings on your API Gateway
   - Verify API endpoints are accessible
   - Check browser console for errors

3. **Routing Issues**:
   - Ensure `trailingSlash: true` in next.config.js
   - Check that all routes have corresponding HTML files

4. **Performance Issues**:
   - Enable gzip compression on S3/CloudFront
   - Set proper cache headers
   - Optimize images and assets

## Monitoring

Set up monitoring for your deployed application:

1. **CloudWatch**: Monitor S3 and CloudFront metrics
2. **AWS X-Ray**: Trace API calls (if using AWS backend)
3. **Real User Monitoring**: Consider AWS CloudWatch RUM

## Security

1. **HTTPS**: Always use HTTPS in production (CloudFront provides this)
2. **CSP Headers**: Configure Content Security Policy
3. **API Security**: Ensure your API Gateway has proper authentication
4. **Data Privacy**: Review data handling for HIPAA compliance if needed

## Cost Optimization

1. **S3 Storage Class**: Use Standard for frequently accessed files
2. **CloudFront**: Use appropriate price class for your users
3. **Monitoring**: Set up billing alerts
4. **Cleanup**: Remove old deployments and unused resources

## Next Steps After Deployment

1. **Custom Domain**: Set up a custom domain with Route 53
2. **SSL Certificate**: Use AWS Certificate Manager for free SSL
3. **CDN Optimization**: Configure CloudFront for better performance
4. **Monitoring**: Set up CloudWatch dashboards
5. **CI/CD**: Automate deployments with GitHub Actions or AWS CodePipeline