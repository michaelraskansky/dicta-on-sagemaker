"""
Demo logging system for streaming agent responses
"""

import sys
from contextlib import contextmanager
from rich.console import Console
from rich.panel import Panel
from rich.align import Align
from rich.spinner import Spinner
from rich.live import Live

console = Console(stderr=True)

# Block display configuration
BLOCK_CONFIG = {
    "reasoning": {
        "title": "🧠 Agent Reasoning",
        "style": "cyan",
        "width": 60,
        "align": "center",
        "spinner_text": "Agent is thinking..."
    },
    "tool": {
        "title": "🔧 Tool Call",
        "style": "blue",
        "width": 50,
        "align": "center",
        "spinner_text": "Calling tool..."
    },
    "text": {
        "title": "🤖 Agent Response",
        "style": "green",
        "width": 50,
        "align": "right",
        "spinner_text": "Generating response..."
    }
}


@contextmanager
def suppress_output():
    """Context manager to suppress stdout during agent execution while preserving Rich console"""
    old_stdout = sys.stdout
    sys.stdout = open('/dev/null', 'w')
    try:
        yield
    finally:
        sys.stdout.close()
        sys.stdout = old_stdout


def log_customer_message_chat(message: str, customer_id: str = None):
    """Log customer message in chat style (left side)"""
    title = f"👤 Customer ({customer_id})" if customer_id else "👤 Customer"
    panel = Panel(message, title=title, style="white", width=50)
    console.print(Align.left(panel))


def _create_panel(block_type: str, content: str, tool_name: str = None) -> Panel:
    """Create a panel based on block type configuration."""
    config = BLOCK_CONFIG[block_type]
    
    # Format content for tool blocks
    if block_type == "tool" and tool_name:
        content = f"Tool: {tool_name}\n{content}"
    
    return Panel(content, title=config["title"], style=config["style"], width=config["width"])


def _display_panel(block_type: str, content: str, tool_name: str = None):
    """Display a panel with proper alignment."""
    config = BLOCK_CONFIG[block_type]
    panel = _create_panel(block_type, content, tool_name)
    
    if config["align"] == "center":
        console.print(Align.center(panel))
    elif config["align"] == "right":
        console.print(Align.right(panel))
    else:
        console.print(panel)


async def display_streaming_response_chat(agent, user_input):
    """Display agent response as it streams in with progress indicators."""
    blocks = {}
    metadata = None
    message_num = 0
    live = None
    
    def start_spinner(text: str):
        """Start a spinner with given text."""
        nonlocal live
        if live:
            live.stop()
        spinner = Spinner("dots", text=text)
        live = Live(spinner, console=console, refresh_per_second=10)
        live.start()
    
    def stop_spinner():
        """Stop and clear the active spinner."""
        nonlocal live
        if live:
            live.update("")
            live.stop()
            live = None
    
    try:
        async for event in agent.stream_async(user_input):
            if not isinstance(event, dict):
                continue
            
            # Unwrap event if needed
            if "event" in event:
                event = event["event"]
            
            # Handle metadata
            if "metadata" in event:
                metadata = event["metadata"]
                continue
            
            # Track message boundaries
            if "messageStart" in event:
                message_num += 1
                continue
            
            # Handle content block start
            if "contentBlockStart" in event:
                start_data = event["contentBlockStart"]
                idx = start_data.get("contentBlockIndex", 0)
                key = (message_num, idx)
                
                # Initialize tool block
                if "start" in start_data and "toolUse" in start_data["start"]:
                    tool_name = start_data["start"]["toolUse"].get("name", "unknown")
                    blocks[key] = {"type": "tool", "content": "", "name": tool_name}
                    start_spinner(BLOCK_CONFIG["tool"]["spinner_text"])
                continue
            
            # Handle content deltas
            if "contentBlockDelta" in event:
                delta_data = event["contentBlockDelta"]
                idx = delta_data.get("contentBlockIndex", 0)
                key = (message_num, idx)
                
                if "delta" not in delta_data:
                    continue
                
                delta = delta_data["delta"]
                
                # Reasoning content
                if "reasoningContent" in delta and "text" in delta["reasoningContent"]:
                    if key not in blocks:
                        blocks[key] = {"type": "reasoning", "content": ""}
                        start_spinner(BLOCK_CONFIG["reasoning"]["spinner_text"])
                    blocks[key]["content"] += delta["reasoningContent"]["text"]
                
                # Tool input
                elif "toolUse" in delta and "input" in delta["toolUse"]:
                    if key in blocks:
                        blocks[key]["content"] += delta["toolUse"]["input"]
                
                # Response text
                elif "text" in delta:
                    if key not in blocks:
                        blocks[key] = {"type": "text", "content": ""}
                        start_spinner(BLOCK_CONFIG["text"]["spinner_text"])
                    blocks[key]["content"] += delta["text"]
                continue
            
            # Handle content block stop
            if "contentBlockStop" in event:
                idx = event["contentBlockStop"].get("contentBlockIndex", 0)
                key = (message_num, idx)
                
                stop_spinner()
                
                if key in blocks:
                    block = blocks[key]
                    tool_name = block.get("name") if block["type"] == "tool" else None
                    _display_panel(block["type"], block["content"], tool_name)
    
    finally:
        stop_spinner()
    
    # Display metadata
    if metadata:
        usage = metadata.get("usage", {})
        metrics = metadata.get("metrics", {})
        
        parts = []
        if usage:
            input_tokens = usage.get("inputTokens", 0)
            output_tokens = usage.get("outputTokens", 0)
            total_tokens = usage.get("totalTokens", 0)
            parts.append(f"Tokens: {input_tokens} in / {output_tokens} out / {total_tokens} total")
        
        if metrics and "latencyMs" in metrics:
            parts.append(f"Latency: {metrics['latencyMs']}ms")
        
        if parts:
            console.print(f"[dim]{' | '.join(parts)}[/dim]")
    
    console.print()  # Add spacing
