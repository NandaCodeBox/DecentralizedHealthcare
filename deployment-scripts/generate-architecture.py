#!/usr/bin/env python3
"""
Arogya.AI Architecture Diagram
Clean left-to-right flow with minimal edge crossings
"""
import os
os.environ["PATH"] += os.pathsep + r"C:\Program Files\Graphviz\bin"

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.storage import S3
from diagrams.aws.network import APIGateway
from diagrams.aws.compute import Lambda
from diagrams.aws.ml import Bedrock, Polly
from diagrams.aws.database import Dynamodb
from diagrams.aws.security import Cognito
from diagrams.aws.management import Cloudwatch
from diagrams.generic.device import Mobile, Tablet

output_path = os.path.join("ArchitectureImages", "arogya_ai_architecture")

with Diagram(
    "Arogya.AI - AWS Bedrock AgentCore Architecture",
    filename=output_path,
    show=False,
    direction="LR",
    graph_attr={
        "fontsize": "18",
        "fontcolor": "#1a237e",
        "bgcolor": "white",
        "pad": "0.5",
        "ranksep": "1.0",
        "nodesep": "0.4",
        "splines": "polyline",
    },
    edge_attr={
        "fontsize": "9",
        "penwidth": "1.5",
    },
    node_attr={
        "fontsize": "9",
        "width": "1.1",
        "height": "1.1",
    },
):
    # === Col 1: Users ===
    with Cluster("Users", graph_attr={
        "bgcolor": "#e3f2fd", "fontcolor": "#0d47a1",
        "pencolor": "#1565c0", "style": "rounded",
    }):
        patient = Mobile("Patient\n(Mobile)")
        supervisor = Tablet("Supervisor\n(Desktop)")

    # === Col 2: Frontend ===
    with Cluster("Frontend (Amazon S3)", graph_attr={
        "bgcolor": "#fff8e1", "fontcolor": "#e65100",
        "pencolor": "#f57f17", "style": "rounded",
    }):
        s3 = S3("React 18 + TS\nTailwind CSS")
        polly = Polly("Amazon Polly\n10 Languages")

    # === Col 3: API Layer ===
    with Cluster("API Layer", graph_attr={
        "bgcolor": "#e0f7fa", "fontcolor": "#006064",
        "pencolor": "#00838f", "style": "rounded",
    }):
        cognito = Cognito("Cognito Auth")
        apigw = APIGateway("API Gateway")
        backend_lambda = Lambda("Backend\nLambda")

    # === Col 4: Bedrock AgentCore ===
    with Cluster("Amazon Bedrock AgentCore", graph_attr={
        "bgcolor": "#f3e5f5", "fontcolor": "#4a148c",
        "pencolor": "#6a1b9a", "penwidth": "3",
        "style": "rounded,bold", "fontsize": "13",
    }):
        with Cluster("AgentCore Runtime", graph_attr={
            "bgcolor": "#e1bee7", "fontcolor": "#6a1b9a",
            "pencolor": "#8e24aa", "style": "rounded",
        }):
            agent1 = Bedrock("Supervisor\nValidation\n(6-Level)")
            agent2 = Bedrock("Care Pathway\nOrchestrator")
            agent3 = Bedrock("Clinical\nDecision Support")

        with Cluster("AgentCore Gateway", graph_attr={
            "bgcolor": "#d1c4e9", "fontcolor": "#4527a0",
            "pencolor": "#5e35b1", "style": "rounded",
        }):
            gateway_lambda = Lambda("Action Groups\nLambda")

        with Cluster("AgentCore Memory", graph_attr={
            "bgcolor": "#c5cae9", "fontcolor": "#283593",
            "pencolor": "#3949ab", "style": "rounded",
        }):
            memory_db = Dynamodb("Session Memory")

    # === Col 5: Services ===
    with Cluster("AI and Data Services", graph_attr={
        "bgcolor": "#e8eaf6", "fontcolor": "#1a237e",
        "pencolor": "#283593", "style": "rounded",
    }):
        bedrock_fm = Bedrock("Amazon Bedrock\nClaude / Titan")
        dynamo = Dynamodb("DynamoDB\nPatient Records")
        cw = Cloudwatch("CloudWatch\nObservability")

    # ========== EDGES ==========

    # Users -> Frontend
    patient >> Edge(color="#1565c0") >> s3
    supervisor >> Edge(color="#1565c0") >> s3

    # Frontend internal
    s3 - Edge(color="#e65100", style="dashed") - polly

    # Frontend -> API
    s3 >> Edge(color="#e65100", label="REST API") >> apigw

    # Auth
    cognito >> Edge(color="#c62828", style="dashed") >> apigw

    # API -> Backend
    apigw >> Edge(color="#00838f") >> backend_lambda

    # Backend -> 3 Agents
    backend_lambda >> Edge(color="#6a1b9a", label="Invoke") >> agent1
    backend_lambda >> Edge(color="#6a1b9a") >> agent2
    backend_lambda >> Edge(color="#6a1b9a") >> agent3

    # Internal: Agents -> Gateway + Memory (only agent2 to minimize crossings)
    agent2 >> Edge(color="#5e35b1", style="dashed") >> gateway_lambda
    agent2 >> Edge(color="#3949ab", style="dashed") >> memory_db

    # Agents -> Bedrock FM (all 3 connect)
    agent1 >> Edge(color="#283593") >> bedrock_fm
    agent2 >> Edge(color="#283593", label="Reasoning") >> bedrock_fm
    agent3 >> Edge(color="#283593") >> bedrock_fm

    # Gateway -> DynamoDB
    gateway_lambda >> Edge(color="#00695c", label="Data") >> dynamo

    # Observability
    agent1 >> Edge(color="#2e7d32", style="dashed") >> cw

print(f"Generated: {output_path}.png")
