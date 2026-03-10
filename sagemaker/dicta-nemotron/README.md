# DictaLM-3.0-Nemotron-12B SageMaker Deployment

Deploy [DictaLM-3.0-Nemotron-12B-Instruct](https://huggingface.co/dicta-il/DictaLM-3.0-Nemotron-12B-Instruct) to Amazon SageMaker.

## Prerequisites

- AWS credentials configured (`~/.aws/credentials` or environment variables)
- IAM role with SageMaker permissions (set `SAGEMAKER_ROLE` env var, or run from SageMaker)
- [uv](https://docs.astral.sh/uv/) installed

## Setup

```bash
uv sync
```

## Deploy

```bash
# Optional: set HuggingFace token if needed
export HF_TOKEN="your-token"

# Set your SageMaker execution role ARN
export SAGEMAKER_ROLE="arn:aws:iam::ACCOUNT:role/YOUR-ROLE"

uv run python deploy.py
```

Deployment takes ~10-15 minutes. Creates `endpoint_config.json` with endpoint details.

## Test

```bash
uv run python test.py
```

## Cleanup

Delete the endpoint via AWS Console or:

```python
import boto3
client = boto3.client("sagemaker", region_name="us-west-2")
client.delete_endpoint(EndpointName="dictalm-3-nemotron-12b")
client.delete_endpoint_config(EndpointConfigName="dictalm-3-nemotron-12b")
```

## Configuration

- **Region**: us-west-2
- **Instance**: ml.g5.12xlarge (4x A10G GPUs, tensor parallelism)
- **Model**: dicta-il/DictaLM-3.0-Nemotron-12B-Instruct
