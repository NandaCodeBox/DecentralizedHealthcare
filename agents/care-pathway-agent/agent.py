"""
Care Pathway Orchestrator Agent - AWS Bedrock AgentCore
Autonomously manages patient journey from triage to recovery
"""

import os
import json
import boto3
from typing import Dict, Any
from datetime import datetime, timedelta
from bedrock_agentcore import AgentCoreRuntime

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
bedrock = boto3.client('bedrock-runtime')

# Initialize AgentCore Runtime
runtime = AgentCoreRuntime()

class CarePathwayOrchestratorAgent:
    """Autonomous agent for coordinating patient care pathways"""
    
    def __init__(self):
        self.episode_table = dynamodb.Table(os.environ.get('EPISODE_TABLE_NAME', 'healthcare-episodes'))
        self.patient_table = dynamodb.Table(os.environ.get('PATIENT_TABLE_NAME', 'healthcare-patients'))
        self.notification_topic = os.environ.get('NOTIFICATION_TOPIC_ARN', '')
        
        # Care pathway stages
        self.stage_transitions = {
            'triage': 'primary_care',
            'primary_care': 'specialist_referral',
            'specialist_referral': 'treatment',
            'treatment': 'follow_up',
            'follow_up': 'closed'
        }
    
    def get_episode_data(self, episode_id: str) -> Dict:
        """Get episode data from DynamoDB"""
        try:
            response = self.episode_table.get_item(Key={'episodeId': episode_id})
            return response.get('Item', {})
        except Exception as e:
            print(f"Error getting episode: {e}")
            return {}
    
    def get_patient_history(self, patient_id: str) -> list:
        """Get patient history from DynamoDB"""
        try:
            response = self.episode_table.query(
                IndexName='PatientEpisodesIndex',
                KeyConditionExpression='patientId = :pid',
                ExpressionAttributeValues={':pid': patient_id},
                Limit=10,
                ScanIndexForward=False
            )
            return response.get('Items', [])
        except Exception as e:
            print(f"Error getting patient history: {e}")
            return []
    
    def schedule_appointment(self, patient_id: str, provider_type: str, urgency: str) -> Dict:
        """Schedule appointment based on urgency"""
        # Calculate appointment time based on urgency
        now = datetime.now()
        if urgency == 'emergency':
            appointment_time = now + timedelta(hours=2)
        elif urgency == 'urgent':
            appointment_time = now + timedelta(days=2)
        else:
            appointment_time = now + timedelta(weeks=1)
        
        return {
            'appointmentId': f"APT-{patient_id}-{int(now.timestamp())}",
            'scheduledTime': appointment_time.isoformat(),
            'providerType': provider_type,
            'status': 'scheduled'
        }
    
    def send_notification(self, recipient: str, message: str, urgency: str) -> bool:
        """Send notification via SNS"""
        try:
            sns.publish(
                TopicArn=self.notification_topic,
                Subject=f'Care Pathway Update - {urgency.upper()}',
                Message=json.dumps({
                    'recipient': recipient,
                    'message': message,
                    'urgency': urgency,
                    'timestamp': datetime.now().isoformat()
                })
            )
            return True
        except Exception as e:
            print(f"Error sending notification: {e}")
            return False
    
    def update_episode_stage(self, episode_id: str, next_stage: str, actions: list) -> bool:
        """Update episode with new care stage"""
        try:
            self.episode_table.update_item(
                Key={'episodeId': episode_id},
                UpdateExpression='SET careStage = :stage, lastUpdated = :timestamp, orchestrationActions = :actions',
                ExpressionAttributeValues={
                    ':stage': next_stage,
                    ':timestamp': datetime.now().isoformat(),
                    ':actions': json.dumps(actions)
                }
            )
            return True
        except Exception as e:
            print(f"Error updating episode: {e}")
            return False
    
    def orchestrate_care_pathway(self, request: Dict) -> Dict:
        """Main orchestration logic using Bedrock"""
        episode_id = request.get('episodeId')
        current_stage = request.get('currentStage')
        urgency_level = request.get('urgencyLevel', 'routine')
        
        # Get episode and patient data
        episode_data = self.get_episode_data(episode_id)
        patient_id = episode_data.get('patientId', request.get('patientId'))
        patient_history = self.get_patient_history(patient_id)
        
        # Use Bedrock to determine optimal care pathway
        prompt = f"""You are a healthcare care pathway orchestrator AI. Analyze this patient's care journey and determine the next optimal steps.

Current Situation:
- Episode ID: {episode_id}
- Current Stage: {current_stage}
- Urgency Level: {urgency_level}
- Diagnosis: {request.get('diagnosis', 'Not yet diagnosed')}
- Treatment Plan: {request.get('treatmentPlan', 'Not yet created')}

Episode Data:
{json.dumps(episode_data, indent=2)}

Patient History (last 5 episodes):
{json.dumps(patient_history[:5], indent=2)}

Care Pathway Stages:
1. triage → primary_care (initial assessment)
2. primary_care → specialist_referral (if specialist needed)
3. specialist_referral → treatment (specialist consultation)
4. treatment → follow_up (treatment completion)
5. follow_up → closed (recovery confirmed)

Your Task:
1. Determine the next stage in the care pathway
2. List specific actions to take (schedule appointments, send reminders, coordinate providers)
3. Provide timeline for each action
4. Identify if human escalation is needed
5. Generate notifications for patient and providers

Respond in JSON format:
{{
  "nextStage": "stage_name",
  "actions": ["action1", "action2"],
  "timeline": "timeframe description",
  "reasoning": "clinical justification",
  "autoScheduled": true/false,
  "notifications": [
    {{"recipient": "patient/provider", "message": "text", "urgency": "high/medium/low"}}
  ],
  "escalationNeeded": true/false
}}"""

        try:
            response = bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                contentType='application/json',
                accept='application/json',
                body=json.dumps({
                    'anthropic_version': 'bedrock-2023-05-31',
                    'max_tokens': 1000,
                    'temperature': 0.2,
                    'messages': [{'role': 'user', 'content': prompt}]
                })
            )
            
            response_body = json.loads(response['body'].read())
            content = response_body['content'][0]['text']
            
            # Extract JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                decision = json.loads(json_match.group(0))
                
                # Execute autonomous actions
                self.execute_actions(decision, episode_id, patient_id, urgency_level)
                
                return decision
        except Exception as e:
            print(f"Bedrock error: {e}")
        
        # Fallback to rule-based orchestration
        return self.fallback_orchestration(current_stage, urgency_level)
    
    def fallback_orchestration(self, current_stage: str, urgency_level: str) -> Dict:
        """Fallback rule-based orchestration"""
        next_stage = self.stage_transitions.get(current_stage, 'follow_up')
        
        return {
            'nextStage': next_stage,
            'actions': [
                'Schedule next appointment',
                'Send patient reminder',
                'Update care team'
            ],
            'timeline': 'Within 24-48 hours',
            'reasoning': 'Standard care pathway progression',
            'autoScheduled': True,
            'notifications': [
                {
                    'recipient': 'patient',
                    'message': 'Your next appointment has been scheduled',
                    'urgency': 'medium'
                }
            ],
            'escalationNeeded': False
        }
    
    def execute_actions(self, decision: Dict, episode_id: str, patient_id: str, urgency: str):
        """Execute autonomous actions"""
        # Schedule appointments if needed
        if decision.get('autoScheduled'):
            appointment = self.schedule_appointment(patient_id, decision['nextStage'], urgency)
            print(f"Scheduled appointment: {appointment}")
        
        # Send notifications
        for notification in decision.get('notifications', []):
            self.send_notification(
                notification['recipient'],
                notification['message'],
                notification['urgency']
            )
        
        # Update episode
        self.update_episode_stage(episode_id, decision['nextStage'], decision['actions'])
    
    def orchestrate(self, request: Dict) -> Dict:
        """Main orchestration method"""
        return self.orchestrate_care_pathway(request)

# Create agent instance
agent = CarePathwayOrchestratorAgent()

# AgentCore handler
@runtime.handler
def handler(event, context):
    """Main handler for AgentCore Runtime"""
    try:
        body = json.loads(event.get('body', '{}'))
        request = body.get('request', body)
        
        result = agent.orchestrate(request)
        
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
