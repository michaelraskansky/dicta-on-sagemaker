"""Deploy DictaLM-3.0-Nemotron-12B-Instruct to SageMaker using DJLModel with vLLM."""
import os
import json
import boto3
import sagemaker
from sagemaker.model import Model

os.environ.setdefault("AWS_PROFILE", "WorkHorse")
os.environ.setdefault("AWS_DEFAULT_REGION", "il-central-1")

REGION = "il-central-1"
MODEL_S3_URI = "s3://sagemaker-il-central-1-509877531266/dictalm-nemotron-12b/model.tar.gz"
INSTANCE_TYPE = "ml.g5.12xlarge"
ENDPOINT_NAME = "dictalm-3-nemotron-12b"
IMAGE_URI = "509877531266.dkr.ecr.il-central-1.amazonaws.com/djl-inference:0.36.0-lmi18.0.0-cu128"
ROLE_ARN = "arn:aws:iam::509877531266:role/service-role/AmazonSageMaker-ExecutionRole-20250923T105118"

def deploy():
    sess = sagemaker.Session(boto_session=boto3.Session(region_name=REGION))
    
    model = Model(
        model_data=MODEL_S3_URI,
        image_uri=IMAGE_URI,
        role=ROLE_ARN,
        sagemaker_session=sess,
    )
    
    print(f"Deploying from {MODEL_S3_URI} to {ENDPOINT_NAME}...")
    predictor = model.deploy(
        initial_instance_count=1,
        instance_type=INSTANCE_TYPE,
        endpoint_name=ENDPOINT_NAME,
        container_startup_health_check_timeout=1200,
    )
    
    with open("endpoint_config.json", "w") as f:
        json.dump({"endpoint_name": ENDPOINT_NAME, "region": REGION}, f)
    
    print(f"Endpoint deployed: {ENDPOINT_NAME}")
    return predictor

if __name__ == "__main__":
    deploy()
