"""Orchestrator — drives the full PRD → Plan → Code → Execute → Validate loop."""

from __future__ import annotations

import logging
from pathlib import Path

from agent_forge_local.agents.coder import CoderAgent
from agent_forge_local.agents.executor import ExecutorAgent
from agent_forge_local.agents.planner import PlannerAgent
from agent_forge_local.agents.validator import ValidatorAgent
from agent_forge_local.clients.copilot import CopilotCLI
from agent_forge_local.clients.ejs import EjsClient
from agent_forge_local.clients.ollama import OllamaClient
from agent_forge_local.config import Config
from agent_forge_local.models.context import SharedContext
from agent_forge_local.models.tasks import (
    PlannedTask,
    TaskPlan,
    ValidationVerdict,
)

logger = logging.getLogger(__name__)

_FILE_CONTENT_PREVIEW_LIMIT = 3000


class Orchestrator:
    """Coordinates the local agent swarm through the full build loop.

    Flow::

        PRD text
          → Planner  (local model)   → TaskPlan
          → for each task:
              Coder    (local model) → CodeOutput
              Executor (Copilot CLI / direct) → ExecutionResult
              Validator(local model) → ValidationResult
              retry if FAIL (up to max_retries)
          → summary
    """

    def __init__(self, config: Config) -> None:
        self.config = config

        # Clients
        self.ollama = OllamaClient(
            base_url=config.ollama.base_url,
            timeout=config.ollama.timeout,
        )

        # Agents are created lazily per-run so the working_directory can vary
        self._copilot: CopilotCLI | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run(self, prd_text: str, working_directory: str) -> SharedContext:
        """Execute the full loop and return the final shared context."""
        ctx = SharedContext(prd_text=prd_text, working_directory=working_directory)
        ctx.log("Orchestrator started")

        # Instantiate agents
        planner = PlannerAgent(self.config.models.planner, self.ollama)
        coder = CoderAgent(self.config.models.coder, self.ollama)
        copilot = CopilotCLI(working_directory)
        executor = ExecutorAgent(self.config.models.executor, self.ollama, copilot)
        validator = ValidatorAgent(self.config.models.validator, self.ollama)

        # ----- Load EJS context (persistent project memory) -----
        ejs_client: EjsClient | None = None
        if self.config.ejs.enabled:
            ejs_client = EjsClient(
                working_directory,
                db_name=self.config.ejs.db_name,
                context_limit=self.config.ejs.context_limit,
            )
            if ejs_client.db_exists:
                ejs_summary = ejs_client.summary()
                if ejs_summary:
                    ctx.ejs_context = ejs_summary
                    ctx.log(
                        f"EJS context loaded ({len(ejs_summary)} chars "
                        f"from {self.config.ejs.db_name})"
                    )
                    logger.info(
                        "EJS context loaded: %d chars from %s",
                        len(ejs_summary),
                        self.config.ejs.db_name,
                    )
                else:
                    ctx.log("EJS database found but contains no data")
                    logger.info("EJS database found but contains no data")
            else:
                ctx.log("No EJS database found — running without project history context")
                logger.info("No EJS database at %s", ejs_client._db_path)

        # ----- Phase 1: Plan -----
        ctx.log("Phase 1 — Planning")
        logger.info("Phase 1: Planning …")
        plan = await planner.run(prd_text=prd_text)
        ctx.plan = plan
        ctx.log(f"Plan created: {len(plan.tasks)} tasks")
        logger.info("Plan: %d tasks — %s", len(plan.tasks), plan.goal)

        # ----- Phase 2: Execute tasks -----
        ctx.log("Phase 2 — Executing tasks")
        for task in self._execution_order(plan):
            await self._execute_task(ctx, task, coder, executor, validator, ejs_client)

        # ----- Cleanup -----
        if ejs_client is not None:
            ejs_client.close()

        # ----- Summary -----
        passed = sum(
            1
            for ts in ctx.task_states.values()
            if ts.validation and ts.validation.verdict == ValidationVerdict.PASS
        )
        total = len(plan.tasks)
        ctx.log(f"Run complete: {passed}/{total} tasks passed")
        logger.info("Done — %d/%d tasks passed", passed, total)

        return ctx

    # ------------------------------------------------------------------
    # Task execution
    # ------------------------------------------------------------------

    async def _execute_task(
        self,
        ctx: SharedContext,
        task: PlannedTask,
        coder: CoderAgent,
        executor: ExecutorAgent,
        validator: ValidatorAgent,
        ejs_client: EjsClient | None = None,
    ) -> None:
        """Run the Code → Execute → Validate loop for a single task."""
        max_retries = self.config.orchestrator.max_retries
        state = ctx.get_task_state(task.id)
        total_attempts = max_retries + 1  # 1 initial attempt + max_retries

        # Build EJS context for this specific task
        existing_context = ""
        if ejs_client is not None:
            existing_context = ejs_client.context_for_task(task.title, task.description)
            if existing_context:
                logger.debug(
                    "[%s] EJS context: %d chars for task '%s'",
                    task.id,
                    len(existing_context),
                    task.title,
                )

        for attempt in range(1, total_attempts + 1):
            state.attempts = attempt
            ctx.log(f"Task {task.id} attempt {attempt}: coding …")
            logger.info("[%s] attempt %d — coding", task.id, attempt)

            # Code
            code = await coder.run(
                task_id=task.id,
                task_title=task.title,
                task_description=task.description,
                target_files=task.files,
                existing_context=existing_context,
            )
            state.code = code

            # Execute
            ctx.log(f"Task {task.id} attempt {attempt}: executing …")
            logger.info("[%s] attempt %d — executing", task.id, attempt)
            execution = await executor.run(
                code=code,
                working_directory=ctx.working_directory,
            )
            state.execution = execution

            # Read back written files for validation
            file_contents: dict[str, str] = {}
            for rel_path in execution.files_written:
                abs_path = Path(ctx.working_directory) / rel_path
                if abs_path.is_file():
                    try:
                        file_contents[rel_path] = abs_path.read_text(encoding="utf-8")[
                            :_FILE_CONTENT_PREVIEW_LIMIT
                        ]
                    except Exception:
                        file_contents[rel_path] = "<read error>"

            # Validate
            ctx.log(f"Task {task.id} attempt {attempt}: validating …")
            logger.info("[%s] attempt %d — validating", task.id, attempt)
            validation = await validator.run(
                task=task,
                execution=execution,
                file_contents=file_contents,
            )
            state.validation = validation

            if validation.verdict == ValidationVerdict.PASS:
                ctx.log(f"Task {task.id} ✅ passed on attempt {attempt}")
                logger.info("[%s] ✅ passed", task.id)
                return

            if validation.verdict == ValidationVerdict.FAIL and attempt <= max_retries:
                ctx.log(
                    f"Task {task.id} ❌ failed (attempt {attempt}): {', '.join(validation.issues)}"
                )
                logger.warning(
                    "[%s] ❌ failed — retrying (%d/%d). Issues: %s",
                    task.id,
                    attempt,
                    max_retries,
                    validation.issues,
                )
                continue

            # Final failure or needs_review
            symbol = "❌" if validation.verdict == ValidationVerdict.FAIL else "⚠️"
            ctx.log(
                f"Task {task.id} {symbol} {validation.verdict.value} after {attempt} attempt(s)"
            )
            logger.warning("[%s] %s %s", task.id, symbol, validation.verdict.value)

            if not self.config.orchestrator.continue_on_failure:
                ctx.log("Stopping — continue_on_failure is False")
                return

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _execution_order(plan: TaskPlan) -> list[PlannedTask]:
        """Return tasks in dependency-respecting order (simple topological sort)."""
        done: set[str] = set()
        ordered: list[PlannedTask] = []
        remaining = list(plan.tasks)

        # Guard against infinite loops from bad dependency data
        max_iterations = len(remaining) * len(remaining) + 1
        iterations = 0

        while remaining:
            iterations += 1
            if iterations > max_iterations:
                # Add all remaining tasks in their original order
                ordered.extend(remaining)
                break

            progress = False
            next_remaining: list[PlannedTask] = []
            for task in remaining:
                if all(dep in done for dep in task.depends_on):
                    ordered.append(task)
                    done.add(task.id)
                    progress = True
                else:
                    next_remaining.append(task)
            remaining = next_remaining

            if not progress:
                # Circular dependency — just add remaining in order
                ordered.extend(remaining)
                break

        return ordered
