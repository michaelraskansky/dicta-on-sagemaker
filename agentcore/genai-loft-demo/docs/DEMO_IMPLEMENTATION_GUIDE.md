# Demo Implementation Guide

This guide explains how to structure and organize demo files for maximum clarity and presentation effectiveness.

## File Organization Principles

### 1. Separation of Concerns

**Main Demo Files** (`demo_XX_*.py`):
- Focus ONLY on the key concept being demonstrated
- Should be <100 lines of code
- Easy to read during live presentation
- Clear narrative flow matching DEMO_SCRIPT.md

**Utility Modules**:
- `demo_utils.py` - Common configuration, model creation, shared tools
- `[concept]_utils.py` - Specific utilities for each concept (e.g., `memory_utils.py`)
- `interactive_chat.py` - Reusable interactive interface
- `demo_logging.py` - Consistent visual logging across demos

### 2. Main Demo File Structure

```python
"""
Demo X: [Concept Name]
======================

[Brief description of what's being demonstrated]

Key [Concept] Features Demonstrated:
- Feature 1
- Feature 2  
- Feature 3

This shows the evolution from [previous state] to [new capability].
"""

import asyncio
from [minimal imports - only what's needed for core concept]

def create_[concept]_agent(...):
    """
    Create agent with [new capability].
    
    This is the key difference from Demo X-1 - adding [key component]
    enables [new capability].
    """
    # Same components as previous demo
    model = create_model()
    tools = get_demo_tools()
    
    # The magic: [New Component]
    new_component = setup_new_component(...)

    return Agent(
        model=model,
        tools=tools,
        system_prompt=get_system_prompt(...),
        hooks=[DemoLoggingHook()],
        new_parameter=new_component,  # This enables [capability]!
    )

async def demonstrate_[concept]_capabilities():
    """
    Demonstrate [concept] capabilities with [demo flow].
    
    This shows the key value proposition: [value statement].
    """
    # Step-by-step demo flow matching DEMO_SCRIPT.md
    pass

if __name__ == "__main__":
    args = parse_interactive_args()
    
    if args.automatic:
        # Run the scripted demo
        asyncio.run(demonstrate_[concept]_capabilities())
    else:
        # Interactive mode for hands-on exploration
        async def interactive_demo():
            # Setup and run interactive session
            pass
        
        asyncio.run(interactive_demo())
```

### 3. Utility Module Structure

**demo_utils.py** - Common utilities:
```python
# Configuration constants
AWS_REGION = "eu-central-1"
MODEL_ID = "anthropic.claude-3-7-sonnet-20250219-v1:0"

def create_model():
    """Create configured Bedrock model."""
    
def get_demo_tools():
    """Get the standard demo tools."""
    
def generate_customer_id():
    """Generate unique customer ID."""
    
def get_system_prompt(customer_id: str):
    """Get system prompt for customer support agent."""
```

**[concept]_utils.py** - Concept-specific utilities:
```python
def setup_[concept]():
    """Set up [concept] with all the complex logic."""
    
def create_[concept]_manager(...):
    """Create [concept] manager with proper configuration."""
    
def get_[concept]_display():
    """Get display string for [concept] features."""
```

## CRITICAL: Real Services Only Policy

### ❌ **NO MOCKS OR SIMULATIONS ALLOWED**

**Absolute Requirements:**
- **REAL AWS SERVICES ONLY** - All demos must use actual AWS services (Bedrock, AgentCore Memory, AgentCore Gateway, etc.)
- **NO MOCK RESPONSES** - Never simulate API responses or service behavior
- **NO FAKE CONNECTIONS** - Never pretend to connect to services that aren't actually running
- **FAIL FAST** - If real services aren't available, demos must fail immediately with clear error messages
- **NO FALLBACKS** - No graceful degradation to mock behavior when real services fail

### ✅ **Acceptable Approaches:**

**Real Service Integration:**
```python
# ✅ CORRECT - Real service with proper error handling
def setup_agentcore_gateway():
    gateway_client = boto3.client("bedrock-agentcore-control")
    response = gateway_client.create_gateway(...)  # Real AWS API call
    return response["gatewayUrl"]  # Real gateway URL

# ✅ CORRECT - Fail fast if service unavailable
mcp_client = MCPClient(gateway_url)
with mcp_client:  # Will raise exception if can't connect
    tools = mcp_client.list_tools_sync()  # Real MCP tools
```

### ❌ **Forbidden Patterns:**

**Mock Services:**
```python
# ❌ FORBIDDEN - Mock service responses
def mock_gateway_response():
    return {"tools": ["fake_tool_1", "fake_tool_2"]}

# ❌ FORBIDDEN - Fallback to mock behavior
try:
    real_gateway = connect_to_gateway()
except Exception:
    print("Using mock gateway")  # NO FALLBACKS ALLOWED
    return mock_gateway()
```

### 🚨 **Exception Policy:**

**Mocks are ONLY allowed when:**
1. **Explicitly documented** in demo comments as mock/simulation
2. **Approved in advance** by demo requirements
3. **Clearly labeled** as "MOCK" or "SIMULATION" in all output


## Refactoring Process

### Step 1: Identify Core Concept
- What is the ONE key capability being demonstrated?
- What's the minimal code needed to show this capability?
- What's the key difference from the previous demo?

### Step 2: Extract Utilities
Move to utility modules:
- Configuration constants
- Complex setup logic
- Helper functions
- Anything used across multiple demos

### Step 3: Simplify Main Demo
Keep in main demo:
- Core concept demonstration
- Key function showing the difference
- Simple demo flow
- Clear comments explaining the "magic"

### Step 4: Verify Presentation Flow
- Code should match DEMO_SCRIPT.md narrative
- Key concept should be obvious within first 20 lines
- Demo flow should be easy to follow live
- Comments should explain what's important

### Step 5: Validate Real Service Integration
- **CRITICAL**: Ensure all AWS services are real, not mocked
- Test with actual service failures to verify proper error handling
- Confirm demos fail fast when services unavailable
- Remove any fallback to mock behavior

## Best Practices

### Code Organization
- **One concept per demo** - Don't mix multiple new concepts
- **Progressive complexity** - Each demo builds on the previous
- **Clear naming** - Function names should match demo concepts
- **Minimal imports** - Only import what's needed for the core concept

### Comments and Documentation
- **Explain the magic** - Comment the 1-2 lines that enable new capability
- **Show progression** - "This is the key difference from Demo X-1"
- **Value proposition** - Explain why this capability matters
- **Demo flow** - Match comments to presentation narrative

### Error Handling
- **Fail fast** - Demo should stop immediately if real services unavailable
- **Clear error messages** - Help presenters understand what went wrong
- **No fallback options** - Never fall back to mock behavior
- **Real service validation** - Verify actual connectivity before proceeding

### Interactive Features
- **Consistent interface** - All demos use same interactive chat system
- **Memory commands** - Add concept-specific commands (e.g., `/memory info`)
- **Help text** - Clear instructions for interactive exploration
- **Parameter support** - Allow customization via command line args

## Example: Demo 2 Refactoring

**Before:** 300+ lines with embedded memory setup, configuration, and utilities

**After:** 
- `demo_02_agent_with_memory.py` - 80 lines focused on memory concept
- `memory_utils.py` - All AgentCore Memory setup and management
- `demo_utils.py` - Common configuration and tools

**Key improvements:**
- Core concept (adding session_manager) obvious in first 20 lines
- Complex memory setup hidden in utilities
- Demo flow matches presentation script
- Easy to follow during live presentation

## Quality Checklist

Before considering a demo complete:

- [ ] Main demo file is <100 lines
- [ ] Key concept is highlighted with comments
- [ ] Code matches DEMO_SCRIPT.md flow
- [ ] No compilation errors
- [ ] Both `--automatic` and interactive modes work
- [ ] Utilities are properly separated
- [ ] Function names are clear and descriptive
- [ ] Comments explain the important parts
- [ ] Demo can be followed during live presentation
- [ ] **CRITICAL: All services are real, no mocks or simulations**
- [ ] **CRITICAL: Demo fails fast when real services unavailable**
- [ ] **CRITICAL: No fallback to mock behavior**
- [ ] Interactive features work as expected

## Maintenance

### When Adding New Demos
1. Follow the file structure template
2. Extract common utilities to demo_utils.py
3. Create concept-specific utility module if needed
4. Update this guide with new patterns

### When Modifying Existing Demos
1. Preserve the core concept focus
2. Move new complexity to utility modules
3. Ensure changes don't break other demos
4. Update comments to reflect changes

### When Updating Utilities
1. Consider impact on all demos using the utility
2. Maintain backward compatibility when possible
3. Update documentation if interfaces change
4. Test all demos after utility changes
