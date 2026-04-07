"""Base agent class — defines the interface all agents implement."""

from __future__ import annotations

import abc
import logging
from typing import Any

from agent_forge_local.clients.ollama import OllamaClient

logger = logging.getLogger(__name__)


class Agent(abc.ABC):
    """Abstract base for every agent in the local swarm.

    Each agent:
    - has a *role* (planner, coder, executor, validator)
    - is backed by a specific local model (via Ollama)
    - has a system prompt that defines its persona and constraints
    - accepts structured input and returns structured output
    """

    role: str = "base"

    def __init__(self, model: str, ollama: OllamaClient) -> None:
        self.model = model
        self.ollama = ollama
        self.logger = logging.getLogger(f"{__name__}.{self.role}")

    @abc.abstractmethod
    def system_prompt(self) -> str:
        """Return the system prompt for this agent's role."""

    @abc.abstractmethod
    async def run(self, **kwargs: Any) -> Any:
        """Execute the agent's primary task and return structured output."""

    # ------------------------------------------------------------------
    # Helpers shared by all agents
    # ------------------------------------------------------------------

    async def _generate(self, prompt: str, *, temperature: float = 0.3) -> str:
        """Call the underlying model via Ollama."""
        self.logger.info("calling %s …", self.model)
        return await self.ollama.generate(
            self.model,
            prompt,
            system=self.system_prompt(),
            temperature=temperature,
        )

    async def _generate_json(self, prompt: str, *, temperature: float = 0.2) -> dict | list:
        """Call the model and parse a JSON response."""
        self.logger.info("calling %s (json mode) …", self.model)
        return await self.ollama.generate_json(
            self.model,
            prompt,
            system=self.system_prompt(),
            temperature=temperature,
        )
