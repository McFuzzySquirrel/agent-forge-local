"""Configuration loading — reads config.yaml and provides typed settings."""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field

_DEFAULT_CONFIG_NAME = "config.yaml"


class ModelAssignment(BaseModel):
    """Which Ollama model backs each agent role."""

    planner: str = Field(default="llama3.3:8b")
    coder: str = Field(default="qwen3:7b")
    executor: str = Field(default="mistral:7b")
    validator: str = Field(default="phi4:latest")


class OllamaSettings(BaseModel):
    """Ollama server connection settings."""

    base_url: str = Field(default="http://localhost:11434")
    timeout: float = Field(default=120.0)


class OrchestratorSettings(BaseModel):
    """Top-level behaviour knobs for the orchestrator."""

    max_retries: int = Field(default=2, description="Max times to retry a failed task")
    continue_on_failure: bool = Field(
        default=False,
        description="If True, skip failed tasks and continue",
    )


class EjsSettings(BaseModel):
    """Settings for the Engineering Journey System (EJS) context provider.

    When enabled and a ``.ejs.db`` database exists in the working directory,
    the orchestrator queries it for past decisions, learnings, and project
    history and injects relevant context into agent prompts.

    See: https://github.com/McFuzzySquirrel/Engineering-Journey-System
    """

    enabled: bool = Field(
        default=True,
        description="Whether to look for and use an EJS database for context",
    )
    db_name: str = Field(
        default=".ejs.db",
        description="Filename of the EJS SQLite database (relative to working directory)",
    )
    context_limit: int = Field(
        default=4000,
        description="Maximum characters of EJS context to inject per agent call",
    )


class Config(BaseModel):
    """Root configuration object."""

    models: ModelAssignment = Field(default_factory=ModelAssignment)
    ollama: OllamaSettings = Field(default_factory=OllamaSettings)
    orchestrator: OrchestratorSettings = Field(default_factory=OrchestratorSettings)
    ejs: EjsSettings = Field(default_factory=EjsSettings)


def load_config(path: str | Path | None = None) -> Config:
    """Load configuration from a YAML file, falling back to defaults."""
    if path is None:
        path = Path.cwd() / _DEFAULT_CONFIG_NAME

    path = Path(path)
    if path.exists():
        with path.open() as f:
            raw = yaml.safe_load(f) or {}
        return Config(**raw)

    return Config()
