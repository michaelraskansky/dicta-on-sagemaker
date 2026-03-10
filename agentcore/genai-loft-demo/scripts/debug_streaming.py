#!/usr/bin/env python3
"""
Debug Script: Inspect Streaming Event Structure
================================================

Quick utility to inspect the structure of streaming events from agents.
Useful for debugging display issues or understanding model behavior.

Usage:
    uv run python debug_stream_events.py

What it shows:
- Content block indices (0, 1, 2, etc.)
- Event types (reasoning, text, toolUse)
- First 50 characters of each text chunk
- Helps identify duplicate content or unexpected block structure
"""

import asyncio
from strands.agent import Agent
from src.demo_utils import create_bedrock_model, get_local_tools, get_customer_support_prompt


async def inspect_stream_events(user_input: str = "What's the return policy?", verbose: bool = False, enable_thinking: bool = False):
    """
    Inspect streaming events from agent response.
    
    Args:
        user_input: Question to ask the agent
        verbose: If True, show all event types including unknown ones
        enable_thinking: If True, enable extended thinking for Claude
    """
    agent = Agent(
        model=create_bedrock_model(enable_thinking=enable_thinking, thinking_budget=2048),
        tools=get_local_tools(),
        system_prompt=get_customer_support_prompt(),
        callback_handler=None,
    )
    
    thinking_status = "WITH EXTENDED THINKING" if enable_thinking else "standard mode"
    print(f"\n🔍 Inspecting stream events for: '{user_input}' ({thinking_status})")
    print("=" * 70)
    
    event_count = 0
    blocks_seen = set()
    unknown_events = []
    
    async for event in agent.stream_async(user_input):
        if not isinstance(event, dict):
            if verbose:
                print(f"  ⚠️  Non-dict event: {type(event)}")
            continue
        
        event_count += 1
        
        # Unwrap event if needed
        original_event = event
        if "event" in event:
            event = event["event"]
        
        # Track all top-level event keys
        event_keys = set(event.keys())
        
        # Track content block starts
        if "contentBlockStart" in event:
            start_data = event["contentBlockStart"]
            idx = start_data.get("contentBlockIndex", 0)
            blocks_seen.add(idx)
            
            if "start" in start_data:
                if "toolUse" in start_data["start"]:
                    tool_name = start_data["start"]["toolUse"].get("name", "unknown")
                    print(f"\n📦 Block {idx} START: Tool Use ({tool_name})")
                else:
                    print(f"\n📦 Block {idx} START")
        
        # Track content deltas
        elif "contentBlockDelta" in event:
            delta_data = event["contentBlockDelta"]
            idx = delta_data.get("contentBlockIndex", 0)
            
            if "delta" in delta_data:
                delta = delta_data["delta"]
                
                # Reasoning
                if "reasoningContent" in delta:
                    text = delta["reasoningContent"].get("text", "")
                    preview = text[:50].replace("\n", " ")
                    print(f"  🧠 Block {idx} REASONING: {preview}...")
                
                # Tool input
                elif "toolUse" in delta:
                    tool_input = delta["toolUse"].get("input", "")
                    preview = tool_input[:50].replace("\n", " ")
                    print(f"  🔧 Block {idx} TOOL INPUT: {preview}...")
                
                # Response text
                elif "text" in delta:
                    text = delta["text"]
                    preview = text[:50].replace("\n", " ")
                    print(f"  💬 Block {idx} TEXT: {preview}...")
        
        # Track content block stops
        elif "contentBlockStop" in event:
            idx = event["contentBlockStop"].get("contentBlockIndex", 0)
            print(f"  ✅ Block {idx} STOP")
        
        # Track message start/stop
        elif "messageStart" in event:
            print(f"  📨 MESSAGE START")
            if verbose:
                print(f"     {event['messageStart']}")
        
        elif "messageStop" in event:
            print(f"  📨 MESSAGE STOP")
            if verbose:
                print(f"     {event['messageStop']}")
        
        # Track metadata
        elif "metadata" in event:
            print(f"  📊 METADATA")
            if verbose:
                print(f"     {event['metadata']}")
        
        # Catch unknown event types
        else:
            unknown_type = list(event.keys())[0] if event else "empty"
            unknown_events.append(unknown_type)
            if verbose:
                print(f"  ❓ UNKNOWN EVENT: {unknown_type}")
                print(f"     {event}")
    
    print("\n" + "=" * 70)
    print(f"📊 Summary:")
    print(f"  Total events: {event_count}")
    print(f"  Content blocks: {sorted(blocks_seen)}")
    if unknown_events:
        print(f"  Unknown event types: {set(unknown_events)}")
    print()


def main():
    """Parse arguments and run inspection."""
    import argparse
    parser = argparse.ArgumentParser(description="Inspect agent streaming events")
    parser.add_argument("--thinking", action="store_true", help="Enable extended thinking")
    parser.add_argument("--verbose", action="store_true", help="Show all event types")
    parser.add_argument("--query", default="What's the return policy?", help="Query to test")
    args = parser.parse_args()
    
    asyncio.run(inspect_stream_events(args.query, args.verbose, args.thinking))


if __name__ == "__main__":
    main()


def main():
    """Entry point for uv run debug_streaming"""
    import sys
    
    # Check for flags
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    enable_thinking = "--thinking" in sys.argv or "-t" in sys.argv
    
    # Test with different questions
    asyncio.run(inspect_stream_events(
        "What's the return policy for laptops?",
        verbose=verbose,
        enable_thinking=enable_thinking
    ))
    
    if not verbose:
        print("\n💡 Tip: Run with --verbose to see all event details")
    if not enable_thinking:
        print("💡 Tip: Run with --thinking to enable extended thinking")
    
    # Uncomment to test other scenarios:
    # asyncio.run(inspect_stream_events("Tell me about your headphones", verbose=verbose, enable_thinking=enable_thinking))
    # asyncio.run(inspect_stream_events("My phone won't turn on", verbose=verbose, enable_thinking=enable_thinking))
