import assert from "node:assert/strict";

import cursorLikeDebugMode from "../extensions/cursor-like-debug-mode.ts";
import {
  checkpointCodeFromChoice,
  CURSOR_LIKE_DEBUG_MODE_CHOICES,
  CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST,
  formatCheckpointAnswer,
} from "../extensions/cursor-like-debug-mode-choice.mjs";

assert.deepEqual(CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST, [
  "A - Reproduced",
  "B - Fixed",
  "C - Other: enter details",
]);
assert.equal(CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST.length, 3);

for (const code of ["A", "B", "C"]) {
  assert.equal(checkpointCodeFromChoice(CURSOR_LIKE_DEBUG_MODE_CHOICES[code]), code);
}
assert.equal(checkpointCodeFromChoice("D - Unknown"), undefined);

assert.deepEqual(JSON.parse(formatCheckpointAnswer("A")), {
  selection: "A",
  meaning: "Reproduced",
});
assert.deepEqual(JSON.parse(formatCheckpointAnswer("B")), {
  selection: "B",
  meaning: "Fixed",
});
assert.deepEqual(JSON.parse(formatCheckpointAnswer("C", "The UI froze after Save.")), {
  selection: "C",
  meaning: "Other",
  text: "The UI froze after Save.",
});

let checkpointTool;
let commandName;
let commandDefinition;
const sentMessages = [];
cursorLikeDebugMode({
  registerCommand(name, definition) {
    commandName = name;
    commandDefinition = definition;
  },
  registerTool(tool) {
    checkpointTool = tool;
  },
  sendUserMessage(content, options) {
    sentMessages.push({ content, options });
  },
});

assert.equal(commandName, "cursor-like-debug-mode");
assert.equal(commandDefinition.description, "Start Cursor-like Debug Mode for a runtime bug");
await commandDefinition.handler("Alias unit test bug", { isIdle: () => true });
assert.match(sentMessages[0].content, /^<skill name="debug-mode" location="[^"]+SKILL\.md">/);
assert.match(sentMessages[0].content, /# Cursor-like Debug Mode/);
assert.match(sentMessages[0].content, /Alias unit test bug$/);
assert.equal(sentMessages[0].content.includes("description: This opt-in workflow"), false);
assert.equal(sentMessages[0].options, undefined);

await commandDefinition.handler("", { isIdle: () => false });
assert.match(sentMessages[1].content, /Start Cursor-like Debug Mode\.$/);
assert.doesNotMatch(sentMessages[1].content, /Bug Intake/);
assert.deepEqual(sentMessages[1].options, { deliverAs: "steer" });

assert.equal(checkpointTool.name, "cursor_like_debug_mode_checkpoint");
assert.equal(checkpointTool.label, "Cursor-like Debug Mode");
assert.equal(checkpointTool.executionMode, "sequential");
assert.deepEqual(checkpointTool.parameters.properties.phase.enum, ["pre-fix", "post-fix"]);

const params = {
  phase: "pre-fix",
  session: "session-1",
  logFile: "/tmp/debug.ndjson",
  debugEndpoint: "http://127.0.0.1:1234/log",
};

function contextWith({ choices, editorValues = [] }) {
  const selectCalls = [];
  const editorCalls = [];
  const notifications = [];
  const pendingChoices = [...choices];
  const pendingEditorValues = [...editorValues];

  return {
    selectCalls,
    editorCalls,
    notifications,
    ctx: {
      hasUI: true,
      ui: {
        async select(title, options) {
          selectCalls.push({ title, options });
          return pendingChoices.shift();
        },
        async editor(title, initialValue) {
          editorCalls.push({ title, initialValue });
          return pendingEditorValues.shift();
        },
        notify(message, level) {
          notifications.push({ message, level });
        },
      },
    },
  };
}

const answerA = contextWith({ choices: [CURSOR_LIKE_DEBUG_MODE_CHOICES.A] });
const resultA = await checkpointTool.execute("call-a", params, undefined, undefined, answerA.ctx);
assert.equal(resultA.details.selection, "A");
assert.equal(answerA.editorCalls.length, 0);
assert.deepEqual(answerA.selectCalls[0].options, CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST);
assert.match(answerA.selectCalls[0].title, /^Cursor-like Debug Mode/m);

const answerC = contextWith({
  choices: [CURSOR_LIKE_DEBUG_MODE_CHOICES.C],
  editorValues: ["  The UI froze after Save.  "],
});
const resultC = await checkpointTool.execute("call-c", params, undefined, undefined, answerC.ctx);
assert.deepEqual(resultC.details, {
  ...params,
  cancelled: false,
  selection: "C",
  text: "The UI froze after Save.",
});
assert.equal(answerC.editorCalls.length, 1);
assert.deepEqual(JSON.parse(resultC.content[0].text), {
  selection: "C",
  meaning: "Other",
  text: "The UI froze after Save.",
});

const blankThenText = contextWith({
  choices: [CURSOR_LIKE_DEBUG_MODE_CHOICES.C],
  editorValues: ["   ", "More details"],
});
const resultAfterBlank = await checkpointTool.execute(
  "call-c-blank",
  params,
  undefined,
  undefined,
  blankThenText.ctx,
);
assert.equal(resultAfterBlank.details.text, "More details");
assert.equal(blankThenText.notifications.length, 1);
assert.equal(blankThenText.notifications[0].level, "warning");

const cancelCThenB = contextWith({
  choices: [CURSOR_LIKE_DEBUG_MODE_CHOICES.C, CURSOR_LIKE_DEBUG_MODE_CHOICES.B],
  editorValues: [undefined],
});
const resultB = await checkpointTool.execute("call-b", params, undefined, undefined, cancelCThenB.ctx);
assert.equal(resultB.details.selection, "B");
assert.equal(cancelCThenB.selectCalls.length, 2);

const noUiResult = await checkpointTool.execute("call-no-ui", params, undefined, undefined, {
  hasUI: false,
});
assert.equal(noUiResult.details.cancelled, true);
assert.equal(noUiResult.details.reason, "ui_unavailable");

console.log("Cursor-like Debug Mode choice tests passed");
