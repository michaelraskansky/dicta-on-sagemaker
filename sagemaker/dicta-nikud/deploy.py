"""
Deploy DictaBERT model to SageMaker.

This script deploys the dicta-il/dictabert-large-char-menaked model to a
SageMaker real-time endpoint. The model is pre-packaged with custom inference
code and stored in S3.

Usage:
    uv run python deploy.py
"""
import os
import sagemaker
from sagemaker.huggingface import HuggingFaceModel

# AWS configuration
os.environ.setdefault("AWS_PROFILE", "WorkHorse")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-west-2")

# SageMaker configuration
ROLE_ARN = "arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<YOUR_SAGEMAKER_ROLE>"
MODEL_S3_PATH = "s3://sagemaker-us-west-2-<YOUR_ACCOUNT_ID>/dictabert-menaked/model.tar.gz"
ENDPOINT_NAME = "dictabert-menaked"
INSTANCE_TYPE = "ml.g5.xlarge"

sess = sagemaker.Session()

def deploy():
    model = HuggingFaceModel(
        model_data=MODEL_S3_PATH,
        role=ROLE_ARN,
        transformers_version="4.37.0",
        pytorch_version="2.1.0",
        py_version="py310",
    )

    # Clean up existing endpoint if present
    try:
        sess.delete_endpoint(ENDPOINT_NAME)
    except Exception:
        pass
    try:
        sess.delete_endpoint_config(ENDPOINT_NAME)
    except Exception:
        pass

    predictor = model.deploy(
        initial_instance_count=1,
        instance_type=INSTANCE_TYPE,
        endpoint_name=ENDPOINT_NAME,
    )

    print(f"Endpoint deployed: {predictor.endpoint_name}")
    return predictor

if __name__ == "__main__":
    deploy()
