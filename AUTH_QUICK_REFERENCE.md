# 🔐 Authentication Quick Reference

## ✅ Status: PRODUCTION AUTH ENABLED

---

## 🔑 Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Test User | `test@arogya.ai` | `SecurePass123!` | General |
| Patient | `patient@arogya.ai` | `PatientPass123!` | Patient |
| Supervisor | `supervisor@arogya.ai` | `SupervisorPass123!` | Supervisor |

---

## 🌐 URLs

- **Frontend**: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com
- **API**: https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1

---

## 🔧 Cognito Configuration

```env
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_nrU9E0RRE
NEXT_PUBLIC_COGNITO_CLIENT_ID=7jslujashqf9negpvns3o60ffs
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USE_DEMO_API=false
```

---

## 🚀 Quick Commands

### Create New User
```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_nrU9E0RRE \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com \
  --temporary-password TempPass123! \
  --region us-east-1

aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_nrU9E0RRE \
  --username user@example.com \
  --password UserPass123! \
  --permanent \
  --region us-east-1
```

### List Users
```bash
aws cognito-idp list-users \
  --user-pool-id us-east-1_nrU9E0RRE \
  --region us-east-1
```

### Reset Password
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_nrU9E0RRE \
  --username user@example.com \
  --password NewPass123! \
  --permanent \
  --region us-east-1
```

---

## 🧪 Test in Browser Console

```javascript
// Sign in
const result = await authService.signIn('test@arogya.ai', 'SecurePass123!');

// Check auth status
const isAuth = await authService.isAuthenticated();

// Get current user
const user = await authService.getCurrentUser();

// Make API call
const profile = await apiService.getProfile();

// Sign out
await authService.signOut();
```

---

## 📋 Deployment

### Rebuild with Auth
```bash
cd frontend
npm run build
```

### Deploy to S3
```bash
aws s3 sync out/ s3://arogya-ai-healthcare-20260308102925 --delete
```

---

## 🔄 Switch Back to Demo Mode

If needed, update `.env.production`:
```env
NEXT_PUBLIC_USE_DEMO_API=true
```

Then rebuild and redeploy.

---

## 📚 Full Documentation

- `PRODUCTION_AUTH_ENABLED.md` - Complete guide
- `AUTHENTICATION_SETUP.md` - Setup instructions
- `AUTHENTICATION_IMPLEMENTATION_SUMMARY.md` - Technical details
