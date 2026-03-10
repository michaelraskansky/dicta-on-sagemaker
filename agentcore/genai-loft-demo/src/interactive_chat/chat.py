"""Main interactive chat interface."""

import argparse
import readline
from typing import Optional, Any, Dict
from rich.console import Console
from .memory_commands import handle_memory_command
from .gateway_commands import handle_gateway_command
from .runtime_commands import handle_runtime_command
from .config import EXIT_COMMANDS
from ..streaming_display import (
    log_customer_message_chat,
    display_streaming_response_chat,
    suppress_output,
)

console = Console()


def parse_interactive_args():
    """Parse command line arguments for interactive mode."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument(
        "--automatic",
        action="store_true",
        help="Run automatic demo instead of interactive chat",
    )
    parser.add_argument(
        "--customer-id", type=str, help="Set specific customer ID for memory demo"
    )
    parser.add_argument(
        "--session-id", type=str, help="Set specific session ID for memory demo"
    )

    args, _ = parser.parse_known_args()
    return args


async def start_interactive_chat(
    agent: Any,
    customer_id: Optional[str] = None,
    title: str = "Interactive Chat",
    memory_client: Optional[Any] = None,
    memory_id: Optional[str] = None,
    session_id: Optional[str] = None,
    gateway_client: Optional[Any] = None,
    gateway_config: Optional[Dict[str, Any]] = None,
    runtime_region: Optional[str] = None,
    agent_arn: Optional[str] = None,
) -> None:
    """
    Start an interactive chat session with the given agent.

    Args:
        agent: The Strands agent instance to chat with
        customer_id: Optional customer ID for display and memory operations
        title: Chat session title displayed to user
        memory_client: Optional AgentCore Memory client for memory commands
        memory_id: Optional memory ID for memory operations
        session_id: Optional session ID for memory operations
        gateway_client: Optional AgentCore Gateway client for gateway commands
        gateway_config: Optional gateway configuration dict with 'gateway_url' and 'client_info'
        runtime_region: Optional AWS region for runtime API calls
        agent_arn: Optional agent ARN for runtime status queries

    Returns:
        None

    Raises:
        KeyboardInterrupt: When user presses Ctrl+C to exit
        Exception: Any other errors are caught and displayed to user

    Example:
        >>> await start_interactive_chat(
        ...     agent=my_agent,
        ...     customer_id="customer-123",
        ...     title="Customer Support Chat"
        ... )
    """
    # Enable readline for history and arrow key support
    readline.parse_and_bind("tab: complete")
    readline.parse_and_bind("set editing-mode emacs")

    console.print(f"\n💬 {title}")
    console.print("Type your messages below. Use 'quit', 'exit', or Ctrl+C to end.")

    help_commands = []
    if memory_client and memory_id:
        help_commands.append("/memory help")
    if gateway_client and gateway_config:
        help_commands.append("/gateway help")
    if runtime_region:
        help_commands.append("/runtime help")

    if help_commands:
        help_commands.append("/status")
        console.print(f"💡 Available commands: {', '.join(help_commands)}")

    console.print()

    if customer_id:
        console.print(f"🎯 Customer ID: [bold cyan]{customer_id}[/bold cyan]")

    console.print("💡 Start chatting with the agent!\n")

    while True:
        try:
            # Get user input with readline support for history
            # Get user input with readline support for history
            console.print("[bold green]>[/bold green] ", end="")
            user_input = input()

            # Clear the input line after entry
            print("\033[1A\033[2K", end="", flush=True)  # Move up and clear line

            # Check for exit commands
            if user_input.lower() in EXIT_COMMANDS:
                console.print("\n👋 Thanks for chatting! Goodbye!")
                break

            # Skip empty inputs
            if not user_input.strip():
                continue

            # Handle status command
            if user_input.strip() == "/status":
                console.print("\n📊 [bold]Session Status[/bold]")
                if customer_id:
                    console.print(f"  Customer: [cyan]{customer_id}[/cyan]")
                if session_id:
                    console.print(f"  Session: [cyan]{session_id}[/cyan]")
                if memory_id:
                    console.print(f"  Memory: [cyan]{memory_id}[/cyan]")
                if gateway_config:
                    console.print(
                        f"  Gateway: [cyan]{gateway_config.get('gateway_id', 'N/A')}[/cyan]"
                    )
                console.print()
                continue

            # Handle memory commands
            if user_input.startswith("/memory") and memory_client and memory_id:
                await handle_memory_command(
                    user_input, memory_client, memory_id, customer_id, session_id, agent
                )
                continue

            # Handle gateway commands
            if user_input.startswith("/gateway") and gateway_client and gateway_config:
                await handle_gateway_command(user_input, gateway_client, gateway_config)
                continue

            # Handle runtime commands
            if user_input.startswith("/runtime") and runtime_region:
                await handle_runtime_command(user_input, runtime_region, agent_arn)
                continue

            # Display user message using demo logging
            log_customer_message_chat(user_input, customer_id)

            # Get agent response with streaming display
            with suppress_output():
                await display_streaming_response_chat(agent, user_input)

        except KeyboardInterrupt:
            console.print("\n\n👋 Chat ended by user. Goodbye!")
            break
        except Exception as e:
            console.print(f"\n❌ Error: {e}")
            console.print("💡 Try again or type 'quit' to exit.")
            continue
