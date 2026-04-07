# ADR-002: EJS Integration — Persistent Project Memory via SQLite

**Status:** Accepted  
**Date:** 2026-04-07  
**Authors:** McFuzzySquirrel

## Context

The agent-forge-local MVP has a **context problem**: every run starts with zero knowledge of the target project's history, past decisions, and learnings. The `SharedContext` is ephemeral — it holds intra-run state (PRD, plan, task results) but nothing carries over between runs.

This means:
- The Coder agent generates code in a vacuum, unaware of project conventions
- Past failed approaches are invisible, so the same mistakes may repeat
- Brownfield projects get no benefit from their accumulated decisions and learnings
- The `existing_context` parameter on the Coder agent exists but is never populated

The [Engineering Journey System (EJS)](https://github.com/McFuzzySquirrel/Engineering-Journey-System) already solves this problem for human+AI collaboration workflows. It captures ADRs, session journeys, and learnings in markdown files, and provides a SQLite-backed index (`adr-db.py` → `.ejs.db`) with FTS5 full-text search for efficient agent-friendly querying.

Additionally, [Copilot CLI's BYOK support for local models](https://github.blog/changelog/2026-04-07-copilot-cli-now-supports-byok-and-local-models/) means that when Copilot CLI uses a local model, the entire tool chain — local agents AND Copilot CLI — can share the same project memory.

## Decision

**Integrate the EJS SQLite database as a read-only context provider in the orchestrator.**

Specifically:

1. **New `EjsClient`** (`src/agent_forge_local/clients/ejs.py`) — a read-only client that opens the `.ejs.db` database and provides:
   - `summary()` — compact digest of all ADRs (decisions, learnings, agent guidance)
   - `search(query)` — FTS5 full-text search across ADRs and journeys
   - `context_for_task(title, description)` — combined summary + targeted search for a specific task

2. **Configuration** (`config.yaml` → `ejs` section) — three settings:
   - `enabled` (default: `true`) — whether to look for an EJS database
   - `db_name` (default: `.ejs.db`) — filename relative to working directory
   - `context_limit` (default: `4000`) — maximum characters of context per agent call

3. **Orchestrator integration** — at run start, the orchestrator loads the EJS summary and stores it in `SharedContext.ejs_context`. Per task, it queries `context_for_task()` and passes the result to the Coder agent via the existing `existing_context` parameter.

4. **Graceful degradation** — if the database doesn't exist, is empty, or EJS is disabled in config, the system behaves identically to before. No new dependencies are added (SQLite is in Python's stdlib).

### Data Flow

```
Target project working directory
  └── .ejs.db (if present)
        ↓ (read-only)
  EjsClient
    → summary()  →  SharedContext.ejs_context
    → context_for_task(title, desc)  →  CoderAgent(existing_context=…)
```

## Alternatives Considered

### A. Read markdown files directly

Parse `ejs-docs/adr/*.md` and `ejs-docs/journey/**/*.md` directly instead of going through the SQLite database.

**Rejected because:**
- Requires parsing YAML frontmatter and markdown sections (duplicating `adr-db.py` logic)
- Much slower than SQLite queries, especially for FTS
- Would blow up agent context windows on projects with many ADRs/journeys
- The SQLite database is the canonical queryable interface EJS provides

### B. Run `adr-db.py` as a subprocess

Shell out to `python scripts/adr-db.py summary` and capture stdout.

**Rejected because:**
- Requires `adr-db.py` to exist in the target project at a known path
- Subprocess overhead for every query
- Error handling is harder (parse stdout vs structured API)
- The database schema is stable — querying directly is simpler and faster

### C. Add EJS as a pip dependency

Make the EJS database module a pip package and import it.

**Rejected because:**
- EJS is designed as a repo-portable system, not a library
- Would add an external dependency to a project that currently has three
- The SQLite schema is stable and simple — a thin client is sufficient

## Consequences

### Positive

- **Agents have project memory:** The Coder agent now receives past decisions, learnings, and guidance. This should improve code quality on brownfield projects.
- **Zero new dependencies:** SQLite is in Python's stdlib. No new pip packages needed.
- **Fully optional:** Works without EJS. No breaking changes. The system detects the database and uses it if present.
- **Configurable context budget:** The `context_limit` setting lets users tune how much EJS context to inject, addressing the "context budget" research question.
- **Observable:** The loaded EJS context is stored in `SharedContext.ejs_context` and exported in the JSON output, so users can see exactly what context agents received.

### Negative

- **Read-only:** The integration is one-way — agents consume EJS context but don't write back session journeys. This is intentional for the MVP but means the feedback loop isn't fully closed yet.
- **Database must be pre-synced:** Users must run `adr-db.py sync` before agent-forge-local runs. The orchestrator doesn't sync the database itself.
- **Only the Coder benefits (for now):** The Planner and Validator don't receive EJS context in this initial integration. This is a natural extension point.

### Future Work

- Feed EJS context to the Planner agent for history-aware task decomposition
- Write session journeys back to EJS at run completion (close the feedback loop)
- Auto-sync the database at run start if `adr-db.py` is detected in the working directory
