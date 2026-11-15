import { z } from "zod";
import { sourcePageSchema } from "./source-layout";
import { domainSchema } from "./course-domains";
export { sourcePageSchema } from "./source-layout";

export const ENGINE_VERSION = "diana-learning-v1";
export const RETRIEVAL_VERSION = "curriculum-hybrid-v1";
export { VERIFIER_VERSION } from "@/supabase/functions/_shared/learning/algebra";
export const LEARNER_VERSION = "independent-evidence-v1";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

const identity = z.string().min(1).max(200);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const subjectSchema = z.enum(["math", "reading"]);
// Document coverage can grow without widening the legacy assessment contract.
export const documentSubjectSchema = domainSchema;
export const locationSchema = z.object({
  page: z.number().int().min(1).max(1500),
  pageLabel: z.string().min(1).max(120),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
}).strict().refine((value) => value.endOffset > value.startOffset, "Empty source span");

export const documentVersionSchema = z.object({
  id: digest,
  documentId: identity,
  ownerId: z.string().uuid(),
  assignmentId: z.string().uuid().nullable(),
  classId: z.string().uuid().nullable(),
  title: z.string().min(1).max(300),
  edition: z.string().max(200),
  subject: documentSubjectSchema,
  contentHash: digest,
  extractionVersion: z.enum(["structured-text-v1", "structured-text-v2"]),
  instructionRights: z.enum(["owner_provided", "licensed", "public_domain"]),
  trainingPermission: z.enum(["excluded", "explicitly_approved"]).default("excluded"),
  parentVersionId: digest.nullable().default(null),
  sourceAssetHash: digest.optional(),
}).strict();

export const blockSchema = z.object({
  id: digest,
  versionId: digest,
  kind: z.enum(["heading", "paragraph", "problem", "equation", "table", "diagram", "rubric"]),
  location: locationSchema,
  text: z.string().min(1).max(12000),
  section: z.string().max(300).nullable(),
  problemNumber: z.string().max(40).nullable(),
  skillIds: z.array(identity).max(20),
  interpretation: z.enum(["original", "model_extraction", "confirmed"]),
  needsConfirmation: z.boolean(),
  structure: z.object({
    headingPath: z.array(digest).max(6),
    headingLevel: z.number().int().min(1).max(6).optional(),
    previousBlockId: digest.nullable(),
    continuationOf: digest.nullable(),
    regionIds: z.array(z.string().max(100)).max(4000),
    table: z.array(z.array(z.object({ startOffset:z.number().int().nonnegative(),endOffset:z.number().int().positive(),text:z.string().max(12000) }).strict()).max(20)).max(60).optional(),
  }).strict().optional(),
}).strict();

export const evidenceAnchorSchema = z.object({
  versionId: digest,
  blockId: digest,
  contentHash: digest,
  location: locationSchema,
  exactText: z.string().min(1).max(12000),
}).strict();

export const chunkSchema = z.object({
  id: digest,
  versionId: digest,
  ownerId: z.string().uuid(),
  assignmentId: z.string().uuid().nullable(),
  classId: z.string().uuid().nullable(),
  subject: documentSubjectSchema,
  text: z.string().min(1).max(12000),
  anchors: z.array(evidenceAnchorSchema).min(1).max(12),
  skillIds: z.array(identity).max(20),
  problemNumber: z.string().max(40).nullable(),
}).strict();

export const learningAttemptSchema = z.object({
  sessionId:z.string().uuid().optional(),
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  problemId: identity,
  skillId: identity,
  revision: z.number().int().min(1).max(10000),
  subject: subjectSchema,
  input: z.string().min(1).max(4000),
  assistance: z.enum(["independent", "hinted", "example_assisted", "unverified"]),
  modality: z.enum(["typed", "handwriting", "voice"]),
  confirmed: z.boolean(),
  documentVersionIds: z.array(digest).max(12),
}).strict();

export const assessmentSchema = z.object({
  status: z.enum(["supported", "unsupported", "inconclusive", "needs_confirmation"]),
  outcome: z.enum(["supported", "revise", "unknown"]),
  claim: z.string().max(500),
  checkedInput: z.string().max(4000),
  verifierVersion: z.string().max(80),
  observations: z.array(z.string().max(500)).max(20),
  limitations: z.array(z.string().max(500)).max(20),
  eligibleForKnowledge: z.boolean(),
}).strict();

export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type SourceBlock = z.infer<typeof blockSchema>;
export type EvidenceAnchor = z.infer<typeof evidenceAnchorSchema>;
export type CurriculumChunk = z.infer<typeof chunkSchema>;
export type LearningAttempt = z.infer<typeof learningAttemptSchema>;
export type AssessmentResult = z.infer<typeof assessmentSchema>;
export type SourcePage = z.infer<typeof sourcePageSchema>;
export type StructuredDocument = {
  version: DocumentVersion;
  pages: SourcePage[];
  blocks: SourceBlock[];
  chunks: CurriculumChunk[];
};
export type RetrievalResult = {
  version: typeof RETRIEVAL_VERSION;
  status: "matched" | "no_evidence" | "index_unavailable" | "source_conflict";
  method: "hybrid" | "keyword";
  chunks: Array<CurriculumChunk & { score: number }>;
};

/** Server environment only. A flag alone never enrolls all students. */
export function learningEnabled(
  feature: "retrieval" | "assessment" | "offline" | "experiments",
  ownerId: string,
  environment: Record<string, string | undefined>,
): boolean {
  return environment["DIANA_LEARNING_" + feature.toUpperCase() + "_ENABLED"] === "true"
    && (environment.DIANA_LEARNING_OWNER_IDS ?? "").split(",").map((id) => id.trim()).includes(ownerId);
}
