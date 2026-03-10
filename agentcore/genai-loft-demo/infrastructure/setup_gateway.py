"""
AgentCore Gateway Setup
======================

Creates and configures AgentCore Gateway with Cognito authentication and Lambda integration.
"""

import json
import logging
import time
from pathlib import Path
from bedrock_agentcore_starter_toolkit.operations.gateway.client import GatewayClient

# Configuration constants
AWS_REGION = "eu-central-1"


def setup_agentcore_gateway():
    """Load existing gateway configuration and get access token."""
    try:
        config_path = Path(__file__).parent / "gateway_config.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        print(f"✅ Using real AgentCore Gateway: {config['gateway_id']}")

        client = GatewayClient(region_name=config["region"])
        access_token = client.get_access_token_for_cognito(config["client_info"])

        return {
            "gateway_url": config["gateway_url"],
            "bearer_token": access_token,
            "gateway_id": config["gateway_id"],
            "region": config["region"],
            "client_info": config["client_info"],
        }

    except FileNotFoundError:
        print("❌ Error: gateway_config.json not found!")
        print("Please run 'uv run infrastructure/setup_gateway.py' first to create the Gateway.")
        raise Exception("Gateway configuration not found. Run setup_gateway.py first.")
    except Exception as e:
        print(f"❌ Failed to setup AgentCore Gateway: {e}")
        raise e


def create_lambda_function():
    """Create Lambda function with customer support tools."""
    import boto3
    import zipfile
    import io
    
    # Read our custom Lambda function code
    lambda_code_path = Path(__file__).parent / "lambda_function.py"
    with open(lambda_code_path, "r") as f:
        lambda_code = f.read()
    
    # Create deployment package
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr('lambda_function.py', lambda_code)
    zip_buffer.seek(0)
    
    # Create Lambda function
    lambda_client = boto3.client('lambda', region_name=AWS_REGION)
    
    # Create IAM role for Lambda
    iam_client = boto3.client('iam', region_name=AWS_REGION)
    
    role_name = "CustomerSupportLambdaRole"
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }
        ]
    }
    
    try:
        # Create IAM role
        role_response = iam_client.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description="Role for Customer Support Lambda function"
        )
        role_arn = role_response['Role']['Arn']
        
        # Attach basic Lambda execution policy
        iam_client.attach_role_policy(
            RoleName=role_name,
            PolicyArn='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        )
        
        print(f"✓ Created IAM role: {role_name}")
        
    except iam_client.exceptions.EntityAlreadyExistsException:
        # Role exists, get its ARN
        role_response = iam_client.get_role(RoleName=role_name)
        role_arn = role_response['Role']['Arn']
        print(f"✓ Using existing IAM role: {role_name}")
    
    # Wait for role propagation
    time.sleep(10)
    
    # Create unique function name
    import uuid
    unique_suffix = str(uuid.uuid4())[:8]
    function_name = f"CustomerSupportTools-{unique_suffix}"
    
    try:
        # Create Lambda function
        lambda_response = lambda_client.create_function(
            FunctionName=function_name,
            Runtime='python3.12',
            Role=role_arn,
            Handler='lambda_function.lambda_handler',
            Code={'ZipFile': zip_buffer.getvalue()},
            Description='Customer Support Tools for AgentCore Gateway',
            Timeout=30,
        )
        
        lambda_arn = lambda_response['FunctionArn']
        print(f"✓ Created Lambda function: {function_name}")
        return lambda_arn, function_name
        
    except lambda_client.exceptions.ResourceConflictException:
        # Function exists, get its ARN
        response = lambda_client.get_function(FunctionName=function_name)
        lambda_arn = response['Configuration']['FunctionArn']
        print(f"✓ Using existing Lambda function: {function_name}")
        return lambda_arn, function_name


def create_gateway():
    """Create new AgentCore Gateway infrastructure."""
    print("🚀 Setting up AgentCore Gateway...")
    print(f"Region: {AWS_REGION}\n")

    client = GatewayClient(region_name=AWS_REGION)
    client.logger.setLevel(logging.INFO)

    # Step 1: Create OAuth authorizer
    print("Step 1: Creating OAuth authorization server...")
    cognito_response = client.create_oauth_authorizer_with_cognito("CustomerSupportGateway")
    print("✓ Authorization server created\n")

    # Step 2: Create Gateway
    print("Step 2: Creating Gateway...")
    import uuid
    unique_suffix = str(uuid.uuid4())[:8]
    gateway = client.create_mcp_gateway(
        name=f"customersupport-gw-{unique_suffix}",
        role_arn=None,
        authorizer_config=cognito_response["authorizer_config"],
        enable_semantic_search=True,
    )
    print(f"✓ Gateway created: {gateway['gatewayUrl']}\n")

    # Step 3: Fix IAM permissions
    client.fix_iam_permissions(gateway)
    print("⏳ Waiting 30s for IAM propagation...")
    time.sleep(30)
    print("✓ IAM permissions configured\n")

    # Step 4: Create custom Lambda function first
    print("Step 4: Creating custom Lambda function...")
    lambda_arn, function_name = create_lambda_function()
    
    # Read our custom API specification
    api_spec_path = Path(__file__).parent / "api_spec.json"
    with open(api_spec_path, "r") as f:
        api_spec = json.load(f)
    
    # Step 5: Add Lambda target with our custom function
    print("Step 5: Adding Lambda target with customer support tools...")
    client.create_mcp_gateway_target(
        gateway=gateway,
        name="CustomerSupportTools",
        target_type="lambda",
        target_payload={
            "lambdaArn": lambda_arn,
            "toolSchema": {
                "inlinePayload": api_spec
            }
        },
        credentials=None,
    )
    print("✓ Lambda target added with customer support tools\n")

    # Step 6: Save configuration
    config = {
        "gateway_url": gateway["gatewayUrl"],
        "gateway_id": gateway["gatewayId"],
        "region": AWS_REGION,
        "client_info": cognito_response["client_info"],
        "lambda_function_name": function_name,
        "lambda_arn": lambda_arn
    }

    config_path = Path(__file__).parent / "gateway_config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print("=" * 60)
    print("✅ Gateway setup complete!")
    print(f"Gateway URL: {gateway['gatewayUrl']}")
    print(f"Gateway ID: {gateway['gatewayId']}")
    print(f"Lambda Function: {function_name}")
    print(f"\nConfiguration saved to: {config_path}")
    print("\nCustomer Support Tools Available:")
    for tool in api_spec:
        print(f"  - {tool['name']}: {tool['description']}")
    print("\nNext step: Run Demo 3 to test your Gateway")
    print("=" * 60)

    return config


def validate_gateway():
    """Validate that the gateway is working properly."""
    try:
        config_path = Path(__file__).parent / "gateway_config.json"
        with open(config_path, "r") as f:
            config = json.load(f)

        print(f"🔍 Validating AgentCore Gateway: {config['gateway_id']}")
        
        # Test authentication
        client = GatewayClient(region_name=config["region"])
        access_token = client.get_access_token_for_cognito(config["client_info"])
        print("✅ Authentication successful")
        
        # Test MCP connection (suppress MCP client errors)
        from strands.tools.mcp import MCPClient
        from mcp.client.streamable_http import streamablehttp_client
        from strands.types.exceptions import MCPClientInitializationError
        
        mcp_client = MCPClient(
            lambda: streamablehttp_client(
                config["gateway_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
        )
        
        try:
            with mcp_client:
                tools = mcp_client.list_tools_sync()
                print(f"✅ Gateway connection successful - {len(tools)} tools available")
                return True
        except MCPClientInitializationError:
            print("❌ Gateway connection failed")
            return False
            
    except FileNotFoundError:
        print("❌ Gateway configuration not found")
        print("   Run: uv run infrastructure/setup_gateway.py")
        return False
    except Exception as e:
        print(f"❌ Gateway validation failed: {e}")
        print("   The gateway may need to be recreated")
        print("   Run: uv run infrastructure/setup_gateway.py")
        return False


if __name__ == "__main__":
    create_gateway()
