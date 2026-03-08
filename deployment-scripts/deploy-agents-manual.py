#!/usr/bin/env python3
"""
Manual deployment script for AWS Bedrock AgentCore agents
Creates Lambda functions as an alternative to agentcore deploy
"""

import os
import json
import zipfile
import boto3
from pathlib import Path

# Initialize AWS clients
lambda_client = boto3.client('lambda', region_name='us-east-1')
iam_client = boto3.client('iam')

EXECUTION_ROLE_ARN = 'arn:aws:iam::289892867722:role/BedrockAgentCoreExecutionRole'

def create_deployment_package(agent_path, output_zip):
    """Create a deployment package for Lambda"""
    print(f"Creating deployment package for {agent_path}...")
    
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add lambda_handler.py as the main handler
        lambda_file = os.path.join(agent_path, 'lambda_handler.py')
        if os.path.exists(lambda_file):
            zipf.write(lambda_file, 'lambda_handler.py')
            print(f"✓ Packaged {lambda_file}")
        else:
            # Fallback to agent.py
            agent_file = os.path.join(agent_path, 'agent.py')
            zipf.write(agent_file, 'agent.py')
            print(f"✓ Packaged {agent_file}")
    
    print(f"✓ Created {output_zip}")
    return output_zip

def deploy_lambda_function(function_name, zip_file, description):
    """Deploy or update Lambda function"""
    print(f"\nDeploying {function_name}...")
    
    with open(zip_file, 'rb') as f:
        zip_content = f.read()
    
    try:
        # Try to update existing function
        response = lambda_client.update_function_code(
            FunctionName=function_name,
            ZipFile=zip_content
        )
        print(f"✓ Updated existing function: {function_name}")
    except lambda_client.exceptions.ResourceNotFoundException:
        # Create new function
        response = lambda_client.create_function(
            FunctionName=function_name,
            Runtime='python3.11',
            Role=EXECUTION_ROLE_ARN,
            Handler='lambda_handler.lambda_handler',
            Code={'ZipFile': zip_content},
            Description=description,
            Timeout=30,
            MemorySize=512,
            Environment={
                'Variables': {
                    'EPISODE_TABLE_NAME': 'healthcare-episodes',
                    'PATIENT_TABLE_NAME': 'healthcare-patients',
                    'NOTIFICATION_TOPIC_ARN': ''
                }
            }
        )
        print(f"✓ Created new function: {function_name}")
    
    return response

def create_function_url(function_name):
    """Create a Function URL for the Lambda"""
    try:
        response = lambda_client.create_function_url_config(
            FunctionName=function_name,
            AuthType='NONE',  # For demo purposes
            Cors={
                'AllowOrigins': ['*'],
                'AllowMethods': ['POST', 'GET'],
                'AllowHeaders': ['*'],
                'MaxAge': 86400
            }
        )
        print(f"✓ Function URL: {response['FunctionUrl']}")
        return response['FunctionUrl']
    except lambda_client.exceptions.ResourceConflictException:
        # URL already exists, get it
        response = lambda_client.get_function_url_config(FunctionName=function_name)
        print(f"✓ Function URL (existing): {response['FunctionUrl']}")
        return response['FunctionUrl']

def main():
    print("=" * 60)
    print("AWS Bedrock AgentCore - Manual Lambda Deployment")
    print("=" * 60)
    print()
    
    agents = [
        {
            'name': 'supervisor-validation-agent',
            'path': 'agents/supervisor-validation-agent',
            'description': 'Autonomous agent for validating triage assessments'
        },
        {
            'name': 'care-pathway-agent',
            'path': 'agents/care-pathway-agent',
            'description': 'Autonomous agent for coordinating patient care pathways'
        },
        {
            'name': 'clinical-decision-agent',
            'path': 'agents/clinical-decision-agent',
            'description': 'AI-powered clinical decision support agent'
        }
    ]
    
    endpoints = {}
    
    for agent in agents:
        print(f"\n{'=' * 60}")
        print(f"Deploying: {agent['name']}")
        print('=' * 60)
        
        # Create deployment package
        zip_file = f"{agent['name']}.zip"
        create_deployment_package(agent['path'], zip_file)
        
        # Deploy Lambda function
        deploy_lambda_function(agent['name'], zip_file, agent['description'])
        
        # Create Function URL
        url = create_function_url(agent['name'])
        endpoints[agent['name']] = url
        
        # Clean up zip file
        os.remove(zip_file)
        print(f"✓ Cleaned up {zip_file}")
    
    print(f"\n{'=' * 60}")
    print("Deployment Complete!")
    print('=' * 60)
    print("\nAgent Endpoints:")
    for name, url in endpoints.items():
        print(f"  • {name}: {url}")
    
    # Save endpoints to file
    with open('agent-endpoints.json', 'w') as f:
        json.dump(endpoints, f, indent=2)
    print("\n✓ Endpoints saved to agent-endpoints.json")
    
    print("\n" + "=" * 60)
    print("Next Steps:")
    print("=" * 60)
    print("1. Test agents with the provided endpoints")
    print("2. Update frontend to use these endpoints")
    print("3. Monitor CloudWatch logs for each function")

if __name__ == '__main__':
    main()
