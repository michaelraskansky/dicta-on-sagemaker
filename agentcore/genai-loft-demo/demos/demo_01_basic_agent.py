"""
Demo 1: Basic Customer Support Agent
====================================

Every production system starts simple.

This demo shows:
1. Local Tools - 4 basic customer support functions
2. Strands Agents Framework - Code-first, simple to understand
3. Bedrock Integration - Using Claude for AI reasoning

Key Point: "This works great... for one user, on my machine, with no memory"
"""

import asyncio
from strands.agent import Agent
from src.demo_utils import (
    create_bedrock_model,
    get_local_tools,
    get_customer_support_prompt,
    run_conversation,
)
from src.interactive_chat import start_interactive_chat, parse_interactive_args


def create_basic_agent():
    """Create a basic Strands agent with local tools."""
    return Agent(
        model=create_bedrock_model(),
        system_prompt=get_customer_support_prompt(),
        tools=get_local_tools(),
        callback_handler=None,
    )


async def demonstrate_basic_agent():
    """Demo 1: Show the 4 local tools and basic agent interaction."""
    agent = create_basic_agent()

    test_questions = [
        "What's the return policy for laptops?",  # Uses get_return_policy
        "Tell me about your headphones",  # Uses get_product_info
        "My phone won't turn on, help!",  # Uses get_technical_support
    ]

    await run_conversation(agent, test_questions, None)


async def interactive_demo():
    """Interactive mode for hands-on exploration."""
    agent = create_basic_agent()
    await start_interactive_chat(
        agent,
        None,  # No customer ID for basic demo
        "Demo 1: Basic Customer Support Agent",
    )


if __name__ == "__main__":
    args = parse_interactive_args()
    asyncio.run(demonstrate_basic_agent() if args.automatic else interactive_demo())
