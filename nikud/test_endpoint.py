"""
Test the DictaBERT SageMaker endpoint.

Sends a sample Hebrew sentence to the endpoint and prints the diacritized output.

Usage:
    uv run python test_endpoint.py
"""
import json
import boto3

ENDPOINT_NAME = "dictabert-menaked"
REGION = "us-west-2"
PROFILE = "WorkHorse"

# Sample input: "In 1948, Ephraim Kishon completed his studies"
TEST_INPUT = "בשנת 1948 השלים אפרים קישון את לימודיו"

client = boto3.Session(profile_name=PROFILE, region_name=REGION).client("sagemaker-runtime")

response = client.invoke_endpoint(
    EndpointName=ENDPOINT_NAME,
    ContentType="application/json",
    Body=json.dumps({"inputs": TEST_INPUT}),
)

# Parse response: output_fn returns (json_string, content_type) tuple
result = json.loads(response["Body"].read())
output = json.loads(result[0])
print(output[0])
