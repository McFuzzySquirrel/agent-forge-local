"""Copilot CLI bridge — wraps `gh copilot` commands for programmatic use."""

from __future__ import annotations

import asyncio
import logging
import shutil

logger = logging.getLogger(__name__)


class CopilotCLI:
    """Interface to GitHub Copilot CLI (``gh copilot``).

    Copilot CLI is used for:
    - Repo-aware code explanations
    - Command suggestions
    - Applying changes within a GitHub-authenticated context

    When Copilot CLI is not available the bridge falls back to *direct mode*
    (plain file writes + shell commands), so the rest of the system still works.
    """

    def __init__(self, working_directory: str) -> None:
        self._cwd = working_directory
        self._available: bool | None = None

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------

    async def is_available(self) -> bool:
        """Check whether ``gh copilot`` is installed and authenticated."""
        if self._available is not None:
            return self._available

        if shutil.which("gh") is None:
            logger.info("gh CLI not found on PATH")
            self._available = False
            return False

        try:
            proc = await asyncio.create_subprocess_exec(
                "gh",
                "copilot",
                "--help",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self._cwd,
            )
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
            self._available = proc.returncode == 0
            if not self._available:
                logger.info("gh copilot not available: %s", stderr.decode(errors="replace"))
        except (TimeoutError, FileNotFoundError):
            self._available = False

        return self._available

    # ------------------------------------------------------------------
    # Suggest
    # ------------------------------------------------------------------

    async def suggest(self, prompt: str, *, shell: str = "bash") -> str:
        """Ask Copilot CLI to suggest a shell command.

        Returns the suggested command string, or an empty string on failure.
        """
        if not await self.is_available():
            return ""

        try:
            proc = await asyncio.create_subprocess_exec(
                "gh",
                "copilot",
                "suggest",
                "-t",
                shell,
                prompt,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self._cwd,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
            if proc.returncode == 0:
                return stdout.decode(errors="replace").strip()
            logger.warning("copilot suggest failed: %s", stderr.decode(errors="replace"))
        except TimeoutError:
            logger.warning("copilot suggest timed out")
        return ""

    # ------------------------------------------------------------------
    # Explain
    # ------------------------------------------------------------------

    async def explain(self, command: str) -> str:
        """Ask Copilot CLI to explain a command.

        Returns the explanation text, or an empty string on failure.
        """
        if not await self.is_available():
            return ""

        try:
            proc = await asyncio.create_subprocess_exec(
                "gh",
                "copilot",
                "explain",
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self._cwd,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
            if proc.returncode == 0:
                return stdout.decode(errors="replace").strip()
            logger.warning("copilot explain failed: %s", stderr.decode(errors="replace"))
        except TimeoutError:
            logger.warning("copilot explain timed out")
        return ""

    # ------------------------------------------------------------------
    # Direct execution fallback
    # ------------------------------------------------------------------

    async def run_shell(self, command: str) -> tuple[int, str, str]:
        """Execute a shell command directly in the working directory.

        Returns ``(returncode, stdout, stderr)``.
        This is the fallback when Copilot CLI is not available.
        """
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self._cwd,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        return (
            proc.returncode or 0,
            stdout.decode(errors="replace"),
            stderr.decode(errors="replace"),
        )
