"""
Demo 2: Adding Memory to Our Agent
==================================

Transform our "goldfish agent" into one that remembers customers across conversations.

Key AgentCore Memory Features Demonstrated:
- Persistent conversation history across sessions
- Customer preference extraction and learning
- Cross-session context awareness
- Semantic fact storage and retrieval

This shows the evolution from prototype to personalized customer experience.
"""

import asyncio
from strands.agent import Agent
from bedrock_agentcore.memory import MemoryClient
from src.demo_utils import (
    create_bedrock_model,
    get_local_tools,
    get_customer_support_prompt,
    generate_session_id,
    generate_customer_id,
    create_session_manager,
    run_conversation,
)
from infrastructure.setup_memory import load_agentcore_memory
from src.interactive_chat import start_interactive_chat, parse_interactive_args


def create_agent_with_memory(customer_id, memory_id, session_id=None):
    """Create agent with AgentCore Memory integration.

    Note: Extended thinking disabled - incompatible with conversation history.
    """
    return Agent(
        model=create_bedrock_model(enable_thinking=False),
        system_prompt=get_customer_support_prompt(),
        tools=get_local_tools(),
        session_manager=create_session_manager(customer_id, memory_id, session_id),
        callback_handler=None,
    )


async def demonstrate_memory_capabilities():
    """Demonstrate AgentCore Memory capabilities with two conversations."""
    memory_id = load_agentcore_memory()
    customer_id = generate_customer_id()
    session_id = generate_session_id()

    # First conversation - Learning Phase
    agent = create_agent_with_memory(customer_id, memory_id, session_id)
    await run_conversation(
        agent,
        [
            "Hi, I'm a software developer looking for a powerful laptop for coding and some gaming on weekends. My name is Alex. always reply back with Alex as my name.",
            "Thanks for all the info. Let me discuss this with my team and I'll get back to you soon.",
        ],
        customer_id,
    )

    # Simulate time passing (memory processing happens in background)
    await asyncio.sleep(8)

    # Second conversation - Memory Recall Phase
    agent = create_agent_with_memory(customer_id, memory_id, session_id)
    await run_conversation(
        agent,
        [
            "Hi! I'm back. My team approved the budget and I'd like to purchase that gaming laptop we discussed",
            "Great! Can you remind me of the laptop specs one more time? I want to make sure it has enough RAM for my development work.",
        ],
        customer_id,
    )


async def interactive_demo(args):
    """Interactive mode for hands-on exploration."""
    memory_id = load_agentcore_memory()
    customer_id = args.customer_id or generate_customer_id()
    session_id = args.session_id or generate_session_id()

    agent = create_agent_with_memory(customer_id, memory_id, session_id)

    await start_interactive_chat(
        agent,
        customer_id,
        "Demo 2: Agent with AgentCore Memory",
        memory_client=MemoryClient(region_name="eu-central-1"),
        memory_id=memory_id,
        session_id=session_id,
    )


if __name__ == "__main__":
    args = parse_interactive_args()
    asyncio.run(
        demonstrate_memory_capabilities() if args.automatic else interactive_demo(args)
    )
