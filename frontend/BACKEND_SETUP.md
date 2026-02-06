# Backend Connection Setup

The Healthcare OS frontend is designed to work with or without a backend server. Here's how to handle different scenarios:

## 🚀 Quick Start (No Backend Required)

The app is configured to use **Mock API** by default for development and testing.

### Current Configuration
- ✅ Mock API enabled (`NEXT_PUBLIC_USE_MOCK_API=true`)
- ✅ Sample data available
- ✅ All features work offline

### What Works with Mock API
- ✅ Symptom reporting
- ✅ Episode tracking  
- ✅ Provider search
- ✅ Profile management
- ✅ Settings management
- ✅ Offline functionality

## 🔧 Configuration Options

### Option 1: Use Mock API (Recommended for Testing)
```bash
# In frontend/.env.local
NEXT_PUBLIC_USE_MOCK_API=true
```

### Option 2: Connect to Real Backend
```bash
# In frontend/.env.local
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

## 🐛 Troubleshooting Connection Errors

### Error: `ERR_CONNECTION_REFUSED`
This means the backend server is not running. You have two options:

#### Option A: Continue with Mock API (Easiest)
1. Keep `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local`
2. Restart the frontend server: `npm run dev`
3. All features will work with sample data

#### Option B: Start the Backend Server
1. Navigate to the backend directory
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Set `NEXT_PUBLIC_USE_MOCK_API=false` in `.env.local`
5. Restart frontend: `npm run dev`

## 🧪 Testing Features

### Load Sample Data
1. Go to: `http://localhost:3000/test-data`
2. Click "Load Sample Data"
3. Test all features with realistic data

### Browser Console Commands
```javascript
// Load test data
loadTestData()

// Switch to mock API
switchToMockApi()

// Switch to real API
switchToRealApi()

// Clear all data
clearTestData()
```

## 📱 Offline Functionality

The app works completely offline:
- ✅ Browse episodes and profile
- ✅ Submit symptoms (saved for sync)
- ✅ View cached provider data
- ✅ Manage settings

## 🔄 API Switching

You can switch between APIs at runtime:

### In Browser Console:
```javascript
// Use mock data for testing
window.switchToMockApi()

// Use real backend (if available)
window.switchToRealApi()
```

## 📊 Mock API Features

The mock API provides:
- **Realistic responses** with proper delays
- **Sample data** matching the real API structure
- **Error simulation** for testing edge cases
- **Offline-first** design patterns

## 🚨 Error Handling

The app gracefully handles:
- ❌ Backend server down → Falls back to offline mode
- ❌ Network errors → Uses cached data
- ❌ API timeouts → Retries with exponential backoff
- ❌ Connection refused → Switches to mock API

## 🎯 Recommended Workflow

1. **Development**: Use Mock API for fast iteration
2. **Testing**: Load sample data and test all features
3. **Integration**: Switch to real API when backend is ready
4. **Production**: Deploy with real backend API

## 📝 Environment Variables

```bash
# Frontend/.env.local
NEXT_PUBLIC_USE_MOCK_API=true          # Use mock API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api  # Backend URL
NEXT_PUBLIC_DEV_MODE=true              # Enable dev features
```

## ✅ Verification

To verify everything is working:

1. **Frontend**: `http://localhost:3000` should load
2. **Test Data**: `http://localhost:3000/test-data` should work
3. **Symptom Intake**: Should submit without errors
4. **Episodes**: Should show sample episodes
5. **Profile**: Should display and edit profile data

## 🆘 Still Having Issues?

1. Check browser console for errors
2. Verify `.env.local` configuration
3. Clear browser cache and localStorage
4. Restart the development server
5. Load sample data from test-data page

The app is designed to work seamlessly with or without a backend, so you can focus on testing the frontend features!