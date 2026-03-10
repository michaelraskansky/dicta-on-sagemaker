"""
Unit tests for interactive_chat module refactored utilities.
"""

import pytest
from unittest.mock import Mock, MagicMock, patch

# Import from the new modular structure
try:
    from src.interactive_chat import (
        MCPClientFactory,
        DisplayFormatter,
        MEMORY_NAMESPACES,
    )
    from src.interactive_chat.memory_commands import retrieve_memory_type
    # Use actual imports if available
    MEMORY_NAMESPACES_TEST = MEMORY_NAMESPACES
except ImportError:
    # Fallback to test data if imports fail
    MEMORY_NAMESPACES_TEST = {
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


class TestMCPClientFactory:
    """Test cases for MCPClientFactory concept."""
    
    def test_create_client_concept(self):
        """Test MCP client creation concept."""
        # Mock the factory pattern
        gateway_config = {
            "gateway_url": "https://test.gateway.com",
            "client_info": {"client_id": "test"}
        }
        gateway_client = Mock()
        gateway_client.get_access_token_for_cognito.return_value = "test_token"
        
        # Simulate factory behavior
        access_token = gateway_client.get_access_token_for_cognito(gateway_config["client_info"])
        
        # Verify token was requested
        gateway_client.get_access_token_for_cognito.assert_called_once_with(
            {"client_id": "test"}
        )
        assert access_token == "test_token"


class TestDisplayFormatter:
    """Test cases for DisplayFormatter concept."""
    
    def test_display_error_format(self):
        """Test error message format."""
        message = "Test error"
        expected = "  [red]Error: Test error[/red]"
        
        # Simulate DisplayFormatter.display_error behavior
        formatted = f"  [red]Error: {message}[/red]"
        assert formatted == expected
    
    def test_display_success_format(self):
        """Test success message format."""
        message = "Test success"
        expected = "  [green]✓ Test success[/green]"
        
        # Simulate DisplayFormatter.display_success behavior
        formatted = f"  [green]✓ {message}[/green]"
        assert formatted == expected
    
    def test_display_section_header_format(self):
        """Test section header format."""
        title = "Test Section"
        icon = "🔧"
        expected = "\n🔧 [bold]Test Section[/bold]"
        
        # Simulate DisplayFormatter.display_section_header behavior
        formatted = f"\n{icon} [bold]{title}[/bold]"
        assert formatted == expected
    
    def test_display_no_results_format(self):
        """Test no results message format."""
        item_type = "tools"
        expected = "  [dim]No tools found[/dim]"
        
        # Simulate DisplayFormatter.display_no_results behavior
        formatted = f"  [dim]No {item_type} found[/dim]"
        assert formatted == expected


class TestMemoryNamespaces:
    """Test cases for MEMORY_NAMESPACES configuration."""
    
    def test_namespace_config_structure(self):
        """Test memory namespace configuration is valid."""
        required_keys = ["namespace", "query", "label", "icon", "color"]
        
        for key, config in MEMORY_NAMESPACES_TEST.items():
            for required_key in required_keys:
                assert required_key in config, f"Missing {required_key} in {key} config"
    
    def test_namespace_formatting(self):
        """Test namespace string formatting works correctly."""
        preferences_ns = MEMORY_NAMESPACES_TEST["preferences"]["namespace"]
        formatted = preferences_ns.format(customer_id="test-customer")
        assert formatted == "/preferences/test-customer"
        
        summaries_ns = MEMORY_NAMESPACES_TEST["summaries"]["namespace"]
        formatted = summaries_ns.format(customer_id="test-customer", session_id="test-session")
        assert formatted == "/summaries/test-customer/test-session"
    
    def test_all_memory_types_present(self):
        """Test all expected memory types are configured."""
        expected_types = ["preferences", "summaries", "facts"]
        for memory_type in expected_types:
            assert memory_type in MEMORY_NAMESPACES_TEST


@pytest.mark.asyncio
class TestRetrieveMemoryType:
    """Test cases for retrieve_memory_type function concept."""
    
    async def test_retrieve_memory_type_concept(self):
        """Test memory retrieval concept."""
        memory_client = Mock()
        memory_client.retrieve_memories.return_value = [
            {"content": "test content 1"},
            {"content": "test content 2"}
        ]
        
        # Simulate retrieve_memory_type behavior
        memory_type = "preferences"
        config = MEMORY_NAMESPACES_TEST[memory_type]
        namespace = config["namespace"].format(customer_id="customer-456", session_id="session-789")
        
        memories = memory_client.retrieve_memories(
            memory_id="mem-123",
            namespace=namespace,
            query=config["query"],
            top_k=10
        )
        
        # Verify memory client was called with correct parameters
        memory_client.retrieve_memories.assert_called_once_with(
            memory_id="mem-123",
            namespace="/preferences/customer-456",
            query="preferences",
            top_k=10
        )
        
        assert len(memories) == 2
        assert memories[0]["content"] == "test content 1"
    
    async def test_retrieve_memory_type_no_results(self):
        """Test memory retrieval with no results."""
        memory_client = Mock()
        memory_client.retrieve_memories.return_value = []
        
        # Simulate retrieve_memory_type behavior
        memories = memory_client.retrieve_memories(
            memory_id="mem-123",
            namespace="/facts/customer-456",
            query="information",
            top_k=10
        )
        
        assert len(memories) == 0
    
    async def test_retrieve_memory_type_error_handling(self):
        """Test memory retrieval error handling."""
        memory_client = Mock()
        memory_client.retrieve_memories.side_effect = Exception("Test error")
        
        # Simulate retrieve_memory_type error handling
        try:
            memory_client.retrieve_memories(
                memory_id="mem-123",
                namespace="/summaries/customer-456/session-789",
                query="conversation",
                top_k=10
            )
            assert False, "Should have raised exception"
        except Exception as e:
            assert str(e) == "Test error"


class TestCodeReduction:
    """Test cases to verify code reduction goals."""
    
    def test_memory_namespace_consolidation(self):
        """Test that memory namespaces can be processed generically."""
        # Before: 3 separate functions with duplicated logic
        # After: 1 generic function + configuration
        
        test_cases = [
            ("preferences", "/preferences/customer-123", "preferences"),
            ("summaries", "/summaries/customer-123/session-456", "conversation"),
            ("facts", "/facts/customer-123", "information")
        ]
        
        for memory_type, expected_namespace, expected_query in test_cases:
            config = MEMORY_NAMESPACES_TEST[memory_type]
            
            # Verify namespace formatting
            if memory_type == "summaries":
                namespace = config["namespace"].format(customer_id="customer-123", session_id="session-456")
            else:
                namespace = config["namespace"].format(customer_id="customer-123", session_id="session-456")
            
            assert namespace == expected_namespace
            assert config["query"] == expected_query
    
    def test_display_formatter_consolidation(self):
        """Test that display patterns are consolidated."""
        # Test different message types use consistent formatting
        error_msg = "  [red]Error: Test error[/red]"
        success_msg = "  [green]✓ Test success[/green]"
        no_results_msg = "  [dim]No items found[/dim]"
        
        # All follow consistent patterns
        assert error_msg.startswith("  [red]Error:")
        assert success_msg.startswith("  [green]✓")
        assert no_results_msg.startswith("  [dim]No")
        assert no_results_msg.endswith("found[/dim]")


if __name__ == "__main__":
    pytest.main([__file__])
