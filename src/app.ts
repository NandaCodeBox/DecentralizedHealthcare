#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HealthcareOrchestrationStack } from './infrastructure/healthcare-orchestration-stack';

const app = new cdk.App();

// Get environment configuration
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Create the main stack
new HealthcareOrchestrationStack(app, 'HealthcareOrchestrationStack', {
  env: {
    account,
    region,
  },
  description: 'AI-enabled decentralized care orchestration system for India healthcare network',
  tags: {
    Project: 'HealthcareOrchestration',
    Environment: process.env.ENVIRONMENT || 'development',
    Owner: 'HealthcareTeam',
  },
});