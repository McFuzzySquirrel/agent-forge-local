"""Validator agent — checks whether task output meets acceptance criteria."""

from __future__ import annotations

from typing import Any

from agent_forge_local.agents.base import Agent
from agent_forge_local.models.tasks import (
    ExecutionResult,
    PlannedTask,
    ValidationResult,
    ValidationVerdict,
)

_SYSTEM = """\
You are a **Validator** agent in a multi-agent software development system.

Your job is to review the output of an executed task and determine whether \
it meets the acceptance criteria defined in the plan.

Rules:
- Compare the files written against the task description and acceptance criteria.
- Check for obvious issues: missing files, empty files, syntax errors, wrong paths.
- Return a verdict: "pass", "fail", or "needs_review".
- List specific issues found.
- Suggest concrete improvements if the verdict is not "pass".
- Output ONLY valid JSON matching the schema below — no markdown, no commentary.

Output JSON schema:
{
  "task_id": "task-01",
  "verdict": "pass" | "fail" | "needs_review",
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1"]
}
"""


class ValidatorAgent(Agent):
    """Validates task output against acceptance criteria."""

    role = "validator"

    def system_prompt(self) -> str:
        return _SYSTEM

    async def run(
        self,
        *,
        task: PlannedTask,
        execution: ExecutionResult,
        file_contents: dict[str, str] | None = None,
        **_kwargs: Any,
    ) -> ValidationResult:
        """Validate the execution result against the planned task."""
        prompt_parts = [
            f"Task ID: {task.id}",
            f"Title: {task.title}",
            f"Description: {task.description}",
            f"Acceptance criteria: {', '.join(task.acceptance_criteria)}",
            f"Expected files: {', '.join(task.files)}",
            "",
            f"Execution method: {execution.method}",
            f"Files written: {', '.join(execution.files_written)}",
            f"Execution success: {execution.success}",
        ]

        if execution.stdout:
            prompt_parts.append(f"Stdout:\n{execution.stdout[:1000]}")
        if execution.stderr:
            prompt_parts.append(f"Stderr:\n{execution.stderr[:1000]}")

        if file_contents:
            prompt_parts.append("\n--- Written file contents ---")
            for path, content in file_contents.items():
                # Limit content shown to avoid blowing up context
                preview = content[:2000]
                prompt_parts.append(f"\n{path}:\n```\n{preview}\n```")

        prompt_parts.append("\nValidate this task and return the JSON verdict.")
        prompt = "\n".join(prompt_parts)

        data = await self._generate_json(prompt)
        verdict_raw = data.get("verdict", "needs_review")
        try:
            verdict = ValidationVerdict(verdict_raw)
        except ValueError:
            verdict = ValidationVerdict.NEEDS_REVIEW

        return ValidationResult(
            task_id=data.get("task_id", task.id),
            verdict=verdict,
            issues=data.get("issues", []),
            suggestions=data.get("suggestions", []),
        )
