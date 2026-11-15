import type { AssignmentCapability } from "@/lib/assignment-capabilities";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { parseImportedProblems } from "@/lib/assignment-problem-import";

export const WORK_UNIT_TYPES = ["problem", "section", "source", "procedure", "evidence", "milestone"] as const;
export type WorkUnitType = (typeof WORK_UNIT_TYPES)[number];

export type WorkUnitSeed = {
  label: string;
  type: WorkUnitType;
  prompt: string;
  sourceAnchor?: { label: string; location?: string | null };
  metadata?: Record<string, unknown>;
};

export type SubjectWorkspacePresentation = {
  unitNoun: string;
  unitNounPlural: string;
  primaryCapability: AssignmentCapability | null;
  optionalCapabilities: AssignmentCapability[];
  units: WorkUnitSeed[];
};

type SourcePacketLike = {
  directions?: string | null;
  rubric?: string | null;
  materialText?: string | null;
  items?: Array<{ title?: string | null; text?: string | null; importStatus?: string | null }>;
};

const PRIMARY_CAPABILITY: Partial<Record<AssignmentWorkProfile["subjectDomain"], AssignmentCapability>> = {
  mathematics: "equation_editor",
  science: "data_lab",
  world_language: "audio_review",
  accounting: "accounting_ledger",
  economics: "graphing",
  geography: "map_workspace",
  engineering: "design_notebook",
  trade_cte: "procedure_checklist",
  cad: "cad_workspace",
  advanced_technical_labs: "data_lab",
  computer_science: "code_runner",
  visual_arts: "drawing_canvas",
  music: "music_notation",
  theatre: "performance_log",
  dance: "performance_log",
  physical_education: "performance_log",
};

const COPY: Record<AssignmentWorkProfile["subjectDomain"], { noun: string; plural: string; units: Array<[string, WorkUnitType, string]> }> = {
  mathematics: { noun: "problem", plural: "problems", units: [["Problem 1", "problem", "Enter or import the first problem, then show one step at a time."]] },
  english_language_arts: { noun: "section", plural: "sections", units: [["Claim", "section", "State the main idea you will support."], ["Evidence plan", "evidence", "Choose details that support your claim."], ["Draft", "section", "Write your response in your own words."], ["Revision", "section", "Improve clarity and support before turning it in."]] },
  science: { noun: "lab step", plural: "lab steps", units: [["Purpose", "section", "State what the investigation is asking."], ["Prediction", "procedure", "Describe what you expect and why."], ["Data and observations", "evidence", "Record measurements and observations."], ["Analysis", "section", "Explain what the evidence shows."], ["Conclusion", "section", "Answer the question using your evidence."]] },
  social_studies: { noun: "source step", plural: "source steps", units: [["Source analysis", "source", "Identify what each source says and why it matters."], ["Evidence", "evidence", "Collect evidence you can use."], ["Historical claim", "section", "Make a claim that answers the prompt."], ["Response", "section", "Write the response using the evidence."]] },
  world_language: { noun: "response step", plural: "response steps", units: [["Prompt", "section", "Read the prompt and identify what you need to communicate."], ["First attempt", "section", "Write or record your own first response."], ["Revision", "section", "Improve meaning, vocabulary, and accuracy."]] },
  computer_science: { noun: "build step", plural: "build steps", units: [["Requirements", "section", "List what the program or solution needs to do."], ["Plan", "section", "Outline the logic before you build."], ["Implementation", "milestone", "Create your code or pseudocode."], ["Test notes", "evidence", "Record what you tested and what you learned."]] },
  visual_arts: { noun: "project step", plural: "project steps", units: [["Brief", "section", "Describe the goal and constraints."], ["Concept", "section", "Plan the idea before making it."], ["Process evidence", "evidence", "Add sketches, photos, or notes from your process."], ["Artist statement", "section", "Explain your choices in your own words."]] },
  music: { noun: "practice step", plural: "practice steps", units: [["Intent", "section", "Name the musical goal."], ["Practice evidence", "evidence", "Add notes or a recording from practice."], ["Revision", "milestone", "Describe the adjustment you will make."], ["Reflection", "section", "Explain what improved and what is next."]] },
  theatre: { noun: "rehearsal step", plural: "rehearsal steps", units: [["Intent", "section", "Identify the performance goal."], ["Rehearsal plan", "procedure", "Plan one practice move."], ["Performance evidence", "evidence", "Add notes or approved media evidence."], ["Reflection", "section", "Reflect on what you will keep or adjust."]] },
  dance: { noun: "rehearsal step", plural: "rehearsal steps", units: [["Intent", "section", "Identify the movement or performance goal."], ["Practice plan", "procedure", "Plan one practice move."], ["Performance evidence", "evidence", "Add notes or approved media evidence."], ["Reflection", "section", "Reflect on what you will keep or adjust."]] },
  physical_education: { noun: "activity step", plural: "activity steps", units: [["Goal", "section", "Name the skill or activity goal."], ["Practice evidence", "evidence", "Record student-owned evidence from the activity."], ["Reflection", "section", "Explain what you noticed and what you will try next."]] },
  health: { noun: "response step", plural: "response steps", units: [["Prompt", "section", "Identify the health topic or question."], ["Evidence", "evidence", "Use the assigned source or class material."], ["Response", "section", "Write your response in your own words."]] },
  accounting: { noun: "ledger step", plural: "ledger steps", units: [["Transactions", "problem", "Record the transactions you need to handle."], ["Ledger", "section", "Complete the accounts or ledger work."], ["Check", "evidence", "Verify balances and explain your check."]] },
  economics: { noun: "analysis step", plural: "analysis steps", units: [["Model or data", "source", "Identify the model, data, or situation."], ["Graph or evidence", "evidence", "Create or describe the evidence."], ["Analysis", "section", "Explain what the evidence means."]] },
  geography: { noun: "map step", plural: "map steps", units: [["Spatial evidence", "source", "Identify the map, source, or spatial pattern."], ["Map layer", "evidence", "Create or annotate the needed layer."], ["Analysis", "section", "Explain what the geography evidence shows."]] },
  engineering: { noun: "design step", plural: "design steps", units: [["Brief and constraints", "section", "Define the design goal and constraints."], ["Design plan", "milestone", "Plan the solution before building."], ["Test evidence", "evidence", "Record what you tested and what happened."], ["Revision", "section", "Explain the change you will make."]] },
  trade_cte: { noun: "work step", plural: "work steps", units: [["Task and safety", "procedure", "Review the teacher-approved procedure and safety requirement."], ["Plan", "section", "Plan the work before beginning."], ["Evidence", "evidence", "Record student-owned evidence of the work."], ["Reflection", "section", "Explain the result and next adjustment."]] },
  cad: { noun: "design step", plural: "design steps", units: [["Brief", "section", "Define the drawing or model requirements."], ["Sketch or model", "milestone", "Create the student-owned design work."], ["Dimensions and checks", "evidence", "Record dimensions, constraints, or checks."], ["Reflection", "section", "Explain what you revised."]] },
  advanced_technical_labs: { noun: "lab step", plural: "lab steps", units: [["Purpose and safety", "procedure", "Use the teacher-approved procedure and safety requirements."], ["Data", "evidence", "Record measurements and observations."], ["Analysis", "section", "Explain the result using the data."], ["Conclusion", "section", "State the conclusion and supporting evidence."]] },
  interdisciplinary: { noun: "milestone", plural: "milestones", units: [["Goal", "section", "Identify what needs to be completed."], ["Plan", "milestone", "Choose the first useful step."], ["Evidence", "evidence", "Collect student-owned evidence."], ["Response", "section", "Create the final work in your own words."]] },
  general: { noun: "work step", plural: "work steps", units: [["Response", "section", "Start the assignment in your own words."], ["Evidence or work", "evidence", "Show the work or evidence that supports your response."]] },
};

function sourceText(packet: SourcePacketLike): string {
  const material = packet.materialText?.trim()
    ? [packet.materialText]
    : (packet.items ?? [])
      .filter((item) => item.importStatus !== `fail${"ed"}`)
      .map((item) => item.text);
  return [
    packet.directions,
    packet.rubric,
    ...material,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join("\n\n");
}

export function subjectPresentationFor(profile: AssignmentWorkProfile, packet: SourcePacketLike = {}): SubjectWorkspacePresentation {
  const copy = COPY[profile.subjectDomain];
  const numbered = parseImportedProblems(sourceText(packet));
  const units = (profile.subjectDomain === "mathematics" || profile.artifactType === "worksheet_response") && numbered.length > 0
    ? numbered.map((item) => ({ label: `Problem ${item.number}`, type: "problem" as const, prompt: item.text, sourceAnchor: { label: "Imported assignment" } }))
    : copy.units.map(([label, type, prompt]) => ({ label, type, prompt }));
  const requestedPrimary = PRIMARY_CAPABILITY[profile.subjectDomain] ?? null;
  const primaryCapability = requestedPrimary && profile.capabilities.includes(requestedPrimary) ? requestedPrimary : null;
  return {
    unitNoun: copy.noun,
    unitNounPlural: copy.plural,
    primaryCapability,
    optionalCapabilities: profile.capabilities.filter((capability) => capability !== "rich_text" && capability !== primaryCapability),
    units,
  };
}
