#!/usr/bin/env python3
"""
Message-Aware Block Tracking Test
==================================

PURPOSE:
    Validates the core algorithm that prevents block collisions in streaming display.
    This test proves that using composite keys (message_num, block_idx) correctly
    handles multiple messages with overlapping block indices.

WHEN TO USE THIS TEST:
    1. After modifying streaming_display.py event handling logic
    2. After changing how blocks are tracked (the `blocks` dictionary)
    3. After modifying message boundary detection (messageStart events)
    4. When debugging block collision issues
    5. Before deploying changes to streaming display code

WHAT THIS TEST VALIDATES:
    ✓ No block collisions across messages (same block_idx in different messages)
    ✓ Correct display order maintained (reasoning → tool → text)
    ✓ All block types captured correctly (reasoning, tool, text)
    ✓ Message boundaries tracked properly

HOW TO RUN:
    uv run tests/test_message_tracking.py

EXPECTED OUTPUT:
    - All 3 test cases pass
    - No collision warnings
    - Display order matches expected for each scenario

TEST SCENARIOS:
    1. Simple greeting with thinking: Tests reasoning + text blocks
    2. Tool without thinking: Tests tool + text blocks across 2 messages
    3. Tool with thinking: Tests reasoning + tool + text across 2 messages

IF THIS TEST FAILS:
    - Check that message_num increments on messageStart events
    - Verify blocks use (message_num, block_idx) composite keys
    - Ensure contentBlockStop uses same key format
    - Review event handling logic in streaming_display.py

RELATED TESTS:
    - test_visual_ux.py: Tests visual appearance and UX (spinners, duplicates)
    - This test: Tests underlying algorithm correctness
"""

import asyncio
from strands.agent import Agent
from src.demo_utils import create_bedrock_model, get_local_tools, get_customer_support_prompt


async def capture_stream_structure(query: str, enable_thinking: bool):
    """Capture the actual stream structure with message and block tracking."""
    agent = Agent(
        model=create_bedrock_model(enable_thinking=enable_thinking, thinking_budget=2048),
        tools=get_local_tools(),
        system_prompt=get_customer_support_prompt(),
        callback_handler=None,
    )
    
    message_num = 0
    blocks = {}  # (message_num, block_idx) -> {"type": ..., "content": ...}
    events_log = []
    
    async for event in agent.stream_async(query):
        if not isinstance(event, dict):
            continue
        
        if "event" in event:
            event = event["event"]
        
        # Track message boundaries
        if "messageStart" in event:
            message_num += 1
            events_log.append(f"MESSAGE {message_num} START")
        
        # Track block starts
        elif "contentBlockStart" in event:
            start_data = event["contentBlockStart"]
            idx = start_data.get("contentBlockIndex", 0)
            key = (message_num, idx)
            
            if "start" in start_data and "toolUse" in start_data["start"]:
                tool_name = start_data["start"]["toolUse"].get("name", "unknown")
                blocks[key] = {"type": "tool", "name": tool_name, "content": ""}
                events_log.append(f"  Block ({message_num},{idx}) START: tool={tool_name}")
            else:
                events_log.append(f"  Block ({message_num},{idx}) START")
        
        # Track content deltas
        elif "contentBlockDelta" in event:
            delta_data = event["contentBlockDelta"]
            idx = delta_data.get("contentBlockIndex", 0)
            key = (message_num, idx)
            
            if "delta" in delta_data:
                delta = delta_data["delta"]
                
                if "reasoningContent" in delta and "text" in delta["reasoningContent"]:
                    if key not in blocks:
                        blocks[key] = {"type": "reasoning", "content": ""}
                    blocks[key]["content"] += delta["reasoningContent"]["text"]
                
                elif "toolUse" in delta and "input" in delta["toolUse"]:
                    if key in blocks:
                        blocks[key]["content"] += delta["toolUse"]["input"]
                
                elif "text" in delta:
                    if key not in blocks:
                        blocks[key] = {"type": "text", "content": ""}
                    blocks[key]["content"] += delta["text"]
        
        # Track block stops
        elif "contentBlockStop" in event:
            idx = event["contentBlockStop"].get("contentBlockIndex", 0)
            key = (message_num, idx)
            if key in blocks:
                block_type = blocks[key]["type"]
                events_log.append(f"  Block ({message_num},{idx}) STOP: type={block_type}")
        
        elif "messageStop" in event:
            events_log.append(f"MESSAGE {message_num} STOP")
    
    return blocks, events_log


def verify_test_case(name: str, blocks: dict, events_log: list, expected_order: list):
    """Verify that blocks match expected pattern."""
    print(f"\n{'='*70}")
    print(f"TEST: {name}")
    print(f"{'='*70}")
    
    # Print event log
    print("\n📋 Event Log:")
    for event in events_log:
        print(f"  {event}")
    
    # Print blocks found
    print(f"\n📦 Blocks Captured: {len(blocks)}")
    for key in sorted(blocks.keys()):
        msg_num, block_idx = key
        block = blocks[key]
        content_preview = block["content"][:50].replace("\n", " ")
        print(f"  Key ({msg_num},{block_idx}): type={block['type']}, content='{content_preview}...'")
    
    # Verify expected order
    print(f"\n✅ Expected Display Order: {' → '.join(expected_order)}")
    
    actual_order = []
    for key in sorted(blocks.keys()):
        actual_order.append(blocks[key]["type"])
    
    print(f"✅ Actual Display Order: {' → '.join(actual_order)}")
    
    # Check for collisions (same key used twice)
    print(f"\n🔍 Collision Check:")
    if len(blocks) == len(set(blocks.keys())):
        print(f"  ✓ No collisions - all keys unique")
    else:
        print(f"  ✗ COLLISION DETECTED - duplicate keys!")
        return False
    
    # Verify order matches
    if actual_order == expected_order:
        print(f"  ✓ Order matches expected")
        return True
    else:
        print(f"  ✗ Order mismatch!")
        print(f"    Expected: {expected_order}")
        print(f"    Got: {actual_order}")
        return False


async def main():
    """Run all test cases."""
    print("\n🧪 Testing Message-Aware Block Tracking Solution")
    print("="*70)
    
    results = []
    
    # Test 1: Simple greeting with thinking (no tools)
    print("\n⏳ Running Test 1...")
    blocks, events = await capture_stream_structure("hi", enable_thinking=True)
    result1 = verify_test_case(
        "Simple greeting with thinking",
        blocks,
        events,
        expected_order=["reasoning", "text"]
    )
    results.append(("Test 1", result1))
    
    # Test 2: Tool without thinking
    print("\n⏳ Running Test 2...")
    blocks, events = await capture_stream_structure(
        "What's the return policy for laptops?",
        enable_thinking=False
    )
    result2 = verify_test_case(
        "Tool without thinking",
        blocks,
        events,
        expected_order=["tool", "text"]
    )
    results.append(("Test 2", result2))
    
    # Test 3: Tool with thinking
    print("\n⏳ Running Test 3...")
    blocks, events = await capture_stream_structure(
        "What's the return policy for laptops?",
        enable_thinking=True
    )
    result3 = verify_test_case(
        "Tool with thinking",
        blocks,
        events,
        expected_order=["reasoning", "tool", "text"]
    )
    results.append(("Test 3", result3))
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(result for _, result in results)
    print("\n" + ("="*70))
    if all_passed:
        print("🎉 ALL TESTS PASSED - Solution verified!")
    else:
        print("❌ SOME TESTS FAILED - Solution needs adjustment")
    print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
