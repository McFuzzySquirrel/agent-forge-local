"""Tests for the Ollama client helper functions."""

from agent_forge_local.clients.ollama import _extract_json


class TestExtractJson:
    def test_plain_json(self):
        assert _extract_json('{"a": 1}') == '{"a": 1}'

    def test_fenced_json(self):
        raw = '```json\n{"a": 1}\n```'
        assert _extract_json(raw) == '{"a": 1}'

    def test_fenced_no_lang(self):
        raw = "```\n[1, 2, 3]\n```"
        assert _extract_json(raw) == "[1, 2, 3]"

    def test_whitespace(self):
        assert _extract_json("  \n  {}\n  ") == "{}"
