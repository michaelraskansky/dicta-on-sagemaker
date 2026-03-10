# DictaLM-3.0-24B-Thinking SageMaker Deployment

Deploy [DictaLM-3.0-24B-Thinking](https://huggingface.co/dicta-il/DictaLM-3.0-24B-Thinking) to Amazon SageMaker using DJL with vLLM backend.

## Key Challenges & Solutions

### 1. Hybrid Mamba-Transformer Architecture
This model uses `NemotronHForCausalLM` - a hybrid Mamba-Transformer architecture. Most inference backends don't support it.

**Solution**: Use LMI v18+ container (`djl-inference:0.36-lmi18.0.0-cu128-v1`) which includes vLLM with NemotronH support. Older containers (v12, v14) will fail with "Model architectures not supported".

### 2. serving.properties Required
DJL needs a `serving.properties` file in the model archive to use vLLM backend. Without it, DJL defaults to TGI which doesn't support this architecture.

**Solution**: The `model-uploader.yaml` CloudFormation template creates this file automatically when packaging the model.

### 3. Model Size & Disk Space
The 24B model is ~48GB. HuggingFace downloads use a cache that can double storage requirements.

**Solution**: The uploader uses a separate 300GB EBS volume mounted at `/data` with `HF_HOME` set there.

### 4. Instance Selection
24B parameters in bf16 = ~48GB VRAM. Need enough GPU memory plus overhead for KV cache.

**Solution**: Use `ml.g5.24xlarge` (4x A10G = 96GB VRAM) with tensor_parallel_degree=4.

## Prerequisites

- AWS credentials configured (profile: `WorkHorse`)
- [uv](https://docs.astral.sh/uv/) installed
- SageMaker quota for `ml.g5.24xlarge` in us-west-2

## Setup

```bash
uv sync
```

## Step 1: Upload Model to S3

The model needs to be packaged with a `serving.properties` file for DJL/vLLM.

Deploy the CloudFormation stack:

```bash
AWS_PROFILE=WorkHorse aws cloudformation create-stack \
  --stack-name dictalm-thinking-uploader \
  --template-body file://model-uploader.yaml \
  --parameters ParameterKey=S3Bucket,ParameterValue=sagemaker-us-west-2-<YOUR_ACCOUNT_ID> \
  --capabilities CAPABILITY_IAM \
  --region us-west-2
```

Monitor progress (~30-45 minutes):
```bash
# Check if complete
AWS_PROFILE=WorkHorse aws ssm get-parameter --name "/dictalm-thinking-upload/status" --region us-west-2

# Check S3
AWS_PROFILE=WorkHorse aws s3 ls s3://sagemaker-us-west-2-<YOUR_ACCOUNT_ID>/dictalm-thinking-24b/ --human-readable
```

### Troubleshooting Upload

**"No space left on device"**: Increase `VolumeSize` in model-uploader.yaml (currently 300GB).

**Instance terminated without upload**: Check CloudWatch or EC2 console output:
```bash
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=dictalm-thinking-uploader" --query 'Reservations[*].Instances[*].InstanceId' --output text | head -1)
aws ec2 get-console-output --instance-id $INSTANCE_ID --query 'Output' --output text
```

## Step 2: Deploy Endpoint

```bash
AWS_PROFILE=WorkHorse AWS_DEFAULT_REGION=us-west-2 uv run python deploy.py
```

Deployment takes ~15-20 minutes.

### Troubleshooting Deployment

**"Model architectures not supported"**: Wrong container version. Ensure `deploy.py` uses LMI v18+:
```
763104351884.dkr.ecr.us-west-2.amazonaws.com/djl-inference:0.36-lmi18.0.0-cu128-v1
```

**Health check failed**: Check CloudWatch logs:
```bash
aws logs filter-log-events \
  --log-group-name "/aws/sagemaker/Endpoints/dictalm-thinking-24b" \
  --filter-pattern "ERROR" \
  --region us-west-2
```

**OOM errors**: Reduce `option.max_model_len` in serving.properties or use larger instance.

## Step 3: Test

```bash
AWS_PROFILE=WorkHorse AWS_DEFAULT_REGION=us-west-2 uv run python test.py
```

## Cleanup

```bash
AWS_PROFILE=WorkHorse AWS_DEFAULT_REGION=us-west-2 uv run python cleanup.py

# Delete uploader stack
AWS_PROFILE=WorkHorse aws cloudformation delete-stack \
  --stack-name dictalm-thinking-uploader --region us-west-2
```

## Configuration

| Setting | Value |
|---------|-------|
| Region | us-west-2 |
| Instance | ml.g5.24xlarge (4x A10G, 96GB VRAM) |
| Container | LMI v18 (`djl-inference:0.36-lmi18.0.0-cu128-v1`) |
| Backend | vLLM with rolling batch |
| Tensor Parallel | 4 |
| Model | dicta-il/DictaLM-3.0-24B-Thinking |
