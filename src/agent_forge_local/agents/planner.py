"""Planner agent — decomposes a PRD / task description into structured tasks."""

from __future__ import annotations

from typing import Any

from agent_forge_local.agents.base import Agent
from agent_forge_local.models.tasks import PlannedTask, TaskPlan

_SYSTEM = """\
You are a **Planner** agent in a multi-agent software development system.

Your job is to take a Product Requirements Document (PRD) or task description \
and produce a structured, ordered list of implementation tasks.

Rules:
- Break work into small, concrete tasks that a single coder can implement.
- Each task must have a unique ID (task-01, task-02, …).
- Specify which files each task will create or modify.
- Define dependencies between tasks (which must finish first).
- Include clear acceptance criteria for each task.
- Output ONLY valid JSON matching the schema below — no markdown, no commentary.

Output JSON schema:
{
  "goal": "string — high-level goal",
  "tasks": [
    {
      "id": "task-01",
      "title": "string",
      "description": "string — detailed instructions",
      "files": ["path/to/file.py"],
      "depends_on": [],
      "acceptance_criteria": ["criterion 1"]
    }
  ],
  "notes": "string — optional caveats"
}
"""


class PlannerAgent(Agent):
    """Decomposes a PRD into an ordered task plan."""

    role = "planner"

    def system_prompt(self) -> str:
        return _SYSTEM

    async def run(self, *, prd_text: str, **_kwargs: Any) -> TaskPlan:
        """Analyse *prd_text* and return a ``TaskPlan``."""
        prompt = (
            "Analyze the following PRD and produce an implementation plan.\n\n"
            "---\n"
            f"{prd_text}\n"
            "---\n\n"
            "Respond with the JSON task plan."
        )

        data = await self._generate_json(prompt)
        if isinstance(data, list):
            # Model returned just the tasks array — wrap it
            data = {"goal": "Implement PRD", "tasks": data, "notes": ""}

        tasks = [PlannedTask(**t) for t in data.get("tasks", [])]
        return TaskPlan(
            goal=data.get("goal", ""),
            tasks=tasks,
            notes=data.get("notes", ""),
        )
