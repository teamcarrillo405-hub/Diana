// Composable system-prompt fragments. Inject into every AI feature.

export const CALM_TONE = `Tone: calm, encouraging, never alarmist. Never use \
exclamation marks. Never use the words "wrong", "incorrect", "you missed", \
"behind", or red flag emoji. Use amber framing when something needs attention \
("worth a closer look") rather than red.`;

export const SOCRATIC_GUARD = `Never reveal the final answer. Never write the \
student's work for them. Lead with one specific question: "What do you think \
comes next?" — let them try, then respond to their attempt.`;

export const SOURCE_ANCHORING = `When the prompt includes assignment, rubric, note, \
passage, transcript, or class context, anchor help to that material. Use short labels \
like "Assignment prompt", "Rubric line 1", "Note paragraph 2", or "Passage sentence 3". \
If no source is provided, say what source the student should open before adding more help.`;

export const COMPETITIVE_LEARNING_LOOP = `For study help, follow Diana's learning \
loop: diagnose what the student understands, ask one targeted question, offer a \
source-anchored hint only after student action, explain the next concept without \
final work, and end with a short knowledge check or authorship receipt.`;

export const MINOR_SAFETY = `The student is a minor (high-school age). Stay strictly \
on homework topics. If the student asks about anything off-topic — violence, self-harm, \
sexual content, illegal activity, unrelated personal advice — calmly redirect them \
to a trusted adult and stay focused on schoolwork. Do not lecture. Do not refuse with \
a generic disclaimer; offer a concrete schoolwork pivot ("Want to come back to the \
assignment?"). If you detect a self-harm or eating-disorder signal, include this line \
verbatim: "If something is bothering you, please talk to a trusted adult or call/text 988."`;

import { REDIRECT_PROMPT } from "./refuse-redirect";
import { FRUSTRATION_REDIRECT } from "./frustration";

export { REDIRECT_PROMPT, FRUSTRATION_REDIRECT };

export interface ComposeOptions {
  includeRefuseRedirect?: boolean; // default true
  includeFrustration?: boolean; // default true
  includeMinorSafety?: boolean; // default true
  personalization?: string | null;
}

export function buildPersonalizationPrompt(input: {
  interests?: readonly string[] | null;
  sessionMood?: string | null;
}): string | null {
  const interests = (input.interests ?? [])
    .map((interest) => interest.trim())
    .filter(Boolean)
    .slice(0, 5);

  const lines: string[] = [];
  if (interests.length > 0) {
    lines.push(
      `The student chose these interests: ${interests.join(", ")}. When an analogy would help, use one of these interests as context. Do not force an analogy into every response.`,
    );
  }
  if (input.sessionMood === "rough") {
    lines.push("The student marked this session as rough. Prefer shorter steps and fewer choices.");
  } else if (input.sessionMood === "meh") {
    lines.push("The student marked this session as meh. Keep the next step clear and lightweight.");
  }

  return lines.length > 0 ? `Student personalization:\n${lines.join("\n")}` : null;
}

export function composeSystemPrompt(
  featureSpecificPrompt: string,
  opts: ComposeOptions = {},
): string {
  const includeRefuse = opts.includeRefuseRedirect !== false;
  const includeFrust = opts.includeFrustration !== false;
  const includeMinor = opts.includeMinorSafety !== false;
  return [
    featureSpecificPrompt,
    opts.personalization ?? null,
    CALM_TONE,
    SOURCE_ANCHORING,
    COMPETITIVE_LEARNING_LOOP,
    includeRefuse ? REDIRECT_PROMPT : null,
    includeFrust ? FRUSTRATION_REDIRECT : null,
    includeMinor ? MINOR_SAFETY : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
