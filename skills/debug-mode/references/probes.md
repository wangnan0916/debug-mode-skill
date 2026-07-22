# Probe Design

Read this reference before adding temporary instrumentation.

## Discriminating Events

Place low-volume events at boundaries between live hypotheses.
Prefer one event that can confirm one hypothesis while rejecting another.
Record state transitions instead of every high-frequency call. Sampling is acceptable when transitions remain visible.

Use this event shape:

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

Keep `probe` names stable across pre-fix and post-fix runs.
Use `runId: "pre-fix"` before the fix and `runId: "post-fix"` after it.
Send events to `<DEBUG_URL>/log` rather than product output streams.

## Privacy Allowlist

Build `vars` from explicit, diagnosis-relevant fields.
Use redacted identifiers when identity is necessary.

Probe payloads exclude these values:

- Secrets, tokens, cookies, authorization headers, and API keys
- Raw requests or responses that can contain private data
- Personal data unrelated to the hypothesis

## Mechanical Regions

Wrap every temporary helper and probe with the exact session marker:

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

Use the file's native comment syntax outside JavaScript.
Preserve the exact text `DEBUG_MODE_PROBE <session_id>` in both markers.

## Runtime Helpers

For browser or frontend JavaScript, copy [`../assets/browser-log-helper.js`](../assets/browser-log-helper.js).
For Node.js or server JavaScript, copy [`../assets/node-log-helper.js`](../assets/node-log-helper.js).
Replace `<session_id>` and `<DEBUG_URL>`. Keep the helper name `debugModeLog`.

For another runtime, write the smallest local probe beside the instrumented boundary.
Follow the event shape and collector contract.
Probe failures must leave product behavior unchanged.
