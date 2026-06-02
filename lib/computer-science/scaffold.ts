export type CsScaffoldMode =
  | "error_hint"
  | "pseudocode_bridge"
  | "code_review"
  | "debug_log"
  | "project_scaffold";

export type CsCard = {
  label: string;
  prompt: string;
  studentAction: string | null;
};

export type DebugLogPrompt = {
  label: string;
  prompt: string;
};

export type ProjectMilestone = {
  label: string;
  goal: string;
  check: string;
};

export type CsScaffoldResult = {
  mode: CsScaffoldMode;
  title: string;
  cards: CsCard[];
  pseudocodeSteps: string[];
  reviewQuestions: string[];
  debugLog: DebugLogPrompt[];
  milestones: ProjectMilestone[];
  checkPrompt: string;
};

export function parseCsScaffoldResponse(content: string, mode: CsScaffoldMode): CsScaffoldResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackCsScaffold(mode);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const fallback = fallbackCsScaffold(mode);
    const cards = normalizeCards(parsed.cards);
    const pseudocodeSteps = normalizeStrings(parsed.pseudocodeSteps, 8);
    const reviewQuestions = normalizeStrings(parsed.reviewQuestions, 8);
    const debugLog = normalizeDebugLog(parsed.debugLog);
    const milestones = normalizeMilestones(parsed.milestones);
    return {
      mode,
      title: stringOr(parsed.title, fallback.title),
      cards: cards.length > 0 ? cards : fallback.cards,
      pseudocodeSteps: pseudocodeSteps.length > 0 ? pseudocodeSteps : fallback.pseudocodeSteps,
      reviewQuestions: reviewQuestions.length > 0 ? reviewQuestions : fallback.reviewQuestions,
      debugLog: debugLog.length > 0 ? debugLog : fallback.debugLog,
      milestones: milestones.length > 0 ? milestones : fallback.milestones,
      checkPrompt: stringOr(parsed.checkPrompt, fallback.checkPrompt),
    };
  } catch {
    return fallbackCsScaffold(mode);
  }
}

export function fallbackCsScaffold(mode: CsScaffoldMode): CsScaffoldResult {
  return {
    mode,
    title: titleForMode(mode),
    cards: fallbackCards(mode),
    pseudocodeSteps: mode === "pseudocode_bridge"
      ? ["Name the inputs.", "Describe the repeated step.", "Name the output."]
      : [],
    reviewQuestions: mode === "code_review"
      ? ["What value changes first?", "Where does the loop stop?", "What should the function return?"]
      : [],
    debugLog: mode === "debug_log"
      ? [
        { label: "Expected", prompt: "What did you expect the code to do?" },
        { label: "Observed", prompt: "What happened when it ran?" },
        { label: "Smallest check", prompt: "What is the smallest input that shows the issue?" },
      ]
      : [],
    milestones: mode === "project_scaffold"
      ? [
        { label: "Plan", goal: "Write the goal and user input.", check: "Can someone else name what it does?" },
        { label: "Prototype", goal: "Make one small version run.", check: "Does one path produce output?" },
        { label: "Test", goal: "Try normal, edge, and empty inputs.", check: "Did each test have an expected result?" },
      ]
      : [],
    checkPrompt: "Run one small test case before changing more code.",
  };
}

function fallbackCards(mode: CsScaffoldMode): CsCard[] {
  if (mode === "error_hint") {
    return [
      { label: "Read", prompt: "What exact line or message points to the issue?", studentAction: "Underline one clue." },
      { label: "Predict", prompt: "What did you expect that line to produce?", studentAction: "Write one expected value." },
      { label: "Trace", prompt: "What value is stored right before that line runs?", studentAction: "Add a print or console.log." },
    ];
  }
  if (mode === "project_scaffold") {
    return [
      { label: "Input", prompt: "What information does the program need?", studentAction: "List inputs." },
      { label: "Process", prompt: "What steps transform the input?", studentAction: "Write steps in plain words." },
      { label: "Output", prompt: "What should the user see or receive?", studentAction: "Name the output." },
    ];
  }
  return [
    { label: "Purpose", prompt: "What is this code trying to accomplish?", studentAction: "Name the goal in one sentence." },
    { label: "State", prompt: "Which variable changes over time?", studentAction: "Track one variable." },
    { label: "Check", prompt: "What small input can test the idea?", studentAction: "Pick a tiny test case." },
  ];
}

function normalizeCards(value: unknown): CsCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Step ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 360),
      studentAction: nullableString(item.studentAction),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeDebugLog(value: unknown): DebugLogPrompt[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Check ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 280),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeMilestones(value: unknown): ProjectMilestone[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Milestone ${index + 1}`).slice(0, 80),
      goal: stringOr(item.goal, "").slice(0, 260),
      check: stringOr(item.check, "").slice(0, 220),
    };
  }).filter((item) => item.goal.length > 0);
}

function normalizeStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((item) => String(item).trim().slice(0, 180)).filter(Boolean);
}

function titleForMode(mode: CsScaffoldMode): string {
  return mode === "error_hint"
    ? "Error hint"
    : mode === "pseudocode_bridge"
    ? "Pseudocode bridge"
    : mode === "code_review"
    ? "Code review"
    : mode === "debug_log"
    ? "Debug log"
    : "Project scaffold";
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return content.slice(start, end + 1);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
