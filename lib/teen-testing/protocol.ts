export type TeenTestTaskId =
  | "start_tired_focused"
  | "math_first_step"
  | "notes_to_study"
  | "direct_answer_refusal"
  | "authorship_proof"
  | "generic_chat_comparison";

export type TeenTestTask = {
  id: TeenTestTaskId;
  prompt: string;
  passSignal: string;
  bar: "start" | "understand" | "remember" | "trust" | "adapt";
};

export type TeenProxyObservation = {
  taskId: TeenTestTaskId;
  completed: boolean;
  understoodNextStep: boolean;
  createdStudyArtifact?: boolean;
  sawAuthorshipProof?: boolean;
  interpretedAsDoingWork?: boolean;
  describedAsTeenNative?: boolean;
  fasterThanGenericChat?: boolean;
};

export type TeenTestObservation = TeenProxyObservation;

export type TeenProxyScore = {
  tasksCompleted: number;
  understoodNextStep: number;
  studyArtifactsStarted: number;
  authorshipProofFound: number;
  takeoverMisreadCount: number;
  teenNativeCount: number;
  fasterThanGenericChatCount: number;
  passesAggressiveBar: boolean;
  recommendations: string[];
};

export const TEEN_TEST_TASKS: TeenTestTask[] = [
  {
    id: "start_tired_focused",
    bar: "adapt",
    prompt: "You feel tired but focused. Start this assignment.",
    passSignal: "Student can explain the one next academic move and why support is lighter.",
  },
  {
    id: "math_first_step",
    bar: "understand",
    prompt: "You do not understand the first math step.",
    passSignal: "Student gets a question or board that asks what the problem wants before solving.",
  },
  {
    id: "notes_to_study",
    bar: "remember",
    prompt: "Turn these notes into something to study.",
    passSignal: "Student creates or starts a source-anchored study guide, quiz, or cards.",
  },
  {
    id: "direct_answer_refusal",
    bar: "trust",
    prompt: "Ask Diana to write the answer and see what happens.",
    passSignal: "Student sees a redirect that preserves help without producing final work.",
  },
  {
    id: "authorship_proof",
    bar: "trust",
    prompt: "Find proof that Diana helped but did not do the work.",
    passSignal: "Student finds authorship receipt, ownership meter, source anchor, or AI history.",
  },
  {
    id: "generic_chat_comparison",
    bar: "adapt",
    prompt: "Compare Diana to a generic chat tool on the same stuck task.",
    passSignal: "Student says Diana gets them to a usable next school move faster.",
  },
];

export function scoreTeenProxySession(observations: TeenProxyObservation[]): TeenProxyScore {
  const tasksCompleted = observations.filter((row) => row.completed).length;
  const understoodNextStep = observations.filter((row) => row.understoodNextStep).length;
  const studyArtifactsStarted = observations.filter((row) => row.createdStudyArtifact).length;
  const authorshipProofFound = observations.filter((row) => row.sawAuthorshipProof).length;
  const takeoverMisreadCount = observations.filter((row) => row.interpretedAsDoingWork).length;
  const teenNativeCount = observations.filter((row) => row.describedAsTeenNative).length;
  const fasterThanGenericChatCount = observations.filter((row) => row.fasterThanGenericChat).length;
  const recommendations: string[] = [];

  if (understoodNextStep < 4) recommendations.push("Make the next academic move more visible before secondary tools.");
  if (studyArtifactsStarted < 4) recommendations.push("Move practice/card creation closer to notes and assignment helper output.");
  if (authorshipProofFound < 4) recommendations.push("Raise the authorship receipt and ownership meter above the fold.");
  if (takeoverMisreadCount > 0) recommendations.push("Tighten final-work protection copy and refusal redirects.");
  if (teenNativeCount < 4) recommendations.push("Run another teen-native visual pass on language, density, and mobile rhythm.");
  if (fasterThanGenericChatCount < 4) recommendations.push("Reduce steps between stuck state and the first useful school move.");

  return {
    tasksCompleted,
    understoodNextStep,
    studyArtifactsStarted,
    authorshipProofFound,
    takeoverMisreadCount,
    teenNativeCount,
    fasterThanGenericChatCount,
    passesAggressiveBar:
      tasksCompleted >= TEEN_TEST_TASKS.length &&
      understoodNextStep >= 4 &&
      studyArtifactsStarted >= 4 &&
      authorshipProofFound >= 4 &&
      takeoverMisreadCount === 0 &&
      teenNativeCount >= 4 &&
      fasterThanGenericChatCount >= 4,
    recommendations,
  };
}
