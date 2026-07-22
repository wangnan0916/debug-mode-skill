# Collector Contract

Read this reference before starting or reusing the collector.

## Safe Start

Choose a session ID containing letters, digits, dots, underscores, or hyphens.
Run the wrapper in the default sandbox:

```bash
node <skill-dir>/scripts/start-collector.mjs --session <session_id>
```

The wrapper fixes host to `127.0.0.1` and port to `0`.
It also supplies `--ensure` to `log-server.mjs`.
Run the wrapper with `--session` alone. The wrapper owns `--host`, `--port`, and `--ensure`.

Capture its five output values:

```text
DEBUG_URL=<loopback origin>
SESSION_ID=<session_id>
LOG_DIR=<temporary log directory>
LOG_FILE=<session NDJSON path>
HEALTH_URL=<loopback health URL>
```

A complete user-supplied set can replace the start command. Treat that set as the active collector.

## Runtime Contract

- `GET /health` reports collector status.
- `POST /log` accepts one JSON object and appends one NDJSON line.
- `OPTIONS` supports browser preflight.
- A successful append returns HTTP `200`.
- Each session has a separate file and write queue.
- The default log directory lives under the operating-system temporary directory.
- `LOG_FILE` appears after the first accepted event.
- The shared collector can serve concurrent sessions.

The wrapper reuses healthy loopback state or starts a detached loopback child.
It writes state, startup, and evidence files outside the repository.
It makes no external network calls.

Preserve `LOG_FILE` after reproduction. Evidence analysis requires the original append history.

## Authorization Branch

Try the safe wrapper in the default sandbox first.
Request elevated approval only after a clear sandbox, permission, listener, or process error.
Use this exact justification:

```text
Start or reuse the debug-mode loopback collector.
It binds only to 127.0.0.1.
It writes state and log files in the operating-system temporary directory.
It does not write to the repository.
It does not make external network calls.
```

An approval denial or service disconnect ends the collector attempt. Send only this template with the real command:

```text
Command authorization blocks local collection for debug-mode.

Run this command in your terminal:

node <skill-dir>/scripts/start-collector.mjs --session <session_id>

Paste the printed DEBUG_URL, SESSION_ID, LOG_DIR, LOG_FILE, and HEALTH_URL.

I will wait before I add probes.
```

Wait for all five values before adding HTTP probes.
If the user cannot run the command, use an existing safe file probe path.
Otherwise, request a different reproduction path.
