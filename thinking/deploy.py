import boto3
from datetime import datetime

SESSION = boto3.Session(profile_name='WorkHorse', region_name='us-west-2')
ROLE = 'arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<YOUR_SAGEMAKER_ROLE>'
MODEL_DATA = "s3://sagemaker-us-west-2-<YOUR_ACCOUNT_ID>/dictalm-thinking-24b/model.tar.gz"
IMAGE_URI = '763104351884.dkr.ecr.us-west-2.amazonaws.com/djl-inference:0.36-lmi18.0.0-cu128-v1'
ENDPOINT_NAME = "dictalm-thinking-24b"

def deploy():
    sm_client = SESSION.client('sagemaker')
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    model_name = f"{ENDPOINT_NAME}-model-{timestamp}"
    endpoint_config_name = f"{ENDPOINT_NAME}-config-{timestamp}"

    print(f"Creating model: {model_name}")
    sm_client.create_model(
        ModelName=model_name,
        PrimaryContainer={
            'Image': IMAGE_URI,
            'ModelDataUrl': MODEL_DATA,
        },
        ExecutionRoleArn=ROLE
    )

    print(f"Creating endpoint config: {endpoint_config_name}")
    sm_client.create_endpoint_config(
        EndpointConfigName=endpoint_config_name,
        ProductionVariants=[{
            'VariantName': 'AllTraffic',
            'ModelName': model_name,
            'InstanceType': 'ml.g5.24xlarge',
            'InitialInstanceCount': 1,
            'ContainerStartupHealthCheckTimeoutInSeconds': 1200,
        }]
    )

    print(f"Creating/updating endpoint: {ENDPOINT_NAME}")
    try:
        sm_client.create_endpoint(
            EndpointName=ENDPOINT_NAME,
            EndpointConfigName=endpoint_config_name
        )
        print(f"Endpoint {ENDPOINT_NAME} is being created")
    except sm_client.exceptions.ClientError as e:
        if 'already exists' in str(e):
            print(f"Endpoint exists, updating...")
            sm_client.update_endpoint(
                EndpointName=ENDPOINT_NAME,
                EndpointConfigName=endpoint_config_name
            )
            print(f"Endpoint {ENDPOINT_NAME} is being updated")
        else:
            raise

if __name__ == "__main__":
    deploy()
