"""Configuration for interactive chat commands."""

# Memory namespace configuration for data-driven memory retrieval
MEMORY_NAMESPACES = {
    "preferences": {
        "namespace": "/preferences/{customer_id}",
        "query": "preferences",
        "label": "User Preferences",
        "icon": "🎯",
        "color": "green"
    },
    "summaries": {
        "namespace": "/summaries/{customer_id}/{session_id}",
        "query": "conversation",
        "label": "Session Summaries",
        "icon": "📝",
        "color": "blue"
    },
    "facts": {
        "namespace": "/facts/{customer_id}",
        "query": "information",
        "label": "Extracted Facts",
        "icon": "💡",
        "color": "yellow"
    }
}

# Command constants
EXIT_COMMANDS = ["quit", "exit", "q"]
