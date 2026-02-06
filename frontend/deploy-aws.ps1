# AWS Deployment Script for Healthcare OS Frontend (PowerShell)

Write-Host "🚀 Deploying Healthcare OS Frontend to AWS..." -ForegroundColor Green

# Check if we're in the frontend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the frontend directory" -ForegroundColor Red
    exit 1
}

# Build the application
Write-Host "📦 Building application..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm run build failed" -ForegroundColor Red
    exit 1
}

# Check if build was successful
if (-not (Test-Path "out")) {
    Write-Host "❌ Build failed - 'out' directory not found" -ForegroundColor Red
    exit 1
}

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not configured"
    }
} catch {
    Write-Host "❌ AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor Red
    Write-Host "   You need:" -ForegroundColor Yellow
    Write-Host "   - AWS Access Key ID" -ForegroundColor Yellow
    Write-Host "   - AWS Secret Access Key" -ForegroundColor Yellow
    Write-Host "   - Default region (e.g., us-east-1)" -ForegroundColor Yellow
    exit 1
}

# Create unique bucket name
$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$bucketName = "healthcare-os-frontend-$timestamp"
$region = "us-east-1"

Write-Host "🪣 Creating S3 bucket: $bucketName" -ForegroundColor Yellow
aws s3 mb "s3://$bucketName" --region $region
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create S3 bucket" -ForegroundColor Red
    exit 1
}

Write-Host "🌐 Enabling static website hosting..." -ForegroundColor Yellow
aws s3 website "s3://$bucketName" --index-document index.html --error-document index.html
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to enable static website hosting" -ForegroundColor Red
    exit 1
}

Write-Host "📤 Uploading files..." -ForegroundColor Yellow
aws s3 sync out/ "s3://$bucketName" --delete
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload files" -ForegroundColor Red
    exit 1
}

Write-Host "🔓 Configuring bucket for public access..." -ForegroundColor Yellow

# First, disable Block Public Access settings
Write-Host "   Disabling Block Public Access..." -ForegroundColor Yellow
aws s3api put-public-access-block --bucket $bucketName --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to configure public access settings" -ForegroundColor Red
    exit 1
}

# Wait a moment for the settings to propagate
Start-Sleep -Seconds 3

# Now set the bucket policy
Write-Host "   Setting bucket policy..." -ForegroundColor Yellow
$policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$bucketName/*"
        }
    ]
}
"@

# Create temporary policy file for Windows compatibility
$tempPolicyFile = "temp-bucket-policy.json"
$policy | Out-File -FilePath $tempPolicyFile -Encoding UTF8

aws s3api put-bucket-policy --bucket $bucketName --policy "file://$tempPolicyFile"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set bucket policy" -ForegroundColor Red
    Remove-Item $tempPolicyFile -ErrorAction SilentlyContinue
    exit 1
}

# Clean up temporary file
Remove-Item $tempPolicyFile -ErrorAction SilentlyContinue

# Get website URL
$websiteUrl = "http://$bucketName.s3-website-$region.amazonaws.com"

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌍 Website URL: $websiteUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Testing the deployment:" -ForegroundColor Yellow
Write-Host "1. Opening website in browser..." -ForegroundColor Yellow

# Open in browser
Start-Process $websiteUrl

Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Yellow
Write-Host "1. Test all pages and functionality" -ForegroundColor White
Write-Host "2. For HTTPS, set up CloudFront distribution" -ForegroundColor White
Write-Host "3. For custom domain, use Route 53" -ForegroundColor White
Write-Host "4. Monitor usage in AWS Console" -ForegroundColor White

# Save deployment info
$deploymentInfo = @"
BUCKET_NAME=$bucketName
WEBSITE_URL=$websiteUrl
REGION=$region
DEPLOYED_AT=$(Get-Date)
"@

$deploymentInfo | Out-File -FilePath "deployment-info.txt" -Encoding UTF8

Write-Host ""
Write-Host "💾 Deployment info saved to deployment-info.txt" -ForegroundColor Green
Write-Host "🗑️  To delete this deployment later, run:" -ForegroundColor Yellow
Write-Host "   aws s3 rb s3://$bucketName --force" -ForegroundColor White