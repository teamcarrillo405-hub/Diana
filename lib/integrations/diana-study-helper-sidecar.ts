import { composeSystemPrompt } from "@/lib/ai/system-prompts";
import {
  createSidecarChatRequest,
  parseSidecarText,
  type LocalAiSidecarConfig,
  type LocalAiSidecarMessage,
} from "@/lib/integrations/openjarvis-sidecar";
import {
  isDianaVoiceSidecarEnabled,
  resolveDianaVoiceSidecarConfig,
} from "@/lib/integrations/diana-voice-sidecar";
import { parseStepsFromContent } from "@/lib/task-breakdown/parse";
import type { BreakdownStep } from "@/lib/task-breakdown/types";

export { isDianaVoiceSidecarEnabled as isDianaStudyHelperEnabled };
export { resolveDianaVoiceSidecarConfig as resolveDianaStudyHelperConfig };

export type StudyHelperMode = "guide" | "hint" | "quiz";

export type StudyHelperInput = {
  source: string;
  question: string;
  mode: StudyHelperMode;
};

export type StudyHelperResult = {
  title: string;
  main: string;
  reason: string;
  steps: string[];
  anchor: string;
};

export type BreakDownInput = {
  assignment: string;
};

const FALLBACK_STUDY_RESULT: StudyHelperResult = {
  title: "Guided step",
  main: "What is the first thing your source asks you to use or explain?",
  reason: "Answer that first, then Diana can help you choose the next structure.",
  steps: [
    "Point to one phrase in the source.",
    "Say what that phrase means in your words.",
    "Turn that into the first rough line of work.",
  ],
  anchor: "Add a source so Diana can anchor the next move.",
};

const STUDY_HELPER_PROMPT = [
  "You are Diana, a student homework helper. Your role is to support learning — never write homework or provide final answers.",
  "Given a source or rubric and a student question, return a JSON object with exactly these keys: title, main, reason, steps (array of 3 strings), anchor.",
  "Return ONLY the JSON object. No markdown code block. No extra prose before or after.",
  "title: short label for the mode (e.g. 'Guided step', 'Hint ladder', 'Quick check').",
  "main: one question or concrete first-step instruction, under 30 words.",
  "reason: one sentence explaining why this move keeps the work the student's own.",
  "steps: array of exactly 3 concrete moves anchored to the source.",
  "anchor: 'This help is anchored to: [first 100 chars of source]' or 'Add a source so Diana can anchor the next move.' if none.",
  "Mode guide: walk through the first concrete move using the source. Mode hint: 3 increasingly specific hints pointing to the source. Mode quiz: 3 recall questions the student should answer before their next move.",
].join(" ");

const BREAK_DOWN_PROMPT = [
  "You are Diana, a student homework helper. Turn assignment text into 5-8 actionable study moves.",
  "Return ONLY a JSON array. No markdown. No extra prose before or after.",
  "Each item must be: {\"step\": number, \"action\": \"concrete micro-action under 15 words\", \"minutes\": number between 2 and 5}.",
  "Rules: each action is one specific student task (circle, write, mark, underline, list, compare). Never write the student's homework for them.",
  "First step must always be: 'Circle the deliverable: what has to be turned in?' with minutes: 3.",
  "Add a final step: 'Compare your first artifact to the prompt before the next part.' with minutes: 3.",
].join(" ");

function buildStudyHelperMessages(input: StudyHelperInput): LocalAiSidecarMessage[] {
  const trimmedSource = input.source.trim();
  const anchor = trimmedSource
    ? `This help is anchored to: ${trimmedSource.slice(0, 100)}${trimmedSource.length > 100 ? "..." : ""}`
    : "Add a source so Diana can anchor the next move.";
  return [
    {
      role: "system",
      content: composeSystemPrompt(STUDY_HELPER_PROMPT, {
        includeRefuseRedirect: true,
        includeFrustration: true,
        includeMinorSafety: true,
      }),
    },
    {
      role: "user",
      content: [
        `Mode: ${input.mode}`,
        trimmedSource
          ? `Source or class material:\n${trimmedSource.slice(0, 800)}`
          : "No source provided.",
        `Student question: ${input.question.trim().slice(0, 500)}`,
        `Expected anchor line: ${anchor}`,
      ].join("\n\n"),
    },
  ];
}

function buildBreakDownMessages(input: BreakDownInput): LocalAiSidecarMessage[] {
  return [
    {
      role: "system",
      content: composeSystemPrompt(BREAK_DOWN_PROMPT, {
        includeRefuseRedirect: true,
        includeFrustration: false,
        includeMinorSafety: true,
      }),
    },
    {
      role: "user",
      content: `Assignment text:\n${input.assignment.trim().slice(0, 1200)}`,
    },
  ];
}

function parseStudyHelperResult(raw: string): StudyHelperResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return FALLBACK_STUDY_RESULT;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : FALLBACK_STUDY_RESULT.title;
    const main =
      typeof parsed.main === "string" && parsed.main.trim()
        ? parsed.main.trim()
        : FALLBACK_STUDY_RESULT.main;
    const reason =
      typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim()
        : FALLBACK_STUDY_RESULT.reason;
    const steps = Array.isArray(parsed.steps)
      ? (parsed.steps as unknown[])
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(0, 4)
      : FALLBACK_STUDY_RESULT.steps;
    const anchor =
      typeof parsed.anchor === "string" && parsed.anchor.trim()
        ? parsed.anchor.trim()
        : FALLBACK_STUDY_RESULT.anchor;
    return { title, main, reason, steps: steps.length > 0 ? steps : FALLBACK_STUDY_RESULT.steps, anchor };
  } catch {
    return FALLBACK_STUDY_RESULT;
  }
}

export async function createDianaStudyHelperResponse({
  input,
  config = resolveDianaVoiceSidecarConfig(),
  fetchImpl = fetch,
  signal,
}: {
  input: StudyHelperInput;
  config?: LocalAiSidecarConfig;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<StudyHelperResult> {
  const messages = buildStudyHelperMessages(input);
  const chatRequest = createSidecarChatRequest(config, messages);
  const response = await fetchImpl(chatRequest.url, { ...chatRequest.init, signal });
  if (!response.ok) {
    throw new Error(`Study helper sidecar returned ${response.status}`);
  }
  const text = parseSidecarText("openjarvis", await response.json());
  return parseStudyHelperResult(text);
}

export async function createDianaBreakDownSteps({
  input,
  config = resolveDianaVoiceSidecarConfig(),
  fetchImpl = fetch,
  signal,
}: {
  input: BreakDownInput;
  config?: LocalAiSidecarConfig;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<BreakdownStep[]> {
  const messages = buildBreakDownMessages(input);
  const chatRequest = createSidecarChatRequest(config, messages);
  const response = await fetchImpl(chatRequest.url, { ...chatRequest.init, signal });
  if (!response.ok) {
    throw new Error(`Break down sidecar returned ${response.status}`);
  }
  const text = parseSidecarText("openjarvis", await response.json());
  return parseStepsFromContent(text);
}
