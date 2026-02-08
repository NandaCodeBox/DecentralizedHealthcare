# Screenshot Capture Guide

## Application Status
✅ **Development server is running on http://localhost:3000**

The frontend application is now live and ready for screenshots.

## Screenshots to Capture

### 1. Mobile Home Page (375x812px)
**URL:** http://localhost:3000
**Steps:**
1. Open Chrome DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" (375x812)
4. Take screenshot: Win+Shift+S
5. Save as: `screenshots/01-home-page-mobile.png`

**What to see:**
- Healthcare OS header with heart icon
- "Report Symptoms" and "Emergency Alert" buttons
- Secondary action cards (Episodes, Find Providers, Profile, Settings)
- Quick stats (24/7, <30s, AI+)
- How It Works section
- Features grid
- Emergency notice with call button

---

### 2. Mobile Symptom Intake Form (375x812px)
**URL:** http://localhost:3000/symptom-intake
**Steps:**
1. Keep mobile view (375x812)
2. Scroll through the form to show:
   - Title and subtitle
   - Form fields (primary complaint, duration, severity)
   - Submit button
3. Take screenshot: Win+Shift+S
4. Save as: `screenshots/02-symptom-intake-mobile.png`

**What to see:**
- Form title: "Report Your Symptoms"
- Input fields for symptom details
- Duration dropdown
- Severity slider
- Submit button

---

### 3. Desktop Episodes/Triage Dashboard (1200x800px)
**URL:** http://localhost:3000/episodes
**Steps:**
1. Close DevTools (F12)
2. Resize browser to 1200px width
3. Navigate to /episodes
4. Take screenshot: Win+Shift+S
5. Save as: `screenshots/03-triage-dashboard-desktop.png`

**What to see:**
- "My Care Episodes" title
- Care episode cards with:
  - Status badges (Active, Completed, Escalated)
  - Urgency levels (Emergency, Urgent, Routine, Self-care)
  - Duration, Severity, Interactions info
  - View Details links

---

### 4. Desktop Provider Search (1200x800px)
**URL:** http://localhost:3000/episodes (shows provider matching)
**Steps:**
1. Keep desktop view (1200px)
2. If episodes exist, click "View Details" on one
3. Or navigate to provider search section
4. Take screenshot: Win+Shift+S
5. Save as: `screenshots/04-provider-search-desktop.png`

**What to see:**
- Provider cards with:
  - Provider name and specialty
  - Distance/location
  - Availability
  - Rating/reviews
  - Contact button

---

## Quick Capture Checklist

- [ ] Home page mobile (375x812)
- [ ] Symptom intake mobile (375x812)
- [ ] Episodes dashboard desktop (1200x800)
- [ ] Provider search desktop (1200x800)

## File Optimization

After capturing, optimize images:
1. Visit https://tinypng.com
2. Upload each PNG
3. Download optimized versions
4. Replace original files

## Git Commands

```bash
# Add screenshots
git add screenshots/

# Commit
git commit -m "Add application screenshots"

# Push
git push origin main
```

## Troubleshooting

**App not loading?**
- Check if server is running: http://localhost:3000
- If not, run: `npm run dev` in frontend folder

**Mobile view not showing correctly?**
- Make sure DevTools is open (F12)
- Click device toggle (Ctrl+Shift+M)
- Select iPhone 12 Pro from dropdown

**Screenshots too large?**
- Use tinypng.com to compress
- Target: <500KB per image

---

## Server Status
The development server is running in the background. You can:
- Keep it running for multiple screenshot sessions
- Stop it anytime with: `Ctrl+C` in the terminal
- Restart with: `npm run dev` in frontend folder
