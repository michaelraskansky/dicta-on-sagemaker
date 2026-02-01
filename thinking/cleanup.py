import boto3

SESSION = boto3.Session(profile_name='WorkHorse', region_name='us-west-2')
ENDPOINT_NAME = "dictalm-thinking-24b"

def cleanup():
    sm_client = SESSION.client('sagemaker')
    
    print(f"Deleting endpoint: {ENDPOINT_NAME}")
    try:
        response = sm_client.describe_endpoint(EndpointName=ENDPOINT_NAME)
        endpoint_config = response['EndpointConfigName']
        
        sm_client.delete_endpoint(EndpointName=ENDPOINT_NAME)
        print(f"Deleted endpoint: {ENDPOINT_NAME}")
        
        print(f"Deleting endpoint config: {endpoint_config}")
        config_response = sm_client.describe_endpoint_config(EndpointConfigName=endpoint_config)
        model_name = config_response['ProductionVariants'][0]['ModelName']
        
        sm_client.delete_endpoint_config(EndpointConfigName=endpoint_config)
        print(f"Deleted endpoint config: {endpoint_config}")
        
        print(f"Deleting model: {model_name}")
        sm_client.delete_model(ModelName=model_name)
        print(f"Deleted model: {model_name}")
        
        print("Cleanup complete")
    except sm_client.exceptions.ClientError as e:
        if 'Could not find' in str(e):
            print(f"Endpoint {ENDPOINT_NAME} not found")
        else:
            raise

if __name__ == "__main__":
    cleanup()
