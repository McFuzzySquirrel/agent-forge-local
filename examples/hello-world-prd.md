# Example PRD: Hello World CLI Tool
#
# Use this to test the agent-forge-local pipeline:
#   agent-forge-local examples/hello-world-prd.md -d /tmp/hello-project -v

## Overview

Build a simple Python command-line tool called `greeter` that greets the user.

## Requirements

1. The tool must accept a `--name` argument (default: "World").
2. Running `python greeter.py --name Alice` prints `Hello, Alice!`.
3. Running `python greeter.py` prints `Hello, World!`.
4. The tool must have a `main()` function as an entry point.
5. Include a basic test file (`test_greeter.py`) that verifies both cases.

## Technical Constraints

- Python 3.11+
- Use `argparse` for argument parsing
- No external dependencies

## Files

- `greeter.py` — the CLI tool
- `test_greeter.py` — tests
