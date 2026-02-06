#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Lambda functions to build
const lambdaFunctions = [
  'symptom-intake',
  'triage-engine',
  'human-validation',
  'emergency-alert',
  'provider-discovery'
];

// Helper function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source directory does not exist: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Create dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build each Lambda function
lambdaFunctions.forEach(functionName => {
  console.log(`Building Lambda function: ${functionName}`);
  
  const lambdaDistDir = path.join(distDir, 'lambda', functionName);
  
  // Create Lambda dist directory
  if (!fs.existsSync(lambdaDistDir)) {
    fs.mkdirSync(lambdaDistDir, { recursive: true });
  }
  
  // Copy compiled Lambda function
  const lambdaSrcDir = path.join(__dirname, '..', 'lib', 'lambda', functionName);
  if (fs.existsSync(lambdaSrcDir)) {
    copyDir(lambdaSrcDir, lambdaDistDir);
  }
  
  // Copy shared types and validation
  const typesDir = path.join(__dirname, '..', 'lib', 'types');
  const validationDir = path.join(__dirname, '..', 'lib', 'validation');
  
  if (fs.existsSync(typesDir)) {
    copyDir(typesDir, path.join(lambdaDistDir, 'types'));
  }
  
  if (fs.existsSync(validationDir)) {
    copyDir(validationDir, path.join(lambdaDistDir, 'validation'));
  }
  
  // Create package.json for Lambda function
  const packageJson = {
    name: `healthcare-${functionName}`,
    version: '1.0.0',
    main: 'index.js',
    dependencies: {
      'uuid': '^9.0.0',
      '@aws-sdk/client-dynamodb': '^3.400.0',
      '@aws-sdk/lib-dynamodb': '^3.400.0',
      'joi': '^17.9.2'
    }
  };

  // Add specific dependencies for different functions
  if (functionName === 'triage-engine') {
    packageJson.dependencies['@aws-sdk/client-bedrock-runtime'] = '^3.400.0';
  }
  
  if (functionName === 'symptom-intake') {
    packageJson.dependencies['@aws-sdk/client-transcribe'] = '^3.400.0';
    packageJson.dependencies['@aws-sdk/client-s3'] = '^3.400.0';
  }
  
  if (functionName === 'human-validation' || functionName === 'emergency-alert') {
    packageJson.dependencies['@aws-sdk/client-sns'] = '^3.400.0';
  }
  
  fs.writeFileSync(
    path.join(lambdaDistDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Install dependencies
  console.log(`Installing dependencies for ${functionName}`);
  execSync('npm install --production', { 
    cwd: lambdaDistDir, 
    stdio: 'inherit' 
  });
  
  console.log(`✅ Built Lambda function: ${functionName}`);
});

console.log('🎉 All Lambda functions built successfully!');