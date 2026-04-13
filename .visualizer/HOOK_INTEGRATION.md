# Visualizer Hook Integration

This repo was bootstrapped for Copilot Agent Activity Visualizer.

## Generated Files
- .visualizer/emit-event.sh
- .visualizer/visualizer.config.json
- .visualizer/logs/events.jsonl (created on first emit)

## Emit Command
Use this in your automation/hooks:

```bash
.visualizer/emit-event.sh <eventType> '<payload-json>' <sessionId>
```

Example:

```bash
SESSION_ID="run-$(date +%s)"
.visualizer/emit-event.sh sessionStart '{}' "$SESSION_ID"
.visualizer/emit-event.sh preToolUse '{"toolName":"bash","toolArgs":{"command":"npm test"}}' "$SESSION_ID"
.visualizer/emit-event.sh postToolUse '{"toolName":"bash","status":"success","durationMs":1200}' "$SESSION_ID"
.visualizer/emit-event.sh sessionEnd '{}' "$SESSION_ID"
```

## Event Types
sessionStart, sessionEnd, userPromptSubmitted, preToolUse, postToolUse,
postToolUseFailure, subagentStart, subagentStop, agentStop, notification,
errorOccurred

## Hook Discovery
The bootstrap script scans `.github/hooks/` and its subdirectories for shell
scripts that match known lifecycle names. If your hooks live in a subfolder
(e.g. `.github/hooks/copilot/session-start.sh`) they are discovered automatically.

When a `--prefix` is used, filenames like `<prefix>-session-start.sh` are also
matched (e.g. `viz-session-start.sh` with `--prefix viz`).

## Live Viewing
1. Start the ingest service from the visualizer repo:
   npm run serve:ingest   (from /home/mcfuzzysquirrel/Projects/agent-forge-visualizer)
2. Start the web UI from the visualizer repo:
   npm run dev --workspace=packages/web-ui
3. Run your multi-agent workflow with hook emits enabled.
4. Open http://127.0.0.1:5173 to observe live activity.

## Offline / JSONL-Only Mode
If the ingest service is NOT running, emit-event.sh still writes all events to
.visualizer/logs/events.jsonl and exits cleanly — no lost events.
Start the ingest service later and replay from the JSONL file.
