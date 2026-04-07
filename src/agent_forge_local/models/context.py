"""Shared context store — the common state that all agents read from and write to."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

from agent_forge_local.models.tasks import (
    CodeOutput,
    ExecutionResult,
    TaskPlan,
    ValidationResult,
)


class TaskState(BaseModel):
    """Full state for a single task across all agent stages."""

    code: CodeOutput | None = None
    execution: ExecutionResult | None = None
    validation: ValidationResult | None = None
    attempts: int = Field(default=0, description="Number of attempts so far")


class SharedContext(BaseModel):
    """The shared context store that all agents read from / write to.

    This is the single source of truth for the current run.  It is passed
    (or a relevant slice of it) to each agent so they have the context they
    need without needing to understand the full repo.
    """

    # Input
    prd_text: str = Field(description="The raw PRD or task description")
    working_directory: str = Field(description="Absolute path to the target repo / project")

    # Planner output
    plan: TaskPlan | None = None

    # Per-task state keyed by task ID
    task_states: dict[str, TaskState] = Field(default_factory=dict)

    # Run metadata
    started_at: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
    )
    run_log: list[str] = Field(
        default_factory=list,
        description="Timestamped log entries for the run",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)

    # EJS context (populated by orchestrator when an EJS database is available)
    ejs_context: str = Field(
        default="",
        description="Project context loaded from the EJS database (ADR summaries, search results)",
    )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def log(self, message: str) -> None:
        """Append a timestamped entry to the run log."""
        ts = datetime.now(UTC).strftime("%H:%M:%S")
        self.run_log.append(f"[{ts}] {message}")

    def get_task_state(self, task_id: str) -> TaskState:
        """Return existing TaskState or create a new one."""
        if task_id not in self.task_states:
            self.task_states[task_id] = TaskState()
        return self.task_states[task_id]
