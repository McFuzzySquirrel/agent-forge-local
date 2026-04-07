"""Tests for the orchestrator — topological sort and task execution logic."""

from agent_forge_local.models.tasks import PlannedTask, TaskPlan
from agent_forge_local.orchestrator import Orchestrator


class TestExecutionOrder:
    """Test the dependency-based topological sort."""

    def test_no_dependencies(self):
        plan = TaskPlan(
            goal="test",
            tasks=[
                PlannedTask(id="t1", title="A", description="..."),
                PlannedTask(id="t2", title="B", description="..."),
            ],
        )
        order = Orchestrator._execution_order(plan)
        assert [t.id for t in order] == ["t1", "t2"]

    def test_linear_dependencies(self):
        plan = TaskPlan(
            goal="test",
            tasks=[
                PlannedTask(id="t3", title="C", description="...", depends_on=["t2"]),
                PlannedTask(id="t1", title="A", description="..."),
                PlannedTask(id="t2", title="B", description="...", depends_on=["t1"]),
            ],
        )
        order = Orchestrator._execution_order(plan)
        ids = [t.id for t in order]
        assert ids.index("t1") < ids.index("t2") < ids.index("t3")

    def test_diamond_dependencies(self):
        plan = TaskPlan(
            goal="test",
            tasks=[
                PlannedTask(id="t4", title="D", description="...", depends_on=["t2", "t3"]),
                PlannedTask(id="t2", title="B", description="...", depends_on=["t1"]),
                PlannedTask(id="t3", title="C", description="...", depends_on=["t1"]),
                PlannedTask(id="t1", title="A", description="..."),
            ],
        )
        order = Orchestrator._execution_order(plan)
        ids = [t.id for t in order]
        assert ids[0] == "t1"
        assert ids[-1] == "t4"
        assert set(ids) == {"t1", "t2", "t3", "t4"}

    def test_circular_dependencies_still_returns_all(self):
        """Circular deps shouldn't crash — just include all tasks."""
        plan = TaskPlan(
            goal="test",
            tasks=[
                PlannedTask(id="t1", title="A", description="...", depends_on=["t2"]),
                PlannedTask(id="t2", title="B", description="...", depends_on=["t1"]),
            ],
        )
        order = Orchestrator._execution_order(plan)
        assert len(order) == 2
        assert {t.id for t in order} == {"t1", "t2"}

    def test_empty_plan(self):
        plan = TaskPlan(goal="test", tasks=[])
        order = Orchestrator._execution_order(plan)
        assert order == []
