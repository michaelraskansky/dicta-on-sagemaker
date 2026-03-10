"""Content formatting utilities for memory display."""

import json
import re
import html
from typing import Any


def format_memory_content(content: Any) -> str:
    """
    Format memory content for better readability.
    
    Args:
        content: Memory content in various formats (dict, str, etc.)
        
    Returns:
        Formatted string with Rich markup for display
        
    Example:
        >>> formatted = format_memory_content({"preference": "Dark mode"})
        >>> print(formatted)  # Returns Rich-formatted preference string
    """
    # Handle different content formats
    if isinstance(content, dict):
        if 'text' in content:
            content = content['text']
        else:
            return str(content)
    
    # Try to parse JSON if it's a string
    if isinstance(content, str):
        try:
            # Check if it's JSON wrapped in a dict with 'text' key
            if content.startswith("{'text': '") or content.startswith('{"text": "'):
                # Extract the JSON from the text field
                import ast
                parsed = ast.literal_eval(content)
                if 'text' in parsed:
                    json_str = parsed['text']
                    data = json.loads(json_str)
                else:
                    data = json.loads(content)
            else:
                data = json.loads(content)
            
            # Format based on content type
            if 'preference' in data:
                # User preference format
                preference = data.get('preference', 'Unknown preference')
                context = data.get('context', '')
                categories = data.get('categories', [])
                
                result = f"[bold green]{preference}[/bold green]"
                if context:
                    result += f"\n     [dim]Context: {context}[/dim]"
                if categories:
                    result += f"\n     [dim]Categories: {', '.join(categories)}[/dim]"
                return result
            
            elif 'summary' in data:
                # Session summary format
                summary = data.get('summary', 'Unknown summary')
                return f"[bold blue]{summary}[/bold blue]"
            
            elif 'fact' in data:
                # Extracted fact format
                fact = data.get('fact', 'Unknown fact')
                return f"[bold yellow]{fact}[/bold yellow]"
            
            else:
                # Generic JSON format
                return f"[cyan]{json.dumps(data, indent=2)}[/cyan]"
                
        except (json.JSONDecodeError, ValueError, SyntaxError):
            # If not JSON, check if it's XML-style summary
            if '<topic name=' in content:
                return format_xml_summary(content)
            # If not JSON, return as-is
            return content
    
    # Check if it's XML-style summary content (not wrapped in JSON)
    if isinstance(content, str) and '<topic name=' in content:
        return format_xml_summary(content)
    
    return str(content)


def format_xml_summary(xml_content: str) -> str:
    """
    Format XML-style summary content for better readability.
    
    Args:
        xml_content: XML-formatted summary content string
        
    Returns:
        Rich-formatted string with proper line breaks and styling
        
    Example:
        >>> formatted = format_xml_summary('<topic name="Issue">Problem description</topic>')
        >>> print(formatted)  # Returns formatted topic with Rich markup
    """
    # Decode HTML entities
    xml_content = html.unescape(xml_content)
    
    # Extract topic sections
    topics = re.findall(r'<topic name="([^"]+)">\s*(.*?)\s*</topic>', xml_content, re.DOTALL)
    
    if not topics:
        return xml_content
    
    result = ""
    for i, (topic_name, topic_content) in enumerate(topics):
        if i > 0:
            result += "\n\n"  # Double line break between topics
        result += f"[bold blue]• {topic_name}[/bold blue]\n"
        # Clean up the content - remove extra whitespace and format nicely
        clean_content = re.sub(r'\s+', ' ', topic_content.strip())
        # Break long lines for better readability
        if len(clean_content) > 80:
            words = clean_content.split()
            lines = []
            current_line = ""
            for word in words:
                if len(current_line + " " + word) > 80:
                    if current_line:
                        lines.append(current_line)
                        current_line = word
                    else:
                        lines.append(word)
                else:
                    current_line = current_line + " " + word if current_line else word
            if current_line:
                lines.append(current_line)
            clean_content = "\n  ".join(lines)
        
        result += f"  [dim]{clean_content}[/dim]"
    
    return result
