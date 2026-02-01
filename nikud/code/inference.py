"""
Custom inference handler for DictaBERT model.

This module overrides the default HuggingFace inference pipeline because
DictaBERT uses a custom predict() method that isn't compatible with the
standard transformers pipeline.

The handler is packaged inside model.tar.gz at code/inference.py and
automatically loaded by the HuggingFace serving container.
"""
from transformers import AutoModel, AutoTokenizer
import torch


def model_fn(model_dir: str) -> dict:
    """
    Load the model and tokenizer from the model directory.
    
    Args:
        model_dir: Path to the extracted model artifacts (from model.tar.gz)
    
    Returns:
        Dictionary containing the model and tokenizer instances
    """
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModel.from_pretrained(model_dir, trust_remote_code=True)
    model.eval()
    if torch.cuda.is_available():
        model = model.cuda()
    return {"model": model, "tokenizer": tokenizer}


def predict_fn(data: dict, model_dict: dict) -> list:
    """
    Run inference using the model's custom predict() method.
    
    Args:
        data: Input dictionary with 'inputs' (str or list) and optional
              'mark_matres_lectionis' (str) to mark silent letters
        model_dict: Dictionary from model_fn containing model and tokenizer
    
    Returns:
        List of diacritized Hebrew strings
    """
    sentences = data.get("inputs")
    if isinstance(sentences, str):
        sentences = [sentences]
    mark_matres = data.get("mark_matres_lectionis")
    with torch.no_grad():
        return model_dict["model"].predict(
            sentences, 
            model_dict["tokenizer"], 
            mark_matres_lectionis=mark_matres
        )


def input_fn(request_body: str, request_content_type: str) -> dict:
    """
    Deserialize the request body.
    
    Args:
        request_body: Raw request body string
        request_content_type: MIME type of the request
    
    Returns:
        Parsed input dictionary
    
    Raises:
        ValueError: If content type is not application/json
    """
    import json
    if request_content_type == "application/json":
        return json.loads(request_body)
    raise ValueError(f"Unsupported content type: {request_content_type}")


def output_fn(prediction: list, accept: str) -> tuple:
    """
    Serialize the prediction output.
    
    Args:
        prediction: List of diacritized strings from predict_fn
        accept: Requested response MIME type (ignored, always returns JSON)
    
    Returns:
        Tuple of (JSON string, content type)
    """
    import json
    return json.dumps(prediction), "application/json"
