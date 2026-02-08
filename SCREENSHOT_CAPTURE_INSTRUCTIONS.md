# 📸 Screenshot Capture Instructions

## ✅ Application Status
**The development server is running on http://localhost:3000**

The Healthcare OS application is live and ready for screenshots.

---

## 🎯 Screenshots to Capture

### Screenshot 1: Mobile Home Page
**Dimensions:** 375x812px (iPhone 12 Pro)  
**URL:** http://localhost:3000

#### Steps:
1. Open Chrome browser
2. Press **F12** to open DevTools
3. Press **Ctrl+Shift+M** to enable Device Mode
4. Select **iPhone 12 Pro** from device dropdown
5. Navigate to http://localhost:3000
6. Press **Win+Shift+S** to capture screenshot
7. Save as: `screenshots/01-home-page-mobile.png`

#### What You'll See:
- Healthcare OS header with heart icon
- "Report Symptoms" button (blue gradient)
- "Emergency Alert" button (red gradient)
- Secondary action cards (Episodes, Find Providers, Profile, Settings)
- Quick stats section (24/7, <30s, AI+)
- "How It Works" section with 4 steps
- Features grid (Multilingual, Offline Ready, AI Powered, Human Verified)
- Emergency notice with "Call 108" button
- Quick links (Help, Test API)

---

### Screenshot 2: Mobile Symptom Intake Form
**Dimensions:** 375x812px (iPhone 12 Pro)  
**URL:** http://localhost:3000/symptom-intake

#### Steps:
1. Keep DevTools open with iPhone 12 Pro view
2. Navigate to http://localhost:3000/symptom-intake
3. Wait for form to load
4. Press **Win+Shift+S** to capture screenshot
5. Save as: `screenshots/02-symptom-intake-mobile.png`

#### What You'll See:
- Page title: "Report Your Symptoms"
- Subtitle: "Describe your health concern"
- Form fields:
  - Primary complaint (text input)
  - Duration dropdown (Last few hours, Last day, Last week, etc.)
  - Severity slider (1-10)
  - Additional symptoms (optional)
- Submit button at bottom
- Mobile-optimized layout

---

### Screenshot 3: Desktop Episodes/Triage Dashboard
**Dimensions:** 1200x800px  
**URL:** http://localhost:3000/episodes

#### Steps:
1. Press **F12** to close DevTools
2. Resize browser window to 1200px width
3. Navigate to http://localhost:3000/episodes
4. Wait for episodes to load
5. Press **Win+Shift+S** to capture screenshot
6. Save as: `screenshots/03-episodes-desktop.png`

#### What You'll See:
- Page title: "My Care Episodes"
- Subtitle: "Track your healthcare journey"
- Care episode cards showing:
  - Status badges (Active, Completed, Escalated)
  - Urgency level badges (Emergency, Urgent, Routine, Self-care)
  - Primary complaint text
  - Date created
  - Duration, Severity, Interactions info
  - "View Details" link
- Desktop grid layout (2-3 columns)

---

### Screenshot 4: Desktop Provider Search/Profile
**Dimensions:** 1200x800px  
**URL:** http://localhost:3000/profile

#### Steps:
1. Keep browser at 1200px width
2. Navigate to http://localhost:3000/profile
3. Wait for profile to load
4. Press **Win+Shift+S** to capture screenshot
5. Save as: `screenshots/04-profile-desktop.png`

#### What You'll See:
- User profile information
- Health history summary
- Preferences and settings
- Provider recommendations
- Desktop-optimized layout

---

## 🛠️ Alternative: Automated Capture

If you have Node.js installed, you can try automated capture:

```bash
# Install Puppeteer (if not already installed)
npm install puppeteer

# Run automated screenshot capture
node scripts/capture-screenshots.js
```

This will automatically capture all screenshots and save them to the `screenshots/` folder.

---

## 📁 File Organization

After capturing, your screenshots folder should look like:
```
screenshots/
├── 01-home-page-mobile.png
├── 02-symptom-intake-mobile.png
├── 03-episodes-desktop.png
└── 04-profile-desktop.png
```

---

## 🎨 Image Optimization

After capturing screenshots, optimize them to reduce file size:

1. Visit https://tinypng.com
2. Upload each PNG file
3. Download the optimized version
4. Replace the original files

**Target:** Each image should be <500KB

---

## 📝 Git Workflow

After capturing and optimizing screenshots:

```bash
# Add all screenshots
git add screenshots/

# Commit with descriptive message
git commit -m "Add application screenshots: home, symptom intake, episodes, profile"

# Push to repository
git push origin main
```

---

## 🔍 Troubleshooting

### App not loading?
- Verify server is running: http://localhost:3000
- If not, run: `npm run dev` in the `frontend` folder
- Check server output for errors

### Mobile view not showing?
- Make sure DevTools is open (F12)
- Click the device toggle icon (Ctrl+Shift+M)
- Select "iPhone 12 Pro" from the device list

### Screenshots are blurry?
- Make sure browser zoom is at 100%
- Use Win+Shift+S for native screenshot tool
- Or use Snagit/ShareX for better quality

### File size too large?
- Use tinypng.com to compress
- Target: <500KB per image
- Typically reduces by 60-80%

---

## 💡 Pro Tips

1. **Clean Browser:** Close unnecessary tabs and extensions for cleaner screenshots
2. **Good Lighting:** Ensure good contrast and readability
3. **Complete UI:** Make sure no important elements are cut off
4. **Consistent Sizing:** Use exact dimensions specified above
5. **Real Data:** Use actual form data, not placeholder text

---

## ✨ Quality Checklist

Before committing screenshots:

- [ ] All 4 screenshots captured
- [ ] Correct dimensions (375x812 for mobile, 1200x800 for desktop)
- [ ] Images optimized (<500KB each)
- [ ] No sensitive data visible
- [ ] Good contrast and readability
- [ ] Complete UI visible (no cut-offs)
- [ ] Saved in `screenshots/` folder
- [ ] Added to git
- [ ] Committed with descriptive message
- [ ] Pushed to repository

---

## 🚀 Next Steps

1. Capture the 4 screenshots following the instructions above
2. Optimize images at tinypng.com
3. Commit and push to GitHub
4. Verify screenshots appear on GitHub repository

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify the development server is running
3. Check browser console for errors (F12 → Console tab)
4. Ensure all dependencies are installed: `npm install` in frontend folder

---

**Happy screenshotting! 📸**
