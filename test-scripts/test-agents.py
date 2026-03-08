#!/usr/bin/env python3
"""
Test script for deployed AWS Lambda agents
"""

import json
import requests

# Load endpoints
with open('agent-endpoints.json', 'r') as f:
    endpoints = json.load(f)

print("=" * 60)
print("Testing Deployed Agents")
print("=" * 60)

# Test Agent 1: Supervisor Validation
print("\n1. Testing Supervisor Validation Agent...")
print("-" * 60)

test_validation = {
    "validation": {
        "id": 1,
        "patientName": "Rajesh Kumar",
        "age": 45,
        "symptoms": "Chest pain, shortness of breath, sweating",
        "primaryComplaint": "Chest pain",
        "duration": "30 minutes",
        "severity": 9,
        "urgencyLevel": "emergency",
        "aiAssessment": "Possible cardiac event",
        "aiReasoning": "Classic cardiac symptoms",
        "confidence": 92,
        "flagReason": None,
        "vitalSigns": {
            "heartRate": 110,
            "bloodPressure": "150/95",
            "temperature": "98.6°F"
        }
    }
}

try:
    response = requests.post(
        endpoints['supervisor-validation-agent'],
        json=test_validation,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Decision: {result.get('decision', 'N/A')}")
        print(f"Auto-Approved: {result.get('autoApproved', 'N/A')}")
        print(f"Confidence: {result.get('confidenceScore', 'N/A')}%")
        print("✓ Agent 1 is working!")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"✗ Error testing Agent 1: {e}")

# Test Agent 2: Care Pathway Orchestrator
print("\n2. Testing Care Pathway Orchestrator Agent...")
print("-" * 60)

test_pathway = {
    "request": {
        "episodeId": "EP-123",
        "patientId": "P-456",
        "currentStage": "triage",
        "urgencyLevel": "urgent",
        "diagnosis": "Possible cardiac event"
    }
}

try:
    response = requests.post(
        endpoints['care-pathway-agent'],
        json=test_pathway,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Next Stage: {result.get('nextStage', 'N/A')}")
        print(f"Auto-Scheduled: {result.get('autoScheduled', 'N/A')}")
        print(f"Actions: {len(result.get('actions', []))} actions")
        print("✓ Agent 2 is working!")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"✗ Error testing Agent 2: {e}")

# Test Agent 3: Clinical Decision Support
print("\n3. Testing Clinical Decision Support Agent...")
print("-" * 60)

test_clinical = {
    "request": {
        "patientId": "P-456",
        "age": 45,
        "gender": "male",
        "symptoms": ["chest pain", "shortness of breath", "sweating"],
        "vitalSigns": {
            "heartRate": 110,
            "bloodPressure": "150/95",
            "temperature": "98.6°F"
        },
        "medicalHistory": ["hypertension"],
        "currentMedications": ["lisinopril"],
        "allergies": []
    }
}

try:
    response = requests.post(
        endpoints['clinical-decision-agent'],
        json=test_clinical,
        timeout=30
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Diagnoses: {len(result.get('differentialDiagnoses', []))} options")
        print(f"Tests: {len(result.get('recommendedTests', []))} recommended")
        print(f"Confidence: {result.get('confidence', 'N/A')}%")
        print("✓ Agent 3 is working!")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"✗ Error testing Agent 3: {e}")

print("\n" + "=" * 60)
print("Testing Complete!")
print("=" * 60)
