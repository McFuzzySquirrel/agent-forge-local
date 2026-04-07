"""Tests for the EJS (Engineering Journey System) context client."""

import sqlite3

import pytest

from agent_forge_local.clients.ejs import (
    EjsClient,
    _build_journey_from_context,
    _sanitise_fts_query,
)
from agent_forge_local.models.context import SharedContext
from agent_forge_local.models.tasks import (
    CodeOutput,
    ExecutionResult,
    PlannedTask,
    TaskPlan,
    ValidationResult,
    ValidationVerdict,
)

# ---------------------------------------------------------------------------
# FTS query sanitisation
# ---------------------------------------------------------------------------


class TestSanitiseFtsQuery:
    def test_plain_word(self):
        assert _sanitise_fts_query("auth") == "auth"

    def test_hyphenated_word_is_quoted(self):
        assert _sanitise_fts_query("sub-agent") == '"sub-agent"'

    def test_multiple_words(self):
        assert _sanitise_fts_query("database auth") == "database auth"

    def test_already_quoted(self):
        assert _sanitise_fts_query('"my-query"') == '"my-query"'

    def test_wildcard_preserved(self):
        assert _sanitise_fts_query("auth*") == "auth*"


# ---------------------------------------------------------------------------
# Helpers — create a minimal EJS database for testing
# ---------------------------------------------------------------------------

_ADR_SCHEMA = """
CREATE TABLE IF NOT EXISTS adrs (
    adr_id          TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    date            TEXT,
    status          TEXT,
    session_id      TEXT,
    session_journey TEXT,
    actors_humans   TEXT,
    actors_agents   TEXT,
    context_repo    TEXT,
    context_branch  TEXT,
    decision        TEXT,
    context_section TEXT,
    rationale       TEXT,
    consequences    TEXT,
    key_learnings   TEXT,
    agent_guidance  TEXT,
    file_path       TEXT,
    last_synced     TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS adrs_fts USING fts5(
    adr_id, title, decision, context_section, rationale,
    consequences, key_learnings, agent_guidance,
    content='adrs', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS adrs_ai AFTER INSERT ON adrs BEGIN
    INSERT INTO adrs_fts(rowid, adr_id, title, decision, context_section,
                         rationale, consequences, key_learnings, agent_guidance)
    VALUES (new.rowid, new.adr_id, new.title, new.decision, new.context_section,
            new.rationale, new.consequences, new.key_learnings, new.agent_guidance);
END;
"""

_JOURNEY_SCHEMA = """
CREATE TABLE IF NOT EXISTS journeys (
    session_id              TEXT PRIMARY KEY,
    author                  TEXT,
    date                    TEXT,
    repo                    TEXT,
    branch                  TEXT,
    agents_involved         TEXT,
    decision_detected       TEXT,
    adr_links               TEXT,
    tags                    TEXT,
    problem_intent          TEXT,
    interaction_summary     TEXT,
    decisions_made          TEXT,
    key_learnings           TEXT,
    future_agent_guidance   TEXT,
    file_path               TEXT,
    last_synced             TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS journeys_fts USING fts5(
    session_id, problem_intent, interaction_summary,
    decisions_made, key_learnings, future_agent_guidance,
    content='journeys', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS journeys_ai AFTER INSERT ON journeys BEGIN
    INSERT INTO journeys_fts(rowid, session_id, problem_intent, interaction_summary,
                             decisions_made, key_learnings, future_agent_guidance)
    VALUES (new.rowid, new.session_id, new.problem_intent, new.interaction_summary,
            new.decisions_made, new.key_learnings, new.future_agent_guidance);
END;
"""


def _create_test_db(db_path, *, adrs=None, journeys=None):
    """Create a minimal EJS database for testing."""
    conn = sqlite3.connect(str(db_path))
    conn.executescript(_ADR_SCHEMA)
    conn.executescript(_JOURNEY_SCHEMA)

    for adr in adrs or []:
        conn.execute(
            "INSERT INTO adrs "
            "(adr_id, title, date, status, decision, key_learnings, agent_guidance) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                adr.get("adr_id", "0001"),
                adr.get("title", "Test ADR"),
                adr.get("date", "2026-01-01"),
                adr.get("status", "Accepted"),
                adr.get("decision", "Use SQLite for storage"),
                adr.get("key_learnings", "SQLite is sufficient for local use"),
                adr.get("agent_guidance", "Prefer SQLite over JSON files"),
            ),
        )

    for j in journeys or []:
        conn.execute(
            "INSERT INTO journeys (session_id, date, problem_intent, interaction_summary, "
            "decisions_made, key_learnings, future_agent_guidance) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                j.get("session_id", "session-001"),
                j.get("date", "2026-01-01"),
                j.get("problem_intent", "Set up authentication"),
                j.get("interaction_summary", "Discussed JWT vs session tokens"),
                j.get("decisions_made", "Use JWT for API auth"),
                j.get("key_learnings", "JWT is stateless"),
                j.get("future_agent_guidance", "Always use JWT for new APIs"),
            ),
        )

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Client tests
# ---------------------------------------------------------------------------


class TestEjsClientNoDB:
    """Tests when no EJS database exists."""

    def test_db_exists_false(self, tmp_path):
        client = EjsClient(str(tmp_path))
        assert client.db_exists is False

    def test_summary_returns_empty(self, tmp_path):
        client = EjsClient(str(tmp_path))
        assert client.summary() == ""

    def test_search_returns_empty(self, tmp_path):
        client = EjsClient(str(tmp_path))
        assert client.search("anything") == ""

    def test_context_for_task_returns_empty(self, tmp_path):
        client = EjsClient(str(tmp_path))
        assert client.context_for_task("title", "desc") == ""


class TestEjsClientEmptyDB:
    """Tests with an empty EJS database (schema but no data)."""

    def test_summary_returns_empty(self, tmp_path):
        _create_test_db(tmp_path / ".ejs.db")
        client = EjsClient(str(tmp_path))
        assert client.db_exists is True
        assert client.summary() == ""

    def test_search_returns_empty(self, tmp_path):
        _create_test_db(tmp_path / ".ejs.db")
        client = EjsClient(str(tmp_path))
        assert client.search("test") == ""


class TestEjsClientWithData:
    """Tests with populated EJS database."""

    @pytest.fixture()
    def client(self, tmp_path):
        _create_test_db(
            tmp_path / ".ejs.db",
            adrs=[
                {
                    "adr_id": "0001",
                    "title": "Use SQLite for local storage",
                    "decision": "We will use SQLite for all local persistence needs.",
                    "key_learnings": "SQLite handles concurrent reads well.",
                    "agent_guidance": "Always use parameterized queries.",
                },
                {
                    "adr_id": "0002",
                    "title": "Authentication with JWT",
                    "decision": "Use JWT tokens for API authentication.",
                    "key_learnings": "Stateless auth scales better.",
                    "agent_guidance": "Include token refresh logic.",
                },
            ],
            journeys=[
                {
                    "session_id": "session-001",
                    "problem_intent": "Set up the project database layer",
                    "interaction_summary": "Built SQLite schema for user data",
                    "decisions_made": "Chose SQLite over PostgreSQL for portability",
                    "key_learnings": "FTS5 provides fast full-text search",
                    "future_agent_guidance": "Use FTS5 for any search features",
                },
            ],
        )
        c = EjsClient(str(tmp_path))
        yield c
        c.close()

    def test_summary_includes_adrs(self, client):
        result = client.summary()
        assert "ADR 0001" in result
        assert "SQLite" in result
        assert "ADR 0002" in result
        assert "JWT" in result

    def test_search_finds_adrs(self, client):
        result = client.search("SQLite")
        assert "ADR 0001" in result

    def test_search_finds_journeys(self, client):
        result = client.search("database")
        assert "session-001" in result

    def test_search_no_results(self, client):
        result = client.search("xyznonexistent")
        assert result == ""

    def test_context_for_task(self, client):
        result = client.context_for_task("Build database layer", "Create SQLite tables")
        assert "Project Decisions" in result
        assert "ADR 0001" in result

    def test_context_limit_respected(self, tmp_path):
        """Context should be truncated to the configured limit."""
        _create_test_db(
            tmp_path / ".ejs.db",
            adrs=[
                {
                    "adr_id": f"{i:04d}",
                    "title": f"Decision number {i} about architecture",
                    "decision": f"Long decision text for item {i}. " * 20,
                    "key_learnings": f"Learning {i}. " * 10,
                    "agent_guidance": f"Guidance {i}. " * 10,
                }
                for i in range(1, 20)
            ],
        )
        client = EjsClient(str(tmp_path), context_limit=500)
        result = client.summary()
        assert len(result) <= 500
        client.close()

    def test_custom_db_name(self, tmp_path):
        _create_test_db(
            tmp_path / "custom.db",
            adrs=[{"adr_id": "0001", "title": "Custom DB test"}],
        )
        client = EjsClient(str(tmp_path), db_name="custom.db")
        assert client.db_exists is True
        assert "Custom DB test" in client.summary()
        client.close()

    def test_close_idempotent(self, client):
        client.close()
        client.close()  # Should not raise


# ---------------------------------------------------------------------------
# Helpers — build a SharedContext with task states for write tests
# ---------------------------------------------------------------------------


def _make_context(
    *,
    goal: str = "Build a hello world app",
    prd_text: str = "Create a simple greeting CLI tool",
    working_directory: str = "/tmp/test-project",
    tasks: list[dict] | None = None,
) -> SharedContext:
    """Create a SharedContext populated with task results for testing."""
    ctx = SharedContext(prd_text=prd_text, working_directory=working_directory)

    if tasks is None:
        tasks = [
            {
                "id": "task-01",
                "title": "Create greeter module",
                "verdict": ValidationVerdict.PASS,
                "issues": [],
                "suggestions": ["Add type hints"],
                "attempts": 1,
            },
            {
                "id": "task-02",
                "title": "Add CLI entry point",
                "verdict": ValidationVerdict.FAIL,
                "issues": ["Missing argument parser"],
                "suggestions": ["Use argparse"],
                "attempts": 2,
            },
        ]

    planned = []
    for t in tasks:
        planned.append(
            PlannedTask(
                id=t["id"],
                title=t["title"],
                description=f"Implement {t['title']}",
                files=[f"{t['id']}.py"],
            )
        )
        state = ctx.get_task_state(t["id"])
        state.attempts = t.get("attempts", 1)
        state.code = CodeOutput(task_id=t["id"], files={f"{t['id']}.py": "# code"})
        state.execution = ExecutionResult(
            task_id=t["id"], success=True, method="direct_write", files_written=[f"{t['id']}.py"]
        )
        state.validation = ValidationResult(
            task_id=t["id"],
            verdict=t["verdict"],
            issues=t.get("issues", []),
            suggestions=t.get("suggestions", []),
        )

    ctx.plan = TaskPlan(goal=goal, tasks=planned)
    return ctx


# ---------------------------------------------------------------------------
# Journey builder unit tests
# ---------------------------------------------------------------------------


class TestBuildJourneyFromContext:
    def test_basic_fields(self):
        ctx = _make_context()
        journey = _build_journey_from_context(ctx, session_id="test-001", date="2026-04-07")

        assert journey["session_id"] == "test-001"
        assert journey["author"] == "agent-forge-local"
        assert journey["date"] == "2026-04-07"
        assert journey["repo"] == "/tmp/test-project"
        assert "planner" in journey["agents_involved"]

    def test_problem_intent_includes_goal_and_prd(self):
        ctx = _make_context(goal="Build CLI tool", prd_text="A simple CLI tool for greetings")
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert "Build CLI tool" in journey["problem_intent"]
        assert "simple CLI tool" in journey["problem_intent"]

    def test_interaction_summary_lists_tasks(self):
        ctx = _make_context()
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert "task-01" in journey["interaction_summary"]
        assert "task-02" in journey["interaction_summary"]
        assert "pass" in journey["interaction_summary"]
        assert "fail" in journey["interaction_summary"]

    def test_decisions_made_separates_pass_fail(self):
        ctx = _make_context()
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert "Passed: task-01" in journey["decisions_made"]
        assert "Failed/needs review: task-02" in journey["decisions_made"]

    def test_key_learnings_includes_issues_and_suggestions(self):
        ctx = _make_context()
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert "Missing argument parser" in journey["key_learnings"]
        assert "Add type hints" in journey["key_learnings"]
        assert "Use argparse" in journey["key_learnings"]

    def test_future_guidance_includes_summary(self):
        ctx = _make_context()
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert "1/2 tasks successfully" in journey["future_agent_guidance"]
        assert "task-02" in journey["future_agent_guidance"]

    def test_all_passed(self):
        ctx = _make_context(
            tasks=[
                {"id": "task-01", "title": "Only task", "verdict": ValidationVerdict.PASS},
            ]
        )
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert "1/1 tasks successfully" in journey["future_agent_guidance"]
        assert "Failed" not in journey["future_agent_guidance"]
        assert "Passed: task-01" in journey["decisions_made"]

    def test_no_tasks(self):
        ctx = _make_context(tasks=[])
        journey = _build_journey_from_context(ctx, session_id="s1", date="2026-01-01")

        assert journey["interaction_summary"] == "No tasks executed"
        assert journey["decisions_made"] == "No decisions recorded"


# ---------------------------------------------------------------------------
# Write journey integration tests
# ---------------------------------------------------------------------------


class TestWriteJourney:
    """Tests for writing session journeys back to the EJS database."""

    def test_write_journey_success(self, tmp_path):
        _create_test_db(tmp_path / ".ejs.db")
        client = EjsClient(str(tmp_path))
        ctx = _make_context()

        session_id = client.write_journey(ctx)

        assert session_id is not None
        assert session_id.startswith("agent-forge-")

        # Verify the row was actually inserted
        conn = sqlite3.connect(str(tmp_path / ".ejs.db"))
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM journeys WHERE session_id = ?", (session_id,)).fetchone()
        conn.close()

        assert row is not None
        assert row["author"] == "agent-forge-local"
        assert "task-01" in row["interaction_summary"]
        assert "Build a hello world app" in row["problem_intent"]
        client.close()

    def test_write_journey_no_db(self, tmp_path):
        client = EjsClient(str(tmp_path))
        ctx = _make_context()

        result = client.write_journey(ctx)
        assert result is None

    def test_write_journey_empty_db(self, tmp_path):
        _create_test_db(tmp_path / ".ejs.db")
        client = EjsClient(str(tmp_path))
        ctx = _make_context()

        session_id = client.write_journey(ctx)
        assert session_id is not None
        client.close()

    def test_written_journey_searchable_via_fts(self, tmp_path):
        """A written journey should be findable via FTS5 search."""
        _create_test_db(tmp_path / ".ejs.db")
        client = EjsClient(str(tmp_path))
        ctx = _make_context(goal="Implement authentication system")

        session_id = client.write_journey(ctx)
        assert session_id is not None

        # Close write connection, re-open for reading
        client.close()
        client = EjsClient(str(tmp_path))
        result = client.search("authentication")
        assert session_id in result
        client.close()

    def test_write_journey_no_journeys_table(self, tmp_path):
        """Gracefully handle a database without the journeys table."""
        db_path = tmp_path / ".ejs.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE adrs (adr_id TEXT PRIMARY KEY)")
        conn.close()

        client = EjsClient(str(tmp_path))
        ctx = _make_context()

        result = client.write_journey(ctx)
        assert result is None
        client.close()

    def test_close_closes_both_connections(self, tmp_path):
        _create_test_db(tmp_path / ".ejs.db")
        client = EjsClient(str(tmp_path))

        # Trigger both connections
        client.summary()
        ctx = _make_context()
        client.write_journey(ctx)

        client.close()
        assert client._conn is None
        assert client._write_conn is None
