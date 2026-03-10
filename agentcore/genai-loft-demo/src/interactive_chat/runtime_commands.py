"""Runtime command handler for interactive chat."""

import boto3
from typing import Optional
from rich.console import Console
from rich.table import Table
from .utilities import DisplayFormatter

console = Console()


async def handle_runtime_command(
    command: str,
    region: str = "eu-central-1",
    agent_arn: Optional[str] = None
) -> None:
    """
    Handle /runtime commands for inspecting AgentCore Runtime status.
    
    Args:
        command: Full command string (e.g., "/runtime list")
        region: AWS region for API calls
        agent_arn: Optional agent ARN for specific runtime queries
    """
    parts = command.split()
    if len(parts) < 2:
        show_runtime_help()
        return
    
    subcommand = parts[1].lower()
    client = boto3.client('bedrock-agentcore-control', region_name=region)
    
    if subcommand == "help":
        show_runtime_help()
        return
    
    elif subcommand == "list":
        console.print("\n🚀 [bold]AgentCore Runtimes[/bold]")
        try:
            response = client.list_agent_runtimes(maxResults=100)
            runtimes = response.get('agentRuntimes', [])
            
            if runtimes:
                table = Table(title=f"Agent Runtimes ({len(runtimes)} found)", show_header=True, header_style="bold cyan")
                table.add_column("Name", style="cyan", width=30)
                table.add_column("ID", style="dim", width=25)
                table.add_column("Version", width=8)
                table.add_column("Status", width=12)
                table.add_column("Updated", style="dim", width=20)
                
                for runtime in runtimes:
                    name = runtime.get('agentRuntimeName', 'N/A')
                    runtime_id = runtime.get('agentRuntimeId', 'N/A')
                    version = runtime.get('agentRuntimeVersion', 'N/A')
                    status = runtime.get('status', 'UNKNOWN')
                    updated = runtime.get('lastUpdatedAt', 'N/A')
                    
                    # Color code status
                    if status == 'ACTIVE':
                        status_display = f"[green]{status}[/green]"
                    elif status in ['CREATING', 'UPDATING']:
                        status_display = f"[yellow]{status}[/yellow]"
                    else:
                        status_display = f"[red]{status}[/red]"
                    
                    table.add_row(name, runtime_id, version, status_display, str(updated))
                
                console.print(table)
            else:
                DisplayFormatter.display_no_results("runtimes")
                
        except Exception as e:
            DisplayFormatter.display_error(str(e))
    
    elif subcommand == "status":
        if not agent_arn:
            console.print("\n❌ No agent ARN available. Deploy an agent first with: agentcore launch")
            return
        
        # Extract runtime ID and version from ARN
        # ARN format: arn:aws:bedrock-agentcore:region:account:agent/runtime-id:version
        try:
            arn_parts = agent_arn.split('/')
            if len(arn_parts) < 2:
                console.print(f"\n❌ Invalid agent ARN format: {agent_arn}")
                return
            
            runtime_info = arn_parts[1].split(':')
            runtime_id = runtime_info[0]
            version = runtime_info[1] if len(runtime_info) > 1 else None
            
            console.print(f"\n📊 [bold]Runtime Status[/bold]")
            console.print(f"Runtime ID: [cyan]{runtime_id}[/cyan]")
            if version:
                console.print(f"Version: [cyan]{version}[/cyan]")
            
            # Get detailed runtime info
            params = {'agentRuntimeId': runtime_id}
            if version:
                params['agentRuntimeVersion'] = version
            
            response = client.get_agent_runtime(**params)
            
            # Display key information
            table = Table(show_header=False, box=None)
            table.add_column("Field", style="bold", width=25)
            table.add_column("Value", width=60)
            
            status = response.get('status', 'UNKNOWN')
            status_color = "green" if status == "ACTIVE" else "yellow" if status in ["CREATING", "UPDATING"] else "red"
            
            table.add_row("Status", f"[{status_color}]{status}[/{status_color}]")
            table.add_row("Name", response.get('agentRuntimeName', 'N/A'))
            table.add_row("ARN", response.get('agentRuntimeArn', 'N/A'))
            table.add_row("Description", response.get('description', 'N/A'))
            table.add_row("Created", str(response.get('createdAt', 'N/A')))
            table.add_row("Last Updated", str(response.get('lastUpdatedAt', 'N/A')))
            
            # Network configuration
            network_config = response.get('networkConfiguration', {})
            network_mode = network_config.get('networkMode', 'N/A')
            table.add_row("Network Mode", network_mode)
            
            # Lifecycle configuration
            lifecycle = response.get('lifecycleConfiguration', {})
            if lifecycle:
                idle_timeout = lifecycle.get('idleRuntimeSessionTimeout', 'N/A')
                max_lifetime = lifecycle.get('maxLifetime', 'N/A')
                table.add_row("Idle Timeout", f"{idle_timeout}s" if idle_timeout != 'N/A' else 'N/A')
                table.add_row("Max Lifetime", f"{max_lifetime}s" if max_lifetime != 'N/A' else 'N/A')
            
            console.print(table)
            
        except Exception as e:
            DisplayFormatter.display_error(str(e))
    
    elif subcommand == "endpoints":
        if not agent_arn:
            console.print("\n❌ No agent ARN available. Deploy an agent first with: agentcore launch")
            return
        
        try:
            arn_parts = agent_arn.split('/')
            runtime_info = arn_parts[1].split(':')
            runtime_id = runtime_info[0]
            version = runtime_info[1] if len(runtime_info) > 1 else None
            
            console.print(f"\n🌐 [bold]Runtime Endpoints[/bold]")
            
            params = {'agentRuntimeId': runtime_id}
            if version:
                params['agentRuntimeVersion'] = version
            
            response = client.list_agent_runtime_endpoints(**params)
            endpoints = response.get('agentRuntimeEndpoints', [])
            
            if endpoints:
                table = Table(title=f"Endpoints ({len(endpoints)} found)", show_header=True, header_style="bold cyan")
                table.add_column("Name", style="cyan", width=25)
                table.add_column("Endpoint ID", style="dim", width=30)
                table.add_column("Status", width=12)
                table.add_column("URL", style="blue", width=50)
                
                for endpoint in endpoints:
                    name = endpoint.get('agentRuntimeEndpointName', 'N/A')
                    endpoint_id = endpoint.get('agentRuntimeEndpointId', 'N/A')
                    status = endpoint.get('status', 'UNKNOWN')
                    url = endpoint.get('endpointUrl', 'N/A')
                    
                    status_color = "green" if status == "ACTIVE" else "yellow" if status in ["CREATING"] else "red"
                    status_display = f"[{status_color}]{status}[/{status_color}]"
                    
                    table.add_row(name, endpoint_id, status_display, url)
                
                console.print(table)
            else:
                DisplayFormatter.display_no_results("endpoints")
                
        except Exception as e:
            DisplayFormatter.display_error(str(e))
    
    elif subcommand == "versions":
        if not agent_arn:
            console.print("\n❌ No agent ARN available. Deploy an agent first with: agentcore launch")
            return
        
        try:
            arn_parts = agent_arn.split('/')
            runtime_info = arn_parts[1].split(':')
            runtime_id = runtime_info[0]
            
            console.print(f"\n📦 [bold]Runtime Versions[/bold]")
            console.print(f"Runtime ID: [cyan]{runtime_id}[/cyan]")
            
            response = client.list_agent_runtime_versions(agentRuntimeId=runtime_id)
            versions = response.get('agentRuntimeVersions', [])
            
            if versions:
                table = Table(title=f"Versions ({len(versions)} found)", show_header=True, header_style="bold cyan")
                table.add_column("Version", style="cyan", width=10)
                table.add_column("Status", width=12)
                table.add_column("Created", style="dim", width=25)
                table.add_column("Description", width=50)
                
                for version in versions:
                    ver = version.get('agentRuntimeVersion', 'N/A')
                    status = version.get('status', 'UNKNOWN')
                    created = str(version.get('createdAt', 'N/A'))
                    desc = version.get('description', 'N/A')
                    
                    status_color = "green" if status == "ACTIVE" else "yellow" if status in ["CREATING"] else "red"
                    status_display = f"[{status_color}]{status}[/{status_color}]"
                    
                    table.add_row(ver, status_display, created, desc)
                
                console.print(table)
            else:
                DisplayFormatter.display_no_results("versions")
                
        except Exception as e:
            DisplayFormatter.display_error(str(e))
    
    else:
        console.print(f"\n❌ Unknown runtime command: {subcommand}")
        show_runtime_help()


def show_runtime_help() -> None:
    """Show available runtime commands."""
    console.print("\n🚀 [bold]Runtime Commands[/bold]")
    console.print("  /runtime help      - Show this help")
    console.print("  /runtime list      - List all agent runtimes in your account")
    console.print("  /runtime status    - Show detailed status of current runtime")
    console.print("  /runtime endpoints - List runtime endpoints")
    console.print("  /runtime versions  - List all versions of current runtime")
    console.print()
