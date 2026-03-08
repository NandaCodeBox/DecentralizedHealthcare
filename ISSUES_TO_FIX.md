# Issues to Fix for Demo Recording

## Current Issues Identified:

### 1. Playwright Recording Issues
- **Problem**: Element selectors not finding buttons properly
- **Cause**: Using text-based selectors that don't match exact button text
- **Fix**: Use data-testid attributes and more robust selectors

### 2. Book Appointment & View Details Buttons
- **Problem**: Buttons are UI-only, don't actually do anything
- **Current State**: Just styled buttons with no onClick handlers
- **Fix**: Add modal dialogs or navigation to booking/details pages

### 3. AI Search Not Working
- **Problem**: AI Search button exists but functionality is limited
- **Current State**: Shows suggestions but doesn't actually filter results
- **Fix**: Implement proper filtering based on AI suggestions

### 4. Missing Data in Forms
- **Problem**: Forms don't persist data properly
- **Current State**: Data stored in sessionStorage but not used effectively
- **Fix**: Properly load and display data from sessionStorage

## Fixes to Implement:

### Fix 1: Add data-testid attributes for Playwright
- Add to symptom buttons
- Add to submit buttons
- Add to search inputs
- Add to appointment/details buttons

### Fix 2: Make Book Appointment functional
- Add modal dialog for appointment booking
- Show appointment confirmation
- Store appointment data

### Fix 3: Make View Details functional
- Add modal dialog for facility/provider details
- Show comprehensive information
- Add map integration (optional)

### Fix 4: Fix AI Search
- Actually filter providers based on AI suggestions
- Show/hide providers based on relevance
- Update UI to reflect filtered results

### Fix 5: Improve Playwright Recording Script
- Use better selectors
- Add proper waits
- Handle errors gracefully
- Add screenshots at key points
