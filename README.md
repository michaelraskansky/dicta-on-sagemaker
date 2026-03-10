# AWS Demos

A collection of self-contained demos showing how to deploy and run things on AWS.

## Demos

| Demo | Service | Description |
|------|---------|-------------|
| [dicta-nikud](sagemaker/dicta-nikud/) | SageMaker | Deploy a Hebrew diacritization model (DictaBERT, 0.3B) to a real-time endpoint |
| [dicta-thinking](sagemaker/dicta-thinking/) | SageMaker | Deploy a 24B reasoning model (DictaLM-3.0-Thinking) with DJL/vLLM |
| [dicta-nemotron](sagemaker/dicta-nemotron/) | SageMaker | Deploy a 12B instruction model (DictaLM-3.0-Nemotron) with DJL/vLLM |
| [genai-loft-demo](agentcore/genai-loft-demo/) | AgentCore | Bedrock AgentCore agents with memory, shared tools, and gateway |

## Structure

```
├── sagemaker/
│   ├── dicta-nikud/        # BERT nikud model on HF container
│   ├── dicta-thinking/     # 24B LLM on DJL/vLLM
│   └── dicta-nemotron/     # 12B LLM on DJL/vLLM
├── agentcore/
│   └── genai-loft-demo/    # AgentCore agents workshop
└── ...                     # more service categories as demos are added
```

Each demo is fully self-contained with its own README, dependencies, and deploy/test/cleanup scripts.

## Adding a Demo

1. Pick or create a service-category directory (e.g. `lambda/`, `ecs/`, `bedrock/`)
2. Add a directory for your demo with a descriptive name
3. Include at minimum: `README.md`, deploy script, cleanup script
4. Add an entry to the table above
