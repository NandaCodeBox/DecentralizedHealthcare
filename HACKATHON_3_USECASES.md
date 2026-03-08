# 3 Core User Flows for Hackathon Demo

**Target**: End-to-end implementation showcasing AI-powered healthcare orchestration

---

## 🎯 Use Case 1: AI-Powered Symptom Triage (Primary Flow)

### User Story
**As a patient with symptoms, I want AI to assess my condition and recommend the best facility, so I can get appropriate care quickly.**

### Flow
```
Patient → Symptom Intake → AI Triage → Facility Recommendation → Book Appointment
```

### Screens Involved
1. **Homepage** (`/`)
   - Click "Tell Us Your Symptoms" card

2. **Symptom Intake** (`/symptom-intake`)
   - Select symptoms (Fever, Headache, etc.)
   - Rate severity (1-10)
   - Enter duration
   - Add additional info
   - Click "Get AI Triage Assessment"

3. **Triage Dashboard** (`/triage-dashboard`)
   - View AI assessment (87% confidence)
   - See severity level (Moderate)
   - View recommended facilities with AI match scores:
     - City General Hospital (95% match)
     - Prime Care Clinic (92% match)
     - QuickCare Medical (88% match)
   - Click "Book Appointment"

### AI Features Demonstrated
- ✨ **AI Symptom Analysis** (Amazon Bedrock/Claude)
- ✨ **Confidence Scoring** (87%)
- ✨ **Facility Matching** (95%, 92%, 88%)
- ✨ **AI Reasoning** ("Best match for moderate symptoms...")

### Backend APIs Required
```
POST /v1/symptoms
  → Stores symptoms in DynamoDB
  
POST /v1/triage
  → Invokes AI Triage Lambda
  → Calls Amazon Bedrock (Claude)
  → Returns assessment + confidence

GET /v1/facilities?lat=X&lng=Y&severity=moderate
  → Returns ranked facilities
  → AI match scoring
```

### Demo Script (2 minutes)
1. "Patient has fever and headache for 2 days"
2. Fill symptom form → Submit
3. Show AI processing animation
4. Display triage results with 87% confidence
5. Show 3 facilities ranked by AI (95%, 92%, 88%)
6. Highlight AI reasoning for each facility
7. Click "Book Appointment"

### Success Metrics
- ✅ AI assessment completes in < 3 seconds
- ✅ Confidence score displayed
- ✅ 3 facilities recommended with match scores
- ✅ AI reasoning shown for each facility

---

## 🎯 Use Case 2: AI Semantic Provider Search

### User Story
**As a patient, I want to search for doctors using natural language, so I can find the right specialist without knowing medical terminology.**

### Flow
```
Patient → Natural Language Search → AI Matches Providers → View Results → Book
```

### Screens Involved
1. **Homepage** (`/`)
   - Click "Find Provider with AI" card

2. **Provider Search** (`/provider-search`)
   - Type natural language query:
     - "I have chest pain and shortness of breath"
     - "Need a pediatrician for my child"
     - "Looking for a cardiologist near me"
   - Click "AI Search"
   - View AI suggestions (specialties)
   - See providers ranked by AI relevance:
     - Dr. Sarah Johnson (95% match)
     - Dr. Rajesh Kumar (88% match)
     - Dr. Priya Sharma (92% match)
   - View AI reasoning for each match
   - Click "Book Appointment"

### AI Features Demonstrated
- ✨ **Semantic Search** (understands intent)
- ✨ **AI Specialty Recommendations**
- ✨ **Provider Ranking** (95%, 88%, 92%)
- ✨ **Match Reasoning** ("Best match for general symptoms...")
- ✨ **Natural Language Processing**

### Backend APIs Required
```
POST /v1/providers/search
  → Input: Natural language query
  → AI analyzes query
  → Extracts symptoms/intent
  → Returns specialty recommendations

GET /v1/providers?specialty=X&lat=Y&lng=Z
  → Returns ranked providers
  → AI match scoring
  → Availability status
```

### Demo Script (2 minutes)
1. "Patient types: 'I have chest pain and shortness of breath'"
2. Show AI processing
3. Display AI specialty suggestions:
   - Cardiologist (primary)
   - Emergency Medicine
   - Internal Medicine
4. Show 3 providers with match scores
5. Highlight AI reasoning for each
6. Show availability and ratings
7. Click "Book Appointment"

### Success Metrics
- ✅ AI understands natural language query
- ✅ Suggests relevant specialties
- ✅ Ranks providers by relevance
- ✅ Shows AI reasoning for matches

---

## 🎯 Use Case 3: Human-in-the-Loop Validation (Supervisor Dashboard)

### User Story
**As a healthcare supervisor, I want to review AI triage decisions that need validation, so I can ensure patient safety and improve AI accuracy.**

### Flow
```
AI Flags Case → Supervisor Reviews → Approves/Overrides → Patient Notified
```

### Screens Involved
1. **Homepage** (`/`)
   - Click "Supervisor Dashboard" (in Dashboards & Tools)

2. **Supervisor Dashboard** (`/supervisor-dashboard`)
   - View pending validations queue
   - See cases flagged by AI:
     - Low confidence (< 70%)
     - Conflicting symptoms
     - Emergency escalations
   - Review case details:
     - Patient symptoms
     - AI assessment
     - Confidence score
     - Recommended action
   - Actions:
     - ✅ Approve AI decision
     - ⚠️ Override with different urgency
     - 🚨 Escalate to emergency
     - 💬 Request more information

3. **Case Detail View**
   - Full symptom history
   - AI reasoning
   - Confidence breakdown
   - Alternative assessments
   - Supervisor notes

### AI Features Demonstrated
- ✨ **Confidence Thresholds** (flags < 70%)
- ✨ **Human Oversight** (safety mechanism)
- ✨ **AI Transparency** (shows reasoning)
- ✨ **Learning Loop** (supervisor feedback improves AI)
- ✨ **Emergency Detection** (auto-escalation)

### Backend APIs Required
```
GET /v1/validation/queue
  → Returns cases needing review
  → Sorted by urgency/confidence

GET /v1/validation/:caseId
  → Full case details
  → AI assessment
  → Patient history

POST /v1/validation/:caseId/approve
  → Supervisor approves AI decision

POST /v1/validation/:caseId/override
  → Supervisor overrides with new assessment
  → Triggers notification to patient
```

### Demo Script (2 minutes)
1. "AI assessed a case with 65% confidence (below threshold)"
2. Show validation queue with 3 pending cases
3. Click on case to review:
   - Patient: "Chest pain, dizziness, sweating"
   - AI Assessment: "Urgent - within 4 hours"
   - Confidence: 65%
   - AI Reasoning: "Symptoms suggest cardiac concern but incomplete data"
4. Supervisor reviews and decides:
   - Override to "Emergency - immediate"
   - Add note: "Cardiac symptoms require immediate attention"
5. Show notification sent to patient
6. Case moved to "Completed" queue

### Success Metrics
- ✅ Low confidence cases flagged automatically
- ✅ Supervisor can review AI reasoning
- ✅ Override functionality works
- ✅ Patient notified of decision
- ✅ Feedback loop for AI improvement

---

## 📊 Implementation Status

### Use Case 1: AI Symptom Triage
**Status**: ✅ 90% Complete (Frontend Done, Backend Needs Deployment)

**What's Working**:
- ✅ Symptom intake form
- ✅ AI processing animation
- ✅ Triage dashboard with results
- ✅ Facility recommendations with AI scores
- ✅ AI reasoning display

**What's Needed**:
- ⏳ Deploy backend Lambda functions
- ⏳ Connect to Amazon Bedrock
- ⏳ Wire up API endpoints

### Use Case 2: AI Provider Search
**Status**: ✅ 90% Complete (Frontend Done, Backend Needs Deployment)

**What's Working**:
- ✅ Natural language search input
- ✅ AI processing animation
- ✅ Specialty suggestions
- ✅ Provider cards with match scores
- ✅ AI reasoning display

**What's Needed**:
- ⏳ Deploy backend Lambda functions
- ⏳ Implement semantic search logic
- ⏳ Wire up API endpoints

### Use Case 3: Supervisor Dashboard
**Status**: ⚠️ 60% Complete (Basic UI, Needs Full Implementation)

**What's Working**:
- ✅ Basic dashboard layout
- ✅ Metrics display

**What's Needed**:
- ⏳ Validation queue UI
- ⏳ Case detail view
- ⏳ Approve/Override actions
- ⏳ Deploy backend Lambda functions
- ⏳ Wire up API endpoints

---

## 🚀 Quick Implementation Plan (For Hackathon)

### Phase 1: Complete Use Case 3 Frontend (2 hours)
```bash
# Create validation queue UI
# Add case detail view
# Add approve/override buttons
# Add notification system
```

### Phase 2: Deploy Backend (1 hour)
```bash
# Clean up failed stack
aws cloudformation delete-stack --stack-name HealthcareOrchestrationStack
aws cloudformation wait stack-delete-complete --stack-name HealthcareOrchestrationStack

# Deploy
npx cdk deploy --all --require-approval never

# Note API Gateway URL
```

### Phase 3: Connect Frontend to Backend (1 hour)
```bash
# Update API configuration
# Test all 3 flows
# Fix any issues
```

### Phase 4: Deploy Frontend to AWS (30 minutes)
```bash
# Deploy to Amplify
# Configure environment variables
# Test live deployment
```

### Phase 5: Prepare Demo (30 minutes)
```bash
# Create demo data
# Practice demo script
# Prepare talking points
```

**Total Time**: ~5 hours

---

## 🎬 Demo Presentation Flow (10 minutes)

### Introduction (1 minute)
"We built an AI-powered healthcare orchestration system that helps patients get the right care at the right time using Amazon Bedrock and AWS services."

### Use Case 1: AI Triage (3 minutes)
1. Show symptom intake
2. Demonstrate AI assessment
3. Highlight facility recommendations
4. Emphasize AI confidence and reasoning

### Use Case 2: Semantic Search (3 minutes)
1. Show natural language search
2. Demonstrate AI understanding
3. Highlight provider matching
4. Show AI reasoning

### Use Case 3: Human Oversight (2 minutes)
1. Show supervisor dashboard
2. Demonstrate validation queue
3. Highlight human-in-the-loop safety
4. Show override capability

### Conclusion (1 minute)
"Our system combines AI efficiency with human oversight to ensure safe, accurate, and accessible healthcare for everyone."

---

## 💡 Key Talking Points

### Technical Innovation
- ✨ Amazon Bedrock (Claude 3 Haiku) for AI triage
- ✨ Semantic search with natural language processing
- ✨ Multi-factor AI ranking algorithm
- ✨ Human-in-the-loop for safety
- ✨ Real-time confidence scoring

### Business Impact
- 📈 Reduces wait times by matching patients to right care
- 💰 Lowers costs by preventing unnecessary ER visits
- 🎯 Improves outcomes with accurate triage
- 🌍 Scales to serve millions of patients
- 🔒 Maintains safety with human oversight

### AWS Services Used
- Amazon Bedrock (AI/ML)
- Lambda (Serverless compute)
- DynamoDB (Database)
- API Gateway (REST API)
- Step Functions (Orchestration)
- SNS (Notifications)
- Amplify (Frontend hosting)
- CloudWatch (Monitoring)

---

## 📝 Next Steps

1. **Complete Supervisor Dashboard UI** (Use Case 3)
2. **Deploy Backend to AWS**
3. **Connect Frontend to Backend APIs**
4. **Test All 3 Flows End-to-End**
5. **Deploy Frontend to Amplify**
6. **Prepare Demo Script**
7. **Practice Presentation**

---

**Ready to implement?** Let's start with completing the Supervisor Dashboard UI!
