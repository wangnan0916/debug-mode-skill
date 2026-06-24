---
name: debug-mode
description: Opt-in, hypothesis-driven debugging workflow for reproducible runtime bugs using temporary instrumentation, structured NDJSON logs, manual reproduction, evidence-based fixes, post-fix verification, and cleanup. Use only when the user explicitly invokes debug-mode, $debug-mode, "debug mode", "instrumented debugging", or local runtime log collection. Do not auto-trigger for ordinary bug reports, failing tests, frontend/UI bugs, requests to investigate, runtime logs, or requests to add probes unless the user explicitly asks for this workflow.
---

# Debug Mode

Use this skill only after the user explicitly invokes `debug-mode`,
`$debug-mode`, `debug mode`, or instrumented debugging.

If the user did not explicitly opt in, debug normally. Mention this skill only
when temporary runtime instrumentation would materially help.

## Core Loop

Run a hypothesis-driven debugging loop:

1. Read the relevant code, repro details, and existing logs.
2. List 2-5 ranked hypotheses with IDs such as `H1`, `H2`, and `H3`.
   Each hypothesis must predict what a runtime probe will show.
3. Start or reuse the loopback collector (Collector Contract).
4. Add 3-8 targeted probes that distinguish the hypotheses. Use structured
   events sent to `DEBUG_URL + "/log"`, never stdout/stderr. Follow Event
   Shape, Region Markers, and Helpers below.
5. Stop at the manual checkpoint. Send a Checkpoint Template. Do not analyze,
   fix, or remove probes until the user replies with `A`, `B`, or `C`.
6. After `A`, inspect the printed `LOG_FILE`, classify each hypothesis as
   `CONFIRMED`, `REJECTED`, or `INCONCLUSIVE`, and make the smallest fix only
   when the logs explain the root cause. Follow Evidence Summary below.
7. Keep probes active for one post-fix run tagged with `runId: "post-fix"`.
8. After the user replies `B` to the post-fix checkpoint, remove all
   instrumentation and run relevant checks. Follow Cleanup Checklist below.

## Hard Rules

- Never skip the manual reproduction checkpoint after adding probes.
- Never fix from guesswork while this skill is active.
- Never remove probes before the user confirms the post-fix check.
- Never commit debug logs or temporary instrumentation.
- Never log secrets, tokens, cookies, authorization headers, API keys, raw
  request bodies, raw responses that may contain private data, or unnecessary
  personal data.

## Collector Contract

The bundled collector is intentionally small:

- `GET /health` checks whether an existing collector is reusable.
- `POST /log` accepts one JSON object and appends one NDJSON line before
  returning `200`, so write failures are visible to the caller.
- Different sessions write to separate files with independent queues, so writes
  can proceed in parallel across sessions.
- Logs live under the OS temp directory by default, outside the workspace.
- `--ensure` prints `DEBUG_URL`, `SESSION_ID`, `LOG_DIR`, `LOG_FILE`, and
  `HEALTH_URL`.
- `--ensure` starts or reuses one shared loopback collector. Leave it running
  across debug-mode sessions unless the user explicitly asks to stop it.
- The collector creates `LOG_FILE` on the first event. Do not `touch`,
  pre-create, truncate, or clear it after a repro.
- The collector is loopback-only. Do not bind it to `0.0.0.0` or any public
  interface.

Start or reuse the shared collector in the agent's default sandbox:

```bash
node <skill-dir>/scripts/log-server.mjs --ensure --session <session_id> --host 127.0.0.1 --port 0
```

What `--ensure` does:

1. Validates that `--host` is loopback-only (`127.0.0.1`, `localhost`, or
   `::1`) before any listener is started.
2. Resolves the state file and log directory. By default both live under the OS
   temp directory, outside the workspace.
3. Reads the state file and calls `GET /health` on the recorded loopback URL.
   If that collector is healthy, it prints the collector details and exits
   without starting a process.
4. Acquires a temp-directory startup lock, then repeats the health check to
   avoid starting duplicate collectors.
5. If no healthy collector exists, starts one detached Node process running the
   same script without `--ensure`.
6. The child process binds only to the requested loopback host and port, writes
   the state file with `pid`, `DEBUG_URL`, `HEALTH_URL`, and `LOG_DIR`, then
   serves only `GET /health`, `POST /log`, and CORS `OPTIONS`.
7. The parent polls `GET /health`, prints `DEBUG_URL`, `SESSION_ID`, `LOG_DIR`,
   `LOG_FILE`, and `HEALTH_URL`, then exits. `LOG_FILE` is still not created
   until the first accepted `POST /log` event.

`--ensure` does not write to the repository, does not bind to LAN/public
interfaces, and does not make external network calls. Its only listener is the
loopback collector, and its normal files are temp-directory state, startup log,
and NDJSON evidence files.

Do not request elevated approval preemptively. Only retry `--ensure` with the
agent's normal approval flow after a default-sandbox attempt fails with a clear
sandbox, permission, local listener, or detached-process error. Scope the
justification to starting or reusing this loopback-only debug collector.
Use this approval justification shape:

```text
Start or reuse the debug-mode loopback collector. It binds only to 127.0.0.1,
writes state/log files under the OS temp directory, does not write to the
repository, and does not make external network calls.
```

If approval is denied or the approval service disconnects, do not repeatedly
ask for the same command. Explain that local collection is blocked and either:

- ask the user to run the same `--ensure` command in their terminal, then run
  `--ensure` again to reuse the healthy collector and print the session details;
  or
- fall back only when a safe file-based probe path exists for the runtime.

## Checkpoint Templates

Checkpoint replies are protocol messages, not progress summaries. After adding
probes or after a post-fix change, send only the appropriate checkpoint
template. Do not add a list of edited files, probes, validation commands,
analysis, next-action commentary, or a narrowed instruction such as "reply A".
The checkpoint must always offer all three state-machine options: `A`, `B`, and
`C`.

Use the templates below verbatim unless the user explicitly asked for another
language. If translating, preserve the same fields, the same order, and all
three `A`/`B`/`C` options, with no extra content.

After adding probes, stop and send this shape with real session details:

```text
I added debug-mode probes and the collector is writing:

- Session: <session_id>
- Log file: <LOG_FILE>
- Debug endpoint: <DEBUG_URL>/log

Please reproduce the bug manually, then reply:

A - Reproduced
B - Fixed
C - Other; describe what happened
```

For post-fix verification, change only the opening sentence:

```text
I kept debug-mode probes active for post-fix verification and the collector is writing:

- Session: <session_id>
- Log file: <LOG_FILE>
- Debug endpoint: <DEBUG_URL>/log

Please verify the original bug manually, then reply:

A - Reproduced
B - Fixed
C - Other; describe what happened
```

Interpret checkpoint replies as a small state machine:

- `A` before a fix: read the NDJSON log, classify hypothesis evidence, then fix
  only a confirmed cause or add narrower probes.
- `A` after a fix: the bug still reproduced. Read the post-fix log and continue
  with narrower hypotheses or probes.
- `B` before a fix: not a terminal state. Treat it as evidence that the bug did
  not reproduce under instrumentation and ask for clarification or a narrower
  repro.
- `B` after a fix: remove probes and run final checks.
- `C` at any time: treat the user's text as evidence. Adjust the repro,
  hypotheses, or probes.

## Event Shape

Use structured, low-volume events. A typical event looks like:

```json
{
  "session": "<session_id>",
  "runId": "pre-fix",
  "probe": "settings.beforePersist",
  "hypothesis": "H1",
  "file": "src/settings/save.ts",
  "fn": "saveSettings",
  "vars": {
    "enabled": true,
    "userId": "redacted"
  }
}
```

Use `runId: "pre-fix"` before the fix and `runId: "post-fix"` for verification.
For high-frequency paths, log only on state changes or sample aggressively.

## Region Markers

Wrap all temporary instrumentation so cleanup can be mechanical:

```ts
// #region DEBUG_MODE_PROBE <session_id> settings-before-persist
debugModeLog({
  probe: "settings.beforePersist",
  hypothesis: "H1",
  file: "src/settings/save.ts",
  fn: "saveSettings",
  vars: { enabled, userId: "redacted" },
});
// #endregion DEBUG_MODE_PROBE <session_id>
```

For non-JavaScript files, use the file's native comment syntax around the
same `DEBUG_MODE_PROBE <session_id>` marker. The exact marker text matters for
cleanup; the comment style does not.

## Helpers

JavaScript has first-class helper templates:

- Browser or frontend JavaScript: copy `assets/browser-log-helper.js`.
- Node.js or server-side JavaScript: copy `assets/node-log-helper.js`.

After copying either helper, replace `<session_id>` and `<DEBUG_URL>`, and keep
the function name `debugModeLog`.

Do not invent reusable helpers for other runtimes while this skill is active. If
the bug requires non-JavaScript instrumentation, use the same Event Shape and
Collector Contract, but write only the smallest local probe needed there.

## Evidence Summary

After an `A` reply, summarize evidence before editing code:

```text
H1 settings state is lost before API call
Status: CONFIRMED
Evidence: settings.beforePersist logged enabled=false while the UI event logged enabled=true.

H2 API rejects the value
Status: REJECTED
Evidence: no API call happened in this repro.

Next action: fix the local state handoff between onToggle and saveSettings.
```

If every hypothesis is `REJECTED` or `INCONCLUSIVE`, generate new hypotheses
from a different subsystem and add narrower probes. Do not patch from vibes.

## Troubleshooting

- Empty log: confirm the app executed the instrumented path, the session id
  matches, and the endpoint includes `/log`.
- Browser blocked request: check mixed content, CSP `connect-src`, extension
  isolation, or content-script context.
- CORS/preflight issue: the collector handles `OPTIONS`; if it still fails, try
  `navigator.sendBeacon`, a same-origin dev-server proxy, or server-side
  instrumentation.
- Host rejected: use `127.0.0.1`, `localhost`, or `::1`; never bind to LAN or
  public interfaces.
- Sandbox blocks listener: try `--ensure` in the default sandbox first. Retry
  once with the required approval only after a clear sandbox failure, using the
  approval justification above. If approval is denied, explain that local
  collection is blocked and fall back only when a safe file-based probe path
  exists.
- Too many logs: replace noisy probes with narrower state-change probes.
- Cannot reproduce: ask for exact steps, environment, input data, or a screen
  recording; do not invent a fix.

## Cleanup Checklist

Before declaring the task done:

- Re-run the original repro or the closest available automated check.
- Remove every paired region marked `DEBUG_MODE_PROBE <session_id>`.
- Search for the session id, `DEBUG_MODE_PROBE`,
  `#region DEBUG_MODE_PROBE`, and `#endregion DEBUG_MODE_PROBE`.
- Remove the session NDJSON log at the printed `LOG_FILE`, or confirm it should
  be kept as local evidence.
- Leave the reusable loopback collector running unless the user asked to stop it.
- Keep only the product fix and any useful regression test.
