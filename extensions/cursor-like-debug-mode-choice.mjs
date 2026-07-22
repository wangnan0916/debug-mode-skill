/** @typedef {"A" | "B" | "C"} CheckpointSelection */
/** @typedef {{ selection: CheckpointSelection, meaning: "Reproduced" | "Fixed" | "Other", text?: string }} CheckpointAnswer */

export const CURSOR_LIKE_DEBUG_MODE_CHOICES = Object.freeze({
  A: "A - Reproduced",
  B: "B - Fixed",
  C: "C - Other: enter details",
});

export const CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST = Object.freeze(
  Object.values(CURSOR_LIKE_DEBUG_MODE_CHOICES),
);

/**
 * @param {string | undefined} choice
 * @returns {CheckpointSelection | undefined}
 */
export function checkpointCodeFromChoice(choice) {
  for (const [code, label] of Object.entries(CURSOR_LIKE_DEBUG_MODE_CHOICES)) {
    if (choice === label) return /** @type {CheckpointSelection} */ (code);
  }
  return undefined;
}

/**
 * @param {CheckpointSelection} selection
 * @param {string | undefined} [text]
 */
export function formatCheckpointAnswer(selection, text) {
  /** @type {CheckpointAnswer} */
  const answer = {
    selection,
    meaning:
      selection === "A"
        ? "Reproduced"
        : selection === "B"
          ? "Fixed"
          : "Other",
  };

  if (selection === "C") answer.text = text;
  return JSON.stringify(answer, null, 2);
}
