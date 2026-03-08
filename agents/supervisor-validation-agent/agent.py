"""
Supervisor Validation Agent - AWS Bedrock AgentCore
Auto-validates triage assessments with multi-level reasoning
"""

import os
import json
import boto3
from typing import Dict, Any, List
from bedrock_agentcore import AgentCoreRuntime

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
bedrock = boto3.client('bedrock-runtime')

# Initialize AgentCore Runtime
runtime = AgentCoreRuntime()

class SupervisorValidationAgent:
    """Autonomous agent for validating triage assessments"""
    
    def __init__(self):
        self.episode_table = dynamodb.Table(os.environ.get('EPISODE_TABLE_NAME', 'healthcare-episodes'))
        self.notification_topic = os.environ.get('NOTIFICATION_TOPIC_ARN', '')
        
    def query_episode_data(self, episode_id: str) -> Dict[str, Any]:
        """Query episode data from DynamoDB"""
        try:
            response = self.episode_table.get_item(Key={'episodeId': episode_id})
            return response.get('Item', {})
        except Exception as e:
            print(f"Error querying episode: {e}")
            return {}
    
    def send_supervisor_alert(self, episode_id: str, message: str, urgency: str) -> bool:
        """Send alert to supervisor via SNS"""
        try:
            sns.publish(
                TopicArn=self.notification_topic,
                Subject=f'Supervisor Alert - {urgency.upper()}',
                Message=json.dumps({
                    'episodeId': episode_id,
                    'message': message,
                    'urgency': urgency,
                    'timestamp': str(boto3.client('sts').get_caller_identity())
                })
            )
            return True
        except Exception as e:
            print(f"Error sending alert: {e}")
            return False
    
    def update_validation_status(self, episode_id: str, status: str, reasoning: str, decision: Dict) -> bool:
        """Update validation status in DynamoDB"""
        try:
            self.episode_table.update_item(
                Key={'episodeId': episode_id},
                UpdateExpression='SET validationStatus = :status, aiReasoning = :reasoning, agenticAIDecision = :decision, lastUpdated = :timestamp',
                ExpressionAttributeValues={
                    ':status': status,
                    ':reasoning': reasoning,
                    ':decision': json.dumps(decision),
                    ':timestamp': str(boto3.client('sts').get_caller_identity())
                }
            )
            return True
        except Exception as e:
            print(f"Error updating validation: {e}")
            return False
    
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
        symptoms = validation_request.get('symptoms', '').lower()
        common_patterns = [
            {'symptoms': ['fever', 'cough'], 'urgency': 'urgent'},
            {'symptoms': ['headache', 'fatigue'], 'urgency': 'routine'},
            {'symptoms': ['chest pain', 'shortness of breath'], 'urgency': 'emergency'},
            {'symptoms': ['abdominal pain', 'vomiting'], 'urgency': 'urgent'},
        ]
        
        matched_pattern = None
        for pattern in common_patterns:
            if all(s in symptoms for s in pattern['symptoms']):
                matched_pattern = pattern
                break
        
        if matched_pattern:
            reasoning.append(f"Matches known pattern for {matched_pattern['urgency']} care")
            if urgency == matched_pattern['urgency']:
                reasoning.append('Assessment aligns with established clinical patterns')
                auto_approve = True
            else:
                risk_factors.append('Urgency mismatch with clinical pattern')
        
        # Level 4: Vital Signs Check
        vital_signs = validation_request.get('vitalSigns', {})
        hr = vital_signs.get('heartRate', 0)
        temp_str = vital_signs.get('temperature', '98.6°F')
        temp = float(temp_str.replace('°F', '').strip())
        
        if hr > 100 or temp > 101:
            reasoning.append('Elevated vital signs support urgency assessment')
            risk_factors.append('Abnormal vital signs')
        elif hr < 90 and temp < 100:
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
        
        # Level 6: Bedrock Advanced Reasoning (for complex cases)
        if not auto_approve or len(risk_factors) > 1:
            bedrock_result = self.invoke_bedrock_reasoning(validation_request, reasoning, risk_factors)
            if bedrock_result:
                reasoning.append(bedrock_result['reasoning'])
                auto_approve = bedrock_result['autoApprove']
                confidence = bedrock_result['confidence']
                if bedrock_result.get('additionalRisks'):
                    risk_factors.extend(bedrock_result['additionalRisks'])
        
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
    
    def invoke_bedrock_reasoning(self, validation_request: Dict, current_reasoning: List[str], risk_factors: List[str]) -> Dict:
        """Invoke Amazon Bedrock for advanced clinical reasoning"""
        try:
            prompt = f"""You are a medical AI assistant helping with triage decisions. Analyze this case and provide clinical reasoning.

Patient Information:
- Age: {validation_request.get('age')}
- Symptoms: {validation_request.get('symptoms')}
- Primary Complaint: {validation_request.get('primaryComplaint')}
- Duration: {validation_request.get('duration')}
- Severity: {validation_request.get('severity')}/10
- Vital Signs: {json.dumps(validation_request.get('vitalSigns', {}))}

Current Assessment:
- Urgency Level: {validation_request.get('urgencyLevel')}
- AI Confidence: {validation_request.get('confidence')}%
- AI Reasoning: {validation_request.get('aiReasoning')}

Current Analysis:
{'. '.join(current_reasoning)}

Risk Factors Identified:
{', '.join(risk_factors) if risk_factors else 'None'}

Question: Should this assessment be auto-approved or escalated to human review?

Provide your response in JSON format:
{{
  "autoApprove": true/false,
  "confidence": 0-100,
  "reasoning": "Brief clinical justification",
  "additionalRisks": ["risk1", "risk2"] or []
}}"""

            response = bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                contentType='application/json',
                accept='application/json',
                body=json.dumps({
                    'anthropic_version': 'bedrock-2023-05-31',
                    'max_tokens': 500,
                    'temperature': 0.1,
                    'messages': [{'role': 'user', 'content': prompt}]
                })
            )
            
            response_body = json.loads(response['body'].read())
            content = response_body['content'][0]['text']
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                result = json.loads(json_match.group(0))
                return {
                    'reasoning': result.get('reasoning', ''),
                    'autoApprove': result.get('autoApprove', False),
                    'confidence': result.get('confidence', 50),
                    'additionalRisks': result.get('additionalRisks', [])
                }
        except Exception as e:
            print(f"Bedrock error: {e}")
        
        return None
    
    def validate(self, validation_request: Dict) -> Dict:
        """Main validation method"""
        # Run multi-level reasoning
        decision = self.run_multi_level_reasoning(validation_request)
        
        # Update episode in DynamoDB
        episode_id = validation_request.get('id', 'unknown')
        status = 'approved' if decision['autoApproved'] else 'pending_human_review'
        self.update_validation_status(episode_id, status, decision['reasoning'], decision)
        
        # Send alert if escalated
        if decision['decision'] == 'escalate_to_human':
            self.send_supervisor_alert(
                episode_id,
                f"Case requires human review: {decision['clinicalJustification']}",
                'high' if len(decision['riskFactors']) > 2 else 'medium'
            )
        
        return decision

# Create agent instance
agent = SupervisorValidationAgent()

# AgentCore handler
@runtime.handler
def handler(event, context):
    """Main handler for AgentCore Runtime"""
    try:
        # Parse request
        body = json.loads(event.get('body', '{}'))
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
