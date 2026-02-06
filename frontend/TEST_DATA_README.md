# Healthcare OS - Test Sample Data

This document describes the test sample data available for testing the Healthcare OS application.

## Quick Start

### Method 1: Using the Test Data Page
1. Navigate to `http://localhost:3000/test-data`
2. Click "Load Sample Data" button
3. Start testing with realistic data

### Method 2: Using Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Run: `loadTestData()`
4. Data is now loaded and ready for testing

### Method 3: Direct Import
```javascript
import sampleData from '@/data/sampleData';
sampleData.populateSampleData();
```

## Sample Data Overview

### 👤 User Profile - Priya Sharma
- **Age**: 32 years old
- **Location**: Mumbai, Maharashtra
- **Medical Conditions**: Type 2 Diabetes, Hypertension
- **Medications**: Metformin, Amlodipine
- **Allergies**: Penicillin, Shellfish
- **Insurance**: Star Health Insurance
- **Language**: Hindi preferred
- **Provider Preference**: Female doctors

### 🏥 Care Episodes (3 Episodes)

#### Episode 1 - Completed Migraine Case
- **Status**: Completed
- **Complaint**: Severe headache with nausea and light sensitivity
- **Urgency**: Urgent
- **Duration**: 6-24 hours
- **Severity**: 8/10
- **Outcome**: Diagnosed as severe migraine, treated successfully

#### Episode 2 - Active Respiratory Infection
- **Status**: Active (In Progress)
- **Complaint**: Persistent cough with fever for 3 days
- **Urgency**: Routine
- **Duration**: 3-7 days
- **Severity**: 6/10
- **Current Step**: Provider matching

#### Episode 3 - Escalated Cardiac Emergency
- **Status**: Escalated
- **Complaint**: Chest pain and shortness of breath
- **Urgency**: Emergency
- **Duration**: 1-6 hours
- **Severity**: 9/10
- **Outcome**: NSTEMI diagnosed, stent placed

### 👨‍⚕️ Healthcare Providers (3 Providers)

#### Dr. Rajesh Kumar - General Medicine
- **Experience**: 15 years
- **Rating**: 4.8/5 (234 reviews)
- **Location**: Bandra West, Mumbai (2.3 km away)
- **Consultation Fee**: ₹800
- **Languages**: English, Hindi, Marathi
- **Next Available**: Today 10:00 AM

#### Dr. Anjali Patel - Neurology
- **Experience**: 12 years
- **Rating**: 4.9/5 (156 reviews)
- **Location**: Powai, Mumbai (8.7 km away)
- **Consultation Fee**: ₹1,500
- **Languages**: English, Hindi, Gujarati
- **Next Available**: Tomorrow 11:30 AM

#### Dr. Priya Menon - Cardiology
- **Experience**: 18 years
- **Rating**: 4.7/5 (298 reviews)
- **Location**: Andheri East, Mumbai (5.2 km away)
- **Consultation Fee**: ₹2,000
- **Languages**: English, Hindi, Malayalam
- **Next Available**: Today 9:00 AM

### ⚙️ App Settings
- **Language**: English (can be changed to Hindi)
- **Notifications**: Push and email enabled
- **Privacy**: Analytics enabled, research sharing disabled
- **Offline**: Auto-sync enabled

### 🚨 Emergency Contacts
- **Emergency Services**: 108
- **Poison Control**: 1066
- **Mental Health Helpline**: 9152987821
- **Women Helpline**: 1091

## Testing Scenarios

### 1. New Symptom Report
Use the sample symptom intake data:
```javascript
{
  primaryComplaint: "Severe stomach pain and nausea since yesterday morning",
  duration: "1to3Days",
  severity: 7,
  associatedSymptoms: "Nausea, vomiting, loss of appetite, mild fever"
}
```

### 2. Profile Management
- Test editing personal information
- Update medical conditions and medications
- Change language preferences
- Modify provider preferences

### 3. Episode Tracking
- View different episode statuses (active, completed, escalated)
- Check episode details and care pathways
- Review interaction history

### 4. Provider Discovery
- Search for providers by specialty
- Filter by distance and cost
- Check availability and ratings
- Test booking functionality

### 5. Offline Functionality
- Load data while online
- Disconnect from internet
- Test offline browsing of episodes and profile
- Reconnect and verify data sync

## Data Management

### Clear All Test Data
```javascript
// In browser console
clearTestData()

// Or visit test-data page and click "Clear All Data"
```

### Export Test Data
- Go to Settings page
- Click "Export My Data"
- Downloads JSON file with all user data

### Reset to Fresh State
1. Clear all test data
2. Refresh the application
3. Start with clean slate

## File Locations

- **Sample Data**: `frontend/src/data/sampleData.ts`
- **Test Data Page**: `frontend/src/pages/test-data.tsx`
- **Data Loader**: `frontend/src/utils/testDataLoader.ts`

## Notes for Developers

- All sample data follows the TypeScript interfaces defined in `@/types`
- Data is stored in localStorage for offline testing
- Sample data includes realistic Indian healthcare context
- All dates are in ISO format for consistency
- Provider locations use Mumbai coordinates for testing

## Troubleshooting

### Data Not Loading
1. Check browser console for errors
2. Verify localStorage is enabled
3. Clear browser cache and try again

### Missing Episodes
1. Ensure sample data is loaded
2. Check if offline service is working
3. Verify data format matches expected types

### Provider Search Issues
1. Confirm provider data is loaded
2. Check location permissions
3. Verify search filters are not too restrictive