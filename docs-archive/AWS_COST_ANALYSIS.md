# 💰 AWS Cost Analysis - Arogya AI Healthcare Platform

**Analysis Period**: March 8, 2026 - April 1, 2026 (24 days)  
**Region**: us-east-1  
**Account**: 289892867722

---

## 📊 Current Infrastructure

### Deployed Services
1. **S3** - Static website hosting (Frontend)
2. **API Gateway** - REST API
3. **Lambda** - Backend functions
4. **DynamoDB** - Database
5. **Cognito** - Authentication
6. **Bedrock** - AI (Claude)
7. **CloudFormation** - Infrastructure

---

## 💵 Cost Breakdown (24 Days)

### 1. S3 - Static Website Hosting

**Usage Estimate**:
- Storage: ~50 MB (frontend build)
- Requests: ~1,000 GET requests/day (demo + judges)
- Data Transfer: ~500 MB/day

**Costs**:
- Storage: $0.023/GB/month × 0.05 GB × 0.8 months = **$0.001**
- GET Requests: $0.0004/1,000 × 1,000 × 24 = **$0.01**
- Data Transfer: First 100 GB free = **$0.00**

**S3 Total**: **~$0.01/24 days**

---

### 2. API Gateway

**Usage Estimate**:
- API Calls: ~500 requests/day (testing + demo)
- Total: 12,000 requests

**Costs**:
- First 1M requests: $3.50/million
- 12,000 requests = **$0.04**

**API Gateway Total**: **~$0.04/24 days**

---

### 3. Lambda Functions

**Usage Estimate**:
- Invocations: ~500/day
- Duration: ~500ms average
- Memory: 512 MB

**Costs**:
- Invocations: First 1M free
- Compute: $0.0000166667/GB-second
- 12,000 invocations × 0.5s × 0.5GB = 3,000 GB-seconds
- 3,000 × $0.0000166667 = **$0.05**

**Lambda Total**: **~$0.05/24 days**

---

### 4. DynamoDB

**Usage Estimate**:
- Storage: ~1 GB
- Read/Write: ~1,000 operations/day
- On-Demand pricing

**Costs**:
- Storage: $0.25/GB/month × 1 GB × 0.8 months = **$0.20**
- Writes: $1.25/million × 0.012 million = **$0.015**
- Reads: $0.25/million × 0.012 million = **$0.003**

**DynamoDB Total**: **~$0.22/24 days**

---

### 5. Cognito

**Usage Estimate**:
- MAU (Monthly Active Users): 10 users (judges + testing)
- First 50,000 MAU free

**Costs**:
- **$0.00** (within free tier)

**Cognito Total**: **$0.00/24 days**

---

### 6. AWS Bedrock (Claude AI)

**Usage Estimate**:
- Model: Claude 3 Sonnet
- Tokens: ~50,000 tokens/day (testing + demo)
- Total: 1.2M tokens

**Costs**:
- Input: $3.00/million tokens
- Output: $15.00/million tokens
- Assuming 50/50 split:
  - Input: 600K × $3.00/1M = **$1.80**
  - Output: 600K × $15.00/1M = **$9.00**

**Bedrock Total**: **~$10.80/24 days**

⚠️ **This is the most expensive component!**

---

### 7. CloudFormation

**Costs**:
- **$0.00** (no charge for CloudFormation itself)

---

### 8. Data Transfer

**Usage Estimate**:
- Outbound: ~10 GB/month
- First 100 GB free

**Costs**:
- **$0.00** (within free tier)

---

## 💰 Total Cost Estimate

### 24-Day Cost Breakdown

| Service | Cost (24 days) |
|---------|----------------|
| S3 | $0.01 |
| API Gateway | $0.04 |
| Lambda | $0.05 |
| DynamoDB | $0.22 |
| Cognito | $0.00 |
| **Bedrock (AI)** | **$10.80** |
| CloudFormation | $0.00 |
| Data Transfer | $0.00 |
| **TOTAL** | **~$11.12** |

---

## 🎯 Cost Optimization Strategies

### Option 1: Keep Everything Running (Recommended)
**Cost**: **~$11.12** for 24 days

**Pros**:
- Always available for judges
- No downtime
- Full functionality

**Cons**:
- Highest cost (but still very low)

---

### Option 2: Reduce AI Usage
**Cost**: **~$2.00** for 24 days

**Strategy**:
- Use cached/mock AI responses for testing
- Only enable real AI for judge demos
- Reduce token usage by 80%

**Savings**: ~$9.00

**Implementation**:
```typescript
// In frontend/.env.production
NEXT_PUBLIC_USE_DEMO_API=true  // Use mock data
NEXT_PUBLIC_USE_REAL_AI=false  // Disable Bedrock
```

---

### Option 3: Scheduled Availability
**Cost**: **~$5.00** for 24 days

**Strategy**:
- Keep infrastructure running 24/7
- Only enable AI during specific hours (e.g., 9 AM - 6 PM EST)
- Use EventBridge to schedule Lambda functions

**Savings**: ~$6.00

---

### Option 4: Minimal Infrastructure
**Cost**: **~$0.50** for 24 days

**Strategy**:
- Keep only S3 + static frontend
- Disable backend API
- Use demo mode only

**Savings**: ~$10.50

**Cons**:
- No real AI functionality
- Demo mode only

---

## 📊 Cost Comparison

```
┌─────────────────────────────────────────────────┐
│         24-Day Cost Comparison                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Full Stack (Recommended)    $11.12 ████████   │
│  Reduced AI Usage            $2.00  ██          │
│  Scheduled Availability      $5.00  ████        │
│  Minimal (Demo Only)         $0.50  █           │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 💡 Recommended Approach

### **Option 1: Keep Everything Running**

**Total Cost**: **~$11.12** for 24 days

**Why?**
1. ✅ **Very affordable** - Less than $0.50/day
2. ✅ **Always available** for judges to test anytime
3. ✅ **Full functionality** - All AI features working
4. ✅ **Professional** - No downtime or limitations
5. ✅ **Peace of mind** - No need to manage schedules

**Cost Breakdown**:
- Infrastructure: $0.32 (S3, API Gateway, Lambda, DynamoDB)
- AI (Bedrock): $10.80
- **Total**: $11.12

---

## 🔍 Detailed AI Cost Analysis

### Bedrock Usage Scenarios

#### Scenario 1: Light Testing (Current)
- **Usage**: 50,000 tokens/day
- **24-day cost**: $10.80
- **Use case**: Occasional testing + judge demos

#### Scenario 2: Heavy Testing
- **Usage**: 200,000 tokens/day
- **24-day cost**: $43.20
- **Use case**: Continuous testing + multiple demos

#### Scenario 3: Demo Only
- **Usage**: 10,000 tokens/day
- **24-day cost**: $2.16
- **Use case**: Only during judge evaluations

---

## 💰 Cost Monitoring

### Set Up Billing Alerts

1. **AWS Budgets**:
   ```bash
   # Set budget alert at $15
   aws budgets create-budget \
     --account-id 289892867722 \
     --budget file://budget.json
   ```

2. **CloudWatch Alarms**:
   - Alert when cost > $10
   - Alert when cost > $15
   - Daily cost reports

3. **Cost Explorer**:
   - Monitor daily costs
   - Track service-by-service usage

---

## 📅 Timeline & Costs

### March 8 - April 1 (24 days)

| Week | Dates | Expected Cost |
|------|-------|---------------|
| Week 1 | Mar 8-14 | $4.63 |
| Week 2 | Mar 15-21 | $4.63 |
| Week 3 | Mar 22-28 | $4.63 |
| Week 4 | Mar 29-Apr 1 | $1.86 |
| **Total** | **24 days** | **~$15.75** |

**Note**: Includes buffer for unexpected usage

---

## 🎯 Cost Reduction Tips

### 1. Use Demo Mode for Testing
```typescript
// frontend/.env.local
NEXT_PUBLIC_USE_DEMO_API=true
```
**Savings**: ~$9/24 days

### 2. Cache AI Responses
- Store common queries in DynamoDB
- Reuse responses for similar symptoms
**Savings**: ~$5/24 days

### 3. Limit AI Token Length
```typescript
// Reduce max tokens in API calls
maxTokens: 500 // instead of 2000
```
**Savings**: ~$7/24 days

### 4. Use Cheaper AI Model
- Switch from Claude Sonnet to Claude Haiku
- Cost: $0.25/million tokens (vs $15/million)
**Savings**: ~$10/24 days

---

## 🚨 Cost Alerts Setup

### Recommended Alerts

1. **Daily Budget**: $0.50/day
2. **Weekly Budget**: $3.50/week
3. **Total Budget**: $15.00 (24 days)

### Alert Actions
- Email notification
- SMS notification (optional)
- Auto-disable Bedrock if > $20

---

## 📊 Free Tier Benefits

### Services with Free Tier (12 months)

1. **Lambda**: 1M requests/month free
2. **API Gateway**: 1M requests/month free (first 12 months)
3. **DynamoDB**: 25 GB storage free
4. **Cognito**: 50,000 MAU free
5. **S3**: 5 GB storage free (first 12 months)
6. **Data Transfer**: 100 GB/month free

**Your Usage**: Well within free tier for most services!

---

## 💡 Final Recommendation

### **Keep Everything Running - $11.12 for 24 days**

**Why this is the best choice**:

1. **Affordable**: Less than $0.50/day
2. **Professional**: Always available for judges
3. **Full Featured**: All AI functionality working
4. **No Management**: Set it and forget it
5. **Peace of Mind**: No risk of downtime during evaluation

### **If Budget is Tight**: Use Demo Mode

**Cost**: ~$0.50 for 24 days

**Trade-off**: No real AI, but all UI/UX works perfectly

---

## 🎯 Action Items

### Immediate Actions

1. ✅ **Set up billing alert** at $15
2. ✅ **Enable Cost Explorer**
3. ✅ **Monitor daily costs**
4. ⚠️ **Decide**: Full stack ($11) or Demo mode ($0.50)

### If Choosing Full Stack ($11.12)
```bash
# No changes needed - already deployed!
# Just monitor costs daily
```

### If Choosing Demo Mode ($0.50)
```bash
# Update frontend environment
cd frontend
echo "NEXT_PUBLIC_USE_DEMO_API=true" >> .env.production
npm run build
aws s3 sync out/ s3://arogya-ai-healthcare-20260308102925 --delete
```

---

## 📞 Cost Monitoring Commands

### Check Current Costs
```bash
# Get cost for last 7 days
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-08 \
  --granularity DAILY \
  --metrics BlendedCost

# Get cost by service
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-08 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

---

## 🎉 Summary

### **Recommended: Full Stack**

**Total Cost**: **$11.12** for 24 days (March 8 - April 1)

**Daily Cost**: **$0.46/day**

**Cost Breakdown**:
- Infrastructure: $0.32 (3%)
- AI (Bedrock): $10.80 (97%)

**Verdict**: **Very affordable for a hackathon demo!**

### **Budget Option: Demo Mode**

**Total Cost**: **$0.50** for 24 days

**Trade-off**: No real AI, but perfect for UI/UX demonstration

---

## 🏆 Bottom Line

For **less than $12**, you can keep your entire application running with full AI functionality for 24 days until the hackathon winners are announced!

**This is incredibly affordable** and ensures judges can test your application anytime without any limitations.

**Recommendation**: **Keep everything running** - it's worth the $11!

---

**Cost Analysis Date**: March 8, 2026  
**Analysis Period**: 24 days (March 8 - April 1)  
**Confidence Level**: High (based on current usage patterns)
