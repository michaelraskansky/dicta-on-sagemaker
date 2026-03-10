"""
Demo 4: Production Agent - AgentCore Runtime
============================================

This is Demo 3 agent transformed for production deployment.

The Magic: Only 4 lines added to make it production-ready!

Deploy: agentcore launch
Test: uv run demos/demo_04_interactive_client.py
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp  # LINE 1: Import runtime
from demos.demo_03_shared_tools import create_agent_with_shared_tools
from infrastructure.setup_memory import load_agentcore_memory
from infrastructure.setup_gateway import setup_agentcore_gateway

# LINE 2: Initialize the app
app = BedrockAgentCoreApp()


# LINE 3: Decorate the entrypoint
@app.entrypoint
async def invoke(payload, context=None):
    """Production agent using Demo 3 functionality with streaming"""
    user_input = payload.get("prompt", "")
    
    # Extract session context from payload or use defaults
    customer_id = payload.get("customer_id", "demo-customer-001")
    session_id = payload.get("session_id", "demo-session-001")

    # Same Demo 3 agent setup
    memory_id = load_agentcore_memory()
    gateway_config = setup_agentcore_gateway()

    agent, mcp_client = create_agent_with_shared_tools(
        customer_id,
        memory_id,
        session_id,
        gateway_config,
    )

    with mcp_client:
        # Stream response events as they arrive
        stream = agent.stream_async(user_input)
        async for event in stream:
            yield event


# LINE 4: Run the app
if __name__ == "__main__":
    app.run()
