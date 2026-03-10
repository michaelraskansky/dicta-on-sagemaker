"""
Interactive Chat Interface for Strands Agent Demos
=================================================

Provides a reusable chat interface that can be integrated into any demo
with minimal changes to the demo code.
"""

from .chat import start_interactive_chat, parse_interactive_args
from .memory_commands import handle_memory_command, show_memory_help
from .gateway_commands import handle_gateway_command, show_gateway_help
from .runtime_commands import handle_runtime_command, show_runtime_help
from .utilities import MCPClientFactory, DisplayFormatter
from .formatters import format_memory_content, format_xml_summary
from .config import MEMORY_NAMESPACES

__all__ = [
    # Main chat interface
    "start_interactive_chat",
    "parse_interactive_args",
    
    # Command handlers
    "handle_memory_command",
    "handle_gateway_command",
    "handle_runtime_command",
    
    # Help functions
    "show_memory_help",
    "show_gateway_help",
    "show_runtime_help",
    
    # Utilities
    "MCPClientFactory",
    "DisplayFormatter",
    
    # Formatters
    "format_memory_content",
    "format_xml_summary",
    
    # Configuration
    "MEMORY_NAMESPACES",
]
