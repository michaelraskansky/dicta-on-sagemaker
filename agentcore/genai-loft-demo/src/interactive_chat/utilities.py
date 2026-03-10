"""Shared utility classes for interactive chat."""

from typing import Any
from rich.console import Console

console = Console()


class MCPClientFactory:
    """Factory for creating configured MCP clients."""
    
    @staticmethod
    def create(gateway_config: dict, gateway_client) -> 'MCPClient':
        """
        Create an MCP client with authentication.
        
        Args:
            gateway_config: Gateway configuration dict with 'gateway_url' and 'client_info'
            gateway_client: GatewayClient instance for token generation
            
        Returns:
            Configured MCPClient instance
        """
        from strands.tools.mcp import MCPClient
        from mcp.client.streamable_http import streamablehttp_client
        
        access_token = gateway_client.get_access_token_for_cognito(
            gateway_config["client_info"]
        )
        
        return MCPClient(
            lambda: streamablehttp_client(
                gateway_config["gateway_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
        )


class DisplayFormatter:
    """Centralized display formatting utilities."""
    
    @staticmethod
    def display_error(message: str) -> None:
        """Display an error message."""
        console.print(f"  [red]Error: {message}[/red]")
    
    @staticmethod
    def display_success(message: str) -> None:
        """Display a success message."""
        console.print(f"  [green]✓ {message}[/green]")
    
    @staticmethod
    def display_section_header(title: str, icon: str = "📋") -> None:
        """Display a section header."""
        console.print(f"\n{icon} [bold]{title}[/bold]")
    
    @staticmethod
    def display_no_results(item_type: str = "items") -> None:
        """Display no results message."""
        console.print(f"  [dim]No {item_type} found[/dim]")
