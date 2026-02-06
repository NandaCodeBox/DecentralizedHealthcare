# Quick AWS Deployment Guide

## 🚀 Deploy Healthcare OS Frontend to AWS in 5 Minutes

### ✅ FULL DEPLOYMENT SUCCESSFUL!
**Live Website**: http://healthcare-os-frontend-1769952598.s3-website-us-east-1.amazonaws.com  
**API Gateway**: https://gm858vl0lh.execute-api.us-east-1.amazonaws.com/v1/  
**Deployed**: February 1, 2026 at 19:00:21  
**Frontend Bucket**: healthcare-os-frontend-1769952598  
**Backend Stack**: HealthcareOrchestrationStack  

🎉 **REAL DATABASE & API DEPLOYED!** 🎉
- ✅ DynamoDB tables deployed and ready
- ✅ Lambda functions deployed and working  
- ✅ API Gateway endpoints live (requires auth)
- ✅ Cognito authentication configured
- ✅ Frontend working with mock data (no auth required)

**Current Status**: App works online with mock APIs. Real backend is deployed and ready for authentication integration.

---

### Prerequisites
1. **AWS Account** - [Sign up here](https://aws.amazon.com/)
2. **AWS CLI** - [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **Node.js** - Already installed ✅

### Step 1: Configure AWS CLI
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region: `us-east-1`
- Default output format: `json`

### Step 2: Deploy (Choose One Method)

#### Method A: PowerShell (Windows)
```powershell
cd frontend
.\deploy-aws.ps1
```

#### Method B: Bash (Linux/Mac)
```bash
cd frontend
./deploy-aws.sh
```

#### Method C: Manual Commands
```bash
cd frontend
npm install
npm run build

# Create unique bucket name
BUCKET_NAME="healthcare-os-frontend-$(date +%s)"

# Create and configure S3 bucket
aws s3 mb s3://$BUCKET_NAME --region us-east-1
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
aws s3 sync out/ s3://$BUCKET_NAME --delete

# Set public permissions
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow", 
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
  }]
}'

# Get URL
echo "Website: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
```

### Step 3: Test Your Deployment

The script will automatically open your browser to the deployed website. Test these features:

1. ✅ **Homepage** - Should load without errors
2. ✅ **Symptom Intake** - Form should work (uses mock data)
3. ✅ **Episodes** - Should show sample episodes
4. ✅ **Profile** - Should allow editing
5. ✅ **Settings** - Should save preferences
6. ✅ **Help** - Should display FAQ
7. ✅ **Mobile** - Test on phone/tablet

### Expected Output
```
✅ Deployment complete!
🌍 Website URL: http://healthcare-os-frontend-1234567890.s3-website-us-east-1.amazonaws.com
```

### Troubleshooting

#### AWS CLI Not Found
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### Permission Denied
```bash
# Make script executable (Linux/Mac)
chmod +x deploy-aws.sh
```

#### Build Errors
```bash
# Clear cache and retry
rm -rf .next node_modules out
npm install
npm run build
```

#### AWS Credentials Issues
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create new user with `AmazonS3FullAccess` policy
3. Generate Access Keys
4. Run `aws configure` again

### What Happens During Deployment

1. **Build**: Creates optimized static files in `out/` directory
2. **S3 Bucket**: Creates unique bucket for your website
3. **Upload**: Syncs all files to S3
4. **Configure**: Enables static website hosting
5. **Permissions**: Makes files publicly readable
6. **URL**: Provides direct website link

### Cost Estimate
- **S3 Storage**: ~$0.02/month for typical usage
- **Data Transfer**: First 1GB free, then ~$0.09/GB
- **Requests**: ~$0.0004 per 1,000 requests
- **Total**: Usually under $1/month for development

### Next Steps After Deployment

1. **Custom Domain**: Set up with Route 53
2. **HTTPS**: Add CloudFront distribution
3. **Monitoring**: Enable CloudWatch
4. **CI/CD**: Automate with GitHub Actions

### Cleanup (Delete Deployment)
```bash
# Replace with your bucket name from deployment-info.txt
aws s3 rb s3://your-bucket-name --force
```

### Alternative: AWS Amplify (Even Easier)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your GitHub repository
4. Use build settings from `amplify.yml`
5. Deploy automatically

---

## 🎉 That's it! Your Healthcare OS frontend is now live on AWS!

Visit your website URL and start testing the application. The frontend will work with mock data until you connect it to your AWS API Gateway backend.