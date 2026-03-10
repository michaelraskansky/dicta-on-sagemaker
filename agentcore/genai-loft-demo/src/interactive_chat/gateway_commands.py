"""Gateway command handler for interactive chat."""

import boto3
import uuid
from typing import Any, Dict
from rich.console import Console
from rich.table import Table
from .utilities import MCPClientFactory, DisplayFormatter

console = Console()


async def handle_gateway_command(
    command: str,
    gateway_client: Any,
    gateway_config: Dict[str, Any]
) -> None:
    """
    Handle /gateway commands for inspecting AgentCore Gateway.
    
    Args:
        command: Full command string (e.g., "/gateway targets")
        gateway_client: AgentCore Gateway client instance
        gateway_config: Gateway configuration dict with 'gateway_url', 'gateway_id', etc.
        
    Returns:
        None
        
    Raises:
        None - All exceptions are caught and displayed to user
        
    Example:
        >>> await handle_gateway_command(
        ...     "/gateway tools",
        ...     gateway_client,
        ...     {"gateway_url": "https://...", "gateway_id": "gw-123"}
        ... )
    """
    parts = command.split()
    if len(parts) < 2:
        show_gateway_help()
        return
    
    subcommand = parts[1].lower()
    
    if subcommand == "help":
        show_gateway_help()
        return
    
    elif subcommand == "info":
        console.print("\n🌐 [bold]AgentCore Gateway Information[/bold]")
        console.print(f"  Gateway ID: [cyan]{gateway_config['gateway_id']}[/cyan]")
        console.print(f"  Gateway URL: [cyan]{gateway_config['gateway_url']}[/cyan]")
        console.print(f"  Region: [cyan]{gateway_config['region']}[/cyan]")
        console.print(f"  Lambda Function: [cyan]{gateway_config.get('lambda_function_name', 'N/A')}[/cyan]")
        
        # Show authentication info
        client_info = gateway_config.get('client_info', {})
        console.print(f"  Client ID: [cyan]{client_info.get('client_id', 'N/A')}[/cyan]")
        console.print(f"  User Pool: [cyan]{client_info.get('user_pool_id', 'N/A')}[/cyan]")
    
    elif subcommand == "targets":
        console.print("\n🎯 [bold]Gateway Targets[/bold]")
        console.print("⏳ Retrieving targets...")
        
        try:
            # Use boto3 to list gateway targets
            client = boto3.client('bedrock-agentcore-control', region_name=gateway_config['region'])
            
            response = client.list_gateway_targets(
                gatewayIdentifier=gateway_config['gateway_id']
            )
            
            targets = response.get('items', [])
            
            if targets:
                table = Table(title="Gateway Targets", show_header=True, header_style="bold cyan")
                table.add_column("Name", style="cyan")
                table.add_column("ID", style="dim")
                table.add_column("Status")
                table.add_column("Created")
                
                for target in targets:
                    target_id = target.get('targetId', 'Unknown')
                    target_name = target.get('name', 'Unnamed')
                    status = target.get('status', 'Unknown')
                    created_at = str(target.get('createdAt', 'Unknown'))
                    
                    # Color code status
                    if status == 'READY':
                        status_style = "green"
                    elif status in ['CREATING', 'UPDATING']:
                        status_style = "yellow"
                    else:
                        status_style = "red"
                    
                    table.add_row(
                        target_name,
                        target_id,
                        f"[{status_style}]{status}[/{status_style}]",
                        created_at
                    )
                
                console.print(table)
            else:
                DisplayFormatter.display_no_results("targets")
                
        except Exception as e:
            DisplayFormatter.display_error(f"retrieving targets: {e}")
    
    elif subcommand == "search":
        if len(parts) < 3:
            console.print("\n❌ Usage: /gateway search <search_term>")
            console.print("Example: /gateway search warranty")
            return
        
        search_term = " ".join(parts[2:])  # Join all parts after "search"
        console.print(f"\n🔍 [bold]Gateway Semantic Search: '[cyan]{search_term}[/cyan]'[/bold]")
        
        try:
            # Connect to gateway via MCP and invoke the search tool
            mcp_client = MCPClientFactory.create(gateway_config, gateway_client)
            
            with mcp_client:
                # Invoke the semantic search tool
                tool_use_id = str(uuid.uuid4())
                result = mcp_client.call_tool_sync(
                    name="x_amz_bedrock_agentcore_search",
                    arguments={"query": search_term},
                    tool_use_id=tool_use_id
                )
                
                # Parse the result - it's a dict with 'structuredContent'
                if result and isinstance(result, dict):
                    structured = result.get('structuredContent', {})
                    tools = structured.get('tools', [])
                    
                    if tools:
                        console.print(f"\n📋 [bold]Found {len(tools)} matching tool(s):[/bold]")
                        for i, tool in enumerate(tools, 1):
                            tool_name = tool.get('name', 'Unknown')
                            description = tool.get('description', 'No description')
                            
                            console.print(f"  {i}. [bold cyan]{tool_name}[/bold cyan]")
                            console.print(f"     Description: [dim]{description}[/dim]")
                            console.print()
                    else:
                        console.print(f"\n❌ No tools found matching '[cyan]{search_term}[/cyan]'")
                else:
                    console.print(f"\n❌ No results found for '[cyan]{search_term}[/cyan]'")
                    
        except Exception as e:
            console.print(f"  [red]Error performing search: {e}[/red]")
    
    elif subcommand == "tools":
        console.print("\n🔧 [bold]Available Tools[/bold]")
        console.print("⏳ Retrieving tools from gateway...")
        
        try:
            # Connect to gateway via MCP to list tools
            mcp_client = MCPClientFactory.create(gateway_config, gateway_client)
            
            with mcp_client:
                tools = mcp_client.list_tools_sync()
                
                if tools:
                    table = Table(title="Available Tools", show_header=True, header_style="bold cyan")
                    table.add_column("Tool Name", style="cyan")
                    table.add_column("Description", style="dim")
                    
                    for tool in tools:
                        # Get tool name and description from MCPAgentTool
                        tool_name = getattr(tool, 'tool_name', 'Unknown')
                        
                        # Get description from tool_spec
                        description = 'No description'
                        if hasattr(tool, 'tool_spec') and tool.tool_spec:
                            spec = tool.tool_spec
                            if hasattr(spec, 'description'):
                                description = spec.description
                            elif isinstance(spec, dict):
                                description = spec.get('description', 'No description')
                        
                        table.add_row(tool_name, description)
                    
                    console.print(table)
                else:
                    DisplayFormatter.display_no_results("tools")
                    
        except Exception as e:
            DisplayFormatter.display_error(f"retrieving tools: {e}")
    
    else:
        console.print(f"\n❌ Unknown gateway command: {subcommand}")
        show_gateway_help()


def show_gateway_help() -> None:
    """Show available gateway commands."""
    console.print("\n🌐 [bold]Gateway Commands[/bold]")
    console.print("  /gateway help     - Show this help")
    console.print("  /gateway info     - Show gateway information")
    console.print("  /gateway targets  - List all gateway targets")
    console.print("  /gateway tools    - List all available tools")
    console.print("  /gateway search <term> - Search tools semantically")
    console.print("                     Example: /gateway search warranty")
    console.print()
