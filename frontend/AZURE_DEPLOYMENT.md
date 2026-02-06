# Azure Deployment Guide

This guide explains how to deploy the Healthcare OS frontend to Azure Static Web Apps.

## Prerequisites

1. **Azure Account**: You need an active Azure subscription
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Azure CLI** (optional): For command-line deployment

## Deployment Options

### Option 1: Azure Portal (Recommended for beginners)

1. **Create Azure Static Web App**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Click "Create a resource" → "Static Web App"
   - Fill in the details:
     - **Subscription**: Your Azure subscription
     - **Resource Group**: Create new or use existing
     - **Name**: `healthcare-os-frontend`
     - **Plan type**: Free (for development) or Standard (for production)
     - **Region**: Choose closest to your users (e.g., East US, West Europe)

2. **Connect to GitHub**:
   - **Source**: GitHub
   - **Organization**: Your GitHub username/organization
   - **Repository**: Your repository name
   - **Branch**: `main` or your deployment branch

3. **Build Configuration**:
   - **Build Presets**: Custom
   - **App location**: `/frontend`
   - **Output location**: `out`
   - **App build command**: `npm run build`

4. **Review and Create**:
   - Review all settings
   - Click "Create"
   - Azure will automatically create a GitHub Actions workflow

### Option 2: Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name healthcare-os-rg --location eastus

# Create static web app
az staticwebapp create \
  --name healthcare-os-frontend \
  --resource-group healthcare-os-rg \
  --source https://github.com/YOUR_USERNAME/YOUR_REPO \
  --location eastus \
  --branch main \
  --app-location "frontend" \
  --output-location "out" \
  --login-with-github
```

## Configuration

### Environment Variables

Set these in Azure Portal → Static Web Apps → Configuration:

```
NEXT_PUBLIC_API_BASE_URL=https://your-aws-api-gateway-url.com/v1
NEXT_PUBLIC_APP_ENV=production
AZURE_CLIENT_ID=your-azure-ad-client-id (if using auth)
AZURE_CLIENT_SECRET=your-azure-ad-client-secret (if using auth)
```

### Custom Domain (Optional)

1. Go to Azure Portal → Your Static Web App → Custom domains
2. Click "Add" → "Custom domain on Azure DNS" or "Custom domain on other DNS"
3. Follow the verification steps
4. Add CNAME record: `www.yourdomain.com` → `your-app.azurestaticapps.net`

## Build Configuration

The deployment uses these files:

- **`azure-deploy.yml`**: GitHub Actions workflow
- **`staticwebapp.config.json`**: Azure Static Web Apps configuration
- **`next.config.js`**: Next.js configuration with static export

### Next.js Configuration for Static Export

Update your `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  }
}

module.exports = nextConfig
```

### Package.json Scripts

Ensure these scripts exist in your `package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "export": "next export",
    "deploy": "npm run build && npm run export"
  }
}
```

## Deployment Process

1. **Automatic Deployment**:
   - Push changes to your main branch
   - GitHub Actions will automatically build and deploy
   - Check the Actions tab in your GitHub repository for progress

2. **Manual Deployment**:
   - Go to Azure Portal → Your Static Web App → GitHub Actions
   - Click "Run workflow" to trigger manual deployment

## Monitoring and Troubleshooting

### View Deployment Logs

1. **GitHub Actions**:
   - Go to your repository → Actions tab
   - Click on the latest workflow run
   - Expand the build steps to see detailed logs

2. **Azure Portal**:
   - Go to your Static Web App → Functions
   - Check the "Logs" section for runtime issues

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`
   - Check for TypeScript errors

2. **API Connection Issues**:
   - Verify `NEXT_PUBLIC_API_BASE_URL` is set correctly
   - Check CORS settings on your AWS API Gateway
   - Ensure API endpoints are accessible from Azure

3. **Routing Issues**:
   - Verify `staticwebapp.config.json` routing rules
   - Check that `output: 'export'` is set in `next.config.js`

### Performance Optimization

1. **Enable CDN**:
   - Azure Static Web Apps includes global CDN by default
   - Configure caching headers in `staticwebapp.config.json`

2. **Optimize Images**:
   - Use WebP format where possible
   - Implement lazy loading
   - Consider Azure CDN for large media files

3. **Bundle Optimization**:
   - Enable tree shaking in Next.js
   - Use dynamic imports for large components
   - Minimize third-party dependencies

## Security

1. **HTTPS**: Automatically enabled with free SSL certificate
2. **Authentication**: Configure Azure AD if needed
3. **API Security**: Ensure your AWS API has proper authentication
4. **Content Security Policy**: Add CSP headers in configuration

## Scaling

- **Free Tier**: 100GB bandwidth, 0.5GB storage
- **Standard Tier**: 100GB bandwidth + $0.20/GB, 0.5GB storage + $0.40/GB
- **Custom Domains**: Available on Standard tier
- **Authentication**: Built-in Azure AD integration

## Cost Estimation

- **Free Tier**: $0/month (suitable for development)
- **Standard Tier**: ~$5-20/month (depending on traffic)
- **Custom Domain**: No additional cost
- **SSL Certificate**: Included free

## Support

- **Azure Documentation**: [Azure Static Web Apps Docs](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- **GitHub Issues**: Report issues in your repository
- **Azure Support**: Available through Azure Portal

## Next Steps

After deployment:

1. Test all functionality on the live site
2. Set up monitoring and alerts
3. Configure custom domain if needed
4. Set up staging environment for testing
5. Implement CI/CD best practices