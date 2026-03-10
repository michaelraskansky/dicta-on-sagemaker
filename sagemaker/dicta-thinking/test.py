import boto3
import json

session = boto3.Session(profile_name='WorkHorse', region_name='us-west-2')
runtime = session.client('sagemaker-runtime')

endpoint_name = "dictalm-thinking-24b"

payload = {
    "inputs": "מהי בירת ישראל?",
    "parameters": {
        "max_new_tokens": 512,
        "temperature": 0.7,
        "top_p": 0.9,
    }
}

print(f"Testing endpoint: {endpoint_name}")
response = runtime.invoke_endpoint(
    EndpointName=endpoint_name,
    ContentType='application/json',
    Body=json.dumps(payload)
)

result = json.loads(response['Body'].read().decode())
print("\nResponse:")
print(json.dumps(result, indent=2, ensure_ascii=False))
