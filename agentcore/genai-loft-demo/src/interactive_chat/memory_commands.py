"""Memory command handler for interactive chat."""

import asyncio
import json
from typing import Any, Optional
from rich.console import Console
from .config import MEMORY_NAMESPACES
from .utilities import DisplayFormatter
from .formatters import format_memory_content

console = Console()


async def retrieve_memory_type(
    memory_type: str,
    memory_client,
    memory_id: str,
    customer_id: str,
    session_id: str
) -> None:
    """
    Generic function to retrieve and display memories of a specific type.
    
    Args:
        memory_type: Key from MEMORY_NAMESPACES dict
        memory_client: AgentCore Memory client
        memory_id: Memory ID
        customer_id: Customer ID for namespace formatting
        session_id: Session ID for namespace formatting
    """
    config = MEMORY_NAMESPACES[memory_type]
    namespace = config["namespace"].format(
        customer_id=customer_id,
        session_id=session_id
    )
    
    console.print(f"\n{config['icon']} [bold]{config['label']}[/bold]")
    
    try:
        memories = memory_client.retrieve_memories(
            memory_id=memory_id,
            namespace=namespace,
            query=config["query"],
            top_k=10
        )
        
        if memories:
            for i, record in enumerate(memories, 1):
                content = record.get('content', 'No content')
                formatted_content = format_memory_content(content)
                console.print(f"  {i}. {formatted_content}")
        else:
            DisplayFormatter.display_no_results("memories")
            
    except Exception as e:
        DisplayFormatter.display_error(str(e))


async def handle_memory_command(
    command: str,
    memory_client: Any,
    memory_id: str,
    customer_id: str,
    session_id: str,
    agent: Optional[Any] = None
) -> None:
    """
    Handle /memory commands for inspecting AgentCore Memory.
    
    Args:
        command: Full command string (e.g., "/memory list")
        memory_client: AgentCore Memory client instance
        memory_id: Memory ID for retrieval operations
        customer_id: Customer ID for namespace formatting
        session_id: Session ID for namespace formatting
        agent: Optional agent instance (unused currently)
        
    Returns:
        None
        
    Raises:
        None - All exceptions are caught and displayed to user
        
    Example:
        >>> await handle_memory_command(
        ...     "/memory list",
        ...     memory_client,
        ...     "mem-123",
        ...     "customer-456",
        ...     "session-789"
        ... )
    """
    parts = command.split()
    if len(parts) < 2:
        show_memory_help()
        return
    
    subcommand = parts[1].lower()
    
    if subcommand == "help":
        show_memory_help()
        return
    
    elif subcommand == "list":
        console.print("\n🧠 [bold]AgentCore Memory Contents[/bold]")
        console.print("⏳ Retrieving memories... (this may take a moment)")
        
        # Wait a bit for any recent extractions
        await asyncio.sleep(2)
        
        namespaces = [
            (f"/preferences/{customer_id}", "User Preferences"),
            (f"/summaries/{customer_id}/{session_id}", "Session Summaries"),
            (f"/facts/{customer_id}", "Extracted Facts")
        ]
        
        for namespace, label in namespaces:
            try:
                memories = memory_client.retrieve_memories(
                    memory_id=memory_id,
                    namespace=namespace,
                    query="user",  # Generic query that should match most content
                    top_k=10
                )
                
                console.print(f"\n📋 [bold cyan]{label}[/bold cyan] ({namespace})")
                if memories:
                    for i, record in enumerate(memories, 1):
                        content = record.get('content', 'No content')
                        # Try to parse and format JSON content nicely
                        formatted_content = format_memory_content(content)
                        console.print(f"  {i}. {formatted_content}")
                else:
                    console.print("  [dim]No memories found[/dim]")
                    
            except Exception as e:
                console.print(f"  [red]Error retrieving {label}: {e}[/red]")
    
    elif subcommand == "preferences":
        await retrieve_memory_type("preferences", memory_client, memory_id, customer_id, session_id)
    
    elif subcommand == "summaries":
        await retrieve_memory_type("summaries", memory_client, memory_id, customer_id, session_id)
    
    elif subcommand == "facts":
        await retrieve_memory_type("facts", memory_client, memory_id, customer_id, session_id)
    
    elif subcommand == "events":
        console.print("\n📜 [bold]Raw Conversation Events[/bold]")
        try:
            events = memory_client.list_events(
                memory_id=memory_id,
                actor_id=customer_id,
                session_id=session_id,
                max_results=10
            )
            
            if events:
                from rich.table import Table
                
                table = Table(title=f"Conversation Events ({len(events)} events)", show_header=True, header_style="bold cyan")
                table.add_column("Event", style="cyan", width=8)
                table.add_column("Time", style="dim", width=25)
                table.add_column("Role", width=10)
                table.add_column("Message", style="dim")
                
                for i, event in enumerate(events, 1):
                    event_id = event.get('eventId', 'Unknown')
                    timestamp = str(event.get('eventTimestamp', event.get('timestamp', 'Unknown')))
                    
                    # Parse the payload structure
                    payload = event.get('payload', [])
                    role = "UNKNOWN"
                    content = "No content"
                    
                    if payload and isinstance(payload, list):
                        for item in payload:
                            if isinstance(item, dict) and 'conversational' in item:
                                conv_data = item['conversational']
                                if 'content' in conv_data and 'text' in conv_data['content']:
                                    try:
                                        # Parse the JSON content
                                        content_json = json.loads(conv_data['content']['text'])
                                        
                                        # Extract message from the JSON
                                        if 'message' in content_json:
                                            msg = content_json['message']
                                            role = msg.get('role', 'unknown').upper()
                                            
                                            # Handle different content formats
                                            msg_content = msg.get('content', [])
                                            text_parts = []
                                            
                                            if isinstance(msg_content, list):
                                                for part in msg_content:
                                                    if isinstance(part, dict):
                                                        if 'text' in part:
                                                            text_parts.append(part['text'])
                                                    else:
                                                        text_parts.append(str(part))
                                            else:
                                                text_parts.append(str(msg_content))
                                            
                                            content = " | ".join(text_parts) if text_parts else "No content"
                                            
                                            # Keep text on single line
                                            content = content.replace('\n', ' ').replace('\r', ' ')
                                            content = ' '.join(content.split())
                                            
                                            # Truncate long messages
                                            if len(content) > 100:
                                                content = content[:97] + "..."
                                        
                                        elif 'user_message' in content_json:
                                            role = "USER"
                                            content = content_json['user_message']
                                        
                                        elif 'user_message' in content_json:
                                            role = "USER"
                                            content = content_json['user_message']
                                            
                                    except json.JSONDecodeError:
                                        pass
                    
                    # Color code role
                    role_style = "green" if role == "USER" else "blue" if role == "ASSISTANT" else "yellow"
                    
                    table.add_row(
                        f"#{i}",
                        timestamp,
                        f"[{role_style}]{role}[/{role_style}]",
                        content
                    )
                
                console.print(table)
                        
            else:
                DisplayFormatter.display_no_results("events")
                
        except Exception as e:
            DisplayFormatter.display_error(str(e))
    
    elif subcommand == "query":
        if len(parts) < 3:
            console.print("\n❌ Usage: /memory query <search_term>")
            console.print("Example: /memory query food")
            return
        
        query_term = " ".join(parts[2:])  # Join all parts after "query"
        console.print(f"\n🔍 [bold]Memory Query: '[cyan]{query_term}[/cyan]'[/bold]")
        
        # Search across all namespaces
        namespaces = [
            (f"/preferences/{customer_id}", "User Preferences", "green"),
            (f"/facts/{customer_id}", "Extracted Facts", "yellow"),
            (f"/summaries/{customer_id}/{session_id}", "Session Summaries", "blue")
        ]
        
        total_results = 0
        for namespace, label, color in namespaces:
            try:
                results = memory_client.retrieve_memories(
                    memory_id=memory_id,
                    namespace=namespace,
                    query=query_term,
                    top_k=5
                )
                
                if results:
                    console.print(f"\n📋 [bold {color}]{label}[/bold {color}] ({len(results)} matches)")
                    for i, result in enumerate(results, 1):
                        content = result.get('content', 'No content')
                        score = result.get('score', 0)
                        formatted_content = format_memory_content(content)
                        
                        # Color code similarity score
                        if score >= 0.7:
                            score_color = "green"
                        elif score >= 0.5:
                            score_color = "yellow"
                        else:
                            score_color = "red"
                        
                        console.print(f"  {i}. [{score_color}]similarity: {score:.3f}[/{score_color}] {formatted_content}")
                    total_results += len(results)
                    
            except Exception as e:
                console.print(f"  [red]Error searching {label}: {e}[/red]")
        
        if total_results == 0:
            console.print(f"\n❌ No memories found matching '[cyan]{query_term}[/cyan]'")
        else:
            console.print(f"\n✅ Found {total_results} total matches across all memory types")
    
    else:
        console.print(f"\n❌ Unknown memory command: {subcommand}")
        show_memory_help()


def show_memory_help() -> None:
    """Show available memory commands."""
    console.print("\n🧠 [bold]Memory Commands[/bold]")
    console.print("  /memory help        - Show this help")
    console.print("  /memory list        - List all memories by type")
    console.print("  /memory preferences - Show only user preferences")
    console.print("  /memory summaries   - Show only session summaries")
    console.print("  /memory facts       - Show only extracted facts")
    console.print("  /memory events      - Show raw conversation events")
    console.print("  /memory query <term> - Search memories with similarity scores")
    console.print("                       Example: /memory query food")
    console.print()
