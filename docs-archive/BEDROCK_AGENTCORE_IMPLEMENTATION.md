# AWS Bedrock AgentCore Implementation

## What is AWS Bedrock AgentCore?

AWS Bedrock AgentCore is AWS's **production-grade framework for autonomous AI agents**. It's not just calling Bedrock - it's a complete infrastructure layer that provides:

- 🚀 **Serverless Runtime**: Managed environment for running agents at scale
- 🔒 **Session Isolation**: Secure, isolated execution per user
- 📊 **Built-in Observability**: CloudWatch logging and metrics
- 🔄 **Memory Management**: Persistent conversation memory
- 🛠️ **Tool Integration**: Connect agents to external tools and APIs
- 🌐 **Gateway**: Secure access to resources
- 📦 **Framework Agnostic**: Works with LangGraph, Strands Agents, CrewAI, etc.

## Why AgentCore vs Direct Bedrock Calls?

| Feature | Direct Bedrock | AgentCore |
|---------|---------------|-----------|
| **Deployment** | Manual Lambda setup | One-command deploy |
| **Scaling** | Manual configuration | Automatic serverless |
| **Memory** | Build yourself | Built-in session memory |
| **Tools** | Manual integration | Framework-provided |
| **Observability** | Manual CloudWatch | Automatic logging |
| **Security** | Manual IAM | Built-in isolation |
| **Cost** | Pay per Lambda | Pay per agent session |

## Our Three Agents with AgentCore

### Agent 1: Supervisor Validation Agent
**Purpose**: Auto-validate triage assessments with multi-level reasoning

**AgentCore Features Used**:
- Session memory (remembers previous validations)
- Tool integration (DynamoDB queries, SNS alerts)
- Observability (tracks approval rates)

### Agent 2: Care Pathway Orchestrator Agent
**Purpose**: Autonomous care coordination from triage to recovery

**AgentCore Features Used**:
- Long-running sessions (tracks patient journey)
- Multiple tools (scheduling, notifications, record transfer)
- State management (current care stage)

### Agent 3: Clinical Decision Support Agent
**Purpose**: AI-powered diagnosis and treatment recommendations

**AgentCore Features Used**:
- Medical knowledge base integration
- Tool calling (lab results, drug databases)
- Explainable reasoning (audit trail)

## Implementation Steps

### Step 1: Install AgentCore CLI
```bash
pip install bedrock-agentcore-starter-toolkit
```

### Step 2: Create Agent Projects
```bash
# Agent 1: Supervisor Validation
agentcore create --name supervisor-validation-agent --framework strands --model bedrock

# Agent 2: Care Pathway Orchestrator
agentcore create --name care-pathway-agent --framework strands --model bedrock

# Agent 3: Clinical Decision Support
agentcore create --name clinical-decision-agent --framework strands --model bedrock
```

### Step 3: Implement Agent Logic

Each agent gets a Python project with this structure:
```
supervisor-validation-agent/
├── agent.py              # Main agent logic
├── tools/                # Custom tools
│   ├── dynamodb_tool.py
│   ├── sns_tool.py
│   └── bedrock_tool.py
├── requirements.txt      # Dependencies
├── config.yaml          # Agent configuration
└── tests/               # Unit tests
```

### Step 4: Deploy to AgentCore Runtime
```bash
# Deploy all three agents
agentcore deploy --agent supervisor-validation-agent
agentcore deploy --agent care-pathway-agent
agentcore deploy --agent clinical-decision-agent
```

### Step 5: Invoke Agents
```bash
# Test Agent 1
agentcore invoke supervisor-validation-agent '{"validation": {...}}'

# Test Agent 2
agentcore invoke care-pathway-agent '{"episodeId": "123", "stage": "triage"}'

# Test Agent 3
agentcore invoke clinical-decision-agent '{"symptoms": [...], "vitals": {...}}'
```

## Agent 1: Supervisor Validation Agent (AgentCore)

### agent.py
```python
from strands_agents import Agent, tool
from bedrock_agentcore import AgentCoreRuntime
import boto3

# Initialize AgentCore Runtime
runtime = AgentCoreRuntime()

# Define tools
@tool
def query_episode_data(episode_id: str) -> dict:
    """Query episode data from DynamoDB"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('healthcare-episodes')
    response = table.get_item(Key={'episodeId': episode_id})
    return response.get('Item', {})

@tool
def send_supervisor_alert(episode_id: str, message: str, urgency: str) -> bool:
    """Send alert to supervisor via SNS"""
    sns = boto3.client('sns')
    sns.publish(
        TopicArn=os.environ['NOTIFICATION_TOPIC_ARN'],
        Subject=f'Supervisor Alert - {urgency.upper()}',
        Message=message
    )
    return True

@tool
def update_validation_status(episode_id: str, status: str, reasoning: str) -> bool:
    """Update validation status in DynamoDB"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('healthcare-episodes')
    table.update_item(
        Key={'episodeId': episode_id},
        UpdateExpression='SET validationStatus = :status, aiReasoning = :reasoning',
        ExpressionAttributeValues={
            ':status': status,
            ':reasoning': reasoning
        }
    )
    return True

# Create agent with tools
agent = Agent(
    name="SupervisorValidationAgent",
    model="anthropic.claude-3-haiku-20240307-v1:0",
    tools=[query_episode_data, send_supervisor_alert, update_validation_status],
    system_prompt="""You are a medical supervisor validation agent. Your role is to:
    
    1. Analyze triage assessments using multi-level reasoning
    2. Auto-approve straightforward cases (70-80%)
    3. Escalate complex cases to human supervisors
    4. Provide detailed clinical reasoning for all decisions
    
    Multi-Level Reasoning Process:
    - Level 1: Confidence Check (≥85% = approve, <70% = escalate)
    - Level 2: Severity Analysis (validate severity vs urgency)
    - Level 3: Pattern Matching (known clinical patterns)
    - Level 4: Vital Signs Check (abnormal values)
    - Level 5: Flag Assessment (any red flags)
    - Level 6: Final Decision (auto-approve or escalate)
    
    Always provide:
    - Decision (auto_approve or escalate_to_human)
    - Detailed reasoning
    - Confidence score
    - Risk factors identified
    - Clinical justification
    """,
    memory=True,  # Enable session memory
    observability=True  # Enable CloudWatch logging
)

# AgentCore handler
@runtime.handler
def validate_triage(event, context):
    """Main handler for triage validation"""
    validation_request = event['body']
    
    # Agent processes the request
    result = agent.run(f"""
    Validate this triage assessment:
    
    Patient: {validation_request['patientName']}, Age {validation_request['age']}
    Symptoms: {validation_request['symptoms']}
    Severity: {validation_request['severity']}/10
    Urgency: {validation_request['urgencyLevel']}
    AI Confidence: {validation_request['confidence']}%
    Vital Signs: HR {validation_request['vitalSigns']['heartRate']}, 
                 BP {validation_request['vitalSigns']['bloodPressure']}, 
                 Temp {validation_request['vitalSigns']['temperature']}
    
    Perform multi-level reasoning and decide: auto-approve or escalate to human?
    """)
    
    return {
        'statusCode': 200,
        'body': result
    }
```

### config.yaml
```yaml
agent:
  name: supervisor-validation-agent
  runtime: bedrock-agentcore
  model: anthropic.claude-3-haiku-20240307-v1:0
  memory:
    enabled: true
    type: dynamodb
    ttl: 86400  # 24 hours
  observability:
    cloudwatch: true
    metrics: true
  tools:
    - query_episode_data
    - send_supervisor_alert
    - update_validation_status
  iam_permissions:
    - dynamodb:GetItem
    - dynamodb:UpdateItem
    - sns:Publish
    - bedrock:InvokeModel
```

## Agent 2: Care Pathway Orchestrator (AgentCore)

### agent.py
```python
from strands_agents import Agent, tool
from bedrock_agentcore import AgentCoreRuntime

runtime = AgentCoreRuntime()

@tool
def schedule_appointment(patient_id: str, provider_id: str, appointment_type: str, urgency: str) -> dict:
    """Automatically schedule appointment based on urgency and availability"""
    # Implementation
    pass

@tool
def send_patient_reminder(patient_id: str, appointment_details: dict) -> bool:
    """Send SMS/email reminder to patient"""
    pass

@tool
def transfer_medical_records(from_provider: str, to_provider: str, patient_id: str) -> bool:
    """Transfer medical records between providers"""
    pass

@tool
def monitor_treatment_adherence(patient_id: str, episode_id: str) -> dict:
    """Check if patient is following treatment plan"""
    pass

agent = Agent(
    name="CarePathwayOrchestratorAgent",
    model="anthropic.claude-3-haiku-20240307-v1:0",
    tools=[schedule_appointment, send_patient_reminder, transfer_medical_records, monitor_treatment_adherence],
    system_prompt="""You are an autonomous care pathway orchestrator. Your role is to:
    
    1. Monitor patient progress through care stages
    2. Automatically schedule appointments
    3. Coordinate between primary and secondary care
    4. Send reminders and notifications
    5. Escalate if patient condition worsens
    
    Care Pathway Stages:
    Triage → Primary Care → Specialist Referral → Treatment → Follow-up → Closed
    
    For each stage transition:
    - Determine next optimal stage
    - Schedule required appointments
    - Notify all stakeholders
    - Set up reminders
    - Monitor progress
    """,
    memory=True,
    observability=True
)

@runtime.handler
def orchestrate_care(event, context):
    request = event['body']
    result = agent.run(f"""
    Orchestrate care pathway for:
    Episode ID: {request['episodeId']}
    Current Stage: {request['currentStage']}
    Urgency: {request['urgencyLevel']}
    
    Determine next stage and execute all necessary actions.
    """)
    return {'statusCode': 200, 'body': result}
```

## Agent 3: Clinical Decision Support (AgentCore)

### agent.py
```python
from strands_agents import Agent, tool
from bedrock_agentcore import AgentCoreRuntime

runtime = AgentCoreRuntime()

@tool
def query_medical_knowledge_base(symptoms: list, patient_history: dict) -> dict:
    """Query medical knowledge base for differential diagnoses"""
    pass

@tool
def check_drug_interactions(current_medications: list, proposed_medication: str) -> dict:
    """Check for drug interactions"""
    pass

@tool
def get_treatment_guidelines(diagnosis: str) -> dict:
    """Get evidence-based treatment guidelines"""
    pass

@tool
def calculate_risk_score(patient_data: dict) -> dict:
    """Calculate patient risk scores"""
    pass

agent = Agent(
    name="ClinicalDecisionSupportAgent",
    model="anthropic.claude-3-haiku-20240307-v1:0",
    tools=[query_medical_knowledge_base, check_drug_interactions, get_treatment_guidelines, calculate_risk_score],
    system_prompt="""You are a clinical decision support AI assistant. Your role is to:
    
    1. Generate differential diagnoses with probabilities
    2. Recommend diagnostic tests with priorities
    3. Suggest evidence-based treatments
    4. Check for drug interactions
    5. Identify red flags requiring immediate attention
    6. Determine if specialist referral is needed
    
    Consider Indian healthcare context:
    - Common tropical diseases (dengue, malaria, typhoid)
    - Dietary factors (vegetarian diet, regional cuisine)
    - Socioeconomic factors (medication affordability)
    - Cultural considerations
    
    Always provide:
    - Differential diagnoses (with probabilities)
    - Recommended tests (with priorities)
    - Treatment suggestions (evidence-based)
    - Drug interaction warnings
    - Red flags
    - Specialist referral recommendation
    """,
    memory=True,
    observability=True
)

@runtime.handler
def analyze_clinical_case(event, context):
    request = event['body']
    result = agent.run(f"""
    Analyze this clinical case:
    
    Patient: Age {request['age']}, {request.get('gender', 'Unknown')}
    Symptoms: {', '.join(request['symptoms'])}
    Vital Signs: {request['vitalSigns']}
    Medical History: {request.get('medicalHistory', [])}
    Current Medications: {request.get('currentMedications', [])}
    
    Provide comprehensive clinical decision support.
    """)
    return {'statusCode': 200, 'body': result}
```

## Deployment with CDK

### cdk-stack.ts
```typescript
import * as cdk from 'aws-cdk-lib';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore';

// Agent 1: Supervisor Validation
const supervisorAgent = new agentcore.Agent(this, 'SupervisorValidationAgent', {
  agentName: 'supervisor-validation-agent',
  sourceCode: agentcore.Code.fromAsset('agents/supervisor-validation'),
  runtime: agentcore.Runtime.PYTHON_3_12,
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  memory: {
    enabled: true,
    ttl: cdk.Duration.days(1),
  },
  observability: {
    cloudWatch: true,
    metrics: true,
  },
});

// Agent 2: Care Pathway Orchestrator
const carePathwayAgent = new agentcore.Agent(this, 'CarePathwayAgent', {
  agentName: 'care-pathway-agent',
  sourceCode: agentcore.Code.fromAsset('agents/care-pathway'),
  runtime: agentcore.Runtime.PYTHON_3_12,
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  memory: {
    enabled: true,
    ttl: cdk.Duration.days(7),  // Longer memory for care journeys
  },
});

// Agent 3: Clinical Decision Support
const clinicalAgent = new agentcore.Agent(this, 'ClinicalDecisionAgent', {
  agentName: 'clinical-decision-agent',
  sourceCode: agentcore.Code.fromAsset('agents/clinical-decision'),
  runtime: agentcore.Runtime.PYTHON_3_12,
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  memory: {
    enabled: true,
    ttl: cdk.Duration.hours(12),
  },
});

// API Gateway integration
const api = new apigateway.RestApi(this, 'AgentCoreAPI');

// Agent 1 endpoint
const supervisorResource = api.root.addResource('supervisor-validation');
supervisorResource.addMethod('POST', new apigateway.LambdaIntegration(supervisorAgent.handler));

// Agent 2 endpoint
const carePathwayResource = api.root.addResource('care-pathway');
carePathwayResource.addMethod('POST', new apigateway.LambdaIntegration(carePathwayAgent.handler));

// Agent 3 endpoint
const clinicalResource = api.root.addResource('clinical-decision');
clinicalResource.addMethod('POST', new apigateway.LambdaIntegration(clinicalAgent.handler));
```

## Benefits of AgentCore Implementation

### 1. Production-Ready Out of the Box
- ✅ Automatic scaling
- ✅ Session isolation
- ✅ Built-in security
- ✅ CloudWatch integration

### 2. Developer Experience
- ✅ One-command deployment
- ✅ Local testing with `agentcore dev`
- ✅ Framework agnostic
- ✅ Hot reload during development

### 3. Cost Optimization
- ✅ Pay per agent session (not per Lambda invocation)
- ✅ Automatic resource optimization
- ✅ Built-in caching

### 4. Enterprise Features
- ✅ Multi-agent orchestration
- ✅ Persistent memory
- ✅ Tool integration
- ✅ Audit trails

## Next Steps

1. **Install AgentCore CLI**
   ```bash
   pip install bedrock-agentcore-starter-toolkit
   ```

2. **Create Agent Projects**
   ```bash
   agentcore create --name supervisor-validation-agent
   agentcore create --name care-pathway-agent
   agentcore create --name clinical-decision-agent
   ```

3. **Implement Agent Logic** (use code above)

4. **Test Locally**
   ```bash
   agentcore dev
   agentcore invoke --dev "test prompt"
   ```

5. **Deploy to AWS**
   ```bash
   agentcore deploy
   ```

6. **Integrate with Frontend**
   - Update API endpoints
   - Test end-to-end flow

## Estimated Timeline

- Setup AgentCore CLI: 5 minutes
- Create 3 agent projects: 10 minutes
- Implement agent logic: 30 minutes
- Test locally: 10 minutes
- Deploy to AWS: 10 minutes
- Frontend integration: 10 minutes

**Total: ~75 minutes**

## Decision

Do you want me to:

**Option A**: Implement full AgentCore solution (75 minutes, production-grade)
**Option B**: Keep current Lambda implementation (already working, good for demo)
**Option C**: Document AgentCore as "next phase" (show architecture, keep current)

Given the hackathon deadline is today, I recommend **Option C** - document the AgentCore architecture as the production roadmap while keeping the current working implementation for the demo.

What do you prefer?
