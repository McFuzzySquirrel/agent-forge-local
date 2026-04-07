# Agent Forge Local

> Can we run a local agent swarm — and treat Copilot as just another tool?

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)

**Agent Forge Local** is an experiment in multi-agent orchestration: instead of replacing the model inside Copilot (BYOK), we keep Copilot exactly as it is and build a local multi-agent system *around* it.

Local models handle planning, coding, and validation.  
Copilot CLI is called only when its strengths are needed — repo-aware edits, command execution, applying changes.

---

## The Hypothesis

> You don't need to swap the model inside Copilot if you can control **how** and **when** it's used.

This means:
- Better control over outputs
- The ability to specialise models per task
- Keeping everything mostly local
- Copilot becomes a **capability**, not the brain

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Orchestrator                     │
│         (Python — drives the full loop)           │
└──────┬───────┬────────┬────────┬─────────────────┘
       │       │        │        │
       ▼       ▼        ▼        ▼
  ┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
  │Planner │ │Coder │ │Executor│ │Validator │
  │Llama   │ │Qwen  │ │Mistral │ │Phi-4     │
  │3.3 8B  │ │3 7B  │ │7B      │ │          │
  └────┬───┘ └──┬───┘ └────┬───┘ └────┬─────┘
       │        │         │           │
       │        │    ┌────▼────┐      │
       │        │    │Copilot  │      │
       │        │    │CLI      │      │
       │        │    │(or file │      │
       │        │    │ writes) │      │
       │        │    └─────────┘      │
       │        │         │           │
       ▼        ▼         ▼           ▼
  ┌───────────────────────────────────────┐
  │          Shared Context (JSON)        │
  │  plan → code → execution → validation│
  └───────────────────────────────────────┘
```

### Agent Roles

| Agent | Default Model | Purpose |
|-------|---------------|---------|
| **Planner** | Llama 3.3 8B | Decomposes a PRD into structured, ordered tasks with dependencies |
| **Coder** | Qwen 3 7B | Generates code files for each task |
| **Executor** | Mistral 7B | Applies code via Copilot CLI (or direct file writes as fallback) |
| **Validator** | Phi-4 | Checks output against acceptance criteria; returns pass/fail/needs_review |

### Flow

```
PRD (text/markdown)
  → Planner (local)    → TaskPlan (structured JSON)
  → for each task:
      Coder (local)    → CodeOutput (file contents)
      Executor         → writes files via Copilot CLI or directly
      Validator (local)→ pass / fail / needs_review
      ↻ retry if fail (up to max_retries)
  → summary
```

---

## Prerequisites

1. **Python 3.11+**
2. **[Ollama](https://ollama.com)** running locally with your chosen models pulled:

```bash
ollama pull llama3.3:8b
ollama pull qwen3:7b
ollama pull mistral:7b
ollama pull phi4:latest
```

3. **(Optional)** [GitHub CLI](https://cli.github.com/) with Copilot extension for repo-aware execution. Without it, the system falls back to direct file writes — everything still works.

---

## Installation

```bash
git clone https://github.com/McFuzzySquirrel/agent-forge-local.git
cd agent-forge-local
pip install -e .
```

For development:
```bash
pip install -e ".[dev]"
```

---

## Quick Start

### 1. Write a PRD (or use the example)

```bash
cat examples/hello-world-prd.md
```

### 2. Run the agent swarm

```bash
# Create a target directory for the output
mkdir /tmp/hello-project

# Run it
agent-forge-local examples/hello-world-prd.md -d /tmp/hello-project -v
```

### 3. Check the results

```bash
ls /tmp/hello-project/
```

### CLI Options

```
agent-forge-local <prd-file> [options]

  -d, --directory   Target project working directory (default: .)
  -c, --config      Path to config.yaml (default: ./config.yaml)
  -o, --output      Write run context to JSON file when done
  -v                Increase verbosity (-v info, -vv debug)
```

---

## Configuration

Edit `config.yaml` to swap models or tune behavior:

```yaml
models:
  planner: "llama3.3:8b"       # Structured reasoning
  coder: "qwen3:7b"            # Code generation
  executor: "mistral:7b"       # Instruction following
  validator: "phi4:latest"     # Evaluation / pass-fail

ollama:
  base_url: "http://localhost:11434"
  timeout: 120.0

orchestrator:
  max_retries: 2
  continue_on_failure: false
```

Any model available in Ollama works. Swap freely based on your hardware:

```yaml
models:
  planner: "deepseek-r1:7b"
  coder: "codellama:13b"
  executor: "llama3.3:8b"
  validator: "gemma3:4b"
```

---

## Project Structure

```
agent-forge-local/
├── src/agent_forge_local/
│   ├── __init__.py
│   ├── __main__.py              # python -m agent_forge_local
│   ├── cli.py                   # CLI entry point & argument parsing
│   ├── config.py                # YAML config loading with defaults
│   ├── orchestrator.py          # Main loop: plan → code → execute → validate
│   ├── agents/
│   │   ├── base.py              # Abstract agent base class
│   │   ├── planner.py           # PRD → TaskPlan
│   │   ├── coder.py             # Task → CodeOutput
│   │   ├── executor.py          # CodeOutput → files on disk
│   │   └── validator.py         # Execution → pass/fail verdict
│   ├── clients/
│   │   ├── ollama.py            # Ollama HTTP client
│   │   └── copilot.py           # Copilot CLI bridge
│   └── models/
│       ├── tasks.py             # PlannedTask, CodeOutput, ValidationResult, etc.
│       └── context.py           # SharedContext — the state all agents share
├── tests/                       # Unit tests
├── examples/
│   └── hello-world-prd.md       # Example PRD to test with
├── config.yaml                  # Default configuration
├── pyproject.toml               # Package definition
└── README.md
```

---

## How It Works — In Detail

### Structured Context Passing

Agents don't pass free-form text to each other. Every handoff uses **typed Pydantic models** serialised as JSON:

- `TaskPlan` — Planner output: goal + ordered list of `PlannedTask`s with dependencies
- `CodeOutput` — Coder output: map of file paths to file contents
- `ExecutionResult` — Executor output: which files were written, stdout/stderr
- `ValidationResult` — Validator output: pass/fail/needs_review + issues + suggestions

The `SharedContext` holds everything for the run: the PRD, the plan, per-task state, and a timestamped log.

### Topological Task Ordering

The orchestrator sorts tasks by their dependency graph before execution. Diamond dependencies, linear chains, and independent tasks are all handled. Circular dependencies don't crash the system — they're detected and the tasks are included anyway.

### Retry Loop

When the Validator returns `FAIL`, the orchestrator retries the task (Coder → Executor → Validator) up to `max_retries` times. This is the core feedback loop — small models fail sometimes, and retrying with the same prompt often produces a different (better) result.

### Copilot CLI as Fallback/Enhancement

The Executor checks whether `gh copilot` is available:
- **If yes**: Uses Copilot CLI for repo-aware operations (explain, suggest)
- **If no**: Falls back to direct file writes — the system works fully offline

This means you can experiment with or without Copilot CLI installed.

---

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest -v

# Lint
ruff check src/ tests/

# Format
ruff format src/ tests/
```

---

## Research Questions

This MVP is designed to help answer:

1. **Context budget** — How much context can you pass between agents before quality degrades?
2. **Copilot's value-add** — For which tasks does Copilot CLI add something local models can't?
3. **Retry economics** — At what rejection rate does the system become impractical?
4. **Planning granularity** — Fine-grained tasks (one function) vs coarse (one feature)?
5. **The escalation boundary** — At what complexity do 7B models fail?

---

## What's Next

- [ ] Add progress file output (`docs/PROGRESS.md` compat with mcfuzzy-agent-forge)
- [ ] Support multi-phase PRDs (Phase 1, Phase 2, …)
- [ ] Add context extraction — have Copilot CLI read existing project files to feed local models
- [ ] Compare results: same PRD through mcfuzzy-agent-forge (Copilot-native) vs agent-forge-local
- [ ] Experiment log: document what works, what breaks, where small models fall short

---

## Related

- [mcfuzzy-agent-forge](https://github.com/McFuzzySquirrel/mcfuzzy-agent-forge) — The Copilot-native version: PRD → agent team → orchestrated build, all inside GitHub Copilot
- [Copilot CLI BYOK announcement](https://github.blog/changelog/2026-04-07-copilot-cli-now-supports-byok-and-local-models/) — The announcement that sparked this experiment

---

## License

MIT — see [LICENSE](LICENSE).
