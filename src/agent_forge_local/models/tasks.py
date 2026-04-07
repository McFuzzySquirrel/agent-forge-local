"""Task and result data models — the structured intermediate format passed between agents."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Planner output
# ---------------------------------------------------------------------------


class PlannedTask(BaseModel):
    """A single task produced by the Planner agent."""

    id: str = Field(description="Unique task identifier, e.g. 'task-01'")
    title: str = Field(description="Short human-readable title")
    description: str = Field(description="Detailed description of what needs to be done")
    files: list[str] = Field(
        default_factory=list,
        description="File paths this task will create or modify",
    )
    depends_on: list[str] = Field(
        default_factory=list,
        description="IDs of tasks that must complete before this one",
    )
    acceptance_criteria: list[str] = Field(
        default_factory=list,
        description="Conditions that must be true when the task is done",
    )


class TaskPlan(BaseModel):
    """Complete plan produced by the Planner from a PRD / task description."""

    goal: str = Field(description="High-level goal derived from the input")
    tasks: list[PlannedTask] = Field(description="Ordered list of tasks")
    notes: str = Field(default="", description="Any planner notes or caveats")


# ---------------------------------------------------------------------------
# Coder output
# ---------------------------------------------------------------------------


class CodeOutput(BaseModel):
    """Code produced by the Coder agent for a single task."""

    task_id: str
    files: dict[str, str] = Field(description="Map of file path → file content to write")
    explanation: str = Field(default="", description="Brief explanation of the approach")


# ---------------------------------------------------------------------------
# Executor result
# ---------------------------------------------------------------------------


class ExecutionResult(BaseModel):
    """Result of executing a task via Copilot CLI or direct file writes."""

    task_id: str
    success: bool
    method: str = Field(description="How the task was executed: 'copilot_cli' | 'direct_write'")
    files_written: list[str] = Field(default_factory=list)
    stdout: str = Field(default="")
    stderr: str = Field(default="")


# ---------------------------------------------------------------------------
# Validator result
# ---------------------------------------------------------------------------


class ValidationVerdict(StrEnum):
    """Verdict from the Validator agent."""

    PASS = "pass"
    FAIL = "fail"
    NEEDS_REVIEW = "needs_review"


class ValidationResult(BaseModel):
    """Validation result for a single task."""

    task_id: str
    verdict: ValidationVerdict
    issues: list[str] = Field(default_factory=list, description="Issues found, if any")
    suggestions: list[str] = Field(default_factory=list, description="Improvement suggestions")
