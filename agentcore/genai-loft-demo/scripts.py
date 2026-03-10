"""Project utility commands."""
import subprocess
import shutil
from pathlib import Path


def clean():
    """Remove temporary files and caches."""
    patterns = [
        "**/__pycache__",
        "**/*.pyc",
        "**/*.pyo",
        "**/.pytest_cache",
        ".coverage",
        "htmlcov",
        "dist",
        "build",
        "*.egg-info",
    ]
    
    files = [
        ".dockerignore",
        "Dockerfile",
        ".bedrock_agentcore.yaml",
    ]
    
    for pattern in patterns:
        for path in Path(".").rglob(pattern.replace("**/", "")):
            if path.is_dir():
                shutil.rmtree(path)
                print(f"Removed {path}")
            elif path.is_file():
                path.unlink()
                print(f"Removed {path}")
    
    for file in files:
        path = Path(file)
        if path.exists():
            path.unlink()
            print(f"Removed {path}")


def launch():
    """Deploy agent to AgentCore Runtime."""
    subprocess.run(["agentcore", "launch"], check=True)


def deploy():
    """Configure and deploy agent to AgentCore Runtime."""
    subprocess.run([
        "agentcore", "configure",
        "--entrypoint", "demos/demo_04_production_agent.py",
        "--name", "demo4_production",
        "--non-interactive"
    ], check=True)
    subprocess.run(["agentcore", "launch"], check=True)


def logs():
    """Tail AgentCore Runtime logs."""
    subprocess.run(["agentcore", "logs", "--follow"], check=True)
