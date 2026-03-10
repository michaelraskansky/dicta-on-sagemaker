# Customer Support Agent Demo - Prototype to Production

In this demo we'll build a customer support agent and evolve it from prototype to production using Amazon Bedrock AgentCore services.

## What We'll Build

A complete customer support system that starts as a simple prototype and evolves into a scalable and secure production application.

The final system handles real customer conversations with memory, shared tools, and a web interface.

> [!IMPORTANT]
> This demo is for educational purposes. It demonstrates how AgentCore services help migrate an agentic use case from prototype to production. It is not intended for direct use in production environments.

**Demo Journey:**

- Start with a basic agent prototype (20 mins)
- Add conversation memory across sessions (20 mins)
- Share tools securely across multiple agents (30 mins)
- Deploy to production with monitoring (30 mins)
- Build a customer-facing web app (20 mins)

## Architecture Overview

By the end of this demo you will have created the following architecture:

<div style="text-align:left">
    <img src="images/architecture_lab5_streamlit.png" width="100%"/>
</div>

## Prerequisites

- AWS account with Bedrock access
- Python 3.10+
- AWS CLI configured
- Claude 3.7 Sonnet enabled in Bedrock

## Demo Steps

### Demo 1: Create Agent Prototype

Build a prototype of a customer support agent with three core tools:

- Return policy lookup
- Product information search
- Web search for troubleshooting

**What you'll learn:** Basic agent creation with Strands Agents and tool integration

### Demo 2: Add Memory

Transform your "goldfish agent" into one that remembers customers across conversations.

- Persistent conversation history
- Customer preference extraction
- Cross-session context awareness

**What you'll learn:** AgentCore Memory for both short-term and long-term persistence

### Demo 3: Scale with Gateway & Identity

Move from local tools to shared, enterprise-ready services.

- Centralized tool management
- JWT-based authentication
- Integration with existing AWS Lambda functions
- **Interactive Commands:** Use `/gateway help` and `/memory help` for exploring AgentCore services

**What you'll learn:** AgentCore Gateway and AgentCore Identity for secure tool sharing

**Interactive Mode:** Demo 3 includes a refactored interactive chat interface with:

- Rich table displays for gateway targets and tools
- Data-driven memory command handling
- Centralized error formatting and display utilities
- Comprehensive type hints and documentation

### Demo 4: Deploy to Production

Transform your prototype into a production-ready system with enterprise capabilities.

- Serverless auto-scaling to handle variable demand
- Comprehensive observability with traces, metrics, and logging
- Enterprise reliability with automatic error recovery
- Secure deployment with proper access controls
- Session isolation and continuity for multiple users

**What you'll learn:** AgentCore Runtime with production-grade observability and scaling

**Key Insight:** Only 4 lines of code transform your local agent into a production-ready system!

**Three Ways to Use Demo 4:**

1. **Deploy to Production:**
   ```bash
   agentcore launch  # Uses demos/demo_04_production_agent.py
   ```

2. **Interactive Client:**
   ```bash
   uv run demos/demo_04_interactive_client.py
   ```
   - Chat with your deployed agent
   - Every message goes to AWS via boto3 streaming
   - Test your production agent exactly as it runs in the cloud
   - Use `/memory`, `/gateway`, and `/runtime` commands

3. **Automated Demo:**
   ```bash
   uv run demos/demo_04_automated_test.py
   ```
   - Scripted conversation showing production capabilities
   - No interaction required

### Demo 5: Build Customer Interface

Create a web app customers can actually use.

- Streamlit-based chat interface
- Real-time response streaming
- Session management and authentication

**What you'll learn:** Frontend integration with secure agent endpoints

## Getting Started

1. Clone this repository
2. Install dependencies: `uv sync`
3. Configure AWS credentials
4. Start with [Demo 1](demo_01_basic_agent.py): `uv run demo_01_basic_agent.py`

Each demo builds on the previous one, showing the evolution from prototype to production.

## Architecture Evolution

Watch the architecture grow from a simple local agent to a production system:

**Demo 1:** Local agent with embedded tools
**Demo 2:** Agent + AgentCore Memory for persistence  
**Demo 3:** Agent + AgentCore Memory + AgentCore Gateway and AgentCore Identity for shared tools  
**Demo 4:** Deployment to AgentCore Runtime and observability with AgentCore Observability
**Demo 5:** Customer-facing application with authentication

Ready to start? [Begin with Demo 1 →](demo_01_basic_agent.py)
