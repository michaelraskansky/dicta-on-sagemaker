"""Delete SageMaker resources for DictaBERT nikud deployment."""
import sagemaker

ENDPOINT_NAME = "dictabert-menaked"

def cleanup():
    sess = sagemaker.Session()
    
    try:
        sess.delete_endpoint(ENDPOINT_NAME)
        print(f"Deleted endpoint: {ENDPOINT_NAME}")
    except Exception:
        print(f"Endpoint not found: {ENDPOINT_NAME}")
    
    try:
        sess.delete_endpoint_config(ENDPOINT_NAME)
        print(f"Deleted endpoint config: {ENDPOINT_NAME}")
    except Exception:
        print(f"Endpoint config not found: {ENDPOINT_NAME}")
    
    print("Cleanup complete")

if __name__ == "__main__":
    cleanup()
