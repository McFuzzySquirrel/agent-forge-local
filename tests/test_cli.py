"""Tests for the CLI argument parsing."""

from agent_forge_local.cli import _parse_args


class TestParseArgs:
    def test_minimal(self):
        args = _parse_args(["my-prd.md"])
        assert args.prd == "my-prd.md"
        assert args.directory == "."
        assert args.config is None
        assert args.verbose == 0

    def test_full(self):
        args = _parse_args(
            [
                "docs/prd.md",
                "-d",
                "/tmp/project",
                "-c",
                "my-config.yaml",
                "-o",
                "output.json",
                "-vv",
            ]
        )
        assert args.prd == "docs/prd.md"
        assert args.directory == "/tmp/project"
        assert args.config == "my-config.yaml"
        assert args.output == "output.json"
        assert args.verbose == 2
