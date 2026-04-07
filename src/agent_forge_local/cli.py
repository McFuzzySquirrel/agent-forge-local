"""CLI entry point — ``python -m agent_forge_local`` or ``agent-forge-local``."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from agent_forge_local.config import load_config
from agent_forge_local.orchestrator import Orchestrator


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="agent-forge-local",
        description="Run a local multi-agent swarm against a PRD",
    )
    parser.add_argument(
        "prd",
        help="Path to the PRD / task-description file (text or markdown)",
    )
    parser.add_argument(
        "-d",
        "--directory",
        default=".",
        help="Target project working directory (default: current dir)",
    )
    parser.add_argument(
        "-c",
        "--config",
        default=None,
        help="Path to config.yaml (default: ./config.yaml)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Write the run context to this JSON file when done",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="count",
        default=0,
        help="Increase logging verbosity (-v info, -vv debug)",
    )
    return parser.parse_args(argv)


def _setup_logging(verbosity: int) -> None:
    level = logging.WARNING
    if verbosity == 1:
        level = logging.INFO
    elif verbosity >= 2:
        level = logging.DEBUG

    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(name)-30s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
    )


async def _async_main(args: argparse.Namespace) -> int:
    prd_path = Path(args.prd)
    if not prd_path.is_file():
        print(f"Error: PRD file not found: {prd_path}", file=sys.stderr)
        return 1

    prd_text = prd_path.read_text(encoding="utf-8")
    working_dir = str(Path(args.directory).resolve())
    config = load_config(args.config)

    print("🔧 Agent Forge Local v0.1.0")
    print(f"📄 PRD: {prd_path}")
    print(f"📁 Working dir: {working_dir}")
    print(
        f"🧠 Models: planner={config.models.planner}  coder={config.models.coder}  "
        f"executor={config.models.executor}  validator={config.models.validator}"
    )
    print()

    orchestrator = Orchestrator(config)

    # Pre-flight check
    if not await orchestrator.ollama.is_available():
        print(
            "❌ Cannot connect to Ollama. Make sure Ollama is running (https://ollama.com).",
            file=sys.stderr,
        )
        return 1

    available_models = await orchestrator.ollama.list_models()
    print(f"✅ Ollama available — {len(available_models)} model(s) loaded")

    ctx = await orchestrator.run(prd_text, working_dir)

    # Print summary
    print("\n" + "=" * 60)
    print("📊 Run Summary")
    print("=" * 60)
    if ctx.plan:
        for task in ctx.plan.tasks:
            state = ctx.task_states.get(task.id)
            if state and state.validation:
                verdict = state.validation.verdict.value
                symbol = {"pass": "✅", "fail": "❌", "needs_review": "⚠️"}.get(verdict, "?")
                attempts = state.attempts
                print(f"  {symbol} {task.id}: {task.title} ({verdict}, {attempts} attempt(s))")
            else:
                print(f"  ⬜ {task.id}: {task.title} (not executed)")

    print()
    for entry in ctx.run_log:
        print(f"  {entry}")

    # Optionally write context to JSON
    if args.output:
        out_path = Path(args.output)
        out_path.write_text(ctx.model_dump_json(indent=2), encoding="utf-8")
        print(f"\n💾 Context saved to {out_path}")

    return 0


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)
    _setup_logging(args.verbose)
    sys.exit(asyncio.run(_async_main(args)))


if __name__ == "__main__":
    main()
