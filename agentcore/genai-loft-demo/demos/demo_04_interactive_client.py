"""
Demo 4: Interactive Client
==========================

Chat with your deployed production agent.

Usage:
    uv run demos/demo_04_interactive_client.py
    uv run demos/demo_04_interactive_client.py --customer-id cust-123 --session-id sess-456
"""

import asyncio
import yaml
from pathlib import Path
from bedrock_agentcore.memory import MemoryClient
from bedrock_agentcore_starter_toolkit.operations.gateway.client import GatewayClient
from src.demo_utils import generate_customer_id, generate_session_id
from infrastructure.setup_memory import load_agentcore_memory
from infrastructure.setup_gateway import setup_agentcore_gateway
from src.runtime_agent_wrapper import RuntimeAgentWrapper
from src.interactive_chat import start_interactive_chat, parse_interactive_args


from typing import Optional


def load_agent_arn() -> Optional[str]:
    """Load deployed agent ARN from config file."""
    config_file = Path.cwd() / ".bedrock_agentcore.yaml"

    if not config_file.exists():
        print("❌ No .bedrock_agentcore.yaml found. Please deploy first with:")
        print("   agentcore launch")
        return None

    with open(config_file) as f:
        config = yaml.safe_load(f)
        default_agent = config.get("default_agent")
        agent_config = config.get("agents", {}).get(default_agent, {})
        agent_arn = agent_config.get("bedrock_agentcore", {}).get("agent_arn")

        if not agent_arn:
            print("❌ No agent_arn found. Run: agentcore launch")
            return None

        return agent_arn


async def main():
    """Interactive client for deployed runtime agent."""
    args = parse_interactive_args()

    agent_arn = load_agent_arn()
    if not agent_arn:
        return

    # Setup configuration
    memory_id = load_agentcore_memory()
    gateway_config = setup_agentcore_gateway()
    region = gateway_config["region"]

    # Session context
    customer_id = args.customer_id or generate_customer_id()
    session_id = args.session_id or generate_session_id()

    # Create runtime agent wrapper
    runtime_agent = RuntimeAgentWrapper(
        agent_arn=agent_arn,
        session_id=session_id,
        customer_id=customer_id,
        region=region,
    )

    # Start interactive chat
    await start_interactive_chat(
        runtime_agent,
        customer_id,
        "Demo 4: Production Agent (Interactive Client)",
        memory_client=MemoryClient(region_name=region),
        memory_id=memory_id,
        session_id=session_id,
        gateway_client=GatewayClient(region_name=region),
        gateway_config=gateway_config,
        runtime_region=region,
        agent_arn=agent_arn,
    )


if __name__ == "__main__":
    asyncio.run(main())
