"""
Clinical Decision Support Agent - AWS Bedrock AgentCore
AI-powered diagnosis and treatment recommendations for doctors
"""

import os
import json
import boto3
from typing import Dict, Any, List
from bedrock_agentcore import AgentCoreRuntime

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

# Initialize AgentCore Runtime
runtime = AgentCoreRuntime()

class ClinicalDecisionSupportAgent:
    """Autonomous agent for clinical decision support"""
    
    def __init__(self):
        self.patient_table = dynamodb.Table(os.environ.get('PATIENT_TABLE_NAME', 'healthcare-patients'))
        self.episode_table = dynamodb.Table(os.environ.get('EPISODE_TABLE_NAME', 'healthcare-episodes'))
    
    def get_patient_data(self, patient_id: str) -> Dict:
        """Get patient data from DynamoDB"""
        try:
            response = self.patient_table.get_item(Key={'patientId': patient_id})
            return response.get('Item', {})
        except Exception as e:
            print(f"Error getting patient: {e}")
            return {}
    
    def analyze_clinical_case(self, request: Dict) -> Dict:
        """Main clinical analysis using Bedrock"""
        patient_id = request.get('patientId', '')
        symptoms = request.get('symptoms', [])
        vital_signs = request.get('vitalSigns', {})
        medical_history = request.get('medicalHistory', [])
        current_medications = request.get('currentMedications', [])
        allergies = request.get('allergies', [])
        
        # Get patient data
        patient_data = self.get_patient_data(patient_id)
        age = patient_data.get('age', request.get('age', 'Unknown'))
        gender = patient_data.get('gender', request.get('gender', 'Unknown'))
        
        # Build comprehensive prompt for Bedrock
        prompt = f"""You are an expert clinical decision support AI assistant. Analyze this patient case and provide comprehensive clinical recommendations.

Patient Information:
- Age: {age}
- Gender: {gender}
- Medical History: {', '.join(medical_history) if medical_history else 'None reported'}
- Current Medications: {', '.join(current_medications) if current_medications else 'None'}
- Allergies: {', '.join(allergies) if allergies else 'None known'}

Current Presentation:
- Symptoms: {', '.join(symptoms)}
- Vital Signs: {json.dumps(vital_signs)}

Your Task:
1. Generate differential diagnoses with probability and reasoning
2. Recommend diagnostic tests with priority
3. Suggest evidence-based treatments
4. Check for drug interactions with current medications
5. Identify red flags requiring immediate attention
6. Determine if specialist referral is needed

IMPORTANT: Consider Indian healthcare context:
- Common tropical diseases (dengue, malaria, typhoid)
- Dietary factors (vegetarian diet, regional cuisine)
- Socioeconomic factors (access to care, medication affordability)
- Cultural considerations

Respond in JSON format:
{{
  "differentialDiagnoses": [
    {{
      "diagnosis": "condition name",
      "probability": 0-100,
      "reasoning": "clinical justification",
      "urgency": "emergency/urgent/routine"
    }}
  ],
  "recommendedTests": [
    {{
      "test": "test name",
      "priority": "high/medium/low",
      "reasoning": "why this test"
    }}
  ],
  "treatmentSuggestions": [
    {{
      "treatment": "treatment description",
      "evidence": "evidence base",
      "contraindications": ["contraindication1"]
    }}
  ],
  "drugInteractions": [
    {{
      "drugs": ["drug1", "drug2"],
      "severity": "severe/moderate/mild",
      "recommendation": "what to do"
    }}
  ],
  "redFlags": ["red flag 1", "red flag 2"],
  "confidence": 0-100,
  "requiresSpecialist": true/false,
  "specialtyRecommendation": "specialty name if needed"
}}"""

        try:
            response = bedrock.invoke_model(
                modelId='anthropic.claude-3-haiku-20240307-v1:0',
                contentType='application/json',
                accept='application/json',
                body=json.dumps({
                    'anthropic_version': 'bedrock-2023-05-31',
                    'max_tokens': 2000,
                    'temperature': 0.1,  # Low temperature for medical accuracy
                    'messages': [{'role': 'user', 'content': prompt}]
                })
            )
            
            response_body = json.loads(response['body'].read())
            content = response_body['content'][0].text']
            
            # Extract JSON
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                decision = json.loads(json_match.group(0))
                
                # Store decision for learning
                self.store_clinical_decision(request.get('episodeId', ''), decision)
                
                return decision
        except Exception as e:
            print(f"Bedrock error: {e}")
        
        # Fallback to rule-based clinical decision
        return self.fallback_clinical_decision(symptoms, vital_signs)
    
    def fallback_clinical_decision(self, symptoms: List[str], vital_signs: Dict) -> Dict:
        """Fallback rule-based clinical decision"""
        symptoms_str = ' '.join(symptoms).lower()
        
        diagnoses = []
        tests = []
        treatments = []
        red_flags = []
        
        # Check for emergency symptoms
        if 'chest pain' in symptoms_str and 'shortness of breath' in symptoms_str:
            diagnoses.append({
                'diagnosis': 'Possible cardiac event or pulmonary embolism',
                'probability': 70,
                'reasoning': 'Chest pain with breathing difficulty requires immediate evaluation',
                'urgency': 'emergency'
            })
            tests.append({
                'test': 'ECG and Cardiac Troponin',
                'priority': 'high',
                'reasoning': 'Rule out myocardial infarction'
            })
            red_flags.append('Chest pain with breathing difficulty')
        
        if 'fever' in symptoms_str:
            diagnoses.append({
                'diagnosis': 'Infectious disease (viral or bacterial)',
                'probability': 60,
                'reasoning': 'Fever indicates possible infection',
                'urgency': 'urgent'
            })
            tests.append({
                'test': 'Complete Blood Count (CBC)',
                'priority': 'high',
                'reasoning': 'Assess infection markers'
            })
        
        if not diagnoses:
            diagnoses.append({
                'diagnosis': 'Requires clinical evaluation',
                'probability': 50,
                'reasoning': 'Symptoms require in-person assessment',
                'urgency': 'routine'
            })
        
        if not tests:
            tests.append({
                'test': 'Complete Blood Count (CBC)',
                'priority': 'medium',
                'reasoning': 'Baseline assessment'
            })
        
        treatments.append({
            'treatment': 'Symptomatic relief and monitoring',
            'evidence': 'Standard care protocol',
            'contraindications': []
        })
        
        return {
            'differentialDiagnoses': diagnoses,
            'recommendedTests': tests,
            'treatmentSuggestions': treatments,
            'drugInteractions': [],
            'redFlags': red_flags,
            'confidence': 50,
            'requiresSpecialist': len(red_flags) > 0,
            'specialtyRecommendation': 'Cardiology' if red_flags else None
        }
    
    def store_clinical_decision(self, episode_id: str, decision: Dict):
        """Store clinical decision for learning and audit"""
        if not episode_id:
            return
        
        try:
            self.episode_table.update_item(
                Key={'episodeId': episode_id},
                UpdateExpression='SET clinicalDecision = :decision, lastUpdated = :timestamp',
                ExpressionAttributeValues={
                    ':decision': json.dumps(decision),
                    ':timestamp': boto3.client('sts').get_caller_identity()
                }
            )
        except Exception as e:
            print(f"Error storing decision: {e}")
    
    def analyze(self, request: Dict) -> Dict:
        """Main analysis method"""
        return self.analyze_clinical_case(request)

# Create agent instance
agent = ClinicalDecisionSupportAgent()

# AgentCore handler
@runtime.handler
def handler(event, context):
    """Main handler for AgentCore Runtime"""
    try:
        body = json.loads(event.get('body', '{}'))
        request = body.get('request', body)
        
        result = agent.analyze(request)
        
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
