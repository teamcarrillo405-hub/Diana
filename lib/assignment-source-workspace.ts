import type { AssignmentSourcePacket } from "@/lib/assignment-sources";
import type { AssignmentWorkProfile, SubjectDomain } from "@/lib/assignment-profile";

export type AssignmentWorkspaceSourceCard = {
  label: string;
  text: string;
  citation: string | null;
};

export type AssignmentWorkspaceSourceSeed = {
  subjectDomain: SubjectDomain;
  confidence: number;
  needsConfirmation: boolean;
  cards: AssignmentWorkspaceSourceCard[];
  checklist: AssignmentWorkspaceSourceCard[];
  fieldHints: Record<string, string>;
};

const FIELD_HINTS_BY_DOMAIN: Partial<Record<SubjectDomain, Record<string, string>>> = {
  english_language_arts: {
    writingThesis: "Use the prompt and rubric to write your own claim.",
    writingPlan: "Put evidence in the order the prompt asks for.",
    draft: "Write in your own words and cite the source when required.",
  },
  social_studies: {
    historySource: "Start with who made each source, when, and what it says.",
    historyEvidence: "Pull exact evidence from the packet with the document or page.",
    historyClaim: "Make a historical claim that the evidence can support.",
    historyResponse: "Use source evidence and context in your own words.",
  },
  science: {
    labQuestion: "Copy the investigation question or purpose from the source.",
    labHypothesis: "Use the variables and science concept to make a testable prediction.",
    labData: "Record measurements, units, and observations from the lab material.",
    labAnalysis: "Connect patterns in the data to the science idea.",
    labConclusion: "Answer the investigation question using evidence.",
  },
  world_language: {
    languagePrompt: "Use the target prompt or vocabulary set from the assignment source.",
    languageAttempt: "Write or record your own first attempt.",
    languageNotes: "Track grammar, vocabulary, or pronunciation notes.",
  },
  computer_science: {
    codeTask: "Use the source requirements, inputs, outputs, and constraints.",
    codePlan: "List one small test before implementation.",
    codeWork: "Write your own code or pseudocode.",
    codeTests: "Record expected and actual results.",
  },
  visual_arts: {
    artBrief: "Pull the required medium, theme, and constraints from the source.",
    artConcept: "Describe your own idea and references.",
    artProcess: "Track studies, revisions, materials, or critique notes.",
    artStatement: "Explain your choices using the rubric language.",
  },
  music: {
    artBrief: "Pull the notation, composition, or performance requirement from the source.",
    artProcess: "Track practice, measures, timing, and revisions.",
    artStatement: "Reflect on musical choices and evidence.",
  },
  theatre: {
    artBrief: "Pull the script, scene, or performance requirement from the source.",
    artProcess: "Track beats, blocking, rehearsal notes, and feedback.",
    artStatement: "Reflect on performance choices using evidence.",
  },
  dance: {
    artBrief: "Pull the movement phrase, counts, or choreography requirement from the source.",
    artProcess: "Track practice, feedback, and safe revision choices.",
    artStatement: "Reflect on movement choices and evidence.",
  },
  physical_education: {
    projectGoal: "Use the skill or movement goal from the assignment source.",
    projectPlan: "Plan safe practice and evidence collection.",
    projectNotes: "Record practice evidence and reflection.",
  },
  health: {
    writingThesis: "Keep the response educational and avoid oversharing personal health details.",
    draft: "Use class concepts and trusted source facts in your own words.",
  },
  accounting: {
    worksheetQuestion: "Identify each transaction or accounting task from the source.",
    worksheetWork: "Show accounts affected, debit/credit, and calculations.",
    worksheetResponse: "Explain the result and check that totals balance.",
  },
  economics: {
    researchQuestion: "Name the economic concept or model from the source.",
    researchSources: "Track data, graph labels, and evidence.",
    researchClaim: "Make a cause/effect or model-based claim.",
    researchDraft: "Explain the model using source evidence.",
  },
  geography: {
    historySource: "Identify the map, place, scale, and data source.",
    historyEvidence: "Record spatial patterns, map features, and evidence.",
    historyClaim: "Make a spatial pattern claim.",
    historyResponse: "Explain the pattern without exposing precise personal location data.",
  },
  engineering: {
    projectGoal: "Pull the problem, criteria, and constraints from the source.",
    projectDeliverables: "List required drawings, calculations, prototypes, or evidence.",
    projectPlan: "Plan sketch, build, test, and iteration steps.",
    projectNotes: "Track decisions, tests, and revisions.",
  },
  trade_cte: {
    projectGoal: "Pull the approved task, safety boundary, and evidence requirement.",
    projectDeliverables: "List required photos, checklist items, or reflection evidence.",
    projectPlan: "Follow teacher-approved procedure only.",
    projectNotes: "Record evidence and reflection without inventing unsafe steps.",
  },
  cad: {
    projectGoal: "Pull dimensions, constraints, and required file type from the source.",
    projectDeliverables: "List required sketch, CAD model, export, or reflection.",
    projectPlan: "Plan dimensions, model steps, and checks.",
    projectNotes: "Track revisions and measurements.",
  },
  advanced_technical_labs: {
    labQuestion: "Pull the technical lab purpose and measurement target.",
    labData: "Record data, units, instrument notes, and uncertainty.",
    labAnalysis: "Connect calculations and test results.",
    labConclusion: "State what the test evidence supports.",
  },
};

function excerpt(value: string, max = 320): string {
  const text = value.replace(/\s+/gu, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function sourceCards(packet: AssignmentSourcePacket): AssignmentWorkspaceSourceCard[] {
  return (packet.items ?? [])
    .filter((item) => item.text.trim().length > 0)
    .slice(0, 5)
    .map((item, index) => ({
      label: item.title || `Source ${index + 1}`,
      text: excerpt(item.text),
      citation: item.citation,
    }));
}

function checklistCards(packet: AssignmentSourcePacket): AssignmentWorkspaceSourceCard[] {
  const requirements = (packet.requirements ?? []).map((item) => ({
    label: item.label,
    text: item.text,
    citation: item.sourceCitation,
  }));
  const rubric = (packet.rubricCriteria ?? []).map((item) => ({
    label: item.label,
    text: item.text,
    citation: item.sourceCitation,
  }));
  return [...requirements, ...rubric].slice(0, 8);
}

export function buildWorkspaceSourceSeed(
  profile: AssignmentWorkProfile,
  packet: AssignmentSourcePacket,
): AssignmentWorkspaceSourceSeed {
  const confidence = typeof packet.importConfidence === "number" ? packet.importConfidence : 0;
  return {
    subjectDomain: profile.subjectDomain,
    confidence,
    needsConfirmation: confidence > 0 && confidence < 0.7,
    cards: sourceCards(packet),
    checklist: checklistCards(packet),
    fieldHints: FIELD_HINTS_BY_DOMAIN[profile.subjectDomain] ?? {},
  };
}
