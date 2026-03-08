#!/bin/bash

# Arogya AI - S3 + CloudFront Deployment Script
# This deploys the frontend to AWS S3 with CloudFront CDN

BUCKET_NAME="arogya-ai-healthcare-$(date +%s)"
REGION="us-east-1"

echo "🚀 Deploying Arogya AI to AWS S3 + CloudFront..."
echo "================================================"

# Create S3 bucket
echo "📦 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Enable static website hosting
echo "🌐 Enabling static website hosting..."
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

# Upload files
echo "📤 Uploading frontend files..."
aws s3 sync frontend/out/ s3://$BUCKET_NAME --delete

# Set public read permissions
echo "🔓 Setting public read permissions..."
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"PublicReadGetObject\",
      \"Effect\": \"Allow\",
      \"Principal\": \"*\",
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
    }]
  }"

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

echo ""
echo "✅ Deployment Complete!"
echo "================================================"
echo "🌐 Website URL: $WEBSITE_URL"
echo "📦 S3 Bucket: $BUCKET_NAME"
echo ""
echo "🎯 Next Steps:"
echo "1. Visit: $WEBSITE_URL"
echo "2. Test all 3 use cases"
echo "3. Optional: Add CloudFront CDN for HTTPS and faster loading"
echo ""
