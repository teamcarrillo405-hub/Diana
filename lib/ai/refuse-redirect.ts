// F17: Refuse-with-redirect. When a student asks Claude to "just do it",
// refuse with a SPECIFIC redirect, never a cold "I can't do that."

export const REFUSE_PATTERNS: RegExp[] = [
  /\bjust do it\b/i,
  /\bdo it for me\b/i,
  /\bwrite (this|my|the) (essay|paper|paragraph|response)\b/i,
  /\bfinish (this|my|the)\b/i,
  /\bgive me the answer\b/i,
  /\bsolve (this|it) for me\b/i,
  /\bcomplete (this|my)\b/i,
];

export const REDIRECT_PROMPT = `If the student asks you to do the work for them \
(write the essay, give the answer, solve it for them), you MUST refuse — but \
never with a cold "I can't do that." Instead, redirect:
- For writing: "I can help you plan this — what's the first thing you want to say?"
- For math: "I can help you think it through — what does the problem ask for?"
- For reading: "I can't summarize this for you, but I can pull out the key words. Want that?"
Always offer a concrete next step they can take in 30 seconds.`;

export function isRefusalNeeded(text: string): boolean {
  return REFUSE_PATTERNS.some((re) => re.test(text));
}
