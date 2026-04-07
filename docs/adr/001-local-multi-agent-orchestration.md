# ADR-001: Local Multi-Agent Orchestration with Copilot CLI as a Capability

**Status:** Accepted  
**Date:** 2026-04-07  
**Authors:** McFuzzySquirrel

## Context

GitHub Copilot CLI [announced BYOK (Bring Your Own Key) support for local models](https://github.blog/changelog/2026-04-07-copilot-cli-now-supports-byok-and-local-models/) on 2026-04-07. This raises the question: if you can swap the model inside Copilot, should you? Or is there a better way to use local models alongside Copilot?

The companion project [mcfuzzy-agent-forge](https://github.com/McFuzzySquirrel/mcfuzzy-agent-forge) already demonstrates multi-agent orchestration *inside* GitHub Copilot — a PRD is fed in, Copilot drives the entire build. That works, but it means:

- You're bound to Copilot's model and context window
- You can't specialise different models for different tasks
- You have limited control over the intermediate outputs
- Everything runs through a single provider

We wanted to test a different hypothesis.

## Decision

**Build a local multi-agent orchestrator that treats Copilot CLI as a capability, not the brain.**

Specifically:

1. **Four specialised agents** — Planner, Coder, Executor, Validator — each backed by a different local model running via [Ollama](https://ollama.com).
2. **Structured context passing** — agents communicate through typed Pydantic models (not free-form text), serialised as JSON. A `SharedContext` object is the single source of truth for each run.
3. **Copilot CLI as an optional enhancement** — the Executor agent checks whether `gh copilot` is available. If yes, it uses Copilot for repo-aware operations. If no, it falls back to direct file writes. The system works fully offline.
4. **Retry-based feedback loop** — when the Validator rejects a task, the orchestrator retries the Coder → Executor → Validator loop up to a configurable `max_retries`. This compensates for the unreliability of smaller models.
5. **Topological task ordering** — the Planner produces tasks with dependency edges; the orchestrator sorts them before execution. Circular dependencies are detected and handled gracefully (tasks are included in original order).
6. **Configuration-driven model assignment** — a `config.yaml` file maps each agent role to an Ollama model. Users can swap models freely based on their hardware and preferences.

### Agent–Model Assignments (defaults)

| Agent | Model | Rationale |
|-------|-------|-----------|
| Planner | Llama 3.3 8B | Strong structured reasoning; good at decomposition |
| Coder | Qwen 3 7B | Strong code generation for its size |
| Executor | Mistral 7B | Good instruction following; formats Copilot CLI inputs well |
| Validator | Phi-4 | Good at evaluation and pass/fail judgments |

### Data Flow

```
PRD (text/markdown)
  → PlannerAgent   → TaskPlan (goal, ordered PlannedTasks with dependencies)
  → for each task (topologically sorted):
      CoderAgent   → CodeOutput (file path → file content map)
      ExecutorAgent→ ExecutionResult (files written, stdout/stderr)
      ValidatorAgent→ ValidationResult (pass/fail/needs_review, issues, suggestions)
      ↻ retry on FAIL (up to max_retries)
  → SharedContext (full run state, exportable as JSON)
```

## Alternatives Considered

### A. BYOK — replace Copilot's model with a local one

Copilot CLI now supports pointing at a local Ollama endpoint. We could just do `gh copilot --model ollama/llama3.3:8b` and keep using Copilot as the sole orchestrator.

**Rejected because:**
- Single model for all tasks — no specialisation
- Still constrained by Copilot's prompting and context management
- Can't inject structured intermediate formats between steps
- Doesn't answer the research question: *what can a local swarm do that a single model can't?*

### B. Fully autonomous agents (no Copilot at all)

Build the entire system with local models only, handling file writes, shell commands, and Git operations directly.

**Partially adopted:** The system *does* work without Copilot CLI installed (the Executor falls back to direct file writes). But we keep Copilot CLI as an optional capability because it brings repo-aware context that local models lack — it knows about the repo structure, Git state, and GitHub-specific conventions.

### C. LangChain / CrewAI / AutoGen

Use an existing multi-agent framework instead of building from scratch.

**Rejected because:**
- These frameworks add significant dependency weight and abstraction layers
- We want to understand the mechanics directly (this is a research project)
- The orchestration logic is simple enough (< 225 lines) to own entirely
- Pydantic models + httpx + asyncio give us everything we need

### D. Streaming / parallel agent execution

Run Coder and Validator concurrently, or stream model output token-by-token.

**Deferred:** The MVP uses sequential execution and non-streaming Ollama calls. This is simpler to debug and reason about. Parallelism can be added later if task throughput becomes a bottleneck.

## Consequences

### Positive

- **Model specialisation:** Each agent uses the best-fit model for its task. Planner gets a reasoning model; Coder gets a code model; Validator gets an evaluation model.
- **Full local control:** All inference happens locally. No data leaves the machine (unless Copilot CLI is used, which is optional).
- **Structured handoffs:** Typed Pydantic models catch malformed intermediate data at serialization time, not at the next agent's prompt boundary.
- **Graceful degradation:** Works with or without Copilot CLI. Works with any Ollama model.
- **Debuggability:** The `SharedContext` captures the full run state — plan, code, execution, validation, and a timestamped log — exportable as JSON with `--output`.
- **Low dependency footprint:** Only three runtime dependencies: `httpx`, `pydantic`, `pyyaml`.

### Negative

- **Sequential bottleneck:** Tasks execute one at a time. A 10-task plan means 10 × (code + execute + validate) round trips.
- **Small model unreliability:** 7B–8B models produce malformed JSON, hallucinated file paths, and incomplete code. The retry loop helps but doesn't eliminate this.
- **No context from existing code:** The current MVP doesn't feed existing project files to the Coder agent — it generates code from the task description alone. This limits quality on brownfield projects.
- **Copilot CLI integration is shallow:** Currently limited to `suggest` and `explain`. Deeper integration (e.g., `gh copilot commit`, context injection) is future work.

### Risks

- **JSON parsing fragility:** If models fail to produce valid JSON after retries, the run halts. Mitigation: the `_extract_json` helper strips markdown fences, and the `generate_json` method retries with a "respond only with JSON" nudge.
- **Model availability:** Users must pull the correct Ollama models before running. Mitigation: the CLI checks Ollama availability at startup and reports which models are loaded.
- **Scope creep:** The system is an experiment, not a product. Keeping it simple (< 30 files, < 2000 LOC) is a feature.

## Research Questions This Enables

1. **Context budget:** How much context can you pass between agents before quality degrades?
2. **Copilot's value-add:** For which tasks does Copilot CLI add something local models can't?
3. **Retry economics:** At what rejection rate does the system become impractical?
4. **Planning granularity:** Fine-grained tasks (one function) vs coarse (one feature) — which works better?
5. **The escalation boundary:** At what complexity do 7B models fail and need escalation to larger models or human review?
