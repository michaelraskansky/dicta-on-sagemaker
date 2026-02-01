"""Test the deployed DictaLM endpoint."""
import os
import json
import boto3

os.environ.setdefault("AWS_PROFILE", "WorkHorse")

def load_config():
    with open("endpoint_config.json") as f:
        return json.load(f)

def test_endpoint():
    config = load_config()
    client = boto3.client("sagemaker-runtime", region_name=config["region"])
    
    messages = [{"role": "user", "content": "שלום, מה שלומך?"}]
    payload = {
        "inputs": f"<|im_start|>user\n{messages[0]['content']}<|im_end|>\n<|im_start|>assistant\n",
        "parameters": {"max_new_tokens": 256, "temperature": 0.7, "do_sample": True},
    }
    
    print(f"Testing endpoint: {config['endpoint_name']}")
    response = client.invoke_endpoint(
        EndpointName=config["endpoint_name"],
        ContentType="application/json",
        Body=json.dumps(payload),
    )
    
    result = json.loads(response["Body"].read().decode())
    print(f"Response: {result}")
    return result

if __name__ == "__main__":
    test_endpoint()
