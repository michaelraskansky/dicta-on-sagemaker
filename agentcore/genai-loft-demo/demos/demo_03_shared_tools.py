"""
Demo 3: Shared Tools with AgentCore Gateway
===========================================

Move from local tools to enterprise-ready shared services.

Key AgentCore Gateway Features Demonstrated:
- Centralized tool management across multiple agents
- JWT-based authentication with Cognito
- Integration with existing AWS Lambda functions
- Shared tools eliminate code duplication

This shows the evolution from prototype to scalable enterprise architecture.
"""

import asyncio
from strands.agent import Agent
from strands.tools.mcp import MCPClient
from mcp.client.streamable_http import streamablehttp_client
from bedrock_agentcore_starter_toolkit.operations.gateway.client import GatewayClient
from bedrock_agentcore.memory import MemoryClient

from src.demo_utils import (
    create_bedrock_model,
    get_customer_support_prompt,
    generate_customer_id,
    generate_session_id,
    create_session_manager,
    run_conversation,
)
from infrastructure.setup_memory import load_agentcore_memory
from infrastructure.setup_gateway import setup_agentcore_gateway, validate_gateway
from src.interactive_chat import start_interactive_chat, parse_interactive_args


def create_agent_with_shared_tools(customer_id, memory_id, session_id, gateway_config):
    """
    Create agent with shared tools from AgentCore Gateway.
    """
    mcp_client = MCPClient(
        lambda: streamablehttp_client(
            gateway_config["gateway_url"],
            headers={"Authorization": f"Bearer {gateway_config['bearer_token']}"},
        )
    )

    with mcp_client:
        shared_tools = mcp_client.list_tools_sync()
        return (
            Agent(
                model=create_bedrock_model(enable_thinking=False),
                system_prompt=get_customer_support_prompt(),
                tools=shared_tools,
                session_manager=create_session_manager(
                    customer_id, memory_id, session_id
                ),
                callback_handler=None,
            ),
            mcp_client,
        )


async def demonstrate_shared_tools_capabilities():
    """Demonstrate AgentCore Gateway capabilities with enterprise scenarios."""
    memory_id = load_agentcore_memory()

    if not validate_gateway():
        return

    customer_id = generate_customer_id()
    gateway_config = setup_agentcore_gateway()
    agent, mcp_client = create_agent_with_shared_tools(
        customer_id, memory_id, generate_session_id(), gateway_config
    )

    with mcp_client:
        await run_conversation(
            agent,
            [
                "I need to check the warranty status for my Gaming Console Pro, serial number MNO33333333",
                "My Lenovo ThinkPad has a blue screen error. Can you search for solutions?",
                "What's your return policy for laptops, and can you search for any recent policy updates?",
            ],
            customer_id,
        )


async def interactive_demo(args):
    """Interactive mode for hands-on exploration."""
    memory_id = load_agentcore_memory()
    customer_id = args.customer_id or generate_customer_id()
    session_id = args.session_id or generate_session_id()
    gateway_config = setup_agentcore_gateway()

    agent, mcp_client = create_agent_with_shared_tools(
        customer_id,
        memory_id,
        session_id,
        gateway_config,
    )

    with mcp_client:
        await start_interactive_chat(
            agent,
            customer_id,
            "Demo 3: Shared Tools with AgentCore Gateway",
            memory_client=MemoryClient(region_name=gateway_config["region"]),
            memory_id=memory_id,
            session_id=session_id,
            gateway_client=GatewayClient(region_name=gateway_config["region"]),
            gateway_config=gateway_config,
        )


if __name__ == "__main__":
    args = parse_interactive_args()
    asyncio.run(
        demonstrate_shared_tools_capabilities()
        if args.automatic
        else interactive_demo(args)
    )
