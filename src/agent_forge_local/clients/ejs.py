"""EJS (Engineering Journey System) client — reads and writes the .ejs.db SQLite database.

The EJS database stores ADRs (Architecture Decision Records) and Session Journeys
in a SQLite database with FTS5 full-text search.  This client provides read access
so that agents can query past decisions, learnings, and project history, and
optionally writes a session journey back at run completion to close the feedback loop.

See: https://github.com/McFuzzySquirrel/Engineering-Journey-System
"""

from __future__ import annotations

import logging
import re
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agent_forge_local.models.context import SharedContext

logger = logging.getLogger(__name__)

_DEFAULT_DB_NAME = ".ejs.db"

# Maximum characters of context to inject into an agent prompt.
_DEFAULT_CONTEXT_LIMIT = 4000


class EjsClient:
    """Client for the EJS SQLite database.

    Supports read-only queries (ADR summaries, FTS5 search) and optionally
    writing session journeys back at run completion.

    The database is expected to already exist (created by ``adr-db.py sync``).
    If the database is missing or empty, all methods return graceful defaults.
    """

    def __init__(
        self,
        working_directory: str,
        *,
        db_name: str = _DEFAULT_DB_NAME,
        context_limit: int = _DEFAULT_CONTEXT_LIMIT,
    ) -> None:
        self._db_path = Path(working_directory) / db_name
        self._context_limit = context_limit
        self._conn: sqlite3.Connection | None = None
        self._write_conn: sqlite3.Connection | None = None

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    @property
    def db_exists(self) -> bool:
        """Check whether the EJS database file exists on disk."""
        return self._db_path.is_file()

    def _connect(self) -> sqlite3.Connection | None:
        """Open a read-only connection (lazy, cached)."""
        if self._conn is not None:
            return self._conn

        if not self.db_exists:
            logger.debug("EJS database not found at %s", self._db_path)
            return None

        try:
            # Open in read-only mode via URI
            uri = f"file:{self._db_path}?mode=ro"
            self._conn = sqlite3.connect(uri, uri=True)
            self._conn.row_factory = sqlite3.Row
            logger.info("Connected to EJS database at %s", self._db_path)
        except sqlite3.Error:
            logger.warning("Failed to open EJS database at %s", self._db_path, exc_info=True)
            return None

        return self._conn

    def _connect_writable(self) -> sqlite3.Connection | None:
        """Open a writable connection (lazy, cached)."""
        if self._write_conn is not None:
            return self._write_conn

        if not self.db_exists:
            logger.debug("EJS database not found at %s — cannot write", self._db_path)
            return None

        try:
            self._write_conn = sqlite3.connect(str(self._db_path))
            self._write_conn.row_factory = sqlite3.Row
            logger.info("Opened writable connection to EJS database at %s", self._db_path)
        except sqlite3.Error:
            logger.warning(
                "Failed to open EJS database for writing at %s",
                self._db_path,
                exc_info=True,
            )
            return None

        return self._write_conn

    def close(self) -> None:
        """Close the database connections if open."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
        if self._write_conn is not None:
            self._write_conn.close()
            self._write_conn = None

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def _has_table(self, conn: sqlite3.Connection, name: str) -> bool:
        """Check whether a table exists in the database."""
        row = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?",
            (name,),
        ).fetchone()
        return row is not None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def summary(self) -> str:
        """Return a compact summary of all ADRs, suitable for agent context.

        This mirrors the output of ``adr-db.py summary`` — a condensed digest
        of every ADR's decision, learnings, and agent guidance.
        """
        conn = self._connect()
        if conn is None or not self._has_table(conn, "adrs"):
            return ""

        rows = conn.execute(
            "SELECT adr_id, title, date, status, decision, key_learnings, agent_guidance "
            "FROM adrs ORDER BY adr_id"
        ).fetchall()

        if not rows:
            return ""

        parts: list[str] = []
        for r in rows:
            decision_short = (r["decision"] or "")[:300]
            learnings_short = (r["key_learnings"] or "")[:200]
            guidance_short = (r["agent_guidance"] or "")[:200]
            parts.append(
                f"### ADR {r['adr_id']}: {r['title']}\n"
                f"Status: {r['status']} | Date: {r['date']}\n"
                f"Decision: {decision_short}\n"
                f"Learnings: {learnings_short}\n"
                f"Agent Guidance: {guidance_short}"
            )

        text = "\n\n".join(parts)
        return text[: self._context_limit]

    def search(self, query: str) -> str:
        """Full-text search across ADRs and journeys.

        Returns a compact text block of matching results, suitable for
        injecting into an agent prompt as additional context.
        """
        conn = self._connect()
        if conn is None:
            return ""

        fts_query = _sanitise_fts_query(query)
        parts: list[str] = []

        # Search ADRs
        if self._has_table(conn, "adrs_fts"):
            try:
                adr_rows = conn.execute(
                    """
                    SELECT a.adr_id, a.title, a.status,
                           snippet(adrs_fts, 2, '>>>', '<<<', '...', 32) AS snippet
                    FROM adrs_fts
                    JOIN adrs a ON a.rowid = adrs_fts.rowid
                    WHERE adrs_fts MATCH ?
                    ORDER BY rank
                    LIMIT 5
                    """,
                    (fts_query,),
                ).fetchall()
                for r in adr_rows:
                    snippet = r["snippet"] or ""
                    parts.append(f"[ADR {r['adr_id']}] {r['title']} ({r['status']}): {snippet}")
            except sqlite3.OperationalError:
                logger.debug("ADR FTS search failed for query: %s", query)

        # Search Journeys
        if self._has_table(conn, "journeys_fts"):
            try:
                journey_rows = conn.execute(
                    """
                    SELECT j.session_id, j.date,
                           snippet(journeys_fts, 1, '>>>', '<<<', '...', 32) AS snippet
                    FROM journeys_fts
                    JOIN journeys j ON j.rowid = journeys_fts.rowid
                    WHERE journeys_fts MATCH ?
                    ORDER BY rank
                    LIMIT 5
                    """,
                    (fts_query,),
                ).fetchall()
                for r in journey_rows:
                    snippet = r["snippet"] or ""
                    parts.append(f"[Journey {r['session_id']}] ({r['date']}): {snippet}")
            except sqlite3.OperationalError:
                logger.debug("Journey FTS search failed for query: %s", query)

        text = "\n".join(parts)
        return text[: self._context_limit]

    def context_for_task(self, task_title: str, task_description: str) -> str:
        """Build a context string for a specific task.

        Combines a project-wide ADR summary with a targeted search
        for content relevant to the task.  The result is capped at
        ``context_limit`` characters.
        """
        sections: list[str] = []

        # 1. ADR summary (compact project memory)
        adr_summary = self.summary()
        if adr_summary:
            sections.append("## Project Decisions (from EJS)\n" + adr_summary)

        # 2. Targeted search using the task title
        search_results = self.search(task_title)
        if search_results:
            sections.append("## Relevant History\n" + search_results)

        if not sections:
            return ""

        text = "\n\n".join(sections)
        return text[: self._context_limit]

    # ------------------------------------------------------------------
    # Write API — session journey persistence
    # ------------------------------------------------------------------

    def write_journey(self, ctx: SharedContext) -> str | None:
        """Write a session journey entry derived from a completed run.

        Extracts the run's goal, task results, learnings, and agent guidance
        from the :class:`SharedContext` and inserts a new row into the
        ``journeys`` table.  FTS5 triggers (if present) will automatically
        index the new row.

        Returns the generated ``session_id`` on success, or ``None`` if the
        write was skipped (e.g. database missing, table absent, error).
        """
        conn = self._connect_writable()
        if conn is None:
            return None

        if not self._has_table(conn, "journeys"):
            logger.warning("EJS database has no 'journeys' table — skipping write")
            return None

        session_id = f"agent-forge-{uuid.uuid4().hex[:12]}"
        date = datetime.now(UTC).strftime("%Y-%m-%d")

        journey = _build_journey_from_context(ctx, session_id=session_id, date=date)

        try:
            conn.execute(
                "INSERT INTO journeys "
                "(session_id, author, date, repo, branch, agents_involved, "
                "problem_intent, interaction_summary, decisions_made, "
                "key_learnings, future_agent_guidance) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    journey["session_id"],
                    journey["author"],
                    journey["date"],
                    journey["repo"],
                    journey["branch"],
                    journey["agents_involved"],
                    journey["problem_intent"],
                    journey["interaction_summary"],
                    journey["decisions_made"],
                    journey["key_learnings"],
                    journey["future_agent_guidance"],
                ),
            )
            conn.commit()
            logger.info("Wrote session journey %s to EJS database", session_id)
        except sqlite3.Error:
            logger.warning("Failed to write journey to EJS database", exc_info=True)
            return None

        return session_id


# ---------------------------------------------------------------------------
# Journey builder — extract structured fields from a SharedContext
# ---------------------------------------------------------------------------


def _build_journey_from_context(
    ctx: SharedContext,
    *,
    session_id: str,
    date: str,
) -> dict[str, str]:
    """Map a completed :class:`SharedContext` to EJS journey fields."""
    from agent_forge_local.models.tasks import ValidationVerdict

    # Goal / intent
    goal = ctx.plan.goal if ctx.plan else "PRD execution"
    problem_intent = f"{goal}\n\nPRD excerpt: {ctx.prd_text[:500]}"

    # Interaction summary — compact per-task results
    summary_parts: list[str] = []
    for task_id, state in ctx.task_states.items():
        verdict = state.validation.verdict.value if state.validation else "no validation"
        title = ""
        if ctx.plan:
            for t in ctx.plan.tasks:
                if t.id == task_id:
                    title = t.title
                    break
        summary_parts.append(f"- {task_id} ({title}): {verdict} after {state.attempts} attempt(s)")
    interaction_summary = "\n".join(summary_parts) if summary_parts else "No tasks executed"

    # Decisions — which tasks passed / failed
    passed: list[str] = []
    failed: list[str] = []
    for task_id, state in ctx.task_states.items():
        if state.validation and state.validation.verdict == ValidationVerdict.PASS:
            passed.append(task_id)
        else:
            failed.append(task_id)

    decisions_parts: list[str] = []
    if passed:
        decisions_parts.append(f"Passed: {', '.join(passed)}")
    if failed:
        decisions_parts.append(f"Failed/needs review: {', '.join(failed)}")
    decisions_made = "\n".join(decisions_parts) if decisions_parts else "No decisions recorded"

    # Key learnings — aggregate validator issues and suggestions
    issues: list[str] = []
    suggestions: list[str] = []
    for state in ctx.task_states.values():
        if state.validation:
            issues.extend(state.validation.issues)
            suggestions.extend(state.validation.suggestions)

    learnings_parts: list[str] = []
    if issues:
        learnings_parts.append("Issues encountered:\n" + "\n".join(f"- {i}" for i in issues))
    if suggestions:
        learnings_parts.append("Suggestions:\n" + "\n".join(f"- {s}" for s in suggestions))
    key_learnings = "\n\n".join(learnings_parts) if learnings_parts else "No issues or suggestions"

    # Future agent guidance
    total = len(ctx.task_states)
    pass_count = len(passed)
    future_agent_guidance = f"Run completed {pass_count}/{total} tasks successfully. Goal: {goal}"
    if failed:
        future_agent_guidance += f"\nFailed tasks ({', '.join(failed)}) may need manual review."

    return {
        "session_id": session_id,
        "author": "agent-forge-local",
        "date": date,
        "repo": ctx.working_directory,
        "branch": "",
        "agents_involved": "planner, coder, executor, validator",
        "problem_intent": problem_intent,
        "interaction_summary": interaction_summary,
        "decisions_made": decisions_made,
        "key_learnings": key_learnings,
        "future_agent_guidance": future_agent_guidance,
    }


# ---------------------------------------------------------------------------
# FTS5 query sanitisation (adapted from EJS adr-db.py)
# ---------------------------------------------------------------------------


def _sanitise_fts_query(query: str) -> str:
    """Quote bare words that contain FTS5 special characters (e.g. hyphens).

    FTS5 interprets ``-`` as the NOT operator.  This helper wraps tokens
    that contain such characters in double-quotes so that a plain search
    like ``sub-agent`` works as expected.
    """
    if '"' in query:
        return query  # Already contains explicit quoting
    tokens = query.split()
    out: list[str] = []
    for t in tokens:
        if re.search(r"[^\w*]", t):
            out.append(f'"{t}"')
        else:
            out.append(t)
    return " ".join(out)
