# Dicta Models - SageMaker Deployment

Deploy Hebrew language models from [Dicta](https://huggingface.co/dicta-il) to Amazon SageMaker.

## Overview

This repository contains deployment scripts for three Dicta models:

| Model | Purpose | Size | Instance | Status |
|-------|---------|------|----------|--------|
| **nikud** | Hebrew diacritization (nikud) | 0.3B / 1.2GB | ml.g5.xlarge | ✅ Deployed |
| **thinking** | Large reasoning model | 24B / 48GB | ml.g5.24xlarge | ✅ Deployed |
| **nemotron** | Instruction-following | 12B | ml.g5.24xlarge | ✅ Deployed |

## Project Structure

```
dicta/
├── nikud/                 # DictaBERT-large-char-menaked
│   ├── deploy.py          # Deploy endpoint
│   ├── cleanup.py         # Delete endpoint
│   ├── test_endpoint.py   # Test endpoint
│   ├── code/
│   │   └── inference.py   # Custom inference handler
│   ├── model-uploader.yaml
│   └── pyproject.toml
│
├── thinking/              # DictaLM-3.0-24B-Thinking
│   ├── deploy.py
│   ├── test.py
│   ├── cleanup.py
│   ├── model-uploader.yaml
│   └── pyproject.toml
│
└── nemotron/              # DictaLM-3.0-Nemotron-12B-Instruct
    ├── deploy.py
    ├── test.py
    ├── cleanup.py
    ├── model-uploader.yaml
    └── pyproject.toml
```

## Prerequisites

- AWS CLI configured with profile `WorkHorse`
- [uv](https://docs.astral.sh/uv/) for Python dependency management
- SageMaker execution role with appropriate permissions
- Access to us-west-2 region

## Common Configuration

All deployments share:
- **AWS Profile**: `WorkHorse`
- **Region**: `us-west-2`
- **IAM Role**: `arn:aws:iam::<YOUR_ACCOUNT_ID>:role/<YOUR_SAGEMAKER_ROLE>`
- **S3 Bucket**: `sagemaker-us-west-2-<YOUR_ACCOUNT_ID>`

## Quick Start

Each module is independent. Navigate to the specific directory:

```bash
# Example: Deploy nikud model
cd nikud
uv sync
uv run python deploy.py
uv run python test_endpoint.py
```

See individual README files in each directory for detailed instructions:
- [nikud/README.md](nikud/README.md) - Hebrew diacritization
- [thinking/README.md](thinking/README.md) - 24B reasoning model
- [nemotron/README.md](nemotron/README.md) - 12B instruction model

## Model Details

### nikud - Hebrew Diacritization
Adds vowel marks (nikud) to Hebrew text.

**Example:**
```
Input:  בשנת 1948 השלים אפרים קישון את לימודיו
Output: בִּשְׁנַת 1948 הִשְׁלִים אֶפְרַיִם קִישׁוֹן אֶת לִמּוּדָיו
```

- **Model**: dicta-il/dictabert-large-char-menaked
- **Container**: HuggingFace PyTorch 2.1 / Transformers 4.37
- **Custom inference**: Overrides default HF pipeline
- **Cost**: ~$1.00/hr (ml.g5.xlarge)

### thinking - Large Reasoning Model
24B parameter reasoning model, initialized from Mistral Small 3.1.

- **Model**: dicta-il/DictaLM-3.0-24B-Thinking
- **Architecture**: Mistral (standard transformer)
- **Container**: DJL with vLLM backend (LMI v18+)
- **Tensor Parallel**: 4 GPUs
- **Cost**: ~$8/hr (ml.g5.24xlarge)

### nemotron - Instruction Model
12B parameter instruction-following model with Hybrid-SSM architecture, initialized from NVIDIA Nemotron Nano V2.

- **Model**: dicta-il/DictaLM-3.0-Nemotron-12B-Instruct
- **Architecture**: Hybrid-SSM (long context with minimal memory footprint)
- **Container**: DJL with vLLM backend (LMI v18+)
- **Tensor Parallel**: 4 GPUs
- **Cost**: ~$8/hr (ml.g5.24xlarge)

## Development

Each module uses `uv` for dependency management:

```bash
cd <module>
uv sync              # Install dependencies
uv run python <script>.py
```

## Known Issues

- **Code Duplication**: Significant overlap in deploy/cleanup/test scripts across modules
- **Configuration**: AWS credentials and region hardcoded in multiple places
- **Error Handling**: Inconsistent patterns across modules

## License

Models are licensed under their respective licenses from Dicta:
- DictaBERT: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- DictaLM models: See [Dicta HuggingFace](https://huggingface.co/dicta-il)