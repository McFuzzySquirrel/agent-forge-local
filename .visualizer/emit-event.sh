#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: .visualizer/emit-event.sh <eventType> <payload-json> <sessionId>" >&2
  exit 1
fi

EVENT_TYPE="$1"
PAYLOAD_JSON="$2"
SESSION_ID="$3"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VISUALIZER_ROOT="/home/mcfuzzysquirrel/Projects/agent-forge-visualizer"
JSONL_PATH="$REPO_ROOT/.visualizer/logs/events.jsonl"
HTTP_ENDPOINT="${VISUALIZER_HTTP_ENDPOINT:-http://127.0.0.1:7070/events}"
STORE_PROMPTS="${VISUALIZER_STORE_PROMPTS:-false}"

npx tsx "$VISUALIZER_ROOT/scripts/emit-event-cli.ts"   --eventType "$EVENT_TYPE"   --payload "$PAYLOAD_JSON"   --sessionId "$SESSION_ID"   --repoPath "$REPO_ROOT"   --jsonlPath "$JSONL_PATH"   --httpEndpoint "$HTTP_ENDPOINT"   --storePrompts "$STORE_PROMPTS"
