#!/bin/bash

# AWS Cost Checker for Arogya AI Healthcare Platform
# Usage: ./check-aws-costs.sh

echo "💰 AWS Cost Analysis - Arogya AI Healthcare Platform"
echo "======================================================"
echo ""

# Get today's date
TODAY=$(date +%Y-%m-%d)
WEEK_AGO=$(date -d '7 days ago' +%Y-%m-%d)
MONTH_START=$(date +%Y-%m-01)

echo "📅 Date Range: $WEEK_AGO to $TODAY"
echo ""

# Get cost for last 7 days
echo "📊 Last 7 Days Cost:"
aws ce get-cost-and-usage \
  --time-period Start=$WEEK_AGO,End=$TODAY \
  --granularity DAILY \
  --metrics BlendedCost \
  --output table

echo ""
echo "📊 Cost by Service (Last 7 Days):"
aws ce get-cost-and-usage \
  --time-period Start=$WEEK_AGO,End=$TODAY \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --output table

echo ""
echo "📊 Month-to-Date Cost:"
aws ce get-cost-and-usage \
  --time-period Start=$MONTH_START,End=$TODAY \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --output table

echo ""
echo "✅ Cost check complete!"
echo ""
echo "💡 Tip: Set up billing alerts at $15 to avoid surprises"
echo "   aws budgets create-budget --account-id 289892867722 --budget file://budget.json"
