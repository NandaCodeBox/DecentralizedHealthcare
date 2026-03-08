# Arogya AI - S3 + CloudFront Deployment Script (PowerShell)
# This deploys the frontend to AWS S3 with static website hosting

$BUCKET_NAME = "arogya-ai-healthcare-$(Get-Date -Format 'yyyyMMddHHmmss')"
$REGION = "us-east-1"

Write-Host "🚀 Deploying Arogya AI to AWS S3..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Create S3 bucket
Write-Host "📦 Creating S3 bucket: $BUCKET_NAME" -ForegroundColor Yellow
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Enable static website hosting
Write-Host "🌐 Enabling static website hosting..." -ForegroundColor Yellow
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Upload files
Write-Host "📤 Uploading frontend files..." -ForegroundColor Yellow
aws s3 sync frontend/out/ s3://$BUCKET_NAME --delete

# Set public read permissions
Write-Host "🔓 Setting public read permissions..." -ForegroundColor Yellow
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
  }]
}
"@

$policy | Out-File -FilePath "bucket-policy.json" -Encoding utf8
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
Remove-Item "bucket-policy.json"

# Get website URL
$WEBSITE_URL = "http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "🌐 Website URL: $WEBSITE_URL" -ForegroundColor Cyan
Write-Host "📦 S3 Bucket: $BUCKET_NAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Visit: $WEBSITE_URL"
Write-Host "2. Test all 3 use cases"
Write-Host "3. Optional: Add CloudFront CDN for HTTPS"
Write-Host ""
