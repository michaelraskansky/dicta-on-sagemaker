"""
Demo Utilities
==============

Common utilities and configuration for all demo files.
Handles the technical details so demos can focus on key concepts.
"""

import uuid
import asyncio
import random
from strands.agent import Agent
from strands.models import BedrockModel
from strands.tools import tool
from bedrock_agentcore.memory.integrations.strands.session_manager import (
    AgentCoreMemorySessionManager,
)
from bedrock_agentcore.memory.integrations.strands.config import (
    AgentCoreMemoryConfig,
    RetrievalConfig,
)
from .streaming_display import (
    log_customer_message_chat,
    display_streaming_response_chat,
    suppress_output,
)

# Configuration constants
AWS_REGION = "eu-central-1"
MODEL_ID = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"


def generate_session_id():
    """Generate a unique session ID."""
    return str(uuid.uuid4())


def generate_customer_id():
    """Generate a unique customer ID for demo purposes."""
    names = ["customer"]
    return f"{random.choice(names)}-{random.randint(1, 999999)}"


def create_bedrock_model(enable_thinking: bool = True, thinking_budget: int = 2048):
    """
    Create Bedrock model with standard configuration.

    Args:
        enable_thinking: Enable extended thinking for Claude models
        thinking_budget: Token budget for thinking (min 1024, default 2048)
    """
    if enable_thinking:
        # Enable extended thinking with budget
        return BedrockModel(
            model_id=MODEL_ID,
            region_name=AWS_REGION,
            additional_request_fields={
                "thinking": {"type": "enabled", "budget_tokens": thinking_budget}
            },
        )
    else:
        return BedrockModel(model_id=MODEL_ID, region_name=AWS_REGION)


def get_customer_support_prompt():
    """Get the standard customer support system prompt."""
    return """

# You are a friendly customer support agent for a technology retailer.

## General Guidance 
- Respond in plain text only.
- Do NOT use any markdown, bold text, bullet points, headers, or special formatting. 
- Write like you're speaking to someone on the phone - natural, conversational, and helpful.
- If you know the customers name, use it naturally in the conversation. i.e "Thanks for reaching out, Alex! How can I assist you today?"

## When customers ask questions
- Use your tools to get accurate information
- Give helpful, direct answers in plain conversational language
- Be warm and personable
- Ask follow-up questions when appropriate
- Explain steps clearly but naturally, like you're talking to a friend
- If the customers requests to get information from the web help the customer with that

Example good response: "I'm sorry your phone isn't working! Let's try a few things. First, can you plug it into the charger for about 10 minutes? Sometimes the battery just needs a boost. If that doesn't work, try holding the power button and volume down button together for about 15 seconds - that usually forces it to restart."
Remember: Talk naturally, no formatting, just helpful conversation."""


# Local tools for basic demo
@tool
def get_return_policy(product_name: str) -> str:
    """Get return policy for a specific product."""
    policies = {
        "laptop": "30-day return policy. Must be in original packaging.",
        "phone": "14-day return policy. Device must be undamaged.",
        "headphones": "60-day return policy. Must include all accessories.",
        "default": "Standard 30-day return policy applies.",
    }
    return policies.get(product_name.lower(), policies["default"])


@tool
def get_product_info(product_name: str) -> str:
    """Get detailed product information."""
    products = {
        "laptop": "Gaming laptop with RTX 4070, 16GB RAM, 1TB SSD. Price: $1,299",
        "phone": "Latest smartphone with 128GB storage, 5G capable. Price: $799",
        "headphones": "Noise-canceling wireless headphones, 30hr battery. Price: $299",
    }
    return products.get(product_name.lower(), "Product not found in our catalog.")


@tool
def web_search(query: str) -> str:
    """Search the web for troubleshooting information."""
    return f"Found troubleshooting guides for: {query}. Check manufacturer website for detailed steps."


@tool
def get_technical_support(issue: str) -> str:
    """Search technical support knowledge base."""
    return f"Technical support found: Common solutions for {issue} include checking connections and updating drivers."


def get_local_tools():
    """Get the standard set of local tools for basic demo."""
    return [get_return_policy, get_product_info, web_search, get_technical_support]


async def run_conversation(agent, messages, customer_id):
    """Run a conversation with the agent."""
    for i, msg in enumerate(messages, 1):
        log_customer_message_chat(msg, customer_id)

        with suppress_output():
            await display_streaming_response_chat(agent, msg)

        if i < len(messages):
            await asyncio.sleep(3)  # Brief pause between messages
            print()


# Memory utilities
def create_session_manager(customer_id: str, memory_id: str, session_id: str = None):
    """Create AgentCore Memory session manager for customer."""
    try:
        if not session_id:
            session_id = generate_session_id()

        agentcore_memory_config = AgentCoreMemoryConfig(
            memory_id=memory_id,
            actor_id=customer_id,
            session_id=session_id,
            retrieval_config={
                "/preferences/{actorId}": RetrievalConfig(top_k=5, relevance_score=0.7),
                "/facts/{actorId}": RetrievalConfig(top_k=10, relevance_score=0.3),
                "/summaries/{actorId}/{sessionId}": RetrievalConfig(
                    top_k=5, relevance_score=0.5
                ),
            },
        )
        session_manager = AgentCoreMemorySessionManager(
            agentcore_memory_config=agentcore_memory_config, region_name=AWS_REGION
        )
        return session_manager

    except Exception as e:
        print(f"⚠️  Error configuring AgentCore Memory: {e}")
        return None
