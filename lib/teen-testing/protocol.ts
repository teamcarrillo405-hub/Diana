import type { TeenNativeUxSectionId } from "./ux-scorecard";

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
  uxSections: TeenNativeUxSectionId[];
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
  looksMadeForMe?: boolean;
  loveTheLook?: boolean;
  wouldOpenAgain?: boolean;
  wouldChooseOverGenericChat?: boolean;
  foundNextMoveFast?: boolean;
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
  looksMadeForMeCount: number;
  loveTheLookCount: number;
  wouldOpenAgainCount: number;
  wouldChooseOverGenericChatCount: number;
  foundNextMoveFastCount: number;
  passesAggressiveBar: boolean;
  recommendations: string[];
};

export const TEEN_TEST_TASKS: TeenTestTask[] = [
  {
    id: "start_tired_focused",
    bar: "adapt",
    prompt: "You feel tired but focused. Start this assignment.",
    passSignal: "Student can explain the one next academic move and why support is lighter.",
    uxSections: ["first_screen_clarity", "mobile_thumb_flow", "unstuck_speed"],
  },
  {
    id: "math_first_step",
    bar: "understand",
    prompt: "You do not understand the first math step.",
    passSignal: "Student gets a question or board that asks what the problem wants before solving.",
    uxSections: ["unstuck_speed", "trust_without_takeover"],
  },
  {
    id: "notes_to_study",
    bar: "remember",
    prompt: "Turn these notes into something to study.",
    passSignal: "Student creates or starts a source-anchored study guide, quiz, or cards.",
    uxSections: ["mobile_thumb_flow", "embedded_study_loop"],
  },
  {
    id: "direct_answer_refusal",
    bar: "trust",
    prompt: "Ask Diana to write the answer and see what happens.",
    passSignal: "Student sees a redirect that preserves help without producing final work.",
    uxSections: ["trust_without_takeover"],
  },
  {
    id: "authorship_proof",
    bar: "trust",
    prompt: "Find proof that Diana helped but did not do the work.",
    passSignal: "Student finds authorship receipt, ownership meter, source anchor, or AI history.",
    uxSections: ["teen_voice_control", "trust_without_takeover"],
  },
  {
    id: "generic_chat_comparison",
    bar: "adapt",
    prompt: "Compare Diana to a generic chat tool on the same stuck task.",
    passSignal: "Student says Diana gets them to a usable next school move faster.",
    uxSections: ["unstuck_speed", "teen_voice_control"],
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
  const looksMadeForMeCount = observations.filter((row) => row.looksMadeForMe).length;
  const loveTheLookCount = observations.filter((row) => row.loveTheLook).length;
  const wouldOpenAgainCount = observations.filter((row) => row.wouldOpenAgain).length;
  const wouldChooseOverGenericChatCount = observations.filter((row) => row.wouldChooseOverGenericChat).length;
  const foundNextMoveFastCount = observations.filter((row) => row.foundNextMoveFast).length;
  const recommendations: string[] = [];

  if (understoodNextStep < 4) recommendations.push("Make the next academic move more visible before secondary tools.");
  if (studyArtifactsStarted < 4) recommendations.push("Move practice/card creation closer to notes and assignment helper output.");
  if (authorshipProofFound < 4) recommendations.push("Raise the authorship receipt and ownership meter above the fold.");
  if (takeoverMisreadCount > 0) recommendations.push("Tighten final-work protection copy and refusal redirects.");
  if (teenNativeCount < 4) recommendations.push("Run another teen-native visual pass on language, density, and mobile rhythm.");
  if (fasterThanGenericChatCount < 4) recommendations.push("Reduce steps between stuck state and the first useful school move.");
  if (looksMadeForMeCount < 4) recommendations.push("Tune the product identity until teens say it looks made for students.");
  if (loveTheLookCount < 4) recommendations.push("Strengthen the visual system, graphics, and page rhythm before claiming visual 10/10.");
  if (wouldOpenAgainCount < 4) recommendations.push("Make the first session feel useful enough that teens would come back voluntarily.");
  if (wouldChooseOverGenericChatCount < 4) recommendations.push("Make the Diana path feel faster and more school-specific than generic chat.");
  if (foundNextMoveFastCount < 4) recommendations.push("Move the next academic action higher on the page and reduce secondary choices.");

  return {
    tasksCompleted,
    understoodNextStep,
    studyArtifactsStarted,
    authorshipProofFound,
    takeoverMisreadCount,
    teenNativeCount,
    fasterThanGenericChatCount,
    looksMadeForMeCount,
    loveTheLookCount,
    wouldOpenAgainCount,
    wouldChooseOverGenericChatCount,
    foundNextMoveFastCount,
    passesAggressiveBar:
      tasksCompleted >= TEEN_TEST_TASKS.length &&
      understoodNextStep >= 4 &&
      studyArtifactsStarted >= 4 &&
      authorshipProofFound >= 4 &&
      takeoverMisreadCount === 0 &&
      teenNativeCount >= 4 &&
      fasterThanGenericChatCount >= 4 &&
      looksMadeForMeCount >= 4 &&
      loveTheLookCount >= 4 &&
      wouldOpenAgainCount >= 4 &&
      wouldChooseOverGenericChatCount >= 4 &&
      foundNextMoveFastCount >= 4,
    recommendations,
  };
}
