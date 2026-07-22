// #region DEBUG_MODE_PROBE <session_id> node-log-helper
const DEBUG_MODE_SESSION = "<session_id>";
const DEBUG_MODE_URL = "<DEBUG_URL>/log";
const DEBUG_MODE_HTTP = process.getBuiltinModule("node:http");

const debugModeLog = (event) => {
  try {
    if (!event || typeof event !== "object" || Array.isArray(event)) return;

    const body = JSON.stringify({
      ...event,
      session: DEBUG_MODE_SESSION,
      source: "node",
    });
    const request = DEBUG_MODE_HTTP.request(
      DEBUG_MODE_URL,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      (response) => response.resume(),
    );
    request.on("error", () => {});
    request.end(body);
  } catch {
    // Debug-mode probes must never affect product behavior.
  }
};
// #endregion DEBUG_MODE_PROBE <session_id>
