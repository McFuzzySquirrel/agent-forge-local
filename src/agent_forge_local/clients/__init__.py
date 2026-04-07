"""Client wrappers for Ollama and Copilot CLI."""

from agent_forge_local.clients.copilot import CopilotCLI
from agent_forge_local.clients.ollama import OllamaClient

__all__ = ["CopilotCLI", "OllamaClient"]
