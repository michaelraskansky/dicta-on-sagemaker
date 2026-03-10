"""Delete all SageMaker resources for DictaLM deployment."""
import os
import boto3

os.environ.setdefault("AWS_PROFILE", "WorkHorse")

REGION = "us-west-2"
ENDPOINT_NAME = "dictalm-3-nemotron-12b"

def cleanup():
    sm = boto3.client("sagemaker", region_name=REGION)
    
    # Delete endpoint
    try:
        sm.delete_endpoint(EndpointName=ENDPOINT_NAME)
        print(f"Deleted endpoint: {ENDPOINT_NAME}")
    except sm.exceptions.ClientError:
        print(f"Endpoint not found: {ENDPOINT_NAME}")
    
    # Delete endpoint config
    try:
        sm.delete_endpoint_config(EndpointConfigName=ENDPOINT_NAME)
        print(f"Deleted endpoint config: {ENDPOINT_NAME}")
    except sm.exceptions.ClientError:
        print(f"Endpoint config not found: {ENDPOINT_NAME}")
    
    # Delete models matching our deployment
    models = sm.list_models(NameContains=ENDPOINT_NAME)["Models"]
    for m in models:
        sm.delete_model(ModelName=m["ModelName"])
        print(f"Deleted model: {m['ModelName']}")
    
    print("Cleanup complete")

if __name__ == "__main__":
    cleanup()
