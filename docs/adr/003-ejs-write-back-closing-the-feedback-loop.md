# ADR-003: EJS Write-Back — Closing the Agent Feedback Loop

**Status:** Accepted  
**Date:** 2026-04-07  
**Authors:** McFuzzySquirrel

## Context

ADR-002 integrated the EJS SQLite database as a **read-only** context provider — agents consume past decisions, learnings, and project history but never contribute back. ADR-002 explicitly listed this as a negative consequence:

> **Read-only:** The integration is one-way — agents consume EJS context but don't write back session journeys. This is intentional for the MVP but means the feedback loop isn't fully closed yet.

And flagged write-back as future work:

> Write session journeys back to EJS at run completion (close the feedback loop)

Without write-back, each agent-forge-local run is ephemeral. Validator issues, pass/fail patterns, and task-level learnings are lost unless a human manually records them. On a project using EJS, this creates an asymmetry: human sessions produce journey entries that agents can learn from, but agent sessions leave no trace — subsequent runs (both human and agent) can't learn from past automated runs.

## Decision

**Add an opt-in write path to the `EjsClient` that persists a session journey to the EJS database at run completion.**

Specifically:

1. **Separate writable connection** (`_connect_writable()`) — the read path continues to use a read-only URI connection (`?mode=ro`). The write path opens a standard connection only when write-back is invoked. This keeps the read path safe from accidental mutations and avoids holding a write lock during the entire run.

2. **Opt-in via config** — new `ejs.write_enabled` setting (default: `false`). Writes never happen unless explicitly enabled. This avoids surprising side effects for users who expect agent-forge-local to be a read-only consumer of their EJS database.

   ```yaml
   ejs:
     enabled: true
     write_enabled: true  # persist session journeys back to EJS
   ```

3. **Journey builder** (`_build_journey_from_context()`) — a pure function that maps `SharedContext` to EJS journey table fields:
   - `problem_intent` — the plan goal + PRD excerpt
   - `interaction_summary` — compact per-task verdicts and attempt counts
   - `decisions_made` — which tasks passed vs failed
   - `key_learnings` — aggregated validator issues and suggestions
   - `future_agent_guidance` — pass rate and guidance for subsequent runs
   - `agents_involved` — always `"planner, coder, executor, validator"`
   - `author` — always `"agent-forge-local"`

4. **FTS5 trigger reliance** — the EJS database schema includes FTS5 triggers that automatically index new `journeys` rows. The write path inserts into the base table only and relies on these triggers for searchability. This means a written journey is immediately discoverable via `search()` in the next run.

5. **Non-blocking error handling** — write failures are logged at WARNING level but do not raise exceptions or halt the run. A failed write-back is never worse than the pre-write-back status quo (no journey at all).

6. **Orchestrator integration** — after all tasks complete but before cleanup, the orchestrator conditionally calls `write_journey(ctx)` when `write_enabled` is `true` and the database exists. The returned `session_id` is logged to the run's `SharedContext` for observability.

### Data Flow

```
Task execution loop complete
  ↓
Orchestrator (Phase 3)
  ├── write_enabled == false  →  skip
  └── write_enabled == true
        ↓
  EjsClient._connect_writable()
        ↓
  _build_journey_from_context(SharedContext)
        ↓
  INSERT INTO journeys (...)  →  FTS5 triggers index automatically
        ↓
  session_id returned → logged in SharedContext
        ↓
  Next run's EjsClient.search() / summary() can find this journey
```

## Alternatives Considered

### A. Write to markdown files instead of SQLite

Generate a `ejs-docs/journey/YYYY-MM/session.md` file matching EJS's markdown format, then let `adr-db.py sync` index it later.

**Rejected because:**
- Requires knowledge of the target project's `ejs-docs` directory structure
- Journey wouldn't be searchable until the next `adr-db.py sync`
- Adds file I/O complexity (directory creation, naming conventions, frontmatter formatting)
- The SQLite database is the queryable interface — writing directly is simpler and immediately useful

### B. Write-back enabled by default

Make `write_enabled` default to `true` so users get the feedback loop automatically.

**Rejected because:**
- Users may not expect agent-forge-local to modify their project's `.ejs.db`
- Write-back is a new capability — opt-in gives users time to evaluate before committing
- The read-only default matches the principle of least surprise
- Can be reconsidered once the feature is proven stable

### C. Use the same connection for reads and writes

Open a single read-write connection instead of maintaining separate read-only and writable connections.

**Rejected because:**
- The read-only URI connection (`?mode=ro`) provides a hard guarantee against accidental writes during the read path
- Write locks held for the full run duration could block other tools accessing the same database
- Lazy connection means the write connection is only opened if write-back actually occurs

### D. Write ADR entries (not just journeys)

Have agents generate ADR-style entries for significant architectural decisions discovered during a run.

**Deferred because:**
- ADRs require human judgment about significance and framing
- The journey format captures enough detail for future agent context
- ADR generation could be added later as a separate agent capability

## Consequences

### Positive

- **Feedback loop closed:** Agent runs now leave a searchable trace in the EJS database. Future runs — both agent and human — can learn from past automated sessions.
- **Immediate searchability:** FTS5 triggers index the journey on insert. The next `search()` call can find it without any manual sync step.
- **Zero new dependencies:** Uses the same `sqlite3` stdlib module as the read path.
- **Non-disruptive:** Opt-in config, graceful error handling, separate connection — nothing changes for users who don't enable it.
- **Observable:** The session ID is logged to `SharedContext`, so users can see exactly what was written via `--output`.

### Negative

- **Write contention risk:** If another tool (e.g., `adr-db.py sync`) writes to `.ejs.db` simultaneously, SQLite's file-level locking could cause transient errors. Mitigation: the write is a single INSERT + COMMIT, keeping the lock window small.
- **Schema coupling:** The INSERT statement assumes a specific `journeys` table schema. If EJS changes its schema, the write path breaks. Mitigation: `_has_table()` check prevents crashes, and the schema has been stable.
- **Only journeys, not ADRs:** The write path creates journey entries only. Architectural decisions still require human authorship. This is intentional but limits the scope of automated memory.

### Risks

- **Stale FTS index:** If the EJS database was created without FTS5 triggers (e.g., an older `adr-db.py` version), written journeys won't be indexed for search. Mitigation: the base table row is still written and queryable via direct SQL.
- **Large context accumulation:** Over many runs, the journeys table could grow large, increasing `summary()` and `search()` response sizes. Mitigation: the existing `context_limit` setting caps injected context regardless of database size.

## Relationship to ADR-002

This ADR extends ADR-002's read-only EJS integration to bidirectional. ADR-002's "Future Work" section listed write-back as a planned next step. The read path (`summary()`, `search()`, `context_for_task()`) is unchanged. The write path is additive — it can be enabled or disabled independently of the read path.
