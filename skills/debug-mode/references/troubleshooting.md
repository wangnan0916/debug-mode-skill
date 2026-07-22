# Troubleshooting

Read only the branch matching the observed collection failure.

## Empty Log

Confirm that the manual trigger crossed the instrumented boundary.
Confirm that event and collector session IDs match.
Confirm that the endpoint ends with `/log`.
Check expected probes with `summarize-log.mjs --expect-probe`.

## Browser Delivery

For a blocked request, inspect mixed-content rules and CSP `connect-src`.
Also inspect extension isolation and the content-script context.

For preflight failure, inspect the `OPTIONS` request first.
Then try `navigator.sendBeacon`, a same-origin proxy, or a server-side probe.

Use `127.0.0.1`, `localhost`, or `::1` when host validation fails.

## Collector Startup

Try `start-collector.mjs` in the default sandbox first.
After a clear permission or listener error, follow the authorization branch in [`collector.md`](collector.md).
An approval denial or service disconnect ends that attempt.

## Noisy Collection

Move probes closer to the disputed boundary.
Record state changes or sample at a low rate.
Keep enough events to preserve causal ordering.

## Bug Does Not Recur

Request the exact trigger, environment, input data, or a screen recording.
Use pre-fix `B` in the checkpoint state table.
Resume evidence analysis after a successful reproduction.
