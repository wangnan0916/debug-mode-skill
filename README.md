# Cursor-like Debug Mode

Agent-agnostic, opt-in debug mode for reproducible runtime bugs. It includes
first-class probe helpers for browser/frontend JavaScript and Node.js, while
the local collector accepts the same structured events from other runtimes.
Pi installations can also load the bundled interactive checkpoint chooser.
The `debug-mode` skill ID remains unchanged for compatibility.

Agents add temporary structured probes, collect NDJSON evidence through a
local loopback collector, wait for you to reproduce manually, fix from log proof,
verify once, then clean up.

```text
hypothesize -> instrument -> reproduce -> inspect evidence -> fix -> verify -> clean up
```

## When to Use

Use this skill only when you explicitly ask for it, for example:

- `$debug-mode` or `debug mode`
- instrumented debugging
- collection of local runtime logs with temporary probes

For ordinary bug reports, test failures, build errors, or explained issues,
agents should use the normal debug process.

The evidence loop lives in [`skills/debug-mode/SKILL.md`](skills/debug-mode/SKILL.md).
Detailed contracts load progressively from `skills/debug-mode/references/`.

## How It Works

1. The agent states ranked hypotheses and adds 3–8 targeted probes.
2. A small loopback collector receives structured events at `POST /log` and
   writes one NDJSON line per event.
3. The agent stops and asks you to reproduce the bug manually. In Pi, the
   bundled chooser presents exactly `A - Reproduced`, `B - Fixed`, and
   `C - Other: enter details`. If the user selects C, the chooser opens a
   free-form editor.
4. After you choose or type a reply, it summarizes the log, confirms or rejects
   hypotheses, states the fix acceptance criteria, makes a minimal fix, verifies
   once with probes still active, then removes all instrumentation.

Probe templates for browser or front-end JavaScript and Node.js are in
`skills/debug-mode/assets/`. Agents start collection with
`skills/debug-mode/scripts/start-collector.mjs`. The lower-level collector is
`skills/debug-mode/scripts/log-server.mjs`. The NDJSON summary script is
`skills/debug-mode/scripts/summarize-log.mjs`.

Agents run `node <skill-dir>/scripts/start-collector.mjs --session <id>`. The
wrapper fixes host to `127.0.0.1` and port to `0`, then delegates to
`log-server.mjs --ensure`. It reuses a healthy collector when available. A new
child binds only to loopback. It writes state and log files in the temporary
directory. If command authorization denies the request, the agent stops. The
agent waits for you to run the same command before it adds probes.

## Usage

### Pi package command

If you installed the Pi package, use the short command:

```text
/cursor-like-debug-mode <problem description>
```

This command loads the bundled `debug-mode` skill and starts the same workflow.
Pi also keeps its native skill command as a compatible alternative:

```text
/skill:debug-mode <problem description>
```

### Agent Skills clients

For Codex and similar clients, invoke the stable Skill ID:

```text
$debug-mode <problem description>
```

When the agent pauses for manual verification, Pi users can select A, B, or C
from the interactive chooser. If you select C, the chooser opens a text editor.
If the chooser is not available, reply with the first letter:

```text
A - Reproduced
B - Fixed
C - Other: describe what happened
```

Checkpoint wording and fallback behavior live in
[`references/checkpoints.md`](skills/debug-mode/references/checkpoints.md).
The main skill owns the evidence format and cleanup criteria.

## Naming and Compatibility

- **Project and display name:** `Cursor-like Debug Mode`.
- **Stable Agent Skills ID:** `debug-mode`. The directory remains
  `skills/debug-mode/` so existing `$debug-mode`, update, and direct-install
  workflows keep working.
- **Pi command:** `/cursor-like-debug-mode`. It loads the bundled `debug-mode`
  skill.
- **Pi tool ID:** `cursor_like_debug_mode_checkpoint`. It is optional and is
  loaded only when the repository is installed as a Pi package.
- **Other Agent Skills clients:** receive only `skills/debug-mode/`, including
  its scripts and assets. They do not receive or execute the Pi extension and
  use the plain-text checkpoint with A, B, and C.
- **Runtime:** Node.js 24+ is required only when the bundled collector or summary
  scripts run.

The repository name is `cursor-like-debug-mode`. The stable Skill ID remains
`debug-mode`.

## Install

### Pi: skill and interactive chooser

Install this repository as a Pi package to load the command, skill, and
Cursor-like Debug Mode chooser:

```bash
pi install git:github.com/wangnan0916/cursor-like-debug-mode
```

The chooser is a Pi extension and therefore runs only in Pi. In non-interactive
Pi modes, the workflow automatically uses the plain-text checkpoint with A, B,
and C.

### Other agents: skill only

Install or inspect the agent-agnostic skill with the open Agent Skills CLI:

```bash
npx skills add wangnan0916/cursor-like-debug-mode
npx skills add wangnan0916/cursor-like-debug-mode -g
npx skills add wangnan0916/cursor-like-debug-mode -a codex
npx skills add wangnan0916/cursor-like-debug-mode --list
npx skills update debug-mode
```

Use `-g` for global install, `-a codex` for a specific agent, `--list` to list
without installing, and `npx skills update debug-mode` to update later. This
installation path does not load the Pi extension.

## Layout

```text
extensions/
  cursor-like-debug-mode.ts         # Pi checkpoint tool with A, B, and C
  cursor-like-debug-mode-choice.mjs # shared option/result helpers

skills/debug-mode/
  SKILL.md                 # evidence loop and completion criteria
  agents/openai.yaml       # Codex / OpenAI skill UI metadata
  assets/
    browser-log-helper.js  # copy into frontend code
    node-log-helper.js     # copy into Node/server code
  references/
    checkpoints.md         # interactive and plain-text checkpoint protocol
    collector.md           # collector contract and authorization branch
    probes.md              # event shape, privacy, markers, and helpers
    troubleshooting.md     # failure-only branches
  scripts/
    start-collector.mjs    # safe fixed-host collector entrypoint
    log-server.mjs         # loopback NDJSON collector
    summarize-log.mjs      # local NDJSON evidence summarizer

tests/                     # Node built-in tests for chooser, collector, helpers, and summarizer
```

## Safety

- Collector binds to loopback only (`127.0.0.1`, `localhost`, or `::1`).
- `start-collector.mjs` fixes host to `127.0.0.1` and port to `0`, then delegates
  to the reusable `--ensure` collector path.
- Approval denial stops that collector command. Agents wait for collector
  details from the user or a safe fallback through a file.
- Probes must not log secrets, tokens, cookies, auth headers, or raw private
  payloads.
- Temporary instrumentation uses `DEBUG_MODE_PROBE <session_id>` region markers
  so agents can remove it mechanically.
- Debug logs are local temp evidence and should not be committed.

## Development

```bash
npm run check
npm test
```

Requires Node.js 24+. Tests use only Node.js built-ins.

## License

MIT. See [LICENSE](LICENSE).
