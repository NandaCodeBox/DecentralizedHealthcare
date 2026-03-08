# 🧹 Workspace Cleanup Guide

## Date: March 9, 2026

---

## 📊 Current Workspace Size: ~1.1 GB

### Folder Size Breakdown

| Folder | Size (MB) | Can Delete? | Notes |
|--------|-----------|-------------|-------|
| **frontend** | 494.73 | ⚠️ Partial | Keep source, delete build cache |
| **node_modules** | 265.28 | ⚠️ Keep | Needed for development |
| **cdk.out** | 142.30 | ✅ YES | CDK build output |
| **cdk-deploy.out** | 72.67 | ✅ YES | CDK deployment cache |
| **cdk-bootstrap.out** | 52.55 | ✅ YES | CDK bootstrap cache |
| **dist** | 51.90 | ⚠️ Partial | Keep for deployment |
| **src** | 8.90 | ❌ NO | Source code |
| **test-scripts** | 4.16 | ✅ YES | Moved test files |
| **docs-archive** | 3.59 | ✅ YES | Old documentation |
| **lib** | 2.19 | ⚠️ Rebuild | TypeScript output |
| **final-screenshots** | 1.39 | ⚠️ Keep | Demo materials |

---

## 🎯 Recommended Cleanup Actions

### 1. SAFE TO DELETE (Save ~270 MB)

#### CDK Build Outputs (~267 MB)
```powershell
Remove-Item -Recurse -Force cdk.out
Remove-Item -Recurse -Force cdk-deploy.out
Remove-Item -Recurse -Force cdk-bootstrap.out
```

**Why safe:**
- Regenerated on next `cdk synth` or `cdk deploy`
- Just build artifacts
- No source code

**Rebuild with:**
```bash
npm run build
cdk synth
```

---

#### Frontend Build Cache (~200 MB in frontend/.next/cache)
```powershell
Remove-Item -Recurse -Force frontend/.next/cache
```

**Why safe:**
- Webpack build cache
- Regenerated on next build
- Speeds up builds but not essential

**Rebuild with:**
```bash
cd frontend
npm run build
```

---

#### Test Scripts Folder (~4 MB)
```powershell
Remove-Item -Recurse -Force test-scripts
```

**Why safe:**
- Already moved test files here
- Duplicate test scripts
- Not needed for production

---

#### Docs Archive (~3.6 MB)
```powershell
Remove-Item -Recurse -Force docs-archive
```

**Why safe:**
- Old documentation files
- Already archived
- Not needed for deployment

---

### 2. OPTIONAL CLEANUP (Save ~265 MB)

#### node_modules (265 MB)
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force frontend/node_modules
```

**Why optional:**
- Needed for development
- Can reinstall with `npm install`
- Only delete if not actively developing

**Reinstall with:**
```bash
npm install
cd frontend && npm install
```

---

#### dist folder (52 MB)
```powershell
Remove-Item -Recurse -Force dist
```

**Why optional:**
- Compiled Lambda functions
- Needed for deployment
- Regenerated with `npm run build`

**Rebuild with:**
```bash
npm run build
```

---

#### lib folder (2.2 MB)
```powershell
Remove-Item -Recurse -Force lib
```

**Why optional:**
- TypeScript compiled output
- Regenerated with `tsc`
- Only needed for CDK

**Rebuild with:**
```bash
npm run build
```

---

### 3. KEEP (Essential Files)

#### ❌ DO NOT DELETE

- **src/** - Your source code
- **agents/** - AI agent implementations
- **frontend/src/** - Frontend source code
- **frontend/public/** - Static assets
- **package.json** - Dependencies
- **tsconfig.json** - TypeScript config
- **cdk.json** - CDK config
- **.env.example** - Environment template
- **README.md** - Documentation
- **final-screenshots/** - Demo materials

---

## 🚀 Quick Cleanup Commands

### Minimal Cleanup (Save ~270 MB)
```powershell
# Delete CDK build outputs
Remove-Item -Recurse -Force cdk.out, cdk-deploy.out, cdk-bootstrap.out

# Delete frontend cache
Remove-Item -Recurse -Force frontend/.next/cache

# Delete archived files
Remove-Item -Recurse -Force test-scripts, docs-archive

Write-Host "✅ Cleaned up ~270 MB" -ForegroundColor Green
```

### Aggressive Cleanup (Save ~535 MB)
```powershell
# All from minimal cleanup
Remove-Item -Recurse -Force cdk.out, cdk-deploy.out, cdk-bootstrap.out
Remove-Item -Recurse -Force frontend/.next/cache
Remove-Item -Recurse -Force test-scripts, docs-archive

# Plus build outputs
Remove-Item -Recurse -Force dist, lib

# Plus node_modules (reinstall needed)
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force frontend/node_modules

Write-Host "✅ Cleaned up ~535 MB" -ForegroundColor Green
Write-Host "⚠️  Run 'npm install' to reinstall dependencies" -ForegroundColor Yellow
```

### For GitHub Upload (Save ~800 MB)
```powershell
# Everything except source code
Remove-Item -Recurse -Force cdk.out, cdk-deploy.out, cdk-bootstrap.out
Remove-Item -Recurse -Force frontend/.next
Remove-Item -Recurse -Force test-scripts, docs-archive
Remove-Item -Recurse -Force dist, lib
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force frontend/node_modules

Write-Host "✅ Ready for GitHub upload" -ForegroundColor Green
Write-Host "📦 Size reduced from 1.1GB to ~300MB" -ForegroundColor Cyan
```

---

## 📦 Large Files Analysis

### Top 10 Largest Files

| File | Size (MB) | Location | Can Delete? |
|------|-----------|----------|-------------|
| next-swc.win32-x64-msvc.node | 129.57 | frontend/node_modules | ⚠️ With node_modules |
| layer.zip | 20.06 | node_modules/@aws-cdk | ⚠️ With node_modules |
| index.js (aws-cdk) | 14.67 | node_modules/aws-cdk | ⚠️ With node_modules |
| 0.pack (webpack) | 13.31 | frontend/.next/cache | ✅ YES |
| .jsii.tabl.json.gz | 9.96 | node_modules/aws-cdk-lib | ⚠️ With node_modules |
| 2.pack (webpack) | 9.84 | frontend/.next/cache | ✅ YES |
| 8.pack (webpack) | 9.73 | frontend/.next/cache | ✅ YES |
| typescript.js | 8.69 | node_modules/typescript | ⚠️ With node_modules |
| .jsii.gz | 7.05 | node_modules/aws-cdk-lib | ⚠️ With node_modules |
| *.zip (CDK cache) | ~40 | cdk.out/.cache | ✅ YES |

---

## 🎯 Cleanup Strategies by Use Case

### Strategy 1: Active Development
**Goal**: Keep everything needed for development

**Delete:**
- ✅ cdk.out, cdk-deploy.out, cdk-bootstrap.out
- ✅ frontend/.next/cache
- ✅ test-scripts
- ✅ docs-archive

**Keep:**
- ❌ node_modules (needed)
- ❌ dist (for deployment)
- ❌ lib (for CDK)

**Savings**: ~270 MB

---

### Strategy 2: Deployment Only
**Goal**: Keep only what's needed to deploy

**Delete:**
- ✅ cdk.out, cdk-deploy.out, cdk-bootstrap.out
- ✅ frontend/.next/cache
- ✅ test-scripts
- ✅ docs-archive
- ✅ lib (rebuild before deploy)

**Keep:**
- ❌ node_modules (needed)
- ❌ dist (needed for Lambda)
- ❌ src (source code)

**Savings**: ~272 MB

---

### Strategy 3: GitHub Upload
**Goal**: Minimize repository size

**Delete:**
- ✅ cdk.out, cdk-deploy.out, cdk-bootstrap.out
- ✅ frontend/.next
- ✅ test-scripts
- ✅ docs-archive
- ✅ dist
- ✅ lib
- ✅ node_modules (all)

**Keep:**
- ❌ src (source code)
- ❌ package.json (dependencies list)
- ❌ config files

**Savings**: ~800 MB (down to ~300 MB)

---

### Strategy 4: Archive/Backup
**Goal**: Keep only essential source code

**Delete:**
- ✅ Everything except src, agents, frontend/src
- ✅ All build outputs
- ✅ All node_modules
- ✅ All caches

**Keep:**
- ❌ Source code only
- ❌ Configuration files
- ❌ README.md

**Savings**: ~900 MB (down to ~200 MB)

---

## 🔄 Rebuild Instructions

### After Minimal Cleanup
```bash
# Rebuild CDK outputs
npm run build
cdk synth

# Rebuild frontend cache (automatic on next build)
cd frontend
npm run build
```

### After Aggressive Cleanup
```bash
# Reinstall dependencies
npm install
cd frontend && npm install
cd ..

# Rebuild everything
npm run build
cdk synth

# Rebuild frontend
cd frontend
npm run build
```

---

## 📋 .gitignore Recommendations

Add these to `.gitignore` to prevent committing large files:

```gitignore
# Build outputs
cdk.out/
cdk-deploy.out/
cdk-bootstrap.out/
dist/
lib/

# Dependencies
node_modules/
frontend/node_modules/

# Next.js
frontend/.next/
frontend/out/

# Caches
*.cache
.cache/

# Archives
docs-archive/
test-scripts/

# Large files
*.zip
*.tar.gz
```

---

## 🎯 Recommended Action Plan

### For Immediate Cleanup (5 minutes)

```powershell
# Step 1: Delete CDK outputs
Remove-Item -Recurse -Force cdk.out, cdk-deploy.out, cdk-bootstrap.out

# Step 2: Delete frontend cache
Remove-Item -Recurse -Force frontend/.next/cache

# Step 3: Delete archived folders
Remove-Item -Recurse -Force test-scripts, docs-archive

# Step 4: Verify
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host "💾 Saved ~270 MB" -ForegroundColor Cyan
```

### For GitHub Upload (10 minutes)

```powershell
# Step 1: Delete all build outputs
Remove-Item -Recurse -Force cdk.out, cdk-deploy.out, cdk-bootstrap.out, dist, lib

# Step 2: Delete all caches
Remove-Item -Recurse -Force frontend/.next

# Step 3: Delete archives
Remove-Item -Recurse -Force test-scripts, docs-archive

# Step 4: Delete node_modules
Remove-Item -Recurse -Force node_modules, frontend/node_modules

# Step 5: Update .gitignore
# (Add the recommended entries above)

# Step 6: Commit and push
git add .
git commit -m "Clean up build artifacts and dependencies"
git push

Write-Host "✅ Ready for GitHub!" -ForegroundColor Green
Write-Host "📦 Repository size: ~300 MB" -ForegroundColor Cyan
```

---

## 📊 Expected Results

### Before Cleanup
- Total Size: ~1.1 GB
- Files: ~50,000+
- Folders: ~5,000+

### After Minimal Cleanup
- Total Size: ~830 MB
- Files: ~45,000
- Folders: ~4,500
- Savings: ~270 MB (25%)

### After Aggressive Cleanup
- Total Size: ~565 MB
- Files: ~10,000
- Folders: ~1,000
- Savings: ~535 MB (49%)

### After GitHub Prep
- Total Size: ~300 MB
- Files: ~2,000
- Folders: ~200
- Savings: ~800 MB (73%)

---

## ⚠️ Important Notes

1. **Always backup before cleanup**
   ```powershell
   # Create backup
   Copy-Item -Recurse . ../DecentralizedHealthcare-Backup
   ```

2. **Test after cleanup**
   ```bash
   npm run build
   npm test
   cdk synth
   ```

3. **node_modules can be large**
   - 265 MB in root
   - 230 MB in frontend
   - Total: ~495 MB
   - But needed for development

4. **CDK outputs regenerate quickly**
   - Safe to delete anytime
   - Rebuild in seconds
   - No data loss

---

## 🎉 Summary

**Recommended Immediate Action:**
```powershell
Remove-Item -Recurse -Force cdk.out, cdk-deploy.out, cdk-bootstrap.out, frontend/.next/cache, test-scripts, docs-archive
```

**Result:**
- ✅ Save ~270 MB
- ✅ No functionality lost
- ✅ Quick rebuild if needed
- ✅ Cleaner workspace

**Next Steps:**
1. Run the cleanup command
2. Test with `npm run build`
3. Verify deployment still works
4. Update .gitignore
5. Commit changes

---

**Generated**: March 9, 2026  
**Workspace Size**: 1.1 GB  
**Potential Savings**: Up to 800 MB (73%)  
**Recommended**: 270 MB cleanup (safe and quick)
