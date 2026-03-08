# Setup AWS Budget and Alerts for Arogya AI
# Email: nandhu.se@gmail.com

Write-Host "💰 Setting up AWS Budget and Alerts" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS Account ID
Write-Host "📋 Getting AWS Account ID..." -ForegroundColor Yellow
$accountId = aws sts get-caller-identity --query Account --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to get AWS Account ID" -ForegroundColor Red
    Write-Host "   Make sure you're logged in to AWS CLI" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Account ID: $accountId" -ForegroundColor Green
Write-Host ""

# Create Budget
Write-Host "💵 Creating Budget: ArogyaAI-Hackathon-Budget" -ForegroundColor Yellow
Write-Host "   Budget Amount: $15.00 USD" -ForegroundColor Yellow
Write-Host "   Period: March 1 - April 30, 2026" -ForegroundColor Yellow
Write-Host ""

aws budgets create-budget `
    --account-id $accountId `
    --budget file://budget-config.json `
    --notifications-with-subscribers file://budget-notifications.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Budget created successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Budget may already exist or there was an error" -ForegroundColor Yellow
    Write-Host "   Trying to update existing budget..." -ForegroundColor Yellow
    
    # Try to update if it already exists
    aws budgets update-budget `
        --account-id $accountId `
        --new-budget file://budget-config.json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Budget updated successfully!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📧 Email Alerts Configuration:" -ForegroundColor Cyan
Write-Host "   Email: nandhu.se@gmail.com" -ForegroundColor White
Write-Host "   Alert 1: When cost reaches 80% of budget ($12.00)" -ForegroundColor White
Write-Host "   Alert 2: When cost reaches 100% of budget ($15.00)" -ForegroundColor White
Write-Host "   Alert 3: When forecasted to exceed budget" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  IMPORTANT: Check your email!" -ForegroundColor Yellow
Write-Host "   AWS will send a confirmation email to: nandhu.se@gmail.com" -ForegroundColor Yellow
Write-Host "   You MUST click the confirmation link to activate alerts!" -ForegroundColor Yellow
Write-Host ""

# List all budgets
Write-Host "📊 Current Budgets:" -ForegroundColor Cyan
aws budgets describe-budgets --account-id $accountId --output table

Write-Host ""
Write-Host "✅ Budget setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Check email: nandhu.se@gmail.com" -ForegroundColor White
Write-Host "   2. Click confirmation link from AWS" -ForegroundColor White
Write-Host "   3. Monitor costs with: .\check-aws-costs.ps1" -ForegroundColor White
Write-Host ""
