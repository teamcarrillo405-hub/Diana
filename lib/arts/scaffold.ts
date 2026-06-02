export type ArtsMode =
  | "art_reflection"
  | "music_theory"
  | "drama_speech"
  | "art_history"
  | "storyboard";

export type ArtsScaffoldResult = {
  mode: ArtsMode;
  prompts: string[];
  cards: Array<{ title: string; body: string; action: string }>;
  checklist: string[];
};

const FALLBACKS: Record<ArtsMode, ArtsScaffoldResult> = {
  art_reflection: {
    mode: "art_reflection",
    prompts: [
      "What did you make?",
      "What choices did you make first?",
      "What changed while you worked?",
      "What do you want the viewer to notice?",
    ],
    cards: [
      {
        title: "Process",
        body: "Describe your materials, first choice, one revision, and one decision you would keep.",
        action: "Write one sentence for each part.",
      },
    ],
    checklist: ["Name the medium", "Describe the process", "Name one revision", "Connect choice to intention"],
  },
  music_theory: {
    mode: "music_theory",
    prompts: ["What key are you in?", "Is the scale major or minor?", "What notes make the triad?"],
    cards: [
      {
        title: "Scale",
        body: "Major uses whole-whole-half-whole-whole-whole-half. Natural minor uses whole-half-whole-whole-half-whole-whole.",
        action: "Build the scale before naming the chord.",
      },
      {
        title: "Triad",
        body: "A triad uses scale degrees 1, 3, and 5. Major and minor differ in the third.",
        action: "Circle the third first.",
      },
    ],
    checklist: ["Write the scale", "Mark 1-3-5", "Name the chord quality"],
  },
  drama_speech: {
    mode: "drama_speech",
    prompts: ["What is the beat of this line?", "Where does the speaker move?", "Which word carries the turn?"],
    cards: [
      {
        title: "Memorization",
        body: "Chunk the speech by beat, cover the next line, then speak from the cue word.",
        action: "Practice one beat at a time.",
      },
    ],
    checklist: ["Mark beats", "Add stage directions", "Choose cue words", "Run one chunk aloud"],
  },
  art_history: {
    mode: "art_history",
    prompts: ["What do you see first?", "What formal elements stand out?", "What context changes the meaning?"],
    cards: [
      {
        title: "Formal analysis",
        body: "Start with line, color, composition, material, scale, and focal point before interpretation.",
        action: "List observations before claims.",
      },
    ],
    checklist: ["Observe", "Analyze form", "Connect context", "State evidence"],
  },
  storyboard: {
    mode: "storyboard",
    prompts: ["What is the moment?", "What does the camera show?", "What sound or action changes the shot?"],
    cards: [
      {
        title: "Shot plan",
        body: "Use one frame per moment: shot type, action, sound, and transition.",
        action: "Sketch six frames before polishing.",
      },
    ],
    checklist: ["Define scene goal", "List shots", "Add sound/action", "Check continuity"],
  },
};

export function fallbackArtsScaffold(mode: ArtsMode): ArtsScaffoldResult {
  return FALLBACKS[mode];
}

export function parseArtsScaffold(raw: string, mode: ArtsMode): ArtsScaffoldResult {
  try {
    const parsed = JSON.parse(raw) as Partial<ArtsScaffoldResult>;
    return {
      mode,
      prompts: normalizeStrings(parsed.prompts, FALLBACKS[mode].prompts),
      cards: normalizeCards(parsed.cards, FALLBACKS[mode].cards),
      checklist: normalizeStrings(parsed.checklist, FALLBACKS[mode].checklist),
    };
  } catch {
    return fallbackArtsScaffold(mode);
  }
}

function normalizeStrings(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const out = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 8);
  return out.length > 0 ? out : fallback;
}

function normalizeCards(value: unknown, fallback: ArtsScaffoldResult["cards"]): ArtsScaffoldResult["cards"] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.title === "string" && typeof item.body === "string")
    .map((item) => ({
      title: String(item.title).trim(),
      body: String(item.body).trim(),
      action: typeof item.action === "string" ? item.action.trim() : "Try one small step.",
    }))
    .filter((item) => item.title && item.body)
    .slice(0, 5);
  return cards.length > 0 ? cards : fallback;
}
