# Runtime Commands

Interactive commands for inspecting AgentCore Runtime status and configuration.

## Overview

The `/runtime` commands provide real-time visibility into your deployed AgentCore Runtime agents, similar to how `/memory` commands inspect memory state and `/gateway` commands inspect gateway configuration.

## Available Commands

### `/runtime help`
Display all available runtime commands.

```bash
/runtime help
```

### `/runtime list`
List all AgentCore Runtime agents in your AWS account.

Shows:
- Agent name
- Runtime ID
- Version number
- Current status (READY, CREATING, UPDATING, etc.)
- Last update timestamp

```bash
/runtime list
```

**Example Output:**
```
🚀 AgentCore Runtimes
                    Agent Runtimes (4 found)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Name                           ┃ Status                    ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ demo_04_production_agent       │ READY                     │
│ my_agent_a4_agent              │ READY                     │
└────────────────────────────────┴───────────────────────────┘
```

### `/runtime status`
Show detailed status of the currently deployed runtime agent.

Displays:
- Runtime status (READY, CREATING, etc.)
- Agent name and ARN
- Creation and update timestamps
- Network configuration
- Lifecycle settings (idle timeout, max lifetime)

```bash
/runtime status
```

**Example Output:**
```
📊 Runtime Status
Runtime ID: demo_04_production_agent-MsXZzFHWjL
Status          READY
Name            demo_04_production_agent
Network Mode    PUBLIC
Idle Timeout    900s
Max Lifetime    28800s
```

### `/runtime endpoints`
List all endpoints for the current runtime agent.

Shows endpoint URLs, status, and configuration for accessing your deployed agent.

```bash
/runtime endpoints
```

### `/runtime versions`
List all versions of the current runtime agent.

Useful for tracking deployment history and version management.

```bash
/runtime versions
```

## Usage in Demo 4

The runtime commands are available in Demo 4's interactive mode:

```bash
# Start interactive chat with deployed agent
uv run demos/demo_04_production_agent.py

# Use runtime commands
> /runtime help
> /runtime list
> /runtime status
```

## API Integration

The runtime commands use the AWS Bedrock AgentCore Control Plane API:

- `list_agent_runtimes` - List all runtimes
- `get_agent_runtime` - Get detailed runtime information
- `list_agent_runtime_endpoints` - List runtime endpoints
- `list_agent_runtime_versions` - List runtime versions

## Status Colors

Commands use color coding for quick status identification:

- 🟢 **Green** - READY/ACTIVE (operational)
- 🟡 **Yellow** - CREATING/UPDATING (in progress)
- 🔴 **Red** - FAILED/ERROR (needs attention)

## Troubleshooting

### "No agent ARN available"
This means no agent is currently deployed. Deploy first:
```bash
agentcore launch
```

### "Invalid agent ARN format"
The agent ARN in `.bedrock_agentcore.yaml` may be malformed. Redeploy:
```bash
agentcore launch
```

### Permission Errors
Ensure your AWS credentials have permissions for:
- `bedrock-agentcore-control:ListAgentRuntimes`
- `bedrock-agentcore-control:GetAgentRuntime`
- `bedrock-agentcore-control:ListAgentRuntimeEndpoints`
- `bedrock-agentcore-control:ListAgentRuntimeVersions`

## Implementation

The runtime commands are implemented in:
- `src/interactive_chat/runtime_commands.py` - Command handlers
- `src/interactive_chat/chat.py` - Integration with interactive chat
- Uses `boto3` client for `bedrock-agentcore-control` service

## Related Commands

- `/memory` - Inspect AgentCore Memory state
- `/gateway` - Inspect AgentCore Gateway configuration
- `/status` - Show current session information
