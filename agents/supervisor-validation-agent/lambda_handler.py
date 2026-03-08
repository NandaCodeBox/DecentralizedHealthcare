"""
Supervisor Validation Agent - AWS Lambda Version
Auto-validates triage assessments with multi-level reasoning
"""

import os
import json
import boto3
from typing import Dict, Any, List

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
bedrock = boto3.client('bedrock-runtime')

class SupervisorValidationAgent:
    """Autonomous agent for validating triage assessments"""
    
    def __init__(self):
        self.episode_table_name = os.environ.get('EPISODE_TABLE_NAME', 'healthcare-episodes')
        self.notification_topic = os.environ.get('NOTIFICATION_TOPIC_ARN', '')
        
    def run_multi_level_reasoning(self, validation_request: Dict) -> Dict:
        """
        Multi-Level Reasoning Engine
        Performs 6 levels of analysis before making a decision
        """
        reasoning = []
        risk_factors = []
        auto_approve = False
        confidence = validation_request.get('confidence', 0)
        
        # Level 1: Confidence Check
        if confidence >= 85:
            reasoning.append(f"High AI confidence ({confidence}%) indicates reliable assessment")
            auto_approve = True
        elif confidence >= 70:
            reasoning.append(f"Moderate confidence ({confidence}%) - proceeding with additional checks")
        else:
            reasoning.append(f"Low confidence ({confidence}%) - requires human review")
            return {
                'decision': 'escalate_to_human',
                'reasoning': '. '.join(reasoning) + '. Human expertise needed for accurate assessment.',
                'autoApproved': False,
                'confidenceScore': confidence,
                'riskFactors': ['Low AI confidence'],
                'clinicalJustification': 'Insufficient confidence for autonomous decision-making'
            }
        
        # Level 2: Severity Analysis
        severity = validation_request.get('severity', 0)
        urgency = validation_request.get('urgencyLevel', '')
        
        if severity >= 8:
            reasoning.append('High severity score warrants immediate attention')
            risk_factors.append('High severity (≥8/10)')
            if urgency == 'emergency':
                reasoning.append('Emergency classification aligns with severity')
                auto_approve = True
        elif severity <= 4:
            reasoning.append('Low severity indicates routine care appropriate')
            auto_approve = True
        
        # Level 3: Pattern Matching
        symptoms = str(validation_request.get('symptoms', '')).lower()
        
        if 'chest pain' in symptoms and 'shortness of breath' in symptoms:
            reasoning.append('Matches known pattern for emergency care')
            if urgency == 'emergency':
                auto_approve = True
        
        # Level 4: Vital Signs Check
        vital_signs = validation_request.get('vitalSigns', {})
        hr = vital_signs.get('heartRate', 0)
        
        if hr > 100:
            reasoning.append('Elevated vital signs support urgency assessment')
            risk_factors.append('Abnormal vital signs')
        elif hr < 90 and hr > 0:
            reasoning.append('Normal vital signs consistent with lower urgency')
        
        # Level 5: Flag Check
        flag_reason = validation_request.get('flagReason')
        if flag_reason:
            reasoning.append('Case flagged for review - escalating to human supervisor')
            risk_factors.append('Flagged for review')
            return {
                'decision': 'escalate_to_human',
                'reasoning': '. '.join(reasoning) + '. ' + flag_reason,
                'autoApproved': False,
                'confidenceScore': confidence,
                'riskFactors': risk_factors,
                'clinicalJustification': flag_reason
            }
        
        # Final Decision
        if auto_approve and confidence >= 75 and len(risk_factors) <= 1:
            reasoning.append('All checks passed - auto-approving assessment')
            return {
                'decision': 'auto_approve',
                'reasoning': '. '.join(reasoning) + '. Assessment validated through multi-level AI reasoning.',
                'autoApproved': True,
                'confidenceScore': confidence,
                'riskFactors': risk_factors,
                'clinicalJustification': 'Multi-level analysis confirms appropriate triage decision'
            }
        else:
            reasoning.append('Uncertain factors detected - human review recommended')
            return {
                'decision': 'escalate_to_human',
                'reasoning': '. '.join(reasoning) + '. Human expertise will ensure optimal care decision.',
                'autoApproved': False,
                'confidenceScore': confidence,
                'riskFactors': risk_factors,
                'clinicalJustification': 'Complex case requiring human clinical judgment'
            }
    
    def validate(self, validation_request: Dict) -> Dict:
        """Main validation method"""
        return self.run_multi_level_reasoning(validation_request)

# Create agent instance
agent = SupervisorValidationAgent()

def lambda_handler(event, context):
    """AWS Lambda handler"""
    try:
        # Parse request
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        validation_request = body.get('validation', body)
        
        # Run validation
        result = agent.validate(validation_request)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
    except Exception as e:
        print(f"Handler error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
