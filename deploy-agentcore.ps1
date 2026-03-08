# Deploy All Three AWS Bedrock AgentCore Agents
# Run this script to deploy the complete Agentic AI system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Bedrock AgentCore Deployment" -ForegroundColor Cyan
Write-Host "Three Autonomous AI Agents" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Add AgentCore to PATH
$env:PATH += ";C:\Users\Nanda\AppData\Roaming\Python\Python313\Scripts"

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
$awsCheck = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ AWS credentials configured" -ForegroundColor Green
} else {
    Write-Host "✗ AWS credentials not configured" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Agent 1: Supervisor Validation Agent" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cd agents/supervisor-validation-agent

Write-Host "Deploying supervisor-validation-agent..." -ForegroundColor Yellow
agentcore deploy --name supervisor-validation-agent --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Agent 1 deployed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Agent 1 deployment failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Agent 2: Care Pathway Orchestrator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cd ../care-pathway-agent

Write-Host "Deploying care-pathway-agent..." -ForegroundColor Yellow
agentcore deploy --name care-pathway-agent --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Agent 2 deployed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Agent 2 deployment failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Agent 3: Clinical Decision Support" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

cd ../clinical-decision-agent

Write-Host "Deploying clinical-decision-agent..." -ForegroundColor Yellow
agentcore deploy --name clinical-decision-agent --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Agent 3 deployed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Agent 3 deployment failed" -ForegroundColor Red
}

cd ../..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test agents with: agentcore invoke <agent-name> '<json-payload>'" -ForegroundColor White
Write-Host "2. Check status with: agentcore status" -ForegroundColor White
Write-Host "3. View logs in CloudWatch" -ForegroundColor White
Write-Host ""
Write-Host "Agent Endpoints:" -ForegroundColor Yellow
Write-Host "- supervisor-validation-agent" -ForegroundColor White
Write-Host "- care-pathway-agent" -ForegroundColor White
Write-Host "- clinical-decision-agent" -ForegroundColor White
