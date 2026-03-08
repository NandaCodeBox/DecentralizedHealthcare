# AWS Cost Checker for Arogya AI Healthcare Platform
# Usage: .\check-aws-costs.ps1

Write-Host "💰 AWS Cost Analysis - Arogya AI Healthcare Platform" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Get dates
$today = Get-Date -Format "yyyy-MM-dd"
$weekAgo = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
$monthStart = Get-Date -Format "yyyy-MM-01"

Write-Host "📅 Date Range: $weekAgo to $today" -ForegroundColor Yellow
Write-Host ""

# Get cost for last 7 days
Write-Host "📊 Last 7 Days Cost:" -ForegroundColor Green
aws ce get-cost-and-usage `
  --time-period Start=$weekAgo,End=$today `
  --granularity DAILY `
  --metrics BlendedCost `
  --output table

Write-Host ""
Write-Host "📊 Cost by Service (Last 7 Days):" -ForegroundColor Green
aws ce get-cost-and-usage `
  --time-period Start=$weekAgo,End=$today `
  --granularity DAILY `
  --metrics BlendedCost `
  --group-by Type=SERVICE `
  --output table

Write-Host ""
Write-Host "📊 Month-to-Date Cost:" -ForegroundColor Green
aws ce get-cost-and-usage `
  --time-period Start=$monthStart,End=$today `
  --granularity MONTHLY `
  --metrics BlendedCost `
  --output table

Write-Host ""
Write-Host "✅ Cost check complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Set up billing alerts at `$15 to avoid surprises" -ForegroundColor Yellow
Write-Host "   aws budgets create-budget --account-id 289892867722 --budget file://budget.json"
