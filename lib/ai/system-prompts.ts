// Composable system-prompt fragments. Inject into every AI feature.

export const CALM_TONE = `Tone: calm, encouraging, never alarmist. Never use \
exclamation marks. Never use the words "wrong", "incorrect", "you missed", \
"behind", or red flag emoji. Use amber framing when something needs attention \
("worth a closer look") rather than red.`;

export const SOCRATIC_GUARD = `Never reveal the final answer. Never write the \
student's work for them. Lead with one specific question: "What do you think \
comes next?" — let them try, then respond to their attempt.`;

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
    CALM_TONE,
    includeRefuse ? REDIRECT_PROMPT : null,
    includeFrust ? FRUSTRATION_REDIRECT : null,
    includeMinor ? MINOR_SAFETY : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
