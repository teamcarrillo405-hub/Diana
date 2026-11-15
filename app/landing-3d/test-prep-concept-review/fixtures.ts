export const PREP_MODES = ["Event", "Scouting", "Training", "Playbook", "Review"] as const;
export type PrepMode = typeof PREP_MODES[number];
export type PracticeKind = "Mixed" | "Multiple choice" | "Written response";
export type TopicStatus = "priority" | "building" | "ready";

export type PrepTopic = {
  id: string;
  label: string;
  status: TopicStatus;
  note: string;
  nextRep: string;
};

export type PrepFixture = {
  id: "chemistry" | "english";
  course: string;
  courseCode: string;
  assessment: string;
  date: string;
  countdown: string;
  target: string;
  focus: string;
  nextRep: string;
  topics: PrepTopic[];
  plan: Array<{ day: string; label: string; state: "now" | "next" | "later" }>;
  records: Array<{ id: string; kind: PracticeKind; score: string; date: string; focus: string }>;
  sample: {
    prompt: string;
    answers: readonly string[];
    answer: number;
    explanation: string;
  };
};

export const PREP_FIXTURES: Record<PrepFixture["id"], PrepFixture> = {
  chemistry: {
    id: "chemistry",
    course: "Chemistry II",
    courseCode: "CHEM",
    assessment: "Unit 4 assessment",
    date: "Thursday, October 2",
    countdown: "8 DAYS",
    target: "Finish one mixed set with time to review it.",
    focus: "Stoichiometry and limiting reagents",
    nextRep: "12-question mixed set",
    topics: [
      { id: "stoich", label: "Stoichiometry", status: "priority", note: "Use the mole ratio before choosing a calculation path.", nextRep: "6 mixed questions" },
      { id: "limiting", label: "Limiting reagents", status: "priority", note: "Name the limiting reactant before finding yield.", nextRep: "4 written steps" },
      { id: "molar", label: "Molar mass", status: "building", note: "Keep units visible through each conversion.", nextRep: "Quick recall" },
      { id: "equations", label: "Balanced equations", status: "ready", note: "Use coefficients as ratios, never subscripts.", nextRep: "Warm-up check" },
    ],
    plan: [
      { day: "TODAY", label: "Run a short mixed set, then keep only the questions you want to revisit.", state: "now" },
      { day: "TOMORROW", label: "Work one limiting-reagent response with your notes open.", state: "next" },
      { day: "SATURDAY", label: "Use a timed practice set and record what you want to review.", state: "next" },
      { day: "NIGHT BEFORE", label: "Light recall only. Put your materials together and stop early.", state: "later" },
    ],
    records: [{ id: "chem-1", kind: "Mixed", score: "9 / 12", date: "SEP 18", focus: "Review limiting reagent setup" }],
    sample: {
      prompt: "A reaction has 3 mol of A and 8 mol of B. The balanced equation needs 1 mol of A for every 2 mol of B. Which reactant limits the reaction?",
      answers: ["A, because its ratio supports only 3 reaction groups.", "B, because it has more total moles.", "Neither, because both reactants are present.", "B, because the coefficients should be added."],
      answer: 0,
      explanation: "Compare each amount to the balanced ratio. Three mol of A needs six mol of B, so A is the limiting reactant.",
    },
  },
  english: {
    id: "english",
    course: "AP English Language",
    courseCode: "ENGL",
    assessment: "Argument practice exam",
    date: "Monday, May 11",
    countdown: "12 DAYS",
    target: "Complete one timed argument and review the commentary.",
    focus: "Evidence commentary and line of reasoning",
    nextRep: "One timed argument outline",
    topics: [
      { id: "commentary", label: "Commentary", status: "priority", note: "After evidence, explain how it advances the claim.", nextRep: "One paragraph revision" },
      { id: "reasoning", label: "Line of reasoning", status: "priority", note: "Each paragraph should move the claim forward once.", nextRep: "Outline checkpoint" },
      { id: "evidence", label: "Specific evidence", status: "building", note: "Choose evidence that can carry an explanation.", nextRep: "Evidence sort" },
      { id: "thesis", label: "Qualified claim", status: "ready", note: "State your position and leave room for nuance.", nextRep: "Warm-up claim" },
    ],
    plan: [
      { day: "TODAY", label: "Build one argument outline. Keep the thesis and first two reasons visible.", state: "now" },
      { day: "TOMORROW", label: "Revise one paragraph for commentary, not extra evidence.", state: "next" },
      { day: "SATURDAY", label: "Write a timed response, then annotate where your reasoning moves.", state: "next" },
      { day: "NIGHT BEFORE", label: "Read one outline and stop. Sleep is part of prep.", state: "later" },
    ],
    records: [{ id: "engl-1", kind: "Written response", score: "1 timed outline", date: "SEP 17", focus: "Add commentary after evidence" }],
    sample: {
      prompt: "Which revision most clearly makes the connection between a piece of evidence and an argument?",
      answers: ["It lists a second example without explaining it.", "It explains how the example supports the claim's reason.", "It repeats the thesis with stronger adjectives.", "It changes the transition but leaves the analysis out."],
      answer: 1,
      explanation: "Commentary names the relationship between evidence and the reason in the claim. Adding more evidence alone does not show that relationship.",
    },
  },
};

export type LocalRecord = PrepFixture["records"][number] & { local?: true };

export function scoreLabel(correct: string, total: string) {
  if (!correct.trim() || !total.trim()) return null;
  const earned = Number(correct);
  const possible = Number(total);
  if (!Number.isInteger(earned) || !Number.isInteger(possible) || possible <= 0 || earned < 0 || earned > possible) return null;
  return `${earned} / ${possible}`;
}
