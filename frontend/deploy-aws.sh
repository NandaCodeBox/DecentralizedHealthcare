#!/bin/bash
# AWS Deployment Script for Healthcare OS Frontend

set -e

echo "🚀 Deploying Healthcare OS Frontend to AWS..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm install
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    echo "❌ Build failed - 'out' directory not found"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    echo "   You need:"
    echo "   - AWS Access Key ID"
    echo "   - AWS Secret Access Key"
    echo "   - Default region (e.g., us-east-1)"
    exit 1
fi

# Create unique bucket name
TIMESTAMP=$(date +%s)
BUCKET_NAME="healthcare-os-frontend-$TIMESTAMP"
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

echo ""
echo "✅ Deployment complete!"
echo "🌍 Website URL: $WEBSITE_URL"
echo ""
echo "📝 Testing the deployment:"
echo "1. Opening website in browser..."

# Try to open in browser (works on macOS and some Linux)
if command -v open > /dev/null; then
    open "$WEBSITE_URL"
elif command -v xdg-open > /dev/null; then
    xdg-open "$WEBSITE_URL"
else
    echo "   Please manually open: $WEBSITE_URL"
fi

echo ""
echo "🔧 Next steps:"
echo "1. Test all pages and functionality"
echo "2. For HTTPS, set up CloudFront distribution"
echo "3. For custom domain, use Route 53"
echo "4. Monitor usage in AWS Console"

# Save deployment info
cat > deployment-info.txt << EOF
BUCKET_NAME=$BUCKET_NAME
WEBSITE_URL=$WEBSITE_URL
REGION=$REGION
DEPLOYED_AT=$(date)
EOF

echo ""
echo "💾 Deployment info saved to deployment-info.txt"
echo "🗑️  To delete this deployment later, run:"
echo "   aws s3 rb s3://$BUCKET_NAME --force"