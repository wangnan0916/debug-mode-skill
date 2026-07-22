# Manual Checkpoints

Read this reference at each reproduction or verification gate.
Checkpoint answers are protocol messages rather than progress summaries.
A checkpoint response contains one interactive tool call or one exact fallback template.

## Interactive Path

When `cursor_like_debug_mode_checkpoint` is available, call it as the response's only tool.
Pass the real `phase`, `session`, `logFile`, and `debugEndpoint` values.
Use `pre-fix` for reproduction and `post-fix` for verification.

The chooser presents exactly these options:

```text
A - Reproduced
B - Fixed
C - Other: enter details
```

Option `C` opens a free-form editor. Treat its submitted text as the checkpoint evidence.
A `cancelled` or `ui_unavailable` result switches to the applicable fallback template.

## Plain-Text Path

Use plain text when the interactive tool is absent, cancelled, or unavailable.
Send exactly the applicable template. Then wait for a typed reply.

### Pre-Fix Template

```text
I added debug-mode probes.
The collector writes to these locations:

- Session: <session_id>
- Log file: <LOG_FILE>
- Debug endpoint: <DEBUG_URL>/log

Reproduce the bug manually. Then, select one option:

A - Reproduced
B - Fixed
C - Other: describe what happened
```

### Post-Fix Template

```text
I kept the debug-mode probes active for post-fix verification.
The collector writes to these locations:

- Session: <session_id>
- Log file: <LOG_FILE>
- Debug endpoint: <DEBUG_URL>/log

Verify the original bug manually. Then, select one option:

A - Reproduced
B - Fixed
C - Other: describe what happened
```

The user can request another language. Preserve every field, field order, and option when translating.

## State Table

| Phase | Result | Route |
| --- | --- | --- |
| Pre-fix | `A` | Read current NDJSON evidence and classify every hypothesis. |
| Pre-fix | `B` | Record that probes changed reproduction. Request a narrower trigger or clarification. |
| Pre-fix | `C` | Use the supplied details to adjust the trigger, hypotheses, or probes. |
| Post-fix | `A` | Read post-fix evidence. Return to narrower hypotheses or probes. |
| Post-fix | `B` | Accept the stated criterion and begin mechanical cleanup. |
| Post-fix | `C` | Use the supplied details to adjust verification, hypotheses, or probes. |
