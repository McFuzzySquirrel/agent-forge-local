"""Tests for data models — tasks, context, and serialization."""

from agent_forge_local.models.context import SharedContext, TaskState
from agent_forge_local.models.tasks import (
    CodeOutput,
    ExecutionResult,
    PlannedTask,
    TaskPlan,
    ValidationResult,
    ValidationVerdict,
)


class TestPlannedTask:
    def test_minimal(self):
        t = PlannedTask(id="task-01", title="Do X", description="Details")
        assert t.id == "task-01"
        assert t.files == []
        assert t.depends_on == []

    def test_full(self):
        t = PlannedTask(
            id="task-02",
            title="Build API",
            description="Create REST endpoints",
            files=["src/api.py"],
            depends_on=["task-01"],
            acceptance_criteria=["endpoints respond 200"],
        )
        assert t.depends_on == ["task-01"]
        assert len(t.acceptance_criteria) == 1


class TestTaskPlan:
    def test_from_tasks(self):
        plan = TaskPlan(
            goal="Build a thing",
            tasks=[
                PlannedTask(id="t1", title="A", description="..."),
                PlannedTask(id="t2", title="B", description="...", depends_on=["t1"]),
            ],
        )
        assert len(plan.tasks) == 2
        assert plan.goal == "Build a thing"


class TestCodeOutput:
    def test_round_trip(self):
        co = CodeOutput(task_id="t1", files={"main.py": "print('hi')"}, explanation="simple")
        data = co.model_dump()
        assert data["files"]["main.py"] == "print('hi')"
        assert CodeOutput(**data) == co


class TestExecutionResult:
    def test_success(self):
        er = ExecutionResult(
            task_id="t1", success=True, method="direct_write", files_written=["main.py"]
        )
        assert er.success is True

    def test_failure(self):
        er = ExecutionResult(task_id="t1", success=False, method="copilot_cli", stderr="error")
        assert er.success is False


class TestValidationResult:
    def test_pass(self):
        vr = ValidationResult(task_id="t1", verdict=ValidationVerdict.PASS)
        assert vr.verdict == ValidationVerdict.PASS
        assert vr.issues == []

    def test_fail_with_issues(self):
        vr = ValidationResult(
            task_id="t1",
            verdict=ValidationVerdict.FAIL,
            issues=["missing file"],
            suggestions=["add the file"],
        )
        assert vr.verdict == ValidationVerdict.FAIL
        assert len(vr.issues) == 1


class TestSharedContext:
    def test_log(self):
        ctx = SharedContext(prd_text="test", working_directory="/tmp")
        ctx.log("hello")
        assert len(ctx.run_log) == 1
        assert "hello" in ctx.run_log[0]

    def test_get_task_state(self):
        ctx = SharedContext(prd_text="test", working_directory="/tmp")
        state = ctx.get_task_state("t1")
        assert isinstance(state, TaskState)
        assert state.attempts == 0
        # Same reference on second call
        assert ctx.get_task_state("t1") is state

    def test_serialization(self):
        ctx = SharedContext(prd_text="test prd", working_directory="/tmp/project")
        ctx.plan = TaskPlan(
            goal="test",
            tasks=[PlannedTask(id="t1", title="A", description="B")],
        )
        ctx.get_task_state("t1").validation = ValidationResult(
            task_id="t1", verdict=ValidationVerdict.PASS
        )

        json_str = ctx.model_dump_json()
        restored = SharedContext.model_validate_json(json_str)
        assert restored.plan is not None
        assert len(restored.plan.tasks) == 1
        assert restored.task_states["t1"].validation is not None
