export type MathSubject =
  | "algebra"
  | "geometry"
  | "precalculus"
  | "calculus"
  | "statistics"
  | "physics"
  | "chemistry";

export type MathScaffoldStep = {
  id: string;
  label: string;
  prompt: string;
  unitHint: string | null;
  studentCheck: string | null;
};

export type MathUnitHint = {
  quantity: string;
  unit: string;
  note: string;
};

export type MathGraphSketch = {
  prompt: string;
  xBehavior: string;
  yBehavior: string;
};

export type MathScaffoldResult = {
  extractedProblem: string;
  latex: string | null;
  subject: MathSubject;
  steps: MathScaffoldStep[];
  commonError: string;
  unitTracker: MathUnitHint[];
  graphSketch: MathGraphSketch | null;
};

const SUBJECTS = new Set<MathSubject>([
  "algebra",
  "geometry",
  "precalculus",
  "calculus",
  "statistics",
  "physics",
  "chemistry",
]);

const DEFAULT_STEPS: Array<Pick<MathScaffoldStep, "id" | "label" | "prompt">> = [
  {
    id: "read",
    label: "Read the ask",
    prompt: "Circle what the problem is asking you to find before choosing a method.",
  },
  {
    id: "givens",
    label: "List givens",
    prompt: "Write the numbers, variables, and conditions you are allowed to use.",
  },
  {
    id: "method",
    label: "Pick a rule",
    prompt: "Choose one formula, theorem, or operation that connects the givens to the ask.",
  },
  {
    id: "next-step",
    label: "Try one move",
    prompt: "Do only the next algebraic or numeric move, then pause to check it.",
  },
];

const UNIT_PATTERNS: Array<[RegExp, string, string]> = [
  [/\b(meters?|metres?|m)\b/i, "distance", "m"],
  [/\b(seconds?|sec|s)\b/i, "time", "s"],
  [/\b(kilograms?|kg|grams?|g)\b/i, "mass", "kg"],
  [/\b(newtons?|n)\b/i, "force", "N"],
  [/\b(joules?|j)\b/i, "energy", "J"],
  [/\b(moles?|mol)\b/i, "amount", "mol"],
  [/\b(liters?|litres?|l)\b/i, "volume", "L"],
  [/\b(degrees?|deg|°)\b/i, "angle", "degrees"],
];

export function parseMathScaffoldResponse(
  content: string,
  fallbackProblem: string,
  fallbackSubject: MathSubject,
): MathScaffoldResult {
  const json = extractJsonObject(content);
  if (!json) return buildFallbackMathScaffold(fallbackProblem, fallbackSubject);

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const problem = stringOr(parsed.extractedProblem, fallbackProblem).slice(0, 2000);
    const subject = subjectOr(parsed.subject, fallbackSubject);
    const steps = normalizeSteps(parsed.steps);
    return {
      extractedProblem: problem,
      latex: nullableString(parsed.latex),
      subject,
      steps: steps.length > 0 ? steps : defaultStepsFor(problem),
      commonError: stringOr(
        parsed.commonError,
        "A common mix-up is doing two moves at once. Keep the next step small.",
      ),
      unitTracker: normalizeUnitHints(parsed.unitTracker, problem),
      graphSketch: normalizeGraphSketch(parsed.graphSketch, problem),
    };
  } catch {
    return buildFallbackMathScaffold(fallbackProblem, fallbackSubject);
  }
}

export function buildFallbackMathScaffold(
  problem: string,
  subject: MathSubject = "algebra",
): MathScaffoldResult {
  return {
    extractedProblem: problem.trim().slice(0, 2000),
    latex: null,
    subject,
    steps: defaultStepsFor(problem),
    commonError: "A common mix-up is copying a sign or unit too quickly. Check one line at a time.",
    unitTracker: inferUnitHints(problem),
    graphSketch: inferGraphSketch(problem),
  };
}

export function inferUnitHints(problem: string): MathUnitHint[] {
  const hints: MathUnitHint[] = [];
  const seen = new Set<string>();
  for (const [pattern, quantity, unit] of UNIT_PATTERNS) {
    if (pattern.test(problem) && !seen.has(unit)) {
      seen.add(unit);
      hints.push({
        quantity,
        unit,
        note: `Track ${unit} through each step before combining values.`,
      });
    }
  }
  return hints.slice(0, 5);
}

export function inferGraphSketch(problem: string): MathGraphSketch | null {
  const lower = problem.toLowerCase();
  const graphLike =
    lower.includes("graph") ||
    lower.includes("sketch") ||
    /\bf\(x\)\s*=/.test(lower) ||
    /\by\s*=/.test(lower);
  if (!graphLike) return null;
  return {
    prompt: "Sketch the axes and mark intercepts or turning points before plotting details.",
    xBehavior: "Check what happens as x moves left and right.",
    yBehavior: "Mark where the graph crosses or approaches the y-axis.",
  };
}

function defaultStepsFor(problem: string): MathScaffoldStep[] {
  const unitHint = inferUnitHints(problem)[0]?.note ?? null;
  return DEFAULT_STEPS.map((step) => ({
    ...step,
    unitHint: step.id === "next-step" ? unitHint : null,
    studentCheck: "Write your work for this step, then compare it to the prompt.",
  }));
}

function normalizeSteps(value: unknown): MathScaffoldStep[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 7).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      id: stringOr(item.id, `step-${index + 1}`).slice(0, 40),
      label: stringOr(item.label, `Step ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "Try the next small move.").slice(0, 400),
      unitHint: nullableString(item.unitHint),
      studentCheck: nullableString(item.studentCheck),
    };
  }).filter((step) => step.prompt.length > 0);
}

function normalizeUnitHints(value: unknown, problem: string): MathUnitHint[] {
  if (!Array.isArray(value)) return inferUnitHints(problem);
  const hints = value.slice(0, 5).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      quantity: stringOr(item.quantity, "quantity").slice(0, 60),
      unit: stringOr(item.unit, "").slice(0, 24),
      note: stringOr(item.note, "Keep this unit visible in each line.").slice(0, 180),
    };
  }).filter((hint) => hint.unit.length > 0 || hint.note.length > 0);
  return hints.length > 0 ? hints : inferUnitHints(problem);
}

function normalizeGraphSketch(value: unknown, problem: string): MathGraphSketch | null {
  if (!value || typeof value !== "object") return inferGraphSketch(problem);
  const item = value as Record<string, unknown>;
  const prompt = nullableString(item.prompt);
  if (!prompt) return inferGraphSketch(problem);
  return {
    prompt: prompt.slice(0, 220),
    xBehavior: stringOr(item.xBehavior, "Check how the graph behaves as x changes.").slice(0, 180),
    yBehavior: stringOr(item.yBehavior, "Check intercepts, asymptotes, or turning points.").slice(0, 180),
  };
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return content.slice(start, end + 1);
}

function subjectOr(value: unknown, fallback: MathSubject): MathSubject {
  return typeof value === "string" && SUBJECTS.has(value as MathSubject)
    ? value as MathSubject
    : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
