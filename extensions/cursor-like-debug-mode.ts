import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
	checkpointCodeFromChoice,
	CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST,
	formatCheckpointAnswer,
} from "./cursor-like-debug-mode-choice.mjs";

const TOOL_NAME = "cursor_like_debug_mode_checkpoint";
const COMMAND_NAME = "cursor-like-debug-mode";
const EXTENSION_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = resolve(EXTENSION_DIR, "../skills/debug-mode/SKILL.md");

const CheckpointParams = {
	type: "object",
	additionalProperties: false,
	required: ["phase", "session", "logFile", "debugEndpoint"],
	properties: {
		phase: {
			type: "string",
			enum: ["pre-fix", "post-fix"],
			description: "The checkpoint phase. Use pre-fix for bug reproduction and post-fix for verification.",
		},
		session: { type: "string", description: "Debug-mode collector session ID." },
		logFile: { type: "string", description: "NDJSON log file that the collector writes." },
		debugEndpoint: { type: "string", description: "Collector POST /log endpoint." },
	},
} as const;

type CheckpointParamsValue = {
	phase: "pre-fix" | "post-fix";
	session: string;
	logFile: string;
	debugEndpoint: string;
};

type CheckpointSelection = "A" | "B" | "C";

function unavailableResult(params: CheckpointParamsValue, reason: "cancelled" | "ui_unavailable") {
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(
					{
						cancelled: true,
						reason,
						instruction: "Show the plain-text checkpoint with A, B, and C. Wait for the user's reply.",
					},
					null,
					2,
				),
			},
		],
		details: { ...params, cancelled: true, reason },
	};
}

function answeredResult(params: CheckpointParamsValue, selection: CheckpointSelection, text?: string) {
	return {
		content: [{ type: "text" as const, text: formatCheckpointAnswer(selection, text) }],
		details: { ...params, cancelled: false, selection, ...(selection === "C" ? { text } : {}) },
	};
}

function stripFrontmatter(source: string) {
	return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
}

function buildSkillPrompt(args: string) {
	const body = stripFrontmatter(readFileSync(SKILL_PATH, "utf8"));
	const request =
		args.trim() || "Start Cursor-like Debug Mode. Ask for the missing Bug Intake information.";
	return `<skill name="debug-mode" location="${SKILL_PATH}">\nReferences are relative to ${dirname(SKILL_PATH)}.\n\n${body}\n</skill>\n\n${request}`;
}

export default function cursorLikeDebugMode(pi: ExtensionAPI) {
	pi.registerCommand(COMMAND_NAME, {
		description: "Start Cursor-like Debug Mode for a runtime bug",
		handler: async (args, ctx) => {
			pi.sendUserMessage(buildSkillPrompt(args), ctx.isIdle() ? undefined : { deliverAs: "steer" });
		},
	});

	pi.registerTool({
		name: TOOL_NAME,
		label: "Cursor-like Debug Mode",
		description:
			"Show the Cursor-like Debug Mode checkpoint. The chooser has exactly A, B, and C. Option C opens a free-form editor. Use this tool only when the debug-mode skill is active.",
		promptSnippet: "Show an interactive Cursor-like Debug Mode checkpoint with A, B, and C",
		promptGuidelines: [
			"Use cursor_like_debug_mode_checkpoint at a manual checkpoint for the debug-mode skill. Call it only if the tool is available. Make it the only tool call in that assistant response. Do not ask the user to type A, B, or C.",
		],
		parameters: CheckpointParams,
		executionMode: "sequential",

		async execute(_toolCallId, params: CheckpointParamsValue, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) return unavailableResult(params, "ui_unavailable");

			const action = params.phase === "pre-fix" ? "reproduce the bug" : "verify the original bug";
			const title = [
				"Cursor-like Debug Mode",
				`Please ${action} manually, then choose the result.`,
				`Session: ${params.session}`,
				`Log file: ${params.logFile}`,
				`Debug endpoint: ${params.debugEndpoint}`,
			].join("\n");

			while (true) {
				const choice = await ctx.ui.select(title, [...CURSOR_LIKE_DEBUG_MODE_CHOICE_LIST]);
				if (!choice) return unavailableResult(params, "cancelled");

				const selection = checkpointCodeFromChoice(choice) as CheckpointSelection | undefined;
				if (!selection) return unavailableResult(params, "cancelled");
				if (selection !== "C") return answeredResult(params, selection);

				while (true) {
					const customText = await ctx.ui.editor("Cursor-like Debug Mode — C: Other", "");
					if (customText === undefined) break;

					const text = customText.trim();
					if (text) return answeredResult(params, "C", text);
					ctx.ui.notify("Enter text for option C. Press Esc to return to A, B, and C.", "warning");
				}
			}
		},
	});
}
