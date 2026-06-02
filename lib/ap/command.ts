export type ApSubjectId =
  | "us_history"
  | "world_history"
  | "english_language"
  | "english_literature"
  | "biology"
  | "chemistry"
  | "physics"
  | "calculus_ab"
  | "calculus_bc"
  | "statistics"
  | "computer_science_a"
  | "computer_science_principles"
  | "spanish"
  | "french"
  | "art_history"
  | "psychology"
  | "microeconomics"
  | "macroeconomics"
  | "government";

export type ApFormat =
  | "history_dbq"
  | "english_synthesis"
  | "literary_analysis"
  | "science_frq"
  | "math_frq"
  | "statistics_frq"
  | "computer_science_frq"
  | "language_frq"
  | "art_history_frq"
  | "social_science_frq";

export type ApScaffoldMode = "frq_outline" | "mcq_practice" | "study_plan";

export type ApSubject = {
  id: ApSubjectId;
  label: string;
  format: ApFormat;
};

export type ApOutlineStep = {
  label: string;
  prompt: string;
  evidence: string;
};

export type ApMcqChoice = {
  label: string;
  text: string;
  explanation: string;
};

export type ApMcqQuestion = {
  stem: string;
  choices: ApMcqChoice[];
  bestChoice: string;
  skill: string;
};

export type ApScaffoldResult = {
  mode: ApScaffoldMode;
  subject: ApSubjectId;
  title: string;
  outline: ApOutlineStep[];
  questions: ApMcqQuestion[];
  plan: string[];
  checklist: string[];
};

export const AP_SUBJECTS: ApSubject[] = [
  { id: "us_history", label: "US History", format: "history_dbq" },
  { id: "world_history", label: "World History", format: "history_dbq" },
  { id: "english_language", label: "English Language", format: "english_synthesis" },
  { id: "english_literature", label: "English Literature", format: "literary_analysis" },
  { id: "biology", label: "Biology", format: "science_frq" },
  { id: "chemistry", label: "Chemistry", format: "science_frq" },
  { id: "physics", label: "Physics 1/2/C", format: "science_frq" },
  { id: "calculus_ab", label: "Calculus AB", format: "math_frq" },
  { id: "calculus_bc", label: "Calculus BC", format: "math_frq" },
  { id: "statistics", label: "Statistics", format: "statistics_frq" },
  { id: "computer_science_a", label: "Computer Science A", format: "computer_science_frq" },
  { id: "computer_science_principles", label: "Computer Science Principles", format: "computer_science_frq" },
  { id: "spanish", label: "Spanish", format: "language_frq" },
  { id: "french", label: "French", format: "language_frq" },
  { id: "art_history", label: "Art History", format: "art_history_frq" },
  { id: "psychology", label: "Psychology", format: "social_science_frq" },
  { id: "microeconomics", label: "Microeconomics", format: "social_science_frq" },
  { id: "macroeconomics", label: "Macroeconomics", format: "social_science_frq" },
  { id: "government", label: "Government", format: "social_science_frq" },
];

export function apSubjectById(id: string): ApSubject {
  return AP_SUBJECTS.find((subject) => subject.id === id) ?? AP_SUBJECTS[0];
}

export function daysUntilExam(examDate: string, now: Date = new Date()): number {
  const exam = Date.parse(`${examDate}T00:00:00.000Z`);
  if (!Number.isFinite(exam)) return 0;
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return Math.max(0, Math.ceil((exam - today) / 86400000));
}

export function apMilestonePlan(subjectId: ApSubjectId, examDate: string, now: Date = new Date()): string[] {
  const subject = apSubjectById(subjectId);
  const days = daysUntilExam(examDate, now);
  if (days >= 60) {
    return [
      `Build a two-week foundation map for ${subject.label}.`,
      "Do one format-specific practice set each week.",
      "Turn open concepts into flashcards or mastery topics.",
      "Schedule one timed section after the first review pass.",
    ];
  }
  if (days >= 30) {
    return [
      `Focus on ${formatLabel(subject.format)} timing.`,
      "Alternate MCQ practice with one FRQ outline.",
      "Review explanations for every answer choice.",
      "Make a calm one-week checkpoint list.",
    ];
  }
  if (days >= 7) {
    return [
      "Use shorter timed sets and one full FRQ outline.",
      "Review only the highest-value concepts after each set.",
      "Keep sleep and meals steady during review days.",
      "Prepare materials and exam-day logistics early.",
    ];
  }
  return [
    "Use light review and format reminders.",
    "Practice one short response outline, then stop.",
    "Pack materials and choose a recovery plan after the exam.",
  ];
}

export function scoreBand(correct: number, total: number): { band: string | null; message: string } {
  if (!Number.isFinite(total) || total <= 0) {
    return { band: null, message: "Add a practice set to estimate a score band." };
  }
  const ratio = Math.max(0, Math.min(1, correct / total));
  const band = ratio >= 0.85 ? "4-5" : ratio >= 0.65 ? "3-4" : ratio >= 0.45 ? "2-3" : "1-2";
  return {
    band,
    message: `You're in the ${band} range based on this practice set.`,
  };
}

export function fallbackApScaffold(subjectId: ApSubjectId, mode: ApScaffoldMode): ApScaffoldResult {
  const subject = apSubjectById(subjectId);
  return {
    mode,
    subject: subject.id,
    title: mode === "frq_outline"
      ? `${subject.label} FRQ outline`
      : mode === "mcq_practice"
      ? `${subject.label} MCQ practice`
      : `${subject.label} study plan`,
    outline: mode === "frq_outline" ? outlineForFormat(subject.format) : [],
    questions: mode === "mcq_practice" ? [fallbackQuestion(subject)] : [],
    plan: mode === "study_plan" ? apMilestonePlan(subject.id, nextMayExamDate()) : [],
    checklist: checklistForFormat(subject.format),
  };
}

export function parseApScaffold(raw: string, subjectId: ApSubjectId, mode: ApScaffoldMode): ApScaffoldResult {
  try {
    const parsed = JSON.parse(raw) as Partial<ApScaffoldResult>;
    const fallback = fallbackApScaffold(subjectId, mode);
    return {
      mode,
      subject: subjectId,
      title: stringOr(parsed.title, fallback.title),
      outline: normalizeOutline(parsed.outline, fallback.outline),
      questions: normalizeQuestions(parsed.questions, fallback.questions),
      plan: normalizeStrings(parsed.plan, fallback.plan, 10),
      checklist: normalizeStrings(parsed.checklist, fallback.checklist, 8),
    };
  } catch {
    return fallbackApScaffold(subjectId, mode);
  }
}

export function nextMayExamDate(now: Date = new Date()): string {
  const year = now.getUTCMonth() > 5 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return `${year}-05-05`;
}

function outlineForFormat(format: ApFormat): ApOutlineStep[] {
  switch (format) {
    case "history_dbq":
      return [
        step("Context", "Set the time period and historical tension.", "One background fact"),
        step("Thesis", "Answer the prompt with a defensible claim.", "Main line of reasoning"),
        step("Document groups", "Group documents by reason, not by order.", "Two or more document references"),
        step("Outside evidence", "Add one specific fact beyond the documents.", "Named event, policy, or person"),
        step("Complexity", "Name a limit, counterpoint, or change over time.", "Contrast evidence"),
      ];
    case "english_synthesis":
      return [
        step("Position", "State the qualified claim.", "Prompt language"),
        step("Source map", "Group sources by the role they play.", "Two source references"),
        step("Line of reasoning", "Explain how the evidence moves the claim forward.", "Commentary after each source"),
        step("Nuance", "Add concession, limit, or implication.", "A specific tradeoff"),
      ];
    case "literary_analysis":
      return [
        step("Text claim", "Name the interpretation of the passage or work.", "Literary element"),
        step("Evidence", "Select brief textual details.", "Quoted phrase or scene detail"),
        step("Commentary", "Connect technique to meaning.", "Effect on theme or character"),
      ];
    case "science_frq":
      return [
        step("Claim", "Answer the science task directly.", "Variable or concept"),
        step("Evidence", "Use data, observation, or equation context.", "Specific value or pattern"),
        step("Reasoning", "Connect evidence to the science rule.", "Mechanism or principle"),
      ];
    case "math_frq":
      return [
        step("Setup", "Define variables and known values.", "Equation or graph feature"),
        step("Work", "Show symbolic or numeric steps.", "Units and notation"),
        step("Interpret", "Answer in context.", "Meaning of the result"),
      ];
    case "statistics_frq":
      return [
        step("State", "Identify the procedure or parameter.", "Context labels"),
        step("Plan", "Check conditions and method.", "Condition evidence"),
        step("Do", "Compute with clear notation.", "Formula and values"),
        step("Conclude", "Interpret in context.", "Plain-language conclusion"),
      ];
    case "computer_science_frq":
      return [
        step("Trace", "Name inputs, outputs, and state changes.", "Example value"),
        step("Plan", "Write pseudocode before code.", "Loop or condition"),
        step("Check", "Test edge cases from the prompt.", "Boundary case"),
      ];
    case "language_frq":
      return [
        step("Task", "Identify audience, purpose, and register.", "Prompt cue"),
        step("Structure", "Plan opening, details, and closing.", "Transition phrase"),
        step("Language control", "Use accurate familiar structures.", "Verb tense or connector"),
      ];
    case "art_history_frq":
      return [
        step("Identify", "Name work, culture, or period when required.", "Title, artist, or tradition"),
        step("Formal evidence", "Describe visible form before interpretation.", "Line, material, scale, composition"),
        step("Context", "Connect form to function or meaning.", "Historical or cultural fact"),
      ];
    case "social_science_frq":
      return [
        step("Define", "State the concept in class terms.", "Course vocabulary"),
        step("Apply", "Connect the concept to the scenario.", "Scenario detail"),
        step("Explain", "Show the cause, effect, or comparison.", "Reasoning sentence"),
      ];
  }
}

function checklistForFormat(format: ApFormat): string[] {
  return [
    `Use ${formatLabel(format)} structure.`,
    "Answer the task directly.",
    "Tie each evidence point to the claim.",
    "Check timing before adding polish.",
  ];
}

function fallbackQuestion(subject: ApSubject): ApMcqQuestion {
  return {
    stem: `Which choice best supports a ${subject.label} claim using course evidence?`,
    bestChoice: "A",
    skill: formatLabel(subject.format),
    choices: [
      { label: "A", text: "A choice with specific evidence and reasoning.", explanation: "Best fit because it uses evidence and explains the link." },
      { label: "B", text: "A choice that names a topic only.", explanation: "Less supported because it does not explain the link." },
      { label: "C", text: "A choice that is too broad.", explanation: "Less supported because it does not stay close to the prompt." },
      { label: "D", text: "A choice that uses a related but weaker detail.", explanation: "Less supported because the evidence is not central." },
    ],
  };
}

function formatLabel(format: ApFormat): string {
  return format.replace(/_/g, " ");
}

function step(label: string, prompt: string, evidence: string): ApOutlineStep {
  return { label, prompt, evidence };
}

function normalizeOutline(value: unknown, fallback: ApOutlineStep[]): ApOutlineStep[] {
  if (!Array.isArray(value)) return fallback;
  const rows = value.slice(0, 8).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Step ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 320),
      evidence: stringOr(item.evidence, "").slice(0, 180),
    };
  }).filter((item) => item.prompt);
  return rows.length > 0 ? rows : fallback;
}

function normalizeQuestions(value: unknown, fallback: ApMcqQuestion[]): ApMcqQuestion[] {
  if (!Array.isArray(value)) return fallback;
  const questions = value.slice(0, 4).map((raw) => {
    const item = raw as Record<string, unknown>;
    const choices = normalizeChoices(item.choices);
    return {
      stem: stringOr(item.stem, "").slice(0, 500),
      choices,
      bestChoice: stringOr(item.bestChoice, choices[0]?.label ?? "A").slice(0, 4),
      skill: stringOr(item.skill, "AP skill").slice(0, 120),
    };
  }).filter((item) => item.stem && item.choices.length >= 2 && item.choices.every((choice) => choice.explanation));
  return questions.length > 0 ? questions : fallback;
}

function normalizeChoices(value: unknown): ApMcqChoice[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, String.fromCharCode(65 + index)).slice(0, 4),
      text: stringOr(item.text, "").slice(0, 300),
      explanation: stringOr(item.explanation, "").slice(0, 360),
    };
  }).filter((item) => item.text && item.explanation);
}

function normalizeStrings(value: unknown, fallback: string[], max: number): string[] {
  if (!Array.isArray(value)) return fallback;
  const rows = value.map((item) => String(item).trim().slice(0, 240)).filter(Boolean).slice(0, max);
  return rows.length > 0 ? rows : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
