# PowerShell script to retrieve AWS Cognito configuration from CloudFormation stack
# Usage: .\get-cognito-config.ps1

$STACK_NAME = "HealthcareOSStack"
$REGION = "us-east-1"

Write-Host "🔍 Retrieving Cognito configuration from AWS..." -ForegroundColor Cyan
Write-Host "Stack: $STACK_NAME"
Write-Host "Region: $REGION"
Write-Host ""

# Get User Pool ID
try {
    $USER_POOL_ID = (aws cloudformation describe-stacks `
        --stack-name $STACK_NAME `
        --region $REGION `
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" `
        --output text 2>$null)
} catch {
    $USER_POOL_ID = $null
}

# Get User Pool Client ID
try {
    $CLIENT_ID = (aws cloudformation describe-stacks `
        --stack-name $STACK_NAME `
        --region $REGION `
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" `
        --output text 2>$null)
} catch {
    $CLIENT_ID = $null
}

# Get API Gateway URL
try {
    $API_URL = (aws cloudformation describe-stacks `
        --stack-name $STACK_NAME `
        --region $REGION `
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
        --output text 2>$null)
} catch {
    $API_URL = $null
}

if ([string]::IsNullOrWhiteSpace($USER_POOL_ID) -or [string]::IsNullOrWhiteSpace($CLIENT_ID)) {
    Write-Host "❌ Could not retrieve Cognito configuration from CloudFormation" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    Write-Host ""
    
    # Try to list user pools directly
    try {
        $USER_POOL_ID = (aws cognito-idp list-user-pools --max-results 10 --region $REGION `
            --query "UserPools[?Name=='HealthcareOSUserPool'].Id" --output text 2>$null)
        
        if (-not [string]::IsNullOrWhiteSpace($USER_POOL_ID)) {
            # Get client ID from user pool
            $CLIENT_ID = (aws cognito-idp list-user-pool-clients `
                --user-pool-id $USER_POOL_ID `
                --region $REGION `
                --query "UserPoolClients[0].ClientId" `
                --output text 2>$null)
        }
    } catch {
        Write-Host "❌ Failed to retrieve configuration" -ForegroundColor Red
    }
}

if ([string]::IsNullOrWhiteSpace($API_URL)) {
    $API_URL = "https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1"
}

Write-Host "✅ Configuration Retrieved:" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "Add these to your frontend/.env.local file:"
Write-Host ""
Write-Host "# API Configuration"
Write-Host "NEXT_PUBLIC_API_BASE_URL=$API_URL"
Write-Host ""
Write-Host "# AWS Cognito Configuration"
Write-Host "NEXT_PUBLIC_AWS_REGION=$REGION"
Write-Host "NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID"
Write-Host "NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"
Write-Host ""
Write-Host "# Mode Selection (set to false to enable authentication)"
Write-Host "NEXT_PUBLIC_USE_DEMO_API=false"
Write-Host "NEXT_PUBLIC_USE_MOCK_API=false"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Create .env.local file
$ENV_FILE = "frontend\.env.local"
Write-Host "📝 Creating $ENV_FILE..." -ForegroundColor Cyan
Write-Host ""

$envContent = @"
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
"@

$envContent | Out-File -FilePath $ENV_FILE -Encoding UTF8

Write-Host "✅ Configuration saved to $ENV_FILE" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Install dependencies: cd frontend; npm install"
Write-Host "2. Create a test user:"
Write-Host "   aws cognito-idp admin-create-user \"
Write-Host "     --user-pool-id $USER_POOL_ID \"
Write-Host "     --username testuser \"
Write-Host "     --user-attributes Name=email,Value=test@example.com \"
Write-Host "     --temporary-password TempPass123! \"
Write-Host "     --region $REGION"
Write-Host ""
Write-Host "3. Set permanent password:"
Write-Host "   aws cognito-idp admin-set-user-password \"
Write-Host "     --user-pool-id $USER_POOL_ID \"
Write-Host "     --username testuser \"
Write-Host "     --password SecurePass123! \"
Write-Host "     --permanent \"
Write-Host "     --region $REGION"
Write-Host ""
Write-Host "4. Build and test: npm run build"
Write-Host ""
