import type { AssignmentKind } from "../supabase/types";

export type SeedContentPackId =
  | "algebra_1_linear_equations"
  | "biology_cell_energy"
  | "english_claim_evidence"
  | "us_history_reconstruction"
  | "ap_lang_rhetorical_analysis"
  | "apush_progressive_era"
  | "ap_biology_gene_expression";

export type SeedContentPack = {
  id: SeedContentPackId;
  title: string;
  subject: string;
  gradeBand: "9-10" | "10-12" | "AP";
  assignmentKinds: AssignmentKind[];
  sourceAnchors: Array<{
    id: string;
    label: string;
    excerpt: string;
  }>;
  studyGuideSections: Array<{
    heading: string;
    bullets: string[];
  }>;
  flashcards: Array<{
    front: string;
    back: string;
    sourceAnchorId: string;
  }>;
  practiceItems: Array<{
    prompt: string;
    studentMove: string;
    sourceAnchorId: string;
  }>;
  helperModes: Array<"guided_steps" | "visual_breakdown" | "retrieval_quiz" | "flashcard_builder">;
};

export const DIANA_SEED_CONTENT_PACKS: SeedContentPack[] = [
  {
    id: "algebra_1_linear_equations",
    title: "Algebra 1: Linear Equations",
    subject: "Math",
    gradeBand: "9-10",
    assignmentKinds: ["problem_set", "test_prep"],
    sourceAnchors: [
      { id: "a1", label: "Example 1", excerpt: "A linear equation keeps both sides balanced when the same operation is applied to each side." },
      { id: "a2", label: "Method note", excerpt: "Isolate the variable by undoing addition, subtraction, multiplication, or division." },
    ],
    studyGuideSections: [
      { heading: "What to notice", bullets: ["Name the variable.", "Name the operation attached to it.", "Undo one operation at a time."] },
    ],
    flashcards: [
      { front: "What does isolate the variable mean?", back: "Get the variable by itself while keeping the equation balanced.", sourceAnchorId: "a2" },
      { front: "Why do we do the same operation to both sides?", back: "It preserves equality.", sourceAnchorId: "a1" },
    ],
    practiceItems: [
      { prompt: "Before solving, what operation is attached to x?", studentMove: "Write the operation before doing arithmetic.", sourceAnchorId: "a2" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
  {
    id: "biology_cell_energy",
    title: "Biology: Cell Energy",
    subject: "Biology",
    gradeBand: "9-10",
    assignmentKinds: ["lab", "reading", "test_prep"],
    sourceAnchors: [
      { id: "b1", label: "Paragraph 2", excerpt: "Photosynthesis stores energy in glucose, while cellular respiration releases usable energy from glucose." },
      { id: "b2", label: "Diagram caption", excerpt: "Chloroplasts and mitochondria are organelles involved in energy transformation." },
    ],
    studyGuideSections: [
      { heading: "Core relationship", bullets: ["Photosynthesis stores energy.", "Respiration releases usable energy.", "The two processes connect through glucose and oxygen."] },
    ],
    flashcards: [
      { front: "What does photosynthesis store?", back: "Energy in glucose.", sourceAnchorId: "b1" },
      { front: "Which organelles connect to cell energy?", back: "Chloroplasts and mitochondria.", sourceAnchorId: "b2" },
    ],
    practiceItems: [
      { prompt: "What evidence would show energy was transformed?", studentMove: "Name the molecule or organelle from the source.", sourceAnchorId: "b2" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
  {
    id: "english_claim_evidence",
    title: "English: Claim, Evidence, Reasoning",
    subject: "English",
    gradeBand: "9-10",
    assignmentKinds: ["essay", "reading"],
    sourceAnchors: [
      { id: "e1", label: "Rubric row 1", excerpt: "A strong claim answers the prompt and can be supported by evidence." },
      { id: "e2", label: "Rubric row 2", excerpt: "Reasoning explains how evidence supports the claim." },
    ],
    studyGuideSections: [
      { heading: "Paragraph structure", bullets: ["Claim answers the prompt.", "Evidence comes from the text.", "Reasoning explains the connection."] },
    ],
    flashcards: [
      { front: "What does a claim do?", back: "It answers the prompt in a supportable way.", sourceAnchorId: "e1" },
      { front: "What does reasoning do?", back: "It explains how evidence supports the claim.", sourceAnchorId: "e2" },
    ],
    practiceItems: [
      { prompt: "Which part of your sentence is the claim?", studentMove: "Underline the words that answer the prompt.", sourceAnchorId: "e1" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
  {
    id: "us_history_reconstruction",
    title: "US History: Reconstruction",
    subject: "US History",
    gradeBand: "10-12",
    assignmentKinds: ["reading", "essay", "test_prep"],
    sourceAnchors: [
      { id: "h1", label: "Source A", excerpt: "The Reconstruction Amendments changed citizenship, voting rights, and equal protection under law." },
      { id: "h2", label: "Source B", excerpt: "Local resistance and federal policy shaped how Reconstruction changed daily life." },
    ],
    studyGuideSections: [
      { heading: "Historical thinking", bullets: ["Separate legal change from lived experience.", "Use context before judging impact.", "Track cause and effect over time."] },
    ],
    flashcards: [
      { front: "What did the Reconstruction Amendments affect?", back: "Citizenship, voting rights, and equal protection.", sourceAnchorId: "h1" },
      { front: "Why does context matter in Reconstruction?", back: "Policy and local resistance shaped outcomes.", sourceAnchorId: "h2" },
    ],
    practiceItems: [
      { prompt: "What changed legally, and what changed in daily life?", studentMove: "Make a two-column evidence note.", sourceAnchorId: "h1" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
  {
    id: "ap_lang_rhetorical_analysis",
    title: "AP Lang: Rhetorical Analysis",
    subject: "AP Lang",
    gradeBand: "AP",
    assignmentKinds: ["essay", "test_prep"],
    sourceAnchors: [
      { id: "l1", label: "Prompt task", excerpt: "Analyze the rhetorical choices the writer makes to develop an argument." },
      { id: "l2", label: "Rubric evidence", excerpt: "Commentary explains how evidence supports the line of reasoning." },
    ],
    studyGuideSections: [
      { heading: "FRQ moves", bullets: ["Name the rhetorical choice.", "Connect it to audience or purpose.", "Explain the effect on the argument."] },
    ],
    flashcards: [
      { front: "What should AP Lang analysis focus on?", back: "Rhetorical choices and how they develop the argument.", sourceAnchorId: "l1" },
      { front: "What does commentary need to do?", back: "Explain how evidence supports the line of reasoning.", sourceAnchorId: "l2" },
    ],
    practiceItems: [
      { prompt: "Which rhetorical choice is visible in the passage?", studentMove: "Name one choice before drafting commentary.", sourceAnchorId: "l1" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
  {
    id: "apush_progressive_era",
    title: "APUSH: Progressive Era Reform",
    subject: "APUSH",
    gradeBand: "AP",
    assignmentKinds: ["reading", "essay", "test_prep"],
    sourceAnchors: [
      { id: "p1", label: "Topic note", excerpt: "Progressive reformers responded to industrialization, urbanization, political corruption, and inequality." },
      { id: "p2", label: "DBQ move", excerpt: "A strong response groups documents by argument, not by document order." },
    ],
    studyGuideSections: [
      { heading: "APUSH moves", bullets: ["Tie reform to a problem.", "Group evidence by argument.", "Explain continuity and change."] },
    ],
    flashcards: [
      { front: "What problems did Progressive reformers respond to?", back: "Industrialization, urbanization, corruption, and inequality.", sourceAnchorId: "p1" },
      { front: "How should DBQ documents be grouped?", back: "By argument, not document order.", sourceAnchorId: "p2" },
    ],
    practiceItems: [
      { prompt: "Which reform problem does this document connect to?", studentMove: "Label the problem before writing the paragraph.", sourceAnchorId: "p1" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
  {
    id: "ap_biology_gene_expression",
    title: "AP Biology: Gene Expression",
    subject: "AP Biology",
    gradeBand: "AP",
    assignmentKinds: ["lab", "reading", "test_prep"],
    sourceAnchors: [
      { id: "g1", label: "Process note", excerpt: "Gene expression includes transcription from DNA to RNA and translation from RNA to protein." },
      { id: "g2", label: "Data note", excerpt: "Regulatory sequences and environmental conditions can affect when genes are expressed." },
    ],
    studyGuideSections: [
      { heading: "Process map", bullets: ["DNA is transcribed into RNA.", "RNA is translated into protein.", "Regulation changes timing and amount."] },
    ],
    flashcards: [
      { front: "What are the two main steps of gene expression?", back: "Transcription and translation.", sourceAnchorId: "g1" },
      { front: "What can affect gene expression?", back: "Regulatory sequences and environmental conditions.", sourceAnchorId: "g2" },
    ],
    practiceItems: [
      { prompt: "Where is the regulation happening in this example?", studentMove: "Point to the sequence or condition in the source.", sourceAnchorId: "g2" },
    ],
    helperModes: ["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"],
  },
];

export function seedContentReadiness() {
  const requiredSubjects = ["Math", "Biology", "English", "US History", "AP Lang", "APUSH", "AP Biology"];
  const availableSubjects = new Set(DIANA_SEED_CONTENT_PACKS.map((pack) => pack.subject));
  const missingSubjects = requiredSubjects.filter((subject) => !availableSubjects.has(subject));
  const packsWithAnchors = DIANA_SEED_CONTENT_PACKS.filter((pack) =>
    pack.sourceAnchors.length >= 2 &&
    pack.flashcards.every((card) => pack.sourceAnchors.some((anchor) => anchor.id === card.sourceAnchorId)) &&
    pack.practiceItems.every((item) => pack.sourceAnchors.some((anchor) => anchor.id === item.sourceAnchorId)),
  ).length;
  return {
    requiredSubjects,
    missingSubjects,
    packCount: DIANA_SEED_CONTENT_PACKS.length,
    packsWithAnchors,
    ready: missingSubjects.length === 0 && packsWithAnchors === DIANA_SEED_CONTENT_PACKS.length,
  };
}
