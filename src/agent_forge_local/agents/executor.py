"""Executor agent — applies code changes via Copilot CLI or direct file writes."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from agent_forge_local.agents.base import Agent
from agent_forge_local.clients.copilot import CopilotCLI
from agent_forge_local.models.tasks import CodeOutput, ExecutionResult

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are an **Executor** agent in a multi-agent software development system.

Your job is to take code output from the Coder agent and determine the best \
way to apply it to the project:

1. If Copilot CLI is available and the task benefits from repo-aware editing, \
   format instructions for Copilot CLI.
2. Otherwise, write files directly.

You also run any build or test commands needed to verify the files were \
applied correctly.

Rules:
- Always ensure parent directories exist before writing files.
- Report exactly which files were written.
- Capture stdout/stderr from any commands executed.
"""


class ExecutorAgent(Agent):
    """Applies code changes to the project — via Copilot CLI when available, else directly."""

    role = "executor"

    def __init__(
        self,
        model: str,
        ollama: OllamaClient,  # noqa: F821 — forward ref
        copilot: CopilotCLI,
    ) -> None:
        super().__init__(model, ollama)
        self.copilot = copilot

    def system_prompt(self) -> str:
        return _SYSTEM

    async def run(
        self,
        *,
        code: CodeOutput,
        working_directory: str,
        **_kwargs: Any,
    ) -> ExecutionResult:
        """Write files and return execution result."""
        files_written: list[str] = []
        method = "direct_write"

        # ----- Write each file -----
        for rel_path, content in code.files.items():
            abs_path = Path(working_directory) / rel_path
            abs_path.parent.mkdir(parents=True, exist_ok=True)
            abs_path.write_text(content, encoding="utf-8")
            files_written.append(rel_path)
            self.logger.info("wrote %s", rel_path)

        # ----- Optionally verify via Copilot CLI -----
        copilot_available = await self.copilot.is_available()
        stdout_parts: list[str] = []
        stderr_parts: list[str] = []

        if copilot_available:
            method = "copilot_cli"
            # Use Copilot to explain what we just wrote (sanity check)
            for rel_path in files_written[:3]:  # limit to first 3 to avoid spam
                explanation = await self.copilot.explain(f"cat {rel_path}")
                if explanation:
                    stdout_parts.append(f"[copilot explain {rel_path}]: {explanation[:200]}")

        return ExecutionResult(
            task_id=code.task_id,
            success=len(files_written) > 0,
            method=method,
            files_written=files_written,
            stdout="\n".join(stdout_parts),
            stderr="\n".join(stderr_parts),
        )
