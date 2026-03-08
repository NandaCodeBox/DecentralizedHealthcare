# AI Recommendation Logic - Healthcare Orchestration System

## Overview
The system uses **multi-factor AI-powered recommendations** combining rule-based logic, machine learning, and real-time data to match patients with the best care options.

---

## 🤖 AI Triage Assessment (Symptom Analysis)

### Model Used
- **Amazon Bedrock** with **Claude 3 Haiku**
- Temperature: 0.1 (low for consistent medical assessment)
- Max tokens: 500

### Input Factors
1. **Primary Complaint** - Main symptom reported
2. **Duration** - How long symptoms have persisted
3. **Severity Score** - Patient-rated 1-10 scale
4. **Associated Symptoms** - Additional symptoms
5. **Rule-Based Assessment** - Initial automated triage result

### AI Assessment Process
```
Patient Symptoms → Rule-Based Triage → AI Review → Final Assessment
```

The AI:
1. Reviews symptoms and rule-based assessment
2. Considers clinical factors rules might miss
3. Validates urgency level appropriateness
4. Provides confidence score (0-100%)
5. Gives clinical reasoning

### Output
- **Confidence Score**: 0-100% (how certain the AI is)
- **Urgency Level**: Emergency | Urgent | Routine | Self-Care
- **Clinical Reasoning**: Why this assessment was made
- **Agreement Status**: Does AI agree with rule-based assessment?

---

## 🏥 Facility Recommendations (Where to Go)

### Recommendation Factors

#### 1. **Symptom Severity Match** (30%)
- Emergency symptoms → Emergency Room
- Urgent symptoms → Urgent Care / Hospital
- Routine symptoms → Clinic / Primary Care
- Minor symptoms → Telemedicine / Walk-in

#### 2. **Distance & Location** (25%)
- Calculated using GPS coordinates
- Closer facilities ranked higher
- Maximum distance preference considered

#### 3. **Wait Time** (20%)
- Real-time facility load data
- Current capacity vs. maximum capacity
- Historical wait time patterns
- Time of day adjustments

#### 4. **Facility Capabilities** (15%)
- Has required specialties
- Has necessary equipment
- Emergency department availability
- 24/7 operation status

#### 5. **Quality Metrics** (10%)
- Patient ratings (1-5 stars)
- Success rates
- Cleanliness scores
- Staff qualifications

### AI Match Score Calculation
```
AI Match = (Severity Match × 0.30) + 
           (Distance Score × 0.25) + 
           (Wait Time Score × 0.20) + 
           (Capability Match × 0.15) + 
           (Quality Rating × 0.10)
```

### Example
**Patient with moderate fever:**
- City General Hospital: 95% match
  - ✅ Has GP available (capability)
  - ✅ 2.3 km away (close)
  - ✅ 2-4 hour wait (reasonable)
  - ✅ 4.8 rating (high quality)
  - ✅ Matches moderate severity

---

## 👨‍⚕️ Provider Recommendations (Which Doctor)

### Ranking Algorithm (100-point scale)

#### 1. **Active Status** (10 points)
- Provider must be actively practicing

#### 2. **Quality Rating** (25 points)
- Based on patient reviews (0-5 stars)
- Converted to 0-25 point scale
- Formula: `(rating / 5) × 25`

#### 3. **Availability** (20 points)
- Current load < 50%: 20 points (excellent)
- Current load 50-70%: 15 points (good)
- Current load 70-85%: 10 points (moderate)
- Current load 85-95%: 5 points (limited)
- Current load > 95%: 0 points (unavailable)

#### 4. **Specialty Match** (15 points)
- Exact specialty match: Full points
- Partial match: Proportional points
- No match: 0 points

#### 5. **Cost Compatibility** (10 points)
- Within budget: Higher score
- Formula: `(1 - cost/maxBudget) × 10`
- Over budget: 0 points

#### 6. **Insurance Acceptance** (10 points)
- Accepts patient's insurance: Full points
- Partial acceptance: Proportional
- No acceptance: 0 points

#### 7. **Language Compatibility** (5 points)
- Speaks patient's language: Full points
- Partial match: Proportional

#### 8. **Distance Bonus** (5 points)
- Closer providers get higher scores
- Formula: `max(0, 5 - (distance/maxDistance) × 5)`

### Wait Time Estimation
```
Estimated Wait = Base Wait Time × Load Multiplier

Load Multipliers:
- Load < 50%: 1.0× (normal)
- Load 50-70%: 1.2× (slightly longer)
- Load 70-85%: 1.5× (50% longer)
- Load 85-95%: 2.0× (double)
- Load > 95%: Unavailable
```

---

## 🔍 AI Semantic Search (Natural Language)

### How It Works
When you type: **"I have chest pain and shortness of breath"**

1. **AI analyzes the query** for:
   - Medical keywords (chest pain, shortness of breath)
   - Urgency indicators (severe, sudden, chronic)
   - Context clues (duration, intensity)

2. **AI suggests specialties**:
   - Cardiologist (primary match)
   - Emergency Medicine (if urgent)
   - Internal Medicine (general assessment)

3. **Providers are ranked** by:
   - Specialty relevance to symptoms
   - Experience with similar cases
   - Availability for urgent cases
   - Patient ratings for that specialty

### AI Match Reasoning Examples
- **95% Match**: "Best match for general symptoms and immediate availability"
- **92% Match**: "Closest location with shorter wait time for non-emergency care"
- **88% Match**: "Highly rated specialist with extensive experience"

---

## 📊 Real-Time Data Integration

### Live Factors Considered
1. **Current Facility Load**
   - Number of patients waiting
   - Staff availability
   - Bed/room availability

2. **Provider Schedules**
   - Current appointments
   - Break times
   - Emergency availability

3. **Geographic Data**
   - Traffic conditions
   - Distance calculations
   - Facility accessibility

4. **Historical Patterns**
   - Typical wait times by hour
   - Seasonal trends
   - Day-of-week patterns

---

## 🎯 Confidence Scoring

### AI Confidence Levels
- **90-100%**: High confidence - Clear symptom patterns
- **70-89%**: Good confidence - Standard cases
- **50-69%**: Moderate confidence - Ambiguous symptoms
- **Below 50%**: Low confidence - Recommends human review

### When AI Defers to Humans
- Conflicting symptoms
- Rare conditions
- Complex medical history
- Patient safety concerns

---

## 🔐 Safety Mechanisms

### Human-in-the-Loop
1. **Emergency Detection**: Immediate escalation
2. **Low Confidence**: Supervisor review required
3. **Conflicting Assessments**: Human validation
4. **Patient Override**: Can request human review anytime

### Validation Rules
- AI recommendations must pass safety checks
- Emergency symptoms trigger immediate alerts
- All assessments logged for audit
- Confidence thresholds enforced

---

## 📈 Continuous Learning

### System Improvements
1. **Outcome Tracking**: Did patient get appropriate care?
2. **Wait Time Accuracy**: Were estimates correct?
3. **Match Quality**: Did provider meet patient needs?
4. **Patient Feedback**: Satisfaction ratings

### Model Updates
- Regular retraining with new data
- Seasonal pattern adjustments
- Regional customization
- Specialty-specific tuning

---

## 💡 Example Scenarios

### Scenario 1: Moderate Fever
**Input**: Fever (102°F), headache, 2 days duration
**AI Assessment**: 
- Urgency: Routine (within 24 hours)
- Confidence: 87%
- Recommendation: General Practitioner

**Facility Match**:
1. City General Hospital (95%) - Has GP, close, available
2. Prime Care Clinic (92%) - Closer, shorter wait
3. QuickCare Medical (88%) - Fast service, urgent care

### Scenario 2: Chest Pain
**Input**: Chest pain, shortness of breath, sudden onset
**AI Assessment**:
- Urgency: EMERGENCY
- Confidence: 98%
- Recommendation: Emergency Room immediately

**Facility Match**:
1. Emergency Hospital (99%) - Closest ER, cardiac unit
2. City General ER (95%) - Full cardiac capabilities
3. Urgent Care (70%) - Can stabilize, will transfer

### Scenario 3: Routine Checkup
**Input**: Annual physical, no symptoms
**AI Assessment**:
- Urgency: Routine (within 2 weeks)
- Confidence: 95%
- Recommendation: Primary Care Physician

**Provider Match**:
1. Dr. Sarah Johnson (95%) - Available, accepts insurance
2. Dr. Rajesh Kumar (88%) - Highly rated, slightly farther
3. Dr. Priya Sharma (85%) - Good availability, new patients

---

## 🚀 Future Enhancements

### Planned Improvements
1. **Predictive Analytics**: Anticipate health issues
2. **Personalization**: Learn patient preferences
3. **Multi-language Support**: Better language matching
4. **Telemedicine Integration**: Virtual care options
5. **Wearable Data**: Real-time health monitoring

---

## 📝 Summary

The AI recommendation system uses:
- ✅ **Multi-factor scoring** (8+ factors)
- ✅ **Real-time data** (load, availability, location)
- ✅ **Machine learning** (Amazon Bedrock/Claude)
- ✅ **Safety validation** (human oversight)
- ✅ **Continuous improvement** (outcome tracking)

**Result**: Patients get matched with the best care option based on their specific needs, location, urgency, and preferences.
