# AWS Amplify Frontend Deployment Guide

**Project**: Arogya AI - Healthcare Orchestration Platform  
**Backend API**: https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1/  
**GitHub Repo**: https://github.com/NandaCodeBox/DecentralizedHealthcare

---

## 🚀 Step-by-Step Deployment

### Step 1: Open AWS Amplify Console
1. Go to: https://console.aws.amazon.com/amplify/
2. Make sure you're in **us-east-1** region (same as backend)

### Step 2: Create New App
1. Click **"New app"** button (top right)
2. Select **"Host web app"**
3. Choose **"GitHub"** as the repository service
4. Click **"Continue"**

### Step 3: Authorize GitHub
1. Click **"Authorize AWS Amplify"**
2. Sign in to GitHub if prompted
3. Grant access to your repositories
4. Click **"Authorize aws-amplify-console"**

### Step 4: Select Repository
1. **Repository**: Select `NandaCodeBox/DecentralizedHealthcare`
2. **Branch**: Select `main`
3. Click **"Next"**

### Step 5: Configure Build Settings

**App name**: `arogya-ai-healthcare`

**Build and test settings**: Edit the YAML to:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/out
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### Step 6: Add Environment Variables

Click **"Advanced settings"** → **"Add environment variable"**

Add these variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1` |
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `NODE_ENV` | `production` |

### Step 7: Review and Deploy
1. Review all settings
2. Click **"Save and deploy"**
3. Wait 5-10 minutes for deployment

---

## 📊 Deployment Progress

You'll see these stages:
1. **Provision** - Setting up build environment (1 min)
2. **Build** - Running npm install and build (3-5 min)
3. **Deploy** - Uploading to CDN (1-2 min)
4. **Verify** - Final checks (30 sec)

---

## ✅ After Deployment

### Your URLs
- **Amplify URL**: `https://main.d[random].amplifyapp.com`
- **Backend API**: `https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1/`

### Test Your Application
1. Visit the Amplify URL
2. Test all 3 use cases:
   - AI Symptom Triage: `/symptom-intake`
   - AI Provider Search: `/provider-search`
   - Supervisor Dashboard: `/supervisor-dashboard`
3. Check browser console for errors
4. Verify API calls work (Network tab)

---

## 🎯 Custom Domain (Optional)

### If you buy `arogya.ai` domain:

1. **In Amplify Console**:
   - Go to your app
   - Click "Domain management"
   - Click "Add domain"
   - Enter `arogya.ai`
   - Follow DNS configuration steps

2. **In your domain registrar** (GoDaddy/Namecheap):
   - Add CNAME records provided by Amplify
   - Wait 5-10 minutes for DNS propagation

3. **Result**: Your app will be at `https://arogya.ai`

---

## 🔧 Troubleshooting

### Build Fails
**Error**: "Module not found"
**Fix**: Check that `frontend/package.json` has all dependencies

### Environment Variables Not Working
**Error**: API calls fail
**Fix**: 
1. Go to Amplify Console
2. App settings → Environment variables
3. Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
4. Redeploy: Actions → Redeploy this version

### 404 Errors on Routes
**Error**: Direct URL access shows 404
**Fix**: Amplify should auto-detect Next.js, but if not:
1. Go to App settings → Rewrites and redirects
2. Add rule: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>` → `/index.html` → 200

---

## 💰 Cost Estimate

### AWS Amplify Pricing
- **Build minutes**: 1000 free/month, then $0.01/minute
- **Hosting**: 15GB storage free, then $0.023/GB
- **Data transfer**: 5GB free/month, then $0.15/GB

### Your Expected Cost
- **Development**: $0 (within free tier)
- **Low traffic**: $0-5/month
- **Medium traffic**: $5-15/month
- **High traffic**: $15-30/month

---

## 🎉 Success Criteria

Deployment is successful when:
- ✅ Build completes without errors
- ✅ Amplify URL is accessible
- ✅ Homepage loads correctly
- ✅ All 3 use cases work
- ✅ API calls reach backend
- ✅ No console errors
- ✅ Mobile responsive works

---

## 📞 Quick Links

- **Amplify Console**: https://console.aws.amazon.com/amplify/
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/
- **API Gateway**: https://console.aws.amazon.com/apigateway/
- **GitHub Repo**: https://github.com/NandaCodeBox/DecentralizedHealthcare

---

## 🚀 Auto-Deployment

After initial setup, every time you push to GitHub:
```bash
git push origin main
```

Amplify will automatically:
1. Detect the push
2. Start a new build
3. Deploy the new version
4. Update your live site

**Deployment time**: 5-10 minutes per push

---

## 🎯 Next Steps After Deployment

1. **Test thoroughly** - All pages and features
2. **Share URL** - With hackathon judges
3. **Monitor** - Check CloudWatch for errors
4. **Optimize** - Review performance metrics
5. **Custom domain** - Buy `arogya.ai` if desired

---

**Ready to deploy!** Follow the steps above in AWS Console.

