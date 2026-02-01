# DictaBERT Nikud - SageMaker Deployment

Deploy [dicta-il/dictabert-large-char-menaked](https://huggingface.co/dicta-il/dictabert-large-char-menaked) to Amazon SageMaker for Hebrew diacritization (nikud).

## Overview

This project deploys a BERT-based model that adds diacritical marks (nikud) to Hebrew text. The model takes undiacritized Hebrew and returns fully vocalized text.

**Example:**
- Input: `בשנת 1948 השלים אפרים קישון את לימודיו`
- Output: `בִּשְׁנַת 1948 הִשְׁלִים אֶפְרַיִם קִישׁוֹן אֶת לִמּוּדָיו`

## Architecture

- **Model**: DictaBERT-large-char-menaked (0.3B parameters, 1.2GB)
- **Instance**: ml.g5.xlarge (1 GPU, 24GB VRAM)
- **Container**: HuggingFace PyTorch 2.1 / Transformers 4.37
- **Region**: us-west-2

## Project Structure

```
├── deploy.py              # Deploys model to SageMaker endpoint
├── test_endpoint.py       # Tests the deployed endpoint
├── code/
│   └── inference.py       # Custom inference handler (packaged in model tarball)
├── model-uploader.yaml    # CloudFormation template for EC2 model uploader
└── pyproject.toml         # Python dependencies (managed by uv)
```

## Setup

### Prerequisites

- AWS CLI configured with profile `WorkHorse`
- [uv](https://github.com/astral-sh/uv) for Python dependency management
- SageMaker execution role with appropriate permissions

### Install Dependencies

```bash
uv sync
```

## Deployment

### 1. Model Packaging (already done)

The model was downloaded from HuggingFace and packaged with custom inference code using an EC2 instance in us-west-2. The packaged model is stored at:

```
s3://sagemaker-us-west-2-<YOUR_ACCOUNT_ID>/dictabert-menaked/model.tar.gz
```

The `model-uploader.yaml` CloudFormation template automates this process if you need to repackage.

### 2. Deploy Endpoint

```bash
uv run python deploy.py
```

This creates a real-time endpoint named `dictabert-menaked`.

### 3. Test Endpoint

```bash
uv run python test_endpoint.py
```

## Custom Inference Handler

The model uses a custom `predict()` method that isn't compatible with HuggingFace's default inference pipeline. The custom handler in `code/inference.py` overrides the default behavior:

- `model_fn`: Loads model with `trust_remote_code=True`
- `predict_fn`: Calls `model.predict()` instead of the default pipeline
- `input_fn` / `output_fn`: Handle JSON serialization

## API Usage

```python
import json
import boto3

client = boto3.client("sagemaker-runtime", region_name="us-west-2")

response = client.invoke_endpoint(
    EndpointName="dictabert-menaked",
    ContentType="application/json",
    Body=json.dumps({"inputs": "שלום עולם"}),
)

result = json.loads(response["Body"].read())
output = json.loads(result[0])
print(output[0])  # שָׁלוֹם עוֹלָם
```

### Request Format

```json
{
  "inputs": "Hebrew text without nikud",
  "mark_matres_lectionis": "*"  // optional: mark matres lectionis with this character
}
```

### Response Format

```json
["Diacritized Hebrew text"]
```

## Costs

- **ml.g5.xlarge**: ~$1.00/hr
- **Model storage**: ~$0.03/month (1.2GB in S3)

## Cleanup

To delete the endpoint:

```python
import sagemaker
sess = sagemaker.Session()
sess.delete_endpoint("dictabert-menaked")
sess.delete_endpoint_config("dictabert-menaked")
```

## License

The DictaBERT model is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
