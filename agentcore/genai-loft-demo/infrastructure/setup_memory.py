"""
AgentCore Memory Setup
=====================

Sets up AgentCore Memory with comprehensive strategies for customer support.
"""

from pathlib import Path
import json
from bedrock_agentcore.memory import MemoryClient

# Configuration constants
AWS_REGION = "eu-central-1"
MEMORY_NAME = "customer_support_memory"
MEMORY_EXPIRY_DAYS = 30
MEMORY_CREATION_TIMEOUT = 300
MEMORY_POLL_INTERVAL = 5


def load_agentcore_memory():
    """Load existing memory configuration."""
    try:
        config_path = Path(__file__).parent / "memory_config.json"
        with open(config_path, "r") as f:
            config = json.load(f)
        
        print(f"✅ Using existing AgentCore Memory: {config['memory_id']}")
        return config["memory_id"]
        
    except FileNotFoundError:
        print("❌ Error: memory_config.json not found!")
        print("Please run 'uv run infrastructure/setup_memory.py' first to create the Memory.")
        raise Exception("Memory configuration not found. Run setup_memory.py first.")
    except Exception as e:
        print(f"❌ Failed to load AgentCore Memory: {e}")
        raise e


def create_memory():
    """Create new AgentCore Memory infrastructure."""
    print("🚀 Setting up AgentCore Memory...")
    print(f"Region: {AWS_REGION}\n")
    
    client = MemoryClient(region_name=AWS_REGION)

    try:
        memory = client.create_memory_and_wait(
            name=MEMORY_NAME,
            description="Customer support memory with user preferences and session summaries",
            strategies=[
                {
                    "summaryMemoryStrategy": {
                        "name": "SessionSummarizer",
                        "namespaces": ["/summaries/{actorId}/{sessionId}"],
                    }
                },
                {
                    "userPreferenceMemoryStrategy": {
                        "name": "PreferenceLearner",
                        "namespaces": ["/preferences/{actorId}"],
                    }
                },
                {
                    "semanticMemoryStrategy": {
                        "name": "FactExtractor",
                        "namespaces": ["/facts/{actorId}"],
                    }
                },
            ],
            event_expiry_days=MEMORY_EXPIRY_DAYS,
            max_wait=MEMORY_CREATION_TIMEOUT,
            poll_interval=MEMORY_POLL_INTERVAL,
        )
        memory_id = memory.get("id")
        print(f"✅ Created new AgentCore Memory with ID: {memory_id}")
        
    except Exception as e:
        if "already exists" in str(e):
            print(f"📋 Memory '{MEMORY_NAME}' already exists, retrieving existing memory...")
            memories = client.list_memories()
            memories_list = (
                memories.get("memories", []) if isinstance(memories, dict) else memories
            )
            existing = next(
                (m for m in memories_list if m.get("id", "").startswith(MEMORY_NAME)),
                None,
            )
            memory_id = existing.get("id")
            print(f"✅ Using existing AgentCore Memory with ID: {memory_id}")
        else:
            raise e

    # Save configuration
    config = {
        "memory_id": memory_id,
        "memory_name": MEMORY_NAME,
        "region": AWS_REGION
    }
    
    config_path = Path(__file__).parent / "memory_config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    
    print("=" * 60)
    print("✅ Memory setup complete!")
    print(f"Memory ID: {memory_id}")
    print(f"Configuration saved to: {config_path}")
    print("\nNext step: Run Demo 2 to test your Memory")
    print("=" * 60)

    return memory_id


# Keep old function name for backward compatibility during transition
def setup_agentcore_memory():
    """Deprecated: Use load_agentcore_memory() instead."""
    return load_agentcore_memory()


if __name__ == "__main__":
    create_memory()
