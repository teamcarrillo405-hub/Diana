import { z } from "zod";
import { sha256 } from "./curriculum";
import { fixedPolicyAction } from "./learned-policy";
import { policyAction, supportActionSchema, supportStateSchema } from "./support-policy";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const family = z.string().min(1).max(160);

export const teachingAblationCaseSchema = z.object({
  id: z.string().min(1).max(160),
  provenanceId: z.string().min(1).max(160),
  documentFamily: family,
  templateFamily: family,
  learnerFamily: family,
  split: z.enum(["train", "development", "test"]),
  state: supportStateSchema,
  expectedAction: supportActionSchema,
  provenance: z.enum(["authored_engineering_fixture", "educator_labeled"]),
  rights: z.enum(["excluded", "authored_original", "public_domain", "licensed_for_evaluation", "explicit_owner_consent"]),
  containsStudentData: z.boolean(),
  consentReceiptId: z.string().min(1).max(160).nullable(),
  reviewerIds: z.array(z.string().min(1).max(160)).max(10),
  sourceExcerpt: z.string().min(1).max(4000).nullable(),
  sourceExcerptHash: digest.nullable(),
  contentHash: digest,
}).strict();
export type TeachingAblationCase = z.infer<typeof teachingAblationCaseSchema>;

export const teachingAblationReceiptSchema = z.object({
  id: z.string().min(1).max(160),
  caseId: z.string().min(1).max(160),
  contentHash: digest,
  scope: z.enum(["evaluation_rights", "student_consent", "educator_review"]),
  issuedBy: z.string().min(1).max(160),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
}).strict();
export type TeachingAblationReceipt = z.infer<typeof teachingAblationReceiptSchema>;

export const teachingAblationCorpusSchema = z.object({
  version: z.literal("diana-teaching-ablation-corpus-v1"),
  purpose: z.literal("offline_action_comparison"),
  createdAt: z.string().datetime(),
  cases: z.array(teachingAblationCaseSchema).min(1).max(2000),
  receipts: z.array(teachingAblationReceiptSchema).max(10000),
  corpusHash: digest,
}).strict();
export type TeachingAblationCorpus = z.infer<typeof teachingAblationCorpusSchema>;
type CaseBody = Omit<TeachingAblationCase, "contentHash">;
type CorpusBody = Omit<TeachingAblationCorpus, "corpusHash">;
type Action = z.infer<typeof supportActionSchema>;

/** Canonical JSON preserves the exact UTF-8 excerpt and excludes display ordering of object keys. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function teachingCaseHash(body: CaseBody): Promise<string> {
  return sha256(canonical(body));
}

export async function teachingCorpusHash(body: CorpusBody): Promise<string> {
  return sha256(canonical(body));
}

/** Local corpus assembly derives integrity hashes without endorsing the input labels. */
export async function assembleTeachingAblationCorpus(input: {
  createdAt: string;
  cases: Array<Omit<CaseBody, "sourceExcerptHash">>;
  receipts?: TeachingAblationReceipt[];
}): Promise<TeachingAblationCorpus> {
  const cases: TeachingAblationCase[] = [];
  for (const item of input.cases) {
    const body: CaseBody = {
      ...item,
      sourceExcerptHash: item.sourceExcerpt === null ? null : await sha256(item.sourceExcerpt),
    };
    cases.push({ ...body, contentHash: await teachingCaseHash(body) });
  }
  const body: CorpusBody = {
    version: "diana-teaching-ablation-corpus-v1",
    purpose: "offline_action_comparison",
    createdAt: input.createdAt,
    cases,
    receipts: input.receipts ?? [],
  };
  const corpus = { ...body, corpusHash: await teachingCorpusHash(body) };
  return validateTeachingAblationCorpus(corpus);
}

/** Hashes are integrity checks; rights strings and reviewer IDs are not credential verification. */
export async function validateTeachingAblationCorpus(raw: unknown, now = Date.now()): Promise<TeachingAblationCorpus> {
  const corpus = teachingAblationCorpusSchema.parse(raw);
  if (!Number.isFinite(now) || Date.parse(corpus.createdAt) > now) throw new Error("Ablation corpus creation time is in the future.");
  const ids = new Set<string>();
  const provenanceIds = new Set<string>();
  const partitions = new Map<string, string>();
  const excerptPartitions = new Map<string, string>();
  if (new Set(corpus.receipts.map(item => item.id)).size !== corpus.receipts.length) throw new Error("Duplicate ablation receipt ID.");
  let testCount = 0;
  for (const item of corpus.cases) {
    if (ids.has(item.id) || provenanceIds.has(item.provenanceId)) throw new Error("Duplicate ablation case or provenance ID.");
    ids.add(item.id); provenanceIds.add(item.provenanceId);
    for (const key of [`document:${item.documentFamily}`, `template:${item.templateFamily}`, `learner:${item.learnerFamily}`]) {
      if (partitions.has(key) && partitions.get(key) !== item.split) throw new Error(`Ablation family crosses partitions: ${key}`);
      partitions.set(key, item.split);
    }
    if (item.split === "test") testCount++;
    if (item.rights === "excluded") throw new Error(`Ablation case ${item.id} has excluded rights.`);
    if (item.containsStudentData && (item.rights !== "explicit_owner_consent" || !item.consentReceiptId)) {
      throw new Error(`Ablation case ${item.id} lacks a student consent reference.`);
    }
    if (!item.containsStudentData && item.consentReceiptId) throw new Error(`Ablation case ${item.id} has an unrelated consent reference.`);
    if (item.provenance === "authored_engineering_fixture" && (item.containsStudentData || item.rights !== "authored_original" || item.reviewerIds.length)) {
      throw new Error(`Ablation case ${item.id} is not an isolated engineering fixture.`);
    }
    if (item.provenance === "educator_labeled" && (new Set(item.reviewerIds).size < 2 || item.rights === "authored_original")) {
      throw new Error(`Ablation case ${item.id} lacks two distinct reviewer IDs or evaluation rights.`);
    }
    if (item.state.hasEvidence !== (item.sourceExcerpt !== null && item.sourceExcerptHash !== null)) {
      throw new Error(`Ablation case ${item.id} has inconsistent evidence fields.`);
    }
    const requiredAction = fixedPolicyAction(item.state);
    if (requiredAction && item.expectedAction !== requiredAction) {
      throw new Error(`Ablation case ${item.id} label conflicts with a fixed policy constraint.`);
    }
    if (item.sourceExcerpt !== null && await sha256(item.sourceExcerpt) !== item.sourceExcerptHash) {
      throw new Error(`Ablation case ${item.id} source excerpt hash changed.`);
    }
    if (item.sourceExcerpt !== null) {
      const normalizedExcerpt = item.sourceExcerpt.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/gu, " ").trim();
      const excerptFingerprint = await sha256(normalizedExcerpt);
      if (excerptPartitions.has(excerptFingerprint) && excerptPartitions.get(excerptFingerprint) !== item.split) {
        throw new Error("Ablation source excerpt crosses partitions under a different family label.");
      }
      excerptPartitions.set(excerptFingerprint, item.split);
    }
    const { contentHash, ...body } = item;
    if (await teachingCaseHash(body) !== contentHash) throw new Error(`Ablation case ${item.id} content hash changed.`);
    const receipts = corpus.receipts.filter(receipt => receipt.caseId === item.id && receipt.contentHash === contentHash
      && !receipt.revokedAt && Date.parse(receipt.issuedAt) <= now && (!receipt.expiresAt || Date.parse(receipt.expiresAt) > now));
    if (item.provenance === "educator_labeled") {
      if (!receipts.some(receipt => receipt.scope === "evaluation_rights")) throw new Error(`Ablation case ${item.id} lacks content-bound evaluation rights evidence.`);
      if (item.reviewerIds.some(reviewer => !receipts.some(receipt => receipt.scope === "educator_review" && receipt.issuedBy === reviewer))) {
        throw new Error(`Ablation case ${item.id} lacks content-bound reviewer evidence.`);
      }
    }
    if (item.containsStudentData && !receipts.some(receipt => receipt.scope === "student_consent" && receipt.id === item.consentReceiptId)) {
      throw new Error(`Ablation case ${item.id} lacks a current content-bound student consent receipt.`);
    }
  }
  if (corpus.receipts.some(receipt => !ids.has(receipt.caseId))) throw new Error("Ablation receipt refers to a missing case.");
  if (!testCount) throw new Error("An ablation corpus needs a held-out test partition.");
  const { corpusHash, ...body } = corpus;
  if (await teachingCorpusHash(body) !== corpusHash) throw new Error("Ablation corpus hash changed.");
  return corpus;
}

/**
 * Fixed hint retains the existing hard constraints. Source-unaware deliberately
 * removes only the evidence signal while still exercising policyAction itself.
 */
export function teachingAblationActions(state: z.infer<typeof supportStateSchema>): Record<"current" | "fixed_hint" | "source_unaware", Action> {
  const parsed = supportStateSchema.parse(state);
  return {
    current: policyAction(parsed),
    fixed_hint: fixedPolicyAction(parsed) ?? "hint",
    source_unaware: policyAction({ ...parsed, hasEvidence: true }),
  };
}

type Arm = keyof ReturnType<typeof teachingAblationActions>;
const arms: Arm[] = ["current", "fixed_hint", "source_unaware"];

export async function evaluateTeachingAblation(raw: unknown, now = Date.now()) {
  const corpus = await validateTeachingAblationCorpus(raw, now);
  const heldOut = corpus.cases.filter(item => item.split === "test");
  const decisions = heldOut.map(item => ({ item, actions: teachingAblationActions(item.state) }));
  const score = (rows: typeof decisions, arm: Arm) => ({
    labelAgreement: rows.filter(({ item, actions }) => actions[arm] === item.expectedAction).length,
    count: rows.length,
    rate: rows.length ? rows.filter(({ item, actions }) => actions[arm] === item.expectedAction).length / rows.length : null,
  });
  const comparison = Object.fromEntries(arms.map(arm => [arm, {
    correct: decisions.filter(({ item, actions }) => actions[arm] === item.expectedAction).length,
    count: heldOut.length,
    accuracy: decisions.filter(({ item, actions }) => actions[arm] === item.expectedAction).length / heldOut.length,
    confirmationGateViolations: decisions.filter(({ item, actions }) => !item.state.confirmed && actions[arm] !== "clarify").length,
    evidenceGateViolations: decisions.filter(({ item, actions }) => !item.state.hasEvidence && actions[arm] !== "clarify").length,
    strata: {
      fixedGate: score(decisions.filter(({ item }) => fixedPolicyAction(item.state) !== null), arm),
      discretionary: score(decisions.filter(({ item }) => fixedPolicyAction(item.state) === null), arm),
    },
  }])) as Record<Arm, {
    correct: number; count: number; accuracy: number;
    confirmationGateViolations: number; evidenceGateViolations: number;
    strata: { fixedGate: ReturnType<typeof score>; discretionary: ReturnType<typeof score> };
  }>;
  const difference = (left: Arm, right: Arm) => decisions.filter(({ actions }) => actions[left] !== actions[right]).length;
  return {
    version: "diana-teaching-ablation-report-v2" as const,
    corpusHash: corpus.corpusHash,
    authorizationCheckedAt: new Date(now).toISOString(),
    evaluatedSplit: "test" as const,
    heldOutCases: heldOut.length,
    heldOutDocumentFamilies: new Set(heldOut.map(item => item.documentFamily)).size,
    heldOutTemplateFamilies: new Set(heldOut.map(item => item.templateFamily)).size,
    heldOutLearnerFamilies: new Set(heldOut.map(item => item.learnerFamily)).size,
    provenanceCounts: {
      authoredEngineering: heldOut.filter(item => item.provenance === "authored_engineering_fixture").length,
      educatorLabeledUnverified: heldOut.filter(item => item.provenance === "educator_labeled").length,
    },
    comparison,
    disagreements: { currentVsFixedHint: difference("current", "fixed_hint"), currentVsSourceUnaware: difference("current", "source_unaware") },
    caseDetailsOmitted: heldOut.some(item => item.containsStudentData || item.provenance !== "authored_engineering_fixture"),
    cases: heldOut.some(item => item.containsStudentData || item.provenance !== "authored_engineering_fixture")
      ? []
      : decisions.map(({ item, actions }, caseIndex) => ({ caseIndex, expectedAction: item.expectedAction, provenance: item.provenance, actions })),
    evidence: {
      externalRightsVerified: false as const,
      externalConsentVerified: false as const,
      reviewerQualificationsVerified: false as const,
      studentLearningGainsEstablished: false as const,
      studentRoutingChanged: false as const,
    },
  };
}
