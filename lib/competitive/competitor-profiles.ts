import type { CompetitorId } from "./capability-matrix";

export type CompetitorProfile = {
  id: Exclude<CompetitorId, "diana">;
  name: string;
  officialUrl: string;
  owns: string[];
  dianaResponse: string[];
  honestLimit: string;
};

export const COMPETITOR_PROFILES: CompetitorProfile[] = [
  {
    id: "chatgpt_study_mode",
    name: "ChatGPT Study Mode",
    officialUrl: "https://openai.com/index/chatgpt-study-mode/",
    owns: [
      "general-purpose step-by-step tutoring",
      "Socratic prompts and knowledge checks",
      "broad model flexibility across topics",
    ],
    dianaResponse: [
      "ties each guided turn to the real assignment",
      "blocks final-work generation with source-anchored redirects",
      "uses student-state rules to decide how much help to show",
    ],
    honestLimit: "Diana should not claim broader world knowledge or raw explanation depth parity without live model evaluations.",
  },
  {
    id: "gemini_guided_learning",
    name: "Gemini Guided Learning",
    officialUrl: "https://blog.google/products-and-platforms/products/education/guided-learning/",
    owns: [
      "guided breakdowns",
      "rich multimodal responses",
      "interactive quizzes and visual explanations",
    ],
    dianaResponse: [
      "creates source-anchored subject boards from class material",
      "keeps visual learning text-structured and inspectable",
      "turns every visual block into a next student action",
    ],
    honestLimit: "Diana should not claim video, image, or broad multimodal parity until those surfaces exist and pass QA.",
  },
  {
    id: "khanmigo",
    name: "Khanmigo",
    officialUrl: "https://khanmigo.ai/",
    owns: [
      "institutional education trust",
      "Socratic answer-safe tutoring",
      "Khan Academy content integration",
    ],
    dianaResponse: [
      "shows assignment-specific authorship receipts",
      "logs help-without-taking-over proof",
      "separates sensitive readiness data from share views",
    ],
    honestLimit: "Diana should not claim Khan Academy content depth or district trust parity without partnerships and usage data.",
  },
  {
    id: "quizlet_ai_tools",
    name: "Quizlet AI Study Tools",
    officialUrl: "https://quizlet.com/features/ai-study-tools",
    owns: [
      "flashcard maturity",
      "practice tests",
      "large study content network",
    ],
    dianaResponse: [
      "preserves source anchors from assignment to cards",
      "connects artifacts to FSRS review and mastery signals",
      "adapts future support from recall history",
    ],
    honestLimit: "Diana should not claim library scale, social sharing scale, or polished study-game depth parity yet.",
  },
];

export function competitorProfile(id: CompetitorProfile["id"]): CompetitorProfile {
  return COMPETITOR_PROFILES.find((profile) => profile.id === id) ?? COMPETITOR_PROFILES[0];
}
