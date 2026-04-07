"""Tests for configuration loading."""

import textwrap

from agent_forge_local.config import Config, load_config


class TestConfig:
    def test_defaults(self):
        cfg = Config()
        assert cfg.models.planner == "llama3.3:8b"
        assert cfg.models.coder == "qwen3:7b"
        assert cfg.models.executor == "mistral:7b"
        assert cfg.models.validator == "phi4:latest"
        assert cfg.ollama.base_url == "http://localhost:11434"
        assert cfg.orchestrator.max_retries == 2

    def test_load_missing_file(self, tmp_path):
        cfg = load_config(tmp_path / "nonexistent.yaml")
        assert cfg.models.planner == "llama3.3:8b"

    def test_load_partial_override(self, tmp_path):
        config_file = tmp_path / "config.yaml"
        config_file.write_text(
            textwrap.dedent("""\
            models:
              planner: "custom-planner:latest"
            orchestrator:
              max_retries: 5
        """)
        )
        cfg = load_config(config_file)
        assert cfg.models.planner == "custom-planner:latest"
        assert cfg.models.coder == "qwen3:7b"  # default preserved
        assert cfg.orchestrator.max_retries == 5


class TestLoadFromCwd:
    def test_auto_discover(self, tmp_path, monkeypatch):
        config_file = tmp_path / "config.yaml"
        config_file.write_text("models:\n  validator: 'tiny:latest'\n")
        monkeypatch.chdir(tmp_path)
        cfg = load_config()
        assert cfg.models.validator == "tiny:latest"
