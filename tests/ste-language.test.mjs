import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = path.join(repoRoot, "skills", "debug-mode");
const markdownFiles = [
  "SKILL.md",
  "references/collector.md",
  "references/checkpoints.md",
  "references/probes.md",
  "references/troubleshooting.md",
];
const sources = await Promise.all(
  markdownFiles.map(async (file) => ({
    file,
    markdown: await readFile(path.join(skillDir, file), "utf8"),
  })),
);

function naturalLanguageLines(markdown) {
  const lines = [];
  let fence;
  let breakBefore = true;

  for (const [index, line] of markdown.split("\n").entries()) {
    const marker = line.match(/^```(.*)$/);
    if (marker) {
      fence = fence === undefined ? marker[1].trim() : undefined;
      breakBefore = true;
      continue;
    }

    if (fence !== undefined && fence !== "text") {
      breakBefore = true;
      continue;
    }
    if (line === "---" || line.startsWith("#") || line.trim() === "") {
      breakBefore = true;
      continue;
    }

    lines.push({
      line: index + 1,
      text: line,
      breakBefore: breakBefore || fence === "text",
    });
    breakBefore = false;
  }

  return lines;
}

for (const { file, markdown } of sources) {
  const proseLines = naturalLanguageLines(markdown);
  for (const { line, text } of proseLines) {
    assert.equal(text.includes(";"), false, `${file}:${line} uses a semicolon`);
  }

  const units = [];
  let current;
  for (const entry of proseLines) {
    const startsUnit = entry.breakBefore || /^\s*(?:[-*]|\d+\.)\s+/.test(entry.text);
    if (startsUnit || current === undefined) {
      if (current) units.push(current);
      current = {
        line: entry.line,
        text: entry.text.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""),
      };
    } else {
      current.text += ` ${entry.text.trim()}`;
    }
  }
  if (current) units.push(current);

  for (const unit of units) {
    const withoutCode = unit.text.replace(/`[^`]+`/g, " CODE ");
    const sentences = withoutCode.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      const words = sentence.match(/\b[\w$+-]+(?:'[\w]+)?\b/g) ?? [];
      assert.ok(
        words.length <= 20,
        `${file}:${unit.line} has ${words.length} words: ${sentence.trim()}`,
      );
    }
  }

  assert.doesNotMatch(markdown, /\b(?:guesswork|repro)\b|patch from vibes/i);
}

const checkpoints = sources.find(({ file }) => file === "references/checkpoints.md").markdown;
assert.match(checkpoints, /C - Other: enter details/);
assert.match(checkpoints, /C - Other: describe what happened/);

console.log("ASD-STE100 language guardrail tests passed");
