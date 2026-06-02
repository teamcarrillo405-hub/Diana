export type HistoryScaffoldMode =
  | "primary_source"
  | "cause_effect"
  | "happ"
  | "dbq"
  | "compare"
  | "current_events";

export type HistoryCard = {
  label: string;
  prompt: string;
  sentenceFrame: string | null;
  evidenceHint: string | null;
};

export type CauseEffectLink = {
  cause: string;
  effect: string;
  connector: string | null;
};

export type HappField = {
  key: "historical_context" | "audience" | "purpose" | "point_of_view";
  prompt: string;
  evidenceHint: string | null;
};

export type DbqParagraph = {
  label: string;
  goal: string;
  evidenceSlots: string[];
};

export type HistoryComparisonRow = {
  lens: string;
  first: string;
  second: string;
  bridge: string | null;
};

export type CurrentEventConnection = {
  then: string;
  now: string;
  bridgeQuestion: string;
};

export type HistoryScaffoldResult = {
  mode: HistoryScaffoldMode;
  title: string;
  cards: HistoryCard[];
  causeEffect: CauseEffectLink[];
  happ: HappField[];
  dbqOutline: DbqParagraph[];
  comparison: HistoryComparisonRow[];
  currentConnections: CurrentEventConnection[];
  checkPrompt: string;
};

export type MapAnnotation = {
  label: string;
  x: number;
  y: number;
  prompt: string;
};

export type MapAnnotationResult = {
  title: string;
  annotations: MapAnnotation[];
  quizPrompt: string;
};

export function parseHistoryScaffoldResponse(
  content: string,
  mode: HistoryScaffoldMode,
): HistoryScaffoldResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackHistoryScaffold(mode);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const fallback = fallbackHistoryScaffold(mode);
    const cards = normalizeCards(parsed.cards);
    const happ = normalizeHapp(parsed.happ);
    const dbqOutline = normalizeDbq(parsed.dbqOutline);
    const comparison = normalizeComparison(parsed.comparison);
    const causeEffect = normalizeCauseEffect(parsed.causeEffect);
    const currentConnections = normalizeCurrentConnections(parsed.currentConnections);
    return {
      mode,
      title: stringOr(parsed.title, fallback.title),
      cards: cards.length > 0 ? cards : fallback.cards,
      causeEffect: causeEffect.length > 0 ? causeEffect : fallback.causeEffect,
      happ: happ.length > 0 ? happ : fallback.happ,
      dbqOutline: dbqOutline.length > 0 ? dbqOutline : fallback.dbqOutline,
      comparison: comparison.length > 0 ? comparison : fallback.comparison,
      currentConnections: currentConnections.length > 0 ? currentConnections : fallback.currentConnections,
      checkPrompt: stringOr(parsed.checkPrompt, fallback.checkPrompt),
    };
  } catch {
    return fallbackHistoryScaffold(mode);
  }
}

export function parseMapAnnotationResponse(content: string): MapAnnotationResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackMapAnnotation();
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const annotations = normalizeMapAnnotations(parsed.annotations);
    return {
      title: stringOr(parsed.title, "Map annotations"),
      annotations,
      quizPrompt: stringOr(parsed.quizPrompt, "Pick one region and explain why it matters in this assignment."),
    };
  } catch {
    return fallbackMapAnnotation();
  }
}

export function fallbackHistoryScaffold(mode: HistoryScaffoldMode): HistoryScaffoldResult {
  const base: HistoryScaffoldResult = {
    mode,
    title: titleForMode(mode),
    cards: fallbackCards(mode),
    causeEffect: [],
    happ: [],
    dbqOutline: [],
    comparison: [],
    currentConnections: [],
    checkPrompt: "Choose one line of evidence before moving to the next step.",
  };
  if (mode === "cause_effect") {
    return {
      ...base,
      causeEffect: [
        { cause: "Event or condition", effect: "Immediate result", connector: "led to" },
        { cause: "Immediate result", effect: "Longer-term change", connector: "contributed to" },
      ],
    };
  }
  if (mode === "happ") {
    return { ...base, happ: fallbackHapp() };
  }
  if (mode === "dbq") {
    return { ...base, dbqOutline: fallbackDbq() };
  }
  if (mode === "compare") {
    return {
      ...base,
      comparison: [
        { lens: "Context", first: "What was happening in the first case?", second: "What was happening in the second case?", bridge: "Name one shared pressure." },
        { lens: "Evidence", first: "Source line or fact for the first case", second: "Source line or fact for the second case", bridge: "What pattern changes?" },
      ],
    };
  }
  if (mode === "current_events") {
    return {
      ...base,
      currentConnections: [
        {
          then: "Historical event or policy",
          now: "Current event or institution",
          bridgeQuestion: "What cause, debate, or tradeoff appears in both?",
        },
      ],
    };
  }
  return base;
}

function fallbackCards(mode: HistoryScaffoldMode): HistoryCard[] {
  if (mode === "primary_source") {
    return [
      card("Observe", "What words, dates, people, or places stand out in the source?", "I notice...", "Quote one short phrase."),
      card("Source", "Who created this, and what might their role affect?", "The creator may...", "Look for author, speaker, or institution."),
      card("Question", "What question does this source raise?", "This makes me wonder...", null),
    ];
  }
  if (mode === "dbq") {
    return [
      card("Thesis", "What argument answers the prompt?", "Although..., the strongest reason is...", null),
      card("Evidence groups", "Which documents support the same reason?", "Documents ... and ... both show...", "Use document labels, not long quotes."),
      card("Reasoning", "How does the evidence prove the argument?", "This matters because...", null),
    ];
  }
  if (mode === "current_events") {
    return [
      card("Then", "What historical pattern or decision are you studying?", "In this period...", null),
      card("Now", "What current event has a similar question or tradeoff?", "Today, a related issue is...", null),
      card("Bridge", "What is similar, and what is different?", "Both involve..., but...", null),
    ];
  }
  return [
    card("Context", "What was happening around this event or source?", "At the time...", null),
    card("Evidence", "Which source line or fact supports the point?", "The evidence shows...", "Use one exact detail."),
    card("Meaning", "Why does that detail matter?", "This matters because...", null),
  ];
}

function fallbackHapp(): HappField[] {
  return [
    { key: "historical_context", prompt: "What was happening when this source was created?", evidenceHint: "Look for date, place, conflict, or policy." },
    { key: "audience", prompt: "Who was supposed to see or hear this source?", evidenceHint: "Look for address, publication, or institution." },
    { key: "purpose", prompt: "What was the creator trying to make the audience think or do?", evidenceHint: "Look for repeated claims or requests." },
    { key: "point_of_view", prompt: "How might the creator's position shape the message?", evidenceHint: "Look for role, identity, or incentive." },
  ];
}

function fallbackDbq(): DbqParagraph[] {
  return [
    { label: "Intro", goal: "Set context and make a thesis.", evidenceSlots: ["time period", "main tension"] },
    { label: "Body 1", goal: "Group documents that support reason one.", evidenceSlots: ["Doc A", "Doc B"] },
    { label: "Body 2", goal: "Group documents that support reason two.", evidenceSlots: ["Doc C", "Doc D"] },
    { label: "Body 3", goal: "Use outside evidence or a missing perspective.", evidenceSlots: ["outside evidence"] },
    { label: "Body 4", goal: "Handle complexity or contrast.", evidenceSlots: ["counterpoint", "limitation"] },
    { label: "Conclusion", goal: "Return to the claim and broader impact.", evidenceSlots: ["why it mattered"] },
  ];
}

function fallbackMapAnnotation(): MapAnnotationResult {
  return {
    title: "Map annotations",
    annotations: [],
    quizPrompt: "Pick one visible region and explain why it matters in this assignment.",
  };
}

function card(
  label: string,
  prompt: string,
  sentenceFrame: string | null,
  evidenceHint: string | null,
): HistoryCard {
  return { label, prompt, sentenceFrame, evidenceHint };
}

function normalizeCards(value: unknown): HistoryCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Step ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 420),
      sentenceFrame: nullableString(item.sentenceFrame),
      evidenceHint: nullableString(item.evidenceHint),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeCauseEffect(value: unknown): CauseEffectLink[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      cause: stringOr(item.cause, "").slice(0, 140),
      effect: stringOr(item.effect, "").slice(0, 140),
      connector: nullableString(item.connector),
    };
  }).filter((item) => item.cause.length > 0 && item.effect.length > 0);
}

function normalizeHapp(value: unknown): HappField[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set<HappField["key"]>(["historical_context", "audience", "purpose", "point_of_view"]);
  return value.slice(0, 4).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const key = allowed.has(item.key as HappField["key"])
      ? item.key as HappField["key"]
      : fallbackHapp()[index]?.key ?? "historical_context";
    return {
      key,
      prompt: stringOr(item.prompt, "").slice(0, 300),
      evidenceHint: nullableString(item.evidenceHint),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeDbq(value: unknown): DbqParagraph[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Paragraph ${index + 1}`).slice(0, 80),
      goal: stringOr(item.goal, "").slice(0, 260),
      evidenceSlots: normalizeStrings(item.evidenceSlots, 5),
    };
  }).filter((item) => item.goal.length > 0);
}

function normalizeComparison(value: unknown): HistoryComparisonRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      lens: stringOr(item.lens, "Lens").slice(0, 80),
      first: stringOr(item.first, "").slice(0, 220),
      second: stringOr(item.second, "").slice(0, 220),
      bridge: nullableString(item.bridge),
    };
  }).filter((item) => item.first.length > 0 || item.second.length > 0);
}

function normalizeCurrentConnections(value: unknown): CurrentEventConnection[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      then: stringOr(item.then, "").slice(0, 180),
      now: stringOr(item.now, "").slice(0, 180),
      bridgeQuestion: stringOr(item.bridgeQuestion, "").slice(0, 240),
    };
  }).filter((item) => item.then.length > 0 && item.now.length > 0);
}

function normalizeMapAnnotations(value: unknown): MapAnnotation[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Region ${index + 1}`).slice(0, 80),
      x: percent(Number(item.x)),
      y: percent(Number(item.y)),
      prompt: stringOr(item.prompt, "What happened here?").slice(0, 200),
    };
  });
}

function normalizeStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((item) => String(item).trim().slice(0, 140)).filter(Boolean);
}

function titleForMode(mode: HistoryScaffoldMode): string {
  return mode === "primary_source"
    ? "Primary source analyzer"
    : mode === "cause_effect"
    ? "Cause and effect chain"
    : mode === "happ"
    ? "HAPP analysis"
    : mode === "dbq"
    ? "DBQ scaffold"
    : mode === "compare"
    ? "Compare and contrast"
    : "Current events connector";
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

function percent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, value));
}
