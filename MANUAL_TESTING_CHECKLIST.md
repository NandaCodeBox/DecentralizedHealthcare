# Manual Testing Checklist - Arogya AI Healthcare Platform

**Live URL**: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com  
**Date**: March 8, 2026

---

## ✅ Use Case 1: AI-Powered Symptom Triage

### Test Steps:
1. **Navigate to Homepage**
   - URL: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com
   - ✅ Verify "Healthcare OS" title appears
   - ✅ Verify "Online" status (green) in header
   - ✅ Verify "Report Symptoms" button is visible

2. **Click "Report Symptoms"**
   - Should navigate to `/symptom-intake`
   - ✅ Verify symptom intake form loads

3. **Fill Symptom Form**
   - Primary Symptom: "Fever"
   - Additional Symptoms: "Headache, body aches"
   - Severity: 7/10
   - Duration: "2 days"
   - ✅ Verify all fields accept input

4. **Submit Form**
   - Click "Get AI Triage Assessment"
   - ✅ Verify loading animation appears
   - ✅ Verify AI processing message shows

5. **View Results**
   - Should navigate to `/triage-dashboard`
   - ✅ Verify AI confidence score appears (e.g., 87%)
   - ✅ Verify severity level shows (e.g., "Moderate")
   - ✅ Verify 3 facilities are recommended
   - ✅ Verify each facility has AI match score (95%, 92%, 88%)
   - ✅ Verify AI reasoning is displayed for each facility

### Expected Results:
- ✨ AI badge visible on assessment card
- 🎯 Confidence score between 60-95%
- 🏥 3 facilities ranked by AI match score
- 💡 AI reasoning explains each recommendation
- 📱 Mobile responsive layout works

### Screenshot Locations:
- Homepage
- Symptom intake form
- AI triage results
- Facility recommendations

---

## ✅ Use Case 2: AI Semantic Provider Search

### Test Steps:
1. **Navigate to Provider Search**
   - From homepage, click "Find Provider with AI"
   - Or go to: `/provider-search`
   - ✅ Verify search page loads

2. **Enter Natural Language Query**
   - Type: "I have chest pain and shortness of breath"
   - ✅ Verify search box accepts input

3. **Click "AI Search"**
   - ✅ Verify loading animation appears
   - ✅ Verify "AI analyzing query..." message shows

4. **View AI Specialty Suggestions**
   - ✅ Verify AI suggests specialties (e.g., "Cardiologist", "Emergency Medicine")
   - ✅ Verify specialty badges appear with AI icon

5. **View Provider Results**
   - ✅ Verify 3+ providers are displayed
   - ✅ Verify each provider has:
     - Name (e.g., "Dr. Sarah Johnson")
     - Specialty (e.g., "General Practitioner")
     - AI match score (e.g., "95% Match")
     - Availability badge (e.g., "Accepting New")
     - AI reasoning for match

### Expected Results:
- ✨ AI specialty suggestions appear
- 🎯 Providers ranked by relevance (95%, 88%, 92%)
- 💡 AI explains why each provider matches
- 🔍 Natural language understood (no medical jargon needed)
- 📱 Mobile responsive layout works

### Screenshot Locations:
- Search page with query
- AI specialty suggestions
- Provider results with match scores
- AI reasoning for top match

---

## ✅ Use Case 3: Human-in-the-Loop Validation

### Test Steps:
1. **Navigate to Supervisor Dashboard**
   - Go to: `/supervisor-dashboard`
   - ✅ Verify dashboard loads

2. **View Statistics Header**
   - ✅ Verify "Pending" count shows (e.g., 4)
   - ✅ Verify "Emergency" count shows (e.g., 1)
   - ✅ Verify "Low Confidence" count shows (e.g., 2)

3. **View Validation Queue**
   - ✅ Verify 4 cases are displayed
   - ✅ Verify case cards show:
     - Patient name
     - Symptoms
     - AI confidence score
     - Status badge

4. **Identify Low Confidence Cases**
   - ✅ Verify cases with < 70% confidence are flagged
   - ✅ Verify orange warning icon appears
   - ✅ Verify "Low Confidence" badge shows

5. **Review Case Details**
   - Click on "Priya Singh" (65% confidence)
   - ✅ Verify detailed view shows:
     - Patient information
     - Symptoms list
     - AI assessment
     - AI reasoning
     - Vital signs (heart rate, BP, temperature)
     - Symptom details (duration, severity)

6. **Test Action Buttons**
   - ✅ Verify "Approve" button is clickable
   - ✅ Verify "Override" button opens urgency selector
   - ✅ Verify "Escalate to Emergency" button is visible
   - ✅ Verify "Reject & Request More Info" button is visible
   - ✅ Verify supervisor notes textarea is present

7. **Test Override Functionality**
   - Click "Override"
   - ✅ Verify urgency selector appears (Emergency/Urgent/Routine/Self-care)
   - ✅ Verify reason textarea appears
   - ✅ Verify can change urgency level

### Expected Results:
- ⚠️ Low confidence cases flagged automatically (< 70%)
- 🔍 AI transparency: shows confidence score and reasoning
- 👤 Human oversight: supervisor can approve/override/escalate
- 📊 Statistics dashboard shows key metrics
- 💬 Supervisor can add notes and justification
- 📱 Mobile responsive layout works

### Screenshot Locations:
- Dashboard overview with statistics
- Validation queue with 4 cases
- Low confidence case flagged (orange warning)
- Case detail view with AI reasoning
- Override modal with urgency selector

---

## 🎯 Cross-Cutting Tests

### Online/Offline Status
- ✅ Verify green "Online" indicator in header
- ✅ Verify no orange "Offline" warning
- ✅ Verify WiFi icon is green

### Navigation
- ✅ Verify all menu items work
- ✅ Verify back button works
- ✅ Verify breadcrumbs work (if present)

### Mobile Responsive
- ✅ Test on mobile viewport (375x667)
- ✅ Verify hamburger menu works
- ✅ Verify all buttons are tappable
- ✅ Verify text is readable

### Performance
- ✅ Page loads in < 3 seconds
- ✅ No console errors
- ✅ Images load correctly
- ✅ Fonts load correctly

### Accessibility
- ✅ All buttons have labels
- ✅ Color contrast is sufficient
- ✅ Keyboard navigation works

---

## 📊 Test Results Summary

### Use Case 1: AI Symptom Triage
- [ ] Homepage loads correctly
- [ ] Symptom form works
- [ ] AI assessment appears
- [ ] Facilities recommended
- [ ] AI reasoning displayed

### Use Case 2: AI Provider Search
- [ ] Search page loads
- [ ] Natural language query works
- [ ] AI specialty suggestions appear
- [ ] Providers ranked by relevance
- [ ] AI reasoning displayed

### Use Case 3: Supervisor Dashboard
- [ ] Dashboard loads
- [ ] 4 cases displayed
- [ ] Low confidence cases flagged
- [ ] Case details viewable
- [ ] Action buttons work

---

## 🐛 Issues Found

| Issue | Severity | Use Case | Description |
|-------|----------|----------|-------------|
| | | | |
| | | | |
| | | | |

---

## ✅ Sign-Off

- **Tester**: _________________
- **Date**: March 8, 2026
- **Overall Status**: ⬜ Pass ⬜ Fail ⬜ Partial
- **Notes**: 

---

## 📸 Screenshot Checklist

Required screenshots for demo:
- [ ] Homepage with "Healthcare OS" title
- [ ] Symptom intake form filled
- [ ] AI triage results with confidence score
- [ ] Facility recommendations with AI match scores
- [ ] Provider search with natural language query
- [ ] AI specialty suggestions
- [ ] Provider results with match scores
- [ ] Supervisor dashboard overview
- [ ] Low confidence case flagged
- [ ] Case detail with AI reasoning
- [ ] Mobile view of homepage

---

**Ready for Hackathon Demo!** 🎉

