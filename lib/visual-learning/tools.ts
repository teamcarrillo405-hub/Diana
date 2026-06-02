import type { OutlineNode } from "@/lib/notes/types";

export type VisualToolMode = "mind_map" | "concept_graph" | "timeline" | "comparison_table";

export type VisualNode = {
  id: string;
  label: string;
  group: string | null;
};

export type VisualEdge = {
  from: string;
  to: string;
  label: string | null;
};

export type TimelineEvent = {
  label: string;
  date: string;
  note: string;
};

export type ComparisonRow = {
  label: string;
  values: string[];
};

export type VisualToolResult = {
  mode: VisualToolMode;
  title: string;
  nodes: VisualNode[];
  edges: VisualEdge[];
  events: TimelineEvent[];
  columns: string[];
  rows: ComparisonRow[];
};

export type DiagramAnnotation = {
  label: string;
  x: number;
  y: number;
  prompt: string;
};

export type DiagramAnnotationResult = {
  title: string;
  annotations: DiagramAnnotation[];
  quizPrompt: string;
};

export type ColorOutlineBand = {
  heading: string;
  bullets: string[];
  color: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "between",
  "class",
  "could",
  "does",
  "from",
  "have",
  "into",
  "notes",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "with",
  "would",
]);

const OUTLINE_COLORS = [
  "border-sky-400 bg-sky-500/5",
  "border-emerald-400 bg-emerald-500/5",
  "border-violet-400 bg-violet-500/5",
  "border-amber-400 bg-amber-500/5",
  "border-fuchsia-400 bg-fuchsia-500/5",
  "border-cyan-400 bg-cyan-500/5",
];

export function extractKeyTerms(text: string, max = 8): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []) {
    if (STOP_WORDS.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word)
    .slice(0, max);
}

export function buildFallbackVisualTool(
  mode: VisualToolMode,
  title: string,
  text: string,
): VisualToolResult {
  const terms = extractKeyTerms(`${title}\n${text}`, 8);
  if (mode === "timeline") return buildFallbackTimeline(title, text);
  if (mode === "comparison_table") return buildFallbackComparison(title, terms);

  const center = nodeId(title || "note");
  const nodes: VisualNode[] = [
    { id: center, label: title || "Note", group: "center" },
    ...terms.map((term) => ({ id: nodeId(term), label: term, group: mode === "mind_map" ? "branch" : "concept" })),
  ];
  const edges: VisualEdge[] = terms.map((term, index) => ({
    from: mode === "mind_map" || index === 0 ? center : nodeId(terms[index - 1]),
    to: nodeId(term),
    label: mode === "mind_map" ? "connects to" : "relates to",
  }));
  return {
    mode,
    title: mode === "mind_map" ? "Mind map" : "Concept graph",
    nodes,
    edges,
    events: [],
    columns: [],
    rows: [],
  };
}

export function buildColorOutline(outline: OutlineNode[] | null): ColorOutlineBand[] {
  if (!outline) return [];
  return outline.map((node, index) => ({
    heading: node.heading,
    bullets: node.bullets,
    color: OUTLINE_COLORS[index % OUTLINE_COLORS.length],
  }));
}

export function parseVisualToolResponse(
  content: string,
  mode: VisualToolMode,
  title: string,
  text: string,
): VisualToolResult {
  const json = extractJsonObject(content);
  if (!json) return buildFallbackVisualTool(mode, title, text);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      mode,
      title: stringOr(parsed.title, visualTitle(mode)),
      nodes: normalizeNodes(parsed.nodes),
      edges: normalizeEdges(parsed.edges),
      events: normalizeEvents(parsed.events),
      columns: normalizeStrings(parsed.columns, 4),
      rows: normalizeRows(parsed.rows),
    };
  } catch {
    return buildFallbackVisualTool(mode, title, text);
  }
}

export function parseDiagramAnnotationResponse(content: string): DiagramAnnotationResult {
  const json = extractJsonObject(content);
  if (!json) {
    return {
      title: "Diagram annotations",
      annotations: [],
      quizPrompt: "Pick one label and explain what it does.",
    };
  }
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      title: stringOr(parsed.title, "Diagram annotations"),
      annotations: normalizeAnnotations(parsed.annotations),
      quizPrompt: stringOr(parsed.quizPrompt, "Pick one label and explain what it does."),
    };
  } catch {
    return {
      title: "Diagram annotations",
      annotations: [],
      quizPrompt: "Pick one label and explain what it does.",
    };
  }
}

function buildFallbackTimeline(title: string, text: string): VisualToolResult {
  const events = [...text.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)]
    .slice(0, 8)
    .map((match, index) => ({
      date: match[0],
      label: `Event ${index + 1}`,
      note: sentenceAround(text, match.index ?? 0),
    }));
  return {
    mode: "timeline",
    title: "Timeline",
    nodes: [],
    edges: [],
    events,
    columns: [],
    rows: [],
  };
}

function buildFallbackComparison(title: string, terms: string[]): VisualToolResult {
  const columns = terms.slice(0, 3);
  return {
    mode: "comparison_table",
    title: `Compare: ${title}`,
    nodes: [],
    edges: [],
    events: [],
    columns,
    rows: [
      { label: "Definition", values: columns.map((term) => `What ${term} means in these notes`) },
      { label: "Evidence", values: columns.map((term) => `Find one note line about ${term}`) },
      { label: "Connection", values: columns.map((term) => `How ${term} connects to another concept`) },
    ],
  };
}

function normalizeNodes(value: unknown): VisualNode[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 16).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const label = stringOr(item.label, `Concept ${index + 1}`).slice(0, 80);
    return {
      id: stringOr(item.id, nodeId(label)).slice(0, 60),
      label,
      group: nullableString(item.group),
    };
  });
}

function normalizeEdges(value: unknown): VisualEdge[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 24).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      from: stringOr(item.from, ""),
      to: stringOr(item.to, ""),
      label: nullableString(item.label),
    };
  }).filter((edge) => edge.from.length > 0 && edge.to.length > 0);
}

function normalizeEvents(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      date: stringOr(item.date, `${index + 1}`).slice(0, 40),
      label: stringOr(item.label, `Event ${index + 1}`).slice(0, 100),
      note: stringOr(item.note, "").slice(0, 240),
    };
  });
}

function normalizeRows(value: unknown): ComparisonRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, "Row").slice(0, 80),
      values: normalizeStrings(item.values, 5),
    };
  });
}

function normalizeAnnotations(value: unknown): DiagramAnnotation[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Label ${index + 1}`).slice(0, 80),
      x: percent(Number(item.x)),
      y: percent(Number(item.y)),
      prompt: stringOr(item.prompt, "What does this part do?").slice(0, 180),
    };
  });
}

function normalizeStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((item) => String(item).trim().slice(0, 160)).filter(Boolean);
}

function sentenceAround(text: string, index: number): string {
  const start = Math.max(0, text.lastIndexOf(".", index - 1) + 1);
  const end = text.indexOf(".", index + 1);
  return text.slice(start, end === -1 ? Math.min(text.length, index + 180) : end + 1).trim();
}

function nodeId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "node";
}

function visualTitle(mode: VisualToolMode): string {
  return mode === "mind_map"
    ? "Mind map"
    : mode === "concept_graph"
    ? "Concept graph"
    : mode === "timeline"
    ? "Timeline"
    : "Comparison table";
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
