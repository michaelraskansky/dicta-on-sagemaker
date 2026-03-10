"""
Customer Support Lambda Function for AgentCore Gateway
Contains warranty checking and web search tools
"""

import json
from typing import Dict, Any


def get_tool_name(event: Dict[str, Any]) -> str:
    """Extract tool name from Lambda event."""
    return event.get("tool_name", "")


def get_named_parameter(event: Dict[str, Any], name: str) -> Any:
    """Extract named parameter from Lambda event."""
    # Try direct access first (AgentCore Gateway format)
    if name in event:
        return event.get(name)
    # Fallback to nested parameters format
    parameters = event.get("parameters", {})
    return parameters.get(name)


def check_warranty_status(serial_number: str, customer_email: str = None) -> str:
    """Check warranty status using serial number and optional email verification."""
    # Simulate enterprise warranty system lookup
    warranty_data = {
        "MNO33333333": "Active warranty until 2025-12-31. Premium support included.",
        "ABC12345678": "Warranty expired 2024-06-15. Extended warranty available.",
        "XYZ98765432": "Active warranty until 2026-03-20. Standard coverage.",
    }
    
    status = warranty_data.get(serial_number, "Serial number not found in warranty database.")
    
    if customer_email:
        return f"Warranty Status for {serial_number} (verified via {customer_email}): {status}"
    return f"Warranty Status for {serial_number}: {status}"


def web_search(keywords: str, region: str = "us-en", max_results: int = 5) -> str:
    """Search the web for updated information."""
    # Simulate web search results
    return f"Found troubleshooting guides for: {keywords}. Check manufacturer website for detailed steps."


def lambda_handler(event, context):
    """Main Lambda handler for customer support tools."""
    
    print(f"Received event: {json.dumps(event)}")
    
    # Infer tool from required parameters
    if "serial_number" in event:
        tool_name = "check_warranty_status"
    elif "keywords" in event:
        tool_name = "web_search"
    else:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Cannot determine tool - missing required parameters"})
        }
    
    print(f"Inferred tool: {tool_name}")
    
    if tool_name == "check_warranty_status":
        serial_number = event.get("serial_number")
        customer_email = event.get("customer_email")
        
        print(f"Parameters - serial_number: {serial_number}, customer_email: {customer_email}")
        
        if not serial_number:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "serial_number is required"})
            }
        
        result = check_warranty_status(serial_number, customer_email)
        return {
            "statusCode": 200,
            "body": json.dumps({"result": result})
        }
    
    elif tool_name == "web_search":
        keywords = event.get("keywords")
        region = event.get("region", "us-en")
        max_results = event.get("max_results", 5)
        
        if not keywords:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "keywords is required"})
            }
        
        result = web_search(keywords, region, max_results)
        return {
            "statusCode": 200,
            "body": json.dumps({"result": result})
        }
    
    else:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Unknown tool: {tool_name}"})
        }
