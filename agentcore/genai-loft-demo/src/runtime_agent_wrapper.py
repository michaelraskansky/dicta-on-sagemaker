"""
Runtime Agent Wrapper
====================

Wrapper for invoking AgentCore Runtime agents with streaming support.
Makes remote runtime agents compatible with interactive chat interface.
"""

import json
import asyncio
import boto3
import sys


class RuntimeAgentWrapper:
    """Wrapper that makes AgentCore Runtime agents compatible with interactive chat."""
    
    def __init__(self, agent_arn: str, session_id: str, customer_id: str, region: str = "eu-central-1"):
        """
        Initialize runtime agent wrapper.
        
        Args:
            agent_arn: ARN of the deployed AgentCore Runtime agent
            session_id: Session ID for conversation context
            customer_id: Customer ID for memory namespacing
            region: AWS region
        """
        self.agent_arn = agent_arn
        self.session_id = session_id
        self.customer_id = customer_id
        self.client = boto3.client('bedrock-agentcore', region_name=region)
    
    def _invoke_runtime(self, user_input: str) -> dict:
        """Synchronous runtime invocation (runs in thread pool)."""
        payload = json.dumps({
            "prompt": user_input,
            "customer_id": self.customer_id,
            "session_id": self.session_id
        }).encode()
        
        response = self.client.invoke_agent_runtime(
            agentRuntimeArn=self.agent_arn,
            runtimeSessionId=self.session_id,
            payload=payload
        )
        
        content_type = response.get("contentType", "")
        
        if "application/json" in content_type:
            # JSON response - read and parse
            response_body = response["response"].read().decode("utf-8")
            return json.loads(response_body)
            
        elif "text/event-stream" in content_type:
            # SSE response - collect chunks
            content = []
            for line in response["response"].iter_lines(chunk_size=10):
                if line:
                    line = line.decode("utf-8")
                    if line.startswith("data: "):
                        content.append(line[6:])
            
            full_response = "".join(content)
            return json.loads(full_response)
        
        else:
            return {"content": [{"text": "Unknown response format"}]}
    
    async def invoke_async(self, user_input: str):
        """
        Invoke the runtime agent with streaming support.
        
        Args:
            user_input: User message to send to agent
            
        Returns:
            Response object compatible with Strands agent format
        """
        # Run blocking boto3 call in thread pool to avoid blocking event loop
        response_data = await asyncio.to_thread(self._invoke_runtime, user_input)
        return RuntimeAgentResponse(response_data)
    
    async def stream_async(self, user_input: str):
        """
        Stream response chunks as they arrive from runtime agent.
        
        Args:
            user_input: User message to send to agent
            
        Yields:
            Event dictionaries as they arrive from the streaming response
        """
        import queue
        import threading
        
        payload = json.dumps({
            "prompt": user_input,
            "customer_id": self.customer_id,
            "session_id": self.session_id
        }).encode()
        
        # Use a queue to pass events from thread to async
        event_queue = queue.Queue()
        
        def _stream_to_queue():
            try:
                response = self.client.invoke_agent_runtime(
                    agentRuntimeArn=self.agent_arn,
                    runtimeSessionId=self.session_id,
                    payload=payload
                )
                
                content_type = response.get("contentType", "")
                
                if "text/event-stream" in content_type:
                    # Stream SSE events
                    for line in response["response"].iter_lines(chunk_size=10):
                        if line:
                            line = line.decode("utf-8")
                            if line.startswith("data: "):
                                chunk_data = line[6:]
                                try:
                                    event_queue.put(("event", json.loads(chunk_data)))
                                except json.JSONDecodeError:
                                    event_queue.put(("event", {"text": chunk_data}))
                else:
                    # Fallback to non-streaming
                    response_body = response["response"].read().decode("utf-8")
                    event_queue.put(("event", json.loads(response_body)))
            except Exception as e:
                event_queue.put(("error", str(e)))
            finally:
                event_queue.put(("done", None))
        
        # Start streaming in background thread
        thread = threading.Thread(target=_stream_to_queue, daemon=True)
        thread.start()
        
        # Yield events as they arrive
        while True:
            # Non-blocking check with timeout
            try:
                event_type, event_data = await asyncio.to_thread(event_queue.get, timeout=0.1)
                
                if event_type == "done":
                    break
                elif event_type == "error":
                    raise Exception(f"Stream error: {event_data}")
                elif event_type == "event":
                    yield event_data
            except queue.Empty:
                # No event yet, continue waiting
                await asyncio.sleep(0.01)
                continue


class RuntimeAgentResponse:
    """Response object that mimics Strands agent response format."""
    
    def __init__(self, response_data: dict):
        """Initialize response with structured content."""
        self.message = response_data
