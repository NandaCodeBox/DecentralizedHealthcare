#!/usr/bin/env python3
"""
Arogya.AI Process Flow - Patient to Resolution
3 swim lanes: Patient Journey, Agentic AI Pipeline, Supervisor Review
"""
import os
os.environ["PATH"] += os.pathsep + r"C:\Program Files\Graphviz\bin"

import graphviz

dot = graphviz.Digraph(
    'Process_Flow',
    format='png',
    engine='dot',
    graph_attr={
        'rankdir': 'LR',
        'bgcolor': 'white',
        'fontsize': '20',
        'fontname': 'Arial Bold',
        'label': 'Arogya.AI - Process Flow: Patient to Resolution',
        'labelloc': 't',
        'fontcolor': '#1a237e',
        'pad': '0.4',
        'ranksep': '0.5',
        'nodesep': '0.35',
        'splines': 'polyline',
        'dpi': '150',
        'size': '24,10',
    },
    node_attr={
        'fontname': 'Arial',
        'fontsize': '9',
        'style': 'filled,rounded',
        'shape': 'box',
        'penwidth': '1.5',
        'width': '1.4',
        'height': '0.6',
    },
    edge_attr={
        'fontname': 'Arial',
        'fontsize': '8',
        'penwidth': '1.5',
        'arrowsize': '0.7',
    },
)

# ============================================================
# SWIM LANE 1: Patient Journey (Mobile View) - TOP
# ============================================================
with dot.subgraph(name='cluster_patient') as c:
    c.attr(
        label='Patient Journey (Mobile View)',
        style='rounded,filled',
        fillcolor='#e3f2fd',
        color='#1565c0',
        penwidth='2.5',
        fontsize='13',
        fontcolor='#0d47a1',
        fontname='Arial Bold',
        labeljust='l',
    )
    # Step nodes
    c.node('p1', 'Open App\nSelect Language\n(10 options)',
           fillcolor='#bbdefb', color='#1565c0')
    c.node('p2', 'Login\nPatient\nDashboard',
           fillcolor='#bbdefb', color='#1565c0')
    c.node('p3', 'Tap Symptom\nTiles\nFill Details',
           fillcolor='#bbdefb', color='#1565c0')
    c.node('p4', 'Rate Severity\nSubmit',
           fillcolor='#90caf9', color='#1565c0')
    c.node('p5', 'AI Analysis\n(3 seconds)',
           fillcolor='#64b5f6', color='#0d47a1', fontcolor='white')
    c.node('p6', 'View Triage\nResults\n(94% confidence)',
           fillcolor='#42a5f5', color='#0d47a1', fontcolor='white')
    c.node('p7', 'Facility\nRecommendations\n(95% match)',
           fillcolor='#2196f3', color='#0d47a1', fontcolor='white')
    c.node('p8', 'Book\nAppointment\nConfirmation',
           fillcolor='#1e88e5', color='#0d47a1', fontcolor='white')

    # Patient flow edges
    c.edge('p1', 'p2', color='#1565c0')
    c.edge('p2', 'p3', color='#1565c0')
    c.edge('p3', 'p4', color='#1565c0')
    c.edge('p4', 'p5', color='#1565c0')
    c.edge('p5', 'p6', color='#1565c0')
    c.edge('p6', 'p7', color='#1565c0')
    c.edge('p7', 'p8', color='#1565c0')

# ============================================================
# SWIM LANE 2: Agentic AI Pipeline - MIDDLE
# ============================================================
with dot.subgraph(name='cluster_ai') as c:
    c.attr(
        label='Agentic AI Pipeline (Behind the Scenes)',
        style='rounded,filled',
        fillcolor='#f3e5f5',
        color='#6a1b9a',
        penwidth='2.5',
        fontsize='13',
        fontcolor='#4a148c',
        fontname='Arial Bold',
        labeljust='l',
    )
    c.node('a1', 'Supervisor\nValidation Agent\n6-Level Reasoning',
           fillcolor='#ce93d8', color='#6a1b9a')
    c.node('a2', 'Care Pathway\nAgent\nTreatment Plan\n+ Scheduling',
           fillcolor='#ce93d8', color='#6a1b9a')
    c.node('a3', 'Clinical Decision\nAgent\nDiagnosis +\nRecommendations',
           fillcolor='#ce93d8', color='#6a1b9a')

    # Decision diamond
    c.node('a4', 'Auto-Approve?\n81% Yes\n19% Escalate',
           fillcolor='#ab47bc', color='#4a148c', fontcolor='white',
           shape='diamond', width='1.6', height='1.0')

    c.node('a5', 'Auto-Approved\n(81%)',
           fillcolor='#4caf50', color='#2e7d32', fontcolor='white')
    c.node('a6', 'Escalate to\nHuman (19%)',
           fillcolor='#ff9800', color='#e65100', fontcolor='white')

    c.edge('a1', 'a2', color='#6a1b9a')
    c.edge('a2', 'a3', color='#6a1b9a')
    c.edge('a3', 'a4', color='#6a1b9a')
    c.edge('a4', 'a5', label=' Yes (81%)', color='#2e7d32', fontcolor='#2e7d32')
    c.edge('a4', 'a6', label=' No (19%)', color='#e65100', fontcolor='#e65100')

# ============================================================
# SWIM LANE 3: Supervisor Review (Desktop View) - BOTTOM
# ============================================================
with dot.subgraph(name='cluster_supervisor') as c:
    c.attr(
        label='Supervisor Review (Desktop View)',
        style='rounded,filled',
        fillcolor='#e8f5e9',
        color='#2e7d32',
        penwidth='2.5',
        fontsize='13',
        fontcolor='#1b5e20',
        fontname='Arial Bold',
        labeljust='l',
    )
    c.node('s1', 'Dashboard\nView All Cases\n+ Statistics',
           fillcolor='#a5d6a7', color='#2e7d32')
    c.node('s2', 'Green =\nAuto-Approved\nOrange =\nNeeds Review',
           fillcolor='#81c784', color='#2e7d32')
    c.node('s3', 'Review AI\nReasoning',
           fillcolor='#66bb6a', color='#1b5e20', fontcolor='white')
    c.node('s4', 'Approve /\nOverride',
           fillcolor='#4caf50', color='#1b5e20', fontcolor='white')
    c.node('s5', 'Resolution\nComplete',
           fillcolor='#388e3c', color='#1b5e20', fontcolor='white',
           shape='doubleoctagon', width='1.3', height='0.7')

    c.edge('s1', 's2', color='#2e7d32')
    c.edge('s2', 's3', color='#2e7d32')
    c.edge('s3', 's4', color='#2e7d32')
    c.edge('s4', 's5', color='#2e7d32')

# ============================================================
# CROSS-LANE CONNECTIONS
# ============================================================

# Patient submits -> triggers AI pipeline
dot.edge('p4', 'a1', label=' Triggers AI',
         color='#6a1b9a', style='bold', penwidth='2')

# AI auto-approved -> back to patient results
dot.edge('a5', 'p6', label=' Results',
         color='#2e7d32', style='bold', penwidth='2')

# AI escalate -> supervisor dashboard
dot.edge('a6', 's1', label=' Review',
         color='#e65100', style='bold', penwidth='2')

# Supervisor approved -> resolution feeds back
dot.edge('s4', 'p6', label=' Approved',
         color='#2e7d32', style='dashed', penwidth='1.5')

# ============================================================
# RENDER
# ============================================================
output_path = os.path.join('ArchitectureImages', 'process_flow')
dot.render(output_path, cleanup=True)
print(f"Generated: {output_path}.png")
