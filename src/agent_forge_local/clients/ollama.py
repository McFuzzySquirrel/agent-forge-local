"""Ollama HTTP client — talks to a local Ollama server for LLM inference."""

from __future__ import annotations

import json
import logging

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_BASE_URL = "http://localhost:11434"


class OllamaClient:
    """Thin async wrapper around the Ollama REST API.

    Usage::

        client = OllamaClient()
        response = await client.generate("llama3.3:8b", "Plan this project …")
    """

    def __init__(self, base_url: str = _DEFAULT_BASE_URL, timeout: float = 120.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate(
        self,
        model: str,
        prompt: str,
        *,
        system: str = "",
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """Send a single-turn generation request and return the full response text."""
        payload: dict = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if system:
            payload["system"] = system

        logger.debug("ollama generate  model=%s  prompt_len=%d", model, len(prompt))

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(f"{self._base_url}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()

        text: str = data.get("response", "")
        logger.debug("ollama response   model=%s  resp_len=%d", model, len(text))
        return text

    async def chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """Send a multi-turn chat request and return the assistant reply."""
        payload: dict = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        logger.debug("ollama chat  model=%s  turns=%d", model, len(messages))

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(f"{self._base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()

        text: str = data.get("message", {}).get("content", "")
        logger.debug("ollama chat response  model=%s  resp_len=%d", model, len(text))
        return text

    async def is_available(self) -> bool:
        """Check whether the Ollama server is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self._base_url}/api/tags")
                return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def list_models(self) -> list[str]:
        """Return names of models currently available in Ollama."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self._base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
        return [m["name"] for m in data.get("models", [])]

    # ------------------------------------------------------------------
    # JSON helpers
    # ------------------------------------------------------------------

    async def generate_json(
        self,
        model: str,
        prompt: str,
        *,
        system: str = "",
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> dict | list:
        """Generate and parse a JSON response.  Retries once on parse failure."""
        for attempt in range(2):
            raw = await self.generate(
                model,
                prompt,
                system=system,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            try:
                return json.loads(_extract_json(raw))
            except (json.JSONDecodeError, ValueError):
                if attempt == 0:
                    logger.warning("JSON parse failed, retrying with nudge …")
                    prompt = (
                        f"{prompt}\n\nIMPORTANT: respond ONLY with valid JSON, no markdown fences."
                    )
                else:
                    raise ValueError(
                        f"Model {model} failed to produce valid JSON after 2 attempts. "
                        f"Raw output:\n{raw[:500]}"
                    )
        raise AssertionError("unreachable")  # pragma: no cover


def _extract_json(text: str) -> str:
    """Strip optional markdown fences and leading/trailing whitespace."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (```json or ```)
        first_newline = text.index("\n")
        text = text[first_newline + 1 :]
        # Remove closing fence
        if text.endswith("```"):
            text = text[: -len("```")]
    return text.strip()
