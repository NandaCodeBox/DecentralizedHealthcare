# Playwright MCP Testing Guide

**Status**: ✅ Playwright MCP Server Added  
**Your Live URL**: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com

---

## 🎭 What is Playwright MCP?

Playwright MCP allows you to automate browser testing directly through Kiro. You can:
- Navigate to your deployed website
- Take screenshots
- Click buttons and fill forms
- Test all 3 hackathon use cases automatically
- Verify the UI works correctly

---

## 🚀 Available Playwright Commands

### 1. Navigate to Page
```
Navigate to: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com
```

### 2. Take Screenshot
```
Take a screenshot of the current page
```

### 3. Click Element
```
Click on "Report Symptoms" button
```

### 4. Fill Form
```
Fill the symptom description field with "Fever and headache for 2 days"
```

### 5. Evaluate JavaScript
```
Get the page title
```

---

## 🧪 Test Scenarios for Your App

### Test 1: Homepage Loads
```
1. Navigate to homepage
2. Take screenshot
3. Verify "Healthcare OS" title is visible
```

### Test 2: Symptom Intake Flow
```
1. Navigate to /symptom-intake
2. Fill symptom form
3. Click "Get AI Triage Assessment"
4. Take screenshot of results
```

### Test 3: Provider Search
```
1. Navigate to /provider-search
2. Fill search query: "chest pain"
3. Click "AI Search"
4. Take screenshot of results
```

### Test 4: Supervisor Dashboard
```
1. Navigate to /supervisor-dashboard
2. Verify 4 cases are displayed
3. Check for low confidence flags
4. Take screenshot
```

---

## 📝 Example Test Commands

### Quick Homepage Test
```
Can you test my deployed app at http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com?
1. Navigate to the homepage
2. Take a screenshot
3. Verify the page loaded correctly
```

### Full Use Case Test
```
Test the symptom intake flow:
1. Go to /symptom-intake
2. Fill in symptoms: "Fever 102°F, headache, body aches"
3. Select severity: 7
4. Click submit
5. Take screenshot of triage results
```

### Mobile Responsive Test
```
Test mobile view:
1. Set viewport to 375x667 (iPhone)
2. Navigate to homepage
3. Take screenshot
4. Verify mobile menu works
```

---

## 🎯 Automated Test Suite

You can ask Kiro to run a complete test suite:

```
Run a complete test of all 3 use cases:
1. Test AI Symptom Triage
2. Test AI Provider Search  
3. Test Supervisor Dashboard
4. Take screenshots of each
5. Report any errors or issues
```

---

## 📊 What Playwright Can Check

### Visual Testing
- ✅ Page loads correctly
- ✅ All elements visible
- ✅ Responsive design works
- ✅ Colors and styling correct

### Functional Testing
- ✅ Buttons clickable
- ✅ Forms submittable
- ✅ Navigation works
- ✅ API calls succeed

### Performance Testing
- ✅ Page load time
- ✅ Time to interactive
- ✅ Resource loading

---

## 🔧 Advanced Usage

### Custom Viewport (Mobile Testing)
```
Set viewport to 375x667 and test mobile view
```

### Wait for Elements
```
Wait for the "AI Assessment" card to appear
```

### Extract Data
```
Get all provider names from the search results
```

### Network Monitoring
```
Monitor API calls when submitting symptoms
```

---

## 💡 Tips for Testing

1. **Start Simple**: Test homepage first
2. **Take Screenshots**: Visual proof of functionality
3. **Test All 3 Use Cases**: Ensure complete demo works
4. **Mobile Testing**: Test on different screen sizes
5. **Error Handling**: Test offline scenarios

---

## 🎬 Ready to Test!

The Playwright MCP server is now configured and ready to use. Just ask Kiro to:

**"Test my deployed healthcare app and take screenshots of all 3 use cases"**

Or start with a simple test:

**"Navigate to my deployed app and take a screenshot of the homepage"**

---

## 📞 Your App Details

- **Live URL**: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com
- **Backend API**: https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1/
- **Status**: ✅ Deployed and Online

---

**Ready to start testing?** Just ask Kiro to run any test scenario!

