import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const skillDir = path.join(repoRoot, "skills", "debug-mode");
const skillPath = path.join(skillDir, "SKILL.md");
const skill = await readFile(skillPath, "utf8");
const collector = await readFile(path.join(skillDir, "references", "collector.md"), "utf8");
const checkpoints = await readFile(path.join(skillDir, "references", "checkpoints.md"), "utf8");
const probes = await readFile(path.join(skillDir, "references", "probes.md"), "utf8");
const troubleshooting = await readFile(
  path.join(skillDir, "references", "troubleshooting.md"),
  "utf8",
);

assert.equal(packageJson.name, "cursor-like-debug-mode");
assert.deepEqual(packageJson.pi.skills, ["./skills"]);
assert.deepEqual(packageJson.pi.extensions, ["./extensions/cursor-like-debug-mode.ts"]);
assert.ok(packageJson.pi.extensions.every((entry) => !entry.startsWith("./skills/")));

assert.match(skill, /^---\nname: debug-mode\n/m);
assert.match(skill, /^disable-model-invocation: true$/m);
assert.equal(path.basename(path.dirname(skillPath)), "debug-mode");
assert.match(skill, /^compatibility: The collector and summary scripts require Node\.js 24/m);
assert.match(skill, /\(references\/collector\.md\)/);
assert.match(skill, /\(references\/checkpoints\.md\)/);
assert.match(skill, /\(references\/probes\.md\)/);
assert.match(skill, /\(references\/troubleshooting\.md\)/);
assert.match(collector, /node <skill-dir>\/scripts\/start-collector\.mjs --session <session_id>/);
assert.match(probes, /#region DEBUG_MODE_PROBE <session_id>/);
assert.match(checkpoints, /When `cursor_like_debug_mode_checkpoint` is available/);
assert.match(checkpoints, /Use plain text when the interactive tool is absent, cancelled, or unavailable\./);
assert.match(checkpoints, /A - Reproduced\nB - Fixed\nC - Other: describe what happened/);
assert.match(troubleshooting, /Read only the branch matching the observed collection failure\./);

console.log("distribution compatibility tests passed");
