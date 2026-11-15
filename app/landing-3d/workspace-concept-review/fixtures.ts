export const FIXTURE_IDS = ["algebra", "english", "history", "biology"] as const;
export const SCENARIOS = ["draft", "empty", "connection-unavailable"] as const;
export type FixtureId = typeof FIXTURE_IDS[number];
export type Scenario = typeof SCENARIOS[number];
export type InspectorMode = "source" | "rubric";

type Unit = { id: string; label: string; prompt: string; draft: string; cue: string };
type Assignment = {
  course: string; title: string; directions: string; sourceTitle: string;
  source: string; rubric: readonly string[]; units: readonly Unit[];
};

export const FIXTURES: Record<FixtureId, Assignment> = {
  algebra: {
    course: "Algebra I", title: "Linear equations",
    directions: "Solve for x. Show each step, then check your result in the original equation.",
    sourceTitle: "Linear equations / practice sheet",
    source: "1. 3x + 5 = 20\n2. 2(x - 4) = 14\n3. 5x - 7 = 3x + 9",
    rubric: ["Show the operation on both sides.", "Keep each step in order.", "Check your result in the original equation."],
    units: [
      { id: "sample-algebra-1", label: "Problem 01", prompt: "3x + 5 = 20", draft: "3x + 5 = 20\n3x = 15\n\nNext, I will divide both sides by 3.", cue: "Which operation would you apply to both sides next?" },
      { id: "sample-algebra-2", label: "Problem 02", prompt: "2(x - 4) = 14", draft: "", cue: "What could you do first to work with the parentheses?" },
      { id: "sample-algebra-3", label: "Problem 03", prompt: "5x - 7 = 3x + 9", draft: "", cue: "How could you collect the x terms on one side?" },
    ],
  },
  english: {
    course: "English 9", title: "An evidence paragraph",
    directions: "Explain how the narrator's actions show a change in confidence. Use one detail from the passage and explain how it supports your claim.",
    sourceTitle: "The first rehearsal / sample passage",
    source: "At the first rehearsal, I kept my lines folded in my pocket. When the room fell quiet, I unfolded the page and began. By the final scene, I was looking at the audience instead of the paper.",
    rubric: ["Make a clear claim about the narrator.", "Use a specific detail from the passage.", "Explain how that detail supports your claim."],
    units: [{ id: "sample-english-1", label: "Paragraph 01", prompt: "How does the narrator's confidence change?", draft: "The narrator becomes more confident during the rehearsal. At first, they keep their lines folded in a pocket. By the final scene,", cue: "Which detail best supports the change you describe?" }],
  },
  history: {
    course: "History", title: "President Nixon: Three-Page Report",
    directions: "Build a three-page report in your own words. Use evidence from your sources and explain what it supports.",
    sourceTitle: "Nixon report / sample assignment brief",
    source: "Write a three-page report about Richard Nixon's presidency.\n\nDevelop a central claim. Discuss domestic policy, foreign policy, and Watergate's effect on his legacy. Connect each section to your claim.\n\nUse at least two credible sources. Keep the author or organization, title, publication date, and page or URL with each evidence note. Add citations and a source list.\n\nThis is a sample assignment brief. No teacher files or research sources have been imported.",
    rubric: ["Develop a clear central claim.", "Connect historical evidence to your claim.", "Cover domestic policy, foreign policy, and Watergate's effect on Nixon's legacy.", "Cite your evidence and include a source list.", "Organize and revise the three-page report in your own words."],
    units: [
      { id: "sample-history-plan", label: "Plan", prompt: "What will your report explain about Nixon's presidency?", draft: "My research question:\nHow should Nixon's presidency be evaluated?\n\nEvidence to find:\n- Domestic policy\n- Foreign policy\n- Watergate and public trust", cue: "We can start with the assignment, a research question, or your outline. Which part would you like help with?" },
      { id: "sample-history-intro", label: "Introduction", prompt: "Introduce your topic and the claim you will support.", draft: "", cue: "What is the main idea you want a reader to take away from your report?" },
      { id: "sample-history-domestic", label: "Domestic policy", prompt: "Explain one domestic policy and why it matters to your claim.", draft: "", cue: "What evidence have you found, and what does it help you explain?" },
      { id: "sample-history-foreign", label: "Foreign policy", prompt: "Explain a foreign-policy decision and connect it to your claim.", draft: "", cue: "Which source supports your point, and how will you explain the connection?" },
      { id: "sample-history-legacy", label: "Watergate & legacy", prompt: "Explain how Watergate affects your evaluation. Bring your report to a conclusion.", draft: "", cue: "How does this evidence change or strengthen the claim you started with?" },
      { id: "sample-history-sources", label: "Sources", prompt: "Collect the sources and citations used in your report.", draft: "", cue: "For each source, collect its author or organization, title, date, and page or URL. Which details do you already have?" },
    ],
  },
  biology: {
    course: "Biology", title: "Cell structure and functions",
    directions: "Identify each structure, describe its job, and connect that job to how a cell works.",
    sourceTitle: "Cell structure / sample assignment brief",
    source: "Review your cell diagram and class notes. Label the structures, describe their functions in your own words, and compare a plant cell with an animal cell.\n\nThis preview has no imported diagram or class notes.",
    rubric: ["Label the structures clearly.", "Explain each function in your own words.", "Support the comparison with details from your class materials."],
    units: [
      { id: "sample-biology-structures", label: "Structures", prompt: "Which structures can you identify in your cell diagram?", draft: "", cue: "Which structure would you like to start with?" },
      { id: "sample-biology-functions", label: "Functions", prompt: "Explain what each structure does for the cell.", draft: "", cue: "How would you explain that structure's job in your own words?" },
      { id: "sample-biology-compare", label: "Compare cells", prompt: "Compare a plant cell with an animal cell using your class materials.", draft: "", cue: "What similarities and differences can you support with your notes?" },
    ],
  },
};

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
export function resolveFixture(value?: string | string[]): FixtureId {
  const candidate = first(value);
  return FIXTURE_IDS.find(id => id === candidate) ?? "algebra";
}

export function lobbyWorkspaceFixture(taskId: string): FixtureId | null {
  return taskId === "history" ? "history" : taskId === "math" ? "algebra" : taskId === "biology" ? "biology" : taskId === "english" ? "english" : null;
}
export function resolveScenario(value?: string | string[]): Scenario {
  const candidate = first(value);
  return candidate === "empty" || candidate === "connection-unavailable" ? candidate : "draft";
}

export type UnitDraft = { text: string; ink: string; history: string[]; reviewedText: string | null; complete: boolean; question: string; messages: string[]; attachment: boolean };
export const workSnapshot = (unit: UnitDraft) => JSON.stringify([unit.text, unit.ink]);
type Work = { selected: string; units: Record<string, UnitDraft> };
export type PreviewState = { fixture: FixtureId; scenario: Scenario; work: Record<string, Work> };
export type PreviewAction =
  | { type: "fixture"; fixture: FixtureId }
  | { type: "scenario"; scenario: Scenario }
  | { type: "select"; id: string }
  | { type: "edit"; text: string }
  | { type: "ink"; ink: string }
  | { type: "question"; text: string }
  | { type: "attachment"; attached: boolean }
  | { type: "send" }
  | { type: "undo" }
  | { type: "review"; checked: boolean }
  | { type: "complete" };

export const workKey = (fixture: FixtureId, scenario: Scenario) => `${fixture}:${scenario}`;
export function createPreviewState(fixture: FixtureId = "algebra", scenario: Scenario = "draft"): PreviewState {
  const work: PreviewState["work"] = {};
  for (const id of FIXTURE_IDS) for (const state of SCENARIOS) {
    const assignment = FIXTURES[id];
    work[workKey(id, state)] = {
      selected: assignment.units[0].id,
      units: Object.fromEntries(assignment.units.map(unit => [unit.id, {
        text: state === "empty" ? "" : unit.draft, ink: "", history: [], reviewedText: null, complete: false, question: "", messages: [], attachment: false,
      }])),
    };
  }
  return { fixture, scenario, work };
}

export function unitStatus(unit: UnitDraft) {
  if (unit.complete) return "Complete locally";
  if (unit.reviewedText !== null && unit.reviewedText === workSnapshot(unit)) return "Self-reviewed";
  return unit.text.trim() || unit.ink ? "Draft" : "Not started";
}

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  if (action.type === "fixture") return { ...state, fixture: action.fixture };
  if (action.type === "scenario") return { ...state, scenario: action.scenario };
  const key = workKey(state.fixture, state.scenario);
  const work = state.work[key];
  if (action.type === "select") {
    if (!work.units[action.id]) return state;
    return { ...state, work: { ...state.work, [key]: { ...work, selected: action.id } } };
  }
  const unit = work.units[work.selected];
  let next = unit;
  if (action.type === "edit" && action.text !== unit.text) {
    next = { ...unit, text: action.text, history: [...unit.history, unit.text].slice(-100), reviewedText: null, complete: false };
  } else if (action.type === "ink" && action.ink !== unit.ink) {
    next = { ...unit, ink: action.ink, reviewedText: null, complete: false };
  } else if (action.type === "question") {
    next = { ...unit, question: action.text };
  } else if (action.type === "attachment") {
    next = { ...unit, attachment: action.attached };
  } else if (action.type === "send" && (unit.question.trim() || unit.attachment)) {
    next = { ...unit, question: "", attachment: false, messages: [...unit.messages, [unit.question.trim(), unit.attachment ? "[Sample image attached]" : ""].filter(Boolean).join("\n")].slice(-30) };
  } else if (action.type === "undo" && unit.history.length) {
    next = { ...unit, text: unit.history[unit.history.length - 1], history: unit.history.slice(0, -1), reviewedText: null, complete: false };
  } else if (action.type === "review") {
    next = { ...unit, reviewedText: action.checked && (unit.text.trim() || unit.ink) ? workSnapshot(unit) : null, complete: false };
  } else if (action.type === "complete" && (unit.text.trim() || unit.ink) && unit.reviewedText === workSnapshot(unit)) {
    next = { ...unit, complete: true };
  }
  if (next === unit) return state;
  return { ...state, work: { ...state.work, [key]: { ...work, units: { ...work.units, [work.selected]: next } } } };
}

export type FocusClock = { elapsedMs: number; startedAt: number | null };
export function elapsedFocus(clock: FocusClock, now: number) {
  return clock.elapsedMs + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt));
}
export function toggleFocus(clock: FocusClock, now: number): FocusClock {
  return clock.startedAt === null
    ? { ...clock, startedAt: now }
    : { elapsedMs: elapsedFocus(clock, now), startedAt: null };
}
