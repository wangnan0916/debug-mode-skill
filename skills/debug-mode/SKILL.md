---
name: debug-mode
description: Diagnose one reproducible runtime bug with temporary probes, NDJSON evidence, manual checkpoints, and mechanical cleanup.
disable-model-invocation: true
compatibility: The collector and summary scripts require Node.js 24 or a later version. The interactive Pi chooser is optional. Other Agent Skills clients use the plain-text fallback for the checkpoint.
---

# Cursor-like Debug Mode

Run this evidence loop:

```text
frame -> hypothesize -> arm -> instrument -> reproduce -> prove -> fix -> verify -> clean
```

Reproduction and verification are gates. Cross them only through the checkpoint protocol.

## 1. Frame the Bug

Read the relevant code, reproduction details, existing logs, and recent changes.
Write a Bug Card with these fields:

- Symptom
- Expected behavior
- Exact trigger, route, command, input, or fixture
- Browser, operating system, runtime, branch, flags, account, and dataset
- Frequency: constant, intermittent, or unknown
- Relevant recent changes and existing evidence
- Observable acceptance criterion

Reuse facts from the user's report. Ask only for missing facts that block targeted probes.

**Complete when:** the manual trigger is exact, and the acceptance criterion is observable.

## 2. Build the Hypothesis Matrix

Write two to five ranked hypotheses before adding probes. Use this shape:

```text
H1 <short cause>
Prediction: <runtime state, path, or timing>
Probe: <event names and code locations>
CONFIRMED when: <specific record condition>
REJECTED when: <specific record condition>
```

A hypothesis without a concrete prediction requires more code reading. Prefer probes that separate multiple hypotheses.

**Complete when:** every hypothesis has falsifiable confirmation and rejection conditions. Every hypothesis also has a distinguishing planned probe.

## 3. Arm the Collector

Read [`references/collector.md`](references/collector.md) before running any collector command.
Start or reuse the collector through its safe wrapper. Capture all five printed collector values.

**Complete when:** `DEBUG_URL`, `SESSION_ID`, `LOG_DIR`, `LOG_FILE`, and `HEALTH_URL` are known.

## 4. Instrument the Boundaries

Read [`references/probes.md`](references/probes.md) before editing instrumentation.
Add three to eight probes at boundaries that distinguish the live hypotheses.
Use `runId: "pre-fix"` and the collector's session.
Wrap every helper and probe in the exact region markers.
Inspect every payload field against the privacy allowlist.

Send events to `DEBUG_URL + "/log"`. Runtime standard output stays unchanged.

**Complete when:** every live hypothesis has a distinguishing probe. Every probe is marked, session-correct, low-volume, and privacy-reviewed.

## 5. Cross the Reproduction Gate

Read [`references/checkpoints.md`](references/checkpoints.md) before presenting the pre-fix checkpoint.
Execute the pre-fix protocol exactly. Then wait and route the result through its state table.

**Complete when:** a valid `A`, `B`, or `C` result has been routed by phase.

## 6. Prove the Cause

After pre-fix `A`, summarize the log before editing product code:

```bash
node <skill-dir>/scripts/summarize-log.mjs <LOG_FILE> --expect-probe <probe_name>
```

Repeat `--expect-probe` for every expected event. Inspect raw NDJSON wherever the summary loses ordering or detail.
Classify every hypothesis as `CONFIRMED`, `REJECTED`, or `INCONCLUSIVE`.
Write the evidence report in this shape:

```text
H1 <short cause>
Status: CONFIRMED
Evidence: <specific events and values>

H2 <short cause>
Status: REJECTED
Evidence: <specific events and values>

Acceptance: <one observable sentence>
Next action: <smallest correction for the confirmed cause>
```

Missing expected probes block confirmation. If every result is rejected or inconclusive, return to Step 2 with narrower hypotheses.

**Complete when:** current-run records confirm a cause that explains the symptom. The acceptance criterion is stated in one sentence.

## 7. Make the Evidence-Bound Fix

Make the smallest change that addresses the confirmed cause. Keep every probe active.
Change probe events to `runId: "post-fix"`. Add a focused regression test when the behavior is automatable.

**Complete when:** each product edit traces to the confirmed cause. Post-fix events and the acceptance check are ready.

## 8. Cross the Verification Gate

Present the post-fix checkpoint from [`references/checkpoints.md`](references/checkpoints.md).
Then wait and route the result through its state table.

**Complete when:** the user returns post-fix `B` for the stated acceptance criterion.

## 9. Clean Mechanically

Remove every paired region marked `DEBUG_MODE_PROBE <session_id>`.
Search for the session ID, `DEBUG_MODE_PROBE`, and both region marker forms.
Remove copied helpers and other temporary instrumentation.
Delete `LOG_FILE` by default. Retain it when the user requests local evidence.
Keep the shared collector running. Stop it upon explicit user request.
Run the relevant checks and inspect the final diff.

**Complete when:** marker and session searches return zero repository matches. Checks pass, evidence is handled, and only product changes remain.

## Exception Branch

Read [`references/troubleshooting.md`](references/troubleshooting.md) only when collection, reproduction, or browser delivery fails.
