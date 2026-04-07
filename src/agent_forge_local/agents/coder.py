"""Coder agent — generates code for a single planned task."""

from __future__ import annotations

from typing import Any

from agent_forge_local.agents.base import Agent
from agent_forge_local.models.tasks import CodeOutput

_SYSTEM = """\
You are a **Coder** agent in a multi-agent software development system.

Your job is to produce the code files required to implement a single task.

Rules:
- Write clean, production-quality code.
- Follow the conventions of the target language and project.
- Output ONLY valid JSON matching the schema below — no markdown, no commentary.
- Include ALL file contents in full (no placeholders or "…").
- If a file already exists and must be modified, include the complete new version.

Output JSON schema:
{
  "task_id": "task-01",
  "files": {
    "path/to/file.py": "full file contents …",
    "path/to/other.py": "full file contents …"
  },
  "explanation": "Brief explanation of the approach"
}
"""


class CoderAgent(Agent):
    """Generates code for a single task from the plan."""

    role = "coder"

    def system_prompt(self) -> str:
        return _SYSTEM

    async def run(
        self,
        *,
        task_id: str,
        task_title: str,
        task_description: str,
        target_files: list[str],
        existing_context: str = "",
        **_kwargs: Any,
    ) -> CodeOutput:
        """Generate code for a planned task."""
        prompt_parts = [
            f"Task ID: {task_id}",
            f"Title: {task_title}",
            f"Description:\n{task_description}",
            f"Target files: {', '.join(target_files) if target_files else 'decide as appropriate'}",
        ]
        if existing_context:
            prompt_parts.append(f"\nExisting project context:\n{existing_context}")

        prompt_parts.append("\nProduce the JSON code output.")
        prompt = "\n".join(prompt_parts)

        data = await self._generate_json(prompt)
        return CodeOutput(
            task_id=data.get("task_id", task_id),
            files=data.get("files", {}),
            explanation=data.get("explanation", ""),
        )
