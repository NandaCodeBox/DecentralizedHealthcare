# Healthcare Orchestration System Deployment Script (PowerShell)

Write-Host "🏥 Healthcare Orchestration System - Deployment Script" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green

# Check if AWS CLI is configured
try {
    $account = aws sts get-caller-identity --query Account --output text
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI error"
    }
} catch {
    Write-Host "❌ AWS CLI is not configured or credentials are invalid" -ForegroundColor Red
    Write-Host "Please run 'aws configure' to set up your credentials" -ForegroundColor Yellow
    exit 1
}

# Get AWS region
$region = $env:AWS_DEFAULT_REGION
if (-not $region) {
    $region = "us-east-1"
}

Write-Host "📋 Deployment Configuration:" -ForegroundColor Cyan
Write-Host "   Account: $account" -ForegroundColor White
Write-Host "   Region: $region" -ForegroundColor White
Write-Host ""

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Build the project
Write-Host "🔨 Building TypeScript project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}

# Bootstrap CDK if needed
Write-Host "🚀 Bootstrapping CDK (if needed)..." -ForegroundColor Yellow
npx cdk bootstrap "aws://$account/$region"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CDK bootstrap failed" -ForegroundColor Red
    exit 1
}

# Deploy the stack
Write-Host "🏗️  Deploying Healthcare Orchestration Stack..." -ForegroundColor Yellow
npx cdk deploy --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check the AWS Console for deployed resources" -ForegroundColor White
Write-Host "   2. Note the API Gateway URL from the stack outputs" -ForegroundColor White
Write-Host "   3. Configure your frontend to use the API endpoints" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "   - View stack: npx cdk ls" -ForegroundColor White
Write-Host "   - Check diff: npx cdk diff" -ForegroundColor White
Write-Host "   - Destroy stack: npx cdk destroy" -ForegroundColor White