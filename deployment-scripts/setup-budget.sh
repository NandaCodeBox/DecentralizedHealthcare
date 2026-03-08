#!/bin/bash

# Setup AWS Budget and Alerts for Arogya AI
# Email: nandhu.se@gmail.com

echo "💰 Setting up AWS Budget and Alerts"
echo "===================================="
echo ""

# Get AWS Account ID
echo "📋 Getting AWS Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to get AWS Account ID"
    echo "   Make sure you're logged in to AWS CLI"
    exit 1
fi

echo "✅ Account ID: $ACCOUNT_ID"
echo ""

# Create Budget
echo "💵 Creating Budget: ArogyaAI-Hackathon-Budget"
echo "   Budget Amount: \$15.00 USD"
echo "   Period: March 1 - April 30, 2026"
echo ""

aws budgets create-budget \
    --account-id $ACCOUNT_ID \
    --budget file://budget-config.json \
    --notifications-with-subscribers file://budget-notifications.json

if [ $? -eq 0 ]; then
    echo "✅ Budget created successfully!"
else
    echo "⚠️  Budget may already exist or there was an error"
    echo "   Trying to update existing budget..."
    
    # Try to update if it already exists
    aws budgets update-budget \
        --account-id $ACCOUNT_ID \
        --new-budget file://budget-config.json
    
    if [ $? -eq 0 ]; then
        echo "✅ Budget updated successfully!"
    fi
fi

echo ""
echo "📧 Email Alerts Configuration:"
echo "   Email: nandhu.se@gmail.com"
echo "   Alert 1: When cost reaches 80% of budget (\$12.00)"
echo "   Alert 2: When cost reaches 100% of budget (\$15.00)"
echo "   Alert 3: When forecasted to exceed budget"
echo ""

echo "⚠️  IMPORTANT: Check your email!"
echo "   AWS will send a confirmation email to: nandhu.se@gmail.com"
echo "   You MUST click the confirmation link to activate alerts!"
echo ""

# List all budgets
echo "📊 Current Budgets:"
aws budgets describe-budgets --account-id $ACCOUNT_ID --output table

echo ""
echo "✅ Budget setup complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Check email: nandhu.se@gmail.com"
echo "   2. Click confirmation link from AWS"
echo "   3. Monitor costs with: ./check-aws-costs.sh"
echo ""
