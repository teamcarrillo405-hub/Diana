import { isDeepStrictEqual } from "node:util";

import { z } from "zod";

import {
  EDUCATIONAL_EVALUATION_ABSTENTION_REASONS,
  EDUCATIONAL_EVALUATION_BANDS,
  EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  EDUCATIONAL_EVALUATION_CORPUS_VERSION,
  EDUCATIONAL_EVALUATION_ESCALATIONS,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
  EDUCATIONAL_EVALUATION_ROUTES,
  EDUCATIONAL_EVALUATION_SCHEMA_VERSION,
  EDUCATIONAL_EVALUATION_SOURCE_KINDS,
  EDUCATIONAL_EVALUATION_STRESS_KINDS,
  EDUCATIONAL_EVALUATION_SUBJECTS,
  EDUCATIONAL_EVALUATION_TIERS,
} from "../educational-evaluation/contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "../educational-evaluation/corpus";
import { EDUCATIONAL_EVALUATION_CORPUS_SHA256 } from "../educational-evaluation/integrity";
import {
  BETA_EDUCATIONAL_EVALUATION_BAND_COUNT,
  BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM,
  BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_CORPUS_INPUT_KIND,
  BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_INPUT_KIND,
  BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION,
  BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION,
  BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM,
  BETA_EDUCATIONAL_EVALUATION_STRATUM_COUNT,
  BETA_EDUCATIONAL_EVALUATION_STRESS_ANCHORS_PER_KIND,
  BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_STRESS_CASES_PER_KIND,
  BETA_EDUCATIONAL_EVALUATION_STRESS_SUPPLEMENTS_PER_KIND,
  BETA_EDUCATIONAL_EVALUATION_SUBJECT_COUNT,
  betaEducationalEvaluationCaseSeed,
  betaEducationalEvaluationExpertReviewItemId,
  betaEducationalEvaluationExpertReviewSeed,
  generateBetaEducationalEvaluationCorpusManifest,
  generateBetaEducationalEvaluationExpertSampleManifest,
  type BetaEducationalEvaluationCorpusInputManifest,
  type BetaEducationalEvaluationExpertSampleInputManifest,
} from "./evaluation-harness";

const SUBJECT_IDS = new Set<string>(
  EDUCATIONAL_EVALUATION_SUBJECTS.map((subject) => subject.id),
);
const CAPABILITY_IDS = new Set<string>(
  EDUCATIONAL_EVALUATION_SUBJECTS.map((subject) => subject.capability),
);
const BAND_IDS = new Set<string>(
  EDUCATIONAL_EVALUATION_BANDS.map((band) => band.id),
);
const SCENARIO_IDS = new Set<string>([
  ...EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  ...EDUCATIONAL_EVALUATION_STRESS_KINDS,
]);
const CORE_SCENARIO_IDS = new Set<string>(EDUCATIONAL_EVALUATION_CORE_SCENARIOS);
const STRESS_KIND_IDS = new Set<string>(EDUCATIONAL_EVALUATION_STRESS_KINDS);
const SEED_PATTERN = /^[a-f0-9]{16}$/u;
const CASE_ID_PATTERN = /^edu-(?:core|stress)-[a-z0-9-]+$/u;
const SOURCE_ID_PATTERN =
  /^edu-(?:core|stress)-[a-z0-9-]+:source:[a-z0-9-]+$/u;
const FORBIDDEN_OUTCOME_KEYS = new Set([
  "caseResults",
  "decision",
  "expertReviews",
  "judgement",
  "judgment",
  "passed",
  "result",
  "results",
  "score",
  "scores",
]);

const knownString = (values: ReadonlySet<string>, message: string) =>
  z.string().refine((value) => values.has(value), message);

const sourceIdSchema = z.string().min(1).max(220).regex(SOURCE_ID_PATTERN);

const evaluationSourceSchema = z.object({
  id: sourceIdSchema,
  kind: z.enum(EDUCATIONAL_EVALUATION_SOURCE_KINDS),
  label: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(5_000),
  trust: z.enum(["approved", "untrusted"]),
}).strict();

const expectedRoutingSchema = z.object({
  subject: knownString(SUBJECT_IDS, "Unknown educational evaluation subject."),
  capability: knownString(
    CAPABILITY_IDS,
    "Unknown educational evaluation capability.",
  ),
  route: z.enum(EDUCATIONAL_EVALUATION_ROUTES),
  tier: z.enum(EDUCATIONAL_EVALUATION_TIERS),
}).strict();

const evaluationCaseSchema = z.object({
  schemaVersion: z.literal(EDUCATIONAL_EVALUATION_SCHEMA_VERSION),
  corpusVersion: z.literal(EDUCATIONAL_EVALUATION_CORPUS_VERSION),
  id: z.string().min(1).max(160).regex(CASE_ID_PATTERN),
  family: z.enum(["core", "stress"]),
  subject: knownString(SUBJECT_IDS, "Unknown educational evaluation subject."),
  academicBand: knownString(BAND_IDS, "Unknown educational evaluation band."),
  scenario: knownString(SCENARIO_IDS, "Unknown educational evaluation scenario."),
  stressOrdinal: z.number().int().min(1).max(40).nullable(),
  stressLayer: z.enum(["stratum_anchor", "supplemental"]).nullable(),
  prompt: z.string().min(1).max(5_000),
  sources: z.array(evaluationSourceSchema).max(20),
  expected: z.object({
    routing: expectedRoutingSchema,
    escalation: z.object({
      required: z.boolean(),
      action: z.enum(EDUCATIONAL_EVALUATION_ESCALATIONS),
    }).strict(),
    verification: z.object({
      required: z.boolean(),
      minimumEvidenceSources: z.number().int().min(0).max(20),
      allowedSourceIds: z.array(sourceIdSchema).max(20),
    }).strict(),
    citation: z.object({
      required: z.boolean(),
      minimumCitations: z.number().int().min(0).max(20),
      allowedSourceIds: z.array(sourceIdSchema).max(20),
    }).strict(),
    abstention: z.object({
      required: z.boolean(),
      reason: z.enum(EDUCATIONAL_EVALUATION_ABSTENTION_REASONS).nullable(),
    }).strict(),
  }).strict(),
}).strict();

const seededCaseSchema = z.object({
  caseId: z.string().min(1).max(160).regex(CASE_ID_PATTERN),
  seed: z.string().regex(SEED_PATTERN),
  definition: evaluationCaseSchema,
}).strict();

export const betaEducationalEvaluationCorpusManifestSchema = z.object({
  schemaVersion: z.literal(
    BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION,
  ),
  artifactKind: z.literal(BETA_EDUCATIONAL_EVALUATION_CORPUS_INPUT_KIND),
  harnessVersion: z.literal(BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION),
  purpose: z.literal("evaluation_input_awaiting_execution"),
  executionStatus: z.literal("awaiting_execution"),
  containsModelResults: z.literal(false),
  containsExpertJudgments: z.literal(false),
  seedAlgorithm: z.literal(BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM),
  corpusVersion: z.literal(EDUCATIONAL_EVALUATION_CORPUS_VERSION),
  corpusSha256: z.literal(EDUCATIONAL_EVALUATION_CORPUS_SHA256),
  caseCount: z.literal(BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT),
  coreCaseCount: z.literal(BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT),
  stressCaseCount: z.literal(BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT),
  dimensions: z.object({
    subjects: z.array(knownString(SUBJECT_IDS, "Unknown subject dimension."))
      .length(BETA_EDUCATIONAL_EVALUATION_SUBJECT_COUNT),
    academicBands: z.array(knownString(BAND_IDS, "Unknown band dimension."))
      .length(BETA_EDUCATIONAL_EVALUATION_BAND_COUNT),
    coreScenarios: z.array(
      knownString(CORE_SCENARIO_IDS, "Unknown core scenario dimension."),
    ).length(BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM),
    stressKinds: z.array(
      knownString(STRESS_KIND_IDS, "Unknown stress-kind dimension."),
    ).length(EDUCATIONAL_EVALUATION_STRESS_KINDS.length),
    coreAssignmentsPerSubjectBand: z.literal(
      BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM,
    ),
    stressCasesPerKind: z.literal(
      BETA_EDUCATIONAL_EVALUATION_STRESS_CASES_PER_KIND,
    ),
  }).strict(),
  cases: z.array(seededCaseSchema)
    .length(BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT),
}).strict();

const expertReviewItemSchema = z.object({
  reviewItemId: z.string().regex(/^expert-review-edu-(?:core|stress)-[a-z0-9-]+$/u),
  reviewSeed: z.string().regex(SEED_PATTERN),
  caseId: z.string().min(1).max(160).regex(CASE_ID_PATTERN),
  caseSeed: z.string().regex(SEED_PATTERN),
  stratumId: z.string().regex(/^[a-z_]+:[a-z_]+$/u),
  selectionRole: z.enum(["core", "stress_anchor"]),
  subject: knownString(SUBJECT_IDS, "Unknown educational evaluation subject."),
  academicBand: knownString(BAND_IDS, "Unknown educational evaluation band."),
  scenario: knownString(SCENARIO_IDS, "Unknown educational evaluation scenario."),
}).strict();

export const betaEducationalEvaluationExpertSampleManifestSchema = z.object({
  schemaVersion: z.literal(
    BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION,
  ),
  artifactKind: z.literal(
    BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_INPUT_KIND,
  ),
  harnessVersion: z.literal(BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION),
  purpose: z.literal("expert_review_sampling_input"),
  reviewStatus: z.literal("awaiting_expert_review"),
  containsModelResults: z.literal(false),
  containsExpertJudgments: z.literal(false),
  seedAlgorithm: z.literal(BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM),
  corpusVersion: z.literal(EDUCATIONAL_EVALUATION_CORPUS_VERSION),
  corpusSha256: z.literal(EDUCATIONAL_EVALUATION_CORPUS_SHA256),
  sampleVersion: z.literal(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION),
  corpusCaseCount: z.literal(BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT),
  sampleCaseCount: z.literal(
    BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT,
  ),
  stratumCount: z.literal(BETA_EDUCATIONAL_EVALUATION_STRATUM_COUNT),
  casesPerStratum: z.literal(2),
  items: z.array(expertReviewItemSchema)
    .length(BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT),
}).strict();

export class BetaEducationalEvaluationManifestValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Educational evaluation input manifest is invalid (${issues.length} issue${issues.length === 1 ? "" : "s"}).`,
    );
    this.name = "BetaEducationalEvaluationManifestValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

function zodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const issuePath = issue.path.length > 0 ? issue.path.join(".") : "input";
    return `${issuePath}: ${issue.message}`;
  });
}

function findForbiddenOutcomeKeys(
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findForbiddenOutcomeKeys(item, `${path}.${index}`, issues));
    return;
  }
  if (value === null || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_OUTCOME_KEYS.has(key)) {
      issues.push(`${childPath}: outcome fields are forbidden in input manifests.`);
    }
    findForbiddenOutcomeKeys(child, childPath, issues);
  }
}

function sameOrderedValues(
  received: readonly string[],
  expected: readonly string[],
): boolean {
  return received.length === expected.length &&
    received.every((value, index) => value === expected[index]);
}

function duplicateValues(values: readonly string[]): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function corpusSemanticIssues(
  manifest: BetaEducationalEvaluationCorpusInputManifest,
): string[] {
  const issues: string[] = [];
  const expected = generateBetaEducationalEvaluationCorpusManifest();
  const wrappers = manifest.cases;
  const definitions = wrappers.map((wrapper) => wrapper.definition);
  const core = definitions.filter((candidate) => candidate.family === "core");
  const stress = definitions.filter((candidate) => candidate.family === "stress");

  const expectedSubjects = EDUCATIONAL_EVALUATION_SUBJECTS.map(
    (subject) => subject.id,
  );
  const expectedBands = EDUCATIONAL_EVALUATION_BANDS.map((band) => band.id);
  if (!sameOrderedValues(manifest.dimensions.subjects, expectedSubjects)) {
    issues.push("dimensions.subjects must contain the 21 canonical subjects in frozen order.");
  }
  if (!sameOrderedValues(manifest.dimensions.academicBands, expectedBands)) {
    issues.push("dimensions.academicBands must contain the six canonical bands in frozen order.");
  }
  if (!sameOrderedValues(
    manifest.dimensions.coreScenarios,
    EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  )) {
    issues.push("dimensions.coreScenarios must contain the six canonical scenarios in frozen order.");
  }
  if (!sameOrderedValues(
    manifest.dimensions.stressKinds,
    EDUCATIONAL_EVALUATION_STRESS_KINDS,
  )) {
    issues.push("dimensions.stressKinds must contain the six canonical stress kinds in frozen order.");
  }

  if (core.length !== BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT) {
    issues.push(`Core case count is ${core.length}; expected 756.`);
  }
  if (stress.length !== BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT) {
    issues.push(`Stress case count is ${stress.length}; expected 240.`);
  }

  const duplicateCaseIds = duplicateValues(wrappers.map((wrapper) => wrapper.caseId));
  if (duplicateCaseIds.length > 0) {
    issues.push(`Duplicate case IDs: ${duplicateCaseIds.slice(0, 10).join(", ")}.`);
  }
  const duplicateSeeds = duplicateValues(wrappers.map((wrapper) => wrapper.seed));
  if (duplicateSeeds.length > 0) {
    issues.push(`Duplicate case seeds: ${duplicateSeeds.slice(0, 10).join(", ")}.`);
  }

  wrappers.forEach((wrapper, index) => {
    if (wrapper.caseId !== wrapper.definition.id) {
      issues.push(`cases.${index}.caseId must match definition.id.`);
    }
    if (wrapper.seed !== betaEducationalEvaluationCaseSeed(wrapper.caseId)) {
      issues.push(`cases.${index}.seed does not match its deterministic case seed.`);
    }
    const sourceIds = wrapper.definition.sources.map((source) => source.id);
    if (duplicateValues(sourceIds).length > 0) {
      issues.push(`cases.${index}.definition contains duplicate source IDs.`);
    }
    const sourceIdSet = new Set(sourceIds);
    const evidenceIds = wrapper.definition.expected.verification.allowedSourceIds;
    const citationIds = wrapper.definition.expected.citation.allowedSourceIds;
    if (evidenceIds.some((sourceId) => !sourceIdSet.has(sourceId))) {
      issues.push(`cases.${index}.definition verification sources are not case-owned.`);
    }
    if (citationIds.some((sourceId) => !sourceIdSet.has(sourceId))) {
      issues.push(`cases.${index}.definition citation sources are not case-owned.`);
    }
    if (wrapper.definition.expected.routing.subject !== wrapper.definition.subject) {
      issues.push(`cases.${index}.definition routing subject does not match the case subject.`);
    }
    if (wrapper.definition.family === "core") {
      if (
        !CORE_SCENARIO_IDS.has(wrapper.definition.scenario) ||
        wrapper.definition.stressOrdinal !== null ||
        wrapper.definition.stressLayer !== null
      ) {
        issues.push(`cases.${index}.definition has incoherent core metadata.`);
      }
    } else if (
      !STRESS_KIND_IDS.has(wrapper.definition.scenario) ||
      wrapper.definition.stressOrdinal === null ||
      wrapper.definition.stressLayer === null
    ) {
      issues.push(`cases.${index}.definition has incoherent stress metadata.`);
    }
  });

  for (const subject of EDUCATIONAL_EVALUATION_SUBJECTS) {
    for (const band of EDUCATIONAL_EVALUATION_BANDS) {
      const stratum = core.filter(
        (candidate) =>
          candidate.subject === subject.id &&
          candidate.academicBand === band.id,
      );
      const scenarios = new Set(stratum.map((candidate) => candidate.scenario));
      if (
        stratum.length !== BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM ||
        scenarios.size !== EDUCATIONAL_EVALUATION_CORE_SCENARIOS.length ||
        EDUCATIONAL_EVALUATION_CORE_SCENARIOS.some(
          (scenario) => !scenarios.has(scenario),
        )
      ) {
        issues.push(
          `Core stratum ${subject.id}:${band.id} must contain all six assignments exactly once.`,
        );
      }
    }
  }

  for (const kind of EDUCATIONAL_EVALUATION_STRESS_KINDS) {
    const kindCases = stress.filter((candidate) => candidate.scenario === kind);
    const anchors = kindCases.filter(
      (candidate) => candidate.stressLayer === "stratum_anchor",
    );
    const supplements = kindCases.filter(
      (candidate) => candidate.stressLayer === "supplemental",
    );
    if (kindCases.length !== BETA_EDUCATIONAL_EVALUATION_STRESS_CASES_PER_KIND) {
      issues.push(`Stress kind ${kind} must contain exactly 40 cases.`);
    }
    if (anchors.length !== BETA_EDUCATIONAL_EVALUATION_STRESS_ANCHORS_PER_KIND) {
      issues.push(`Stress kind ${kind} must contain exactly 21 stratum anchors.`);
    }
    if (
      supplements.length !==
      BETA_EDUCATIONAL_EVALUATION_STRESS_SUPPLEMENTS_PER_KIND
    ) {
      issues.push(`Stress kind ${kind} must contain exactly 19 supplemental cases.`);
    }
  }

  if (!isDeepStrictEqual(manifest, expected)) {
    issues.push("Corpus input differs from the frozen canonical manifest or ordering.");
  }
  return issues;
}

function expertSampleSemanticIssues(
  manifest: BetaEducationalEvaluationExpertSampleInputManifest,
): string[] {
  const issues: string[] = [];
  const expected = generateBetaEducationalEvaluationExpertSampleManifest();
  const corpusById = new Map(
    EDUCATIONAL_EVALUATION_CORPUS.map((candidate) => [candidate.id, candidate]),
  );

  for (const [label, values] of [
    ["review item IDs", manifest.items.map((item) => item.reviewItemId)],
    ["case IDs", manifest.items.map((item) => item.caseId)],
    ["review seeds", manifest.items.map((item) => item.reviewSeed)],
  ] as const) {
    const duplicates = duplicateValues(values);
    if (duplicates.length > 0) {
      issues.push(`Duplicate ${label}: ${duplicates.slice(0, 10).join(", ")}.`);
    }
  }

  manifest.items.forEach((item, index) => {
    const evaluationCase = corpusById.get(item.caseId);
    if (!evaluationCase) {
      issues.push(`items.${index}.caseId is not part of the frozen corpus.`);
      return;
    }
    if (
      item.reviewItemId !==
      betaEducationalEvaluationExpertReviewItemId(item.caseId)
    ) {
      issues.push(`items.${index}.reviewItemId is not deterministic.`);
    }
    if (
      item.reviewSeed !== betaEducationalEvaluationExpertReviewSeed(item.caseId)
    ) {
      issues.push(`items.${index}.reviewSeed is not deterministic.`);
    }
    if (item.caseSeed !== betaEducationalEvaluationCaseSeed(item.caseId)) {
      issues.push(`items.${index}.caseSeed does not match the corpus seed.`);
    }
    if (
      item.stratumId !==
      `${evaluationCase.subject}:${evaluationCase.academicBand}` ||
      item.subject !== evaluationCase.subject ||
      item.academicBand !== evaluationCase.academicBand ||
      item.scenario !== evaluationCase.scenario
    ) {
      issues.push(`items.${index} does not match its frozen case metadata.`);
    }
    if (
      (item.selectionRole === "core" && evaluationCase.family !== "core") ||
      (item.selectionRole === "stress_anchor" &&
        (evaluationCase.family !== "stress" ||
          evaluationCase.stressLayer !== "stratum_anchor"))
    ) {
      issues.push(`items.${index}.selectionRole does not match the frozen case.`);
    }
  });

  for (const subject of EDUCATIONAL_EVALUATION_SUBJECTS) {
    for (const band of EDUCATIONAL_EVALUATION_BANDS) {
      const stratumId = `${subject.id}:${band.id}`;
      const stratum = manifest.items.filter(
        (item) => item.stratumId === stratumId,
      );
      if (
        stratum.length !== 2 ||
        stratum.filter((item) => item.selectionRole === "core").length !== 1 ||
        stratum.filter((item) => item.selectionRole === "stress_anchor").length !== 1
      ) {
        issues.push(
          `Expert-review stratum ${stratumId} must contain one core and one anchor stress case.`,
        );
      }
    }
  }

  for (const scenario of EDUCATIONAL_EVALUATION_CORE_SCENARIOS) {
    const count = manifest.items.filter(
      (item) => item.selectionRole === "core" && item.scenario === scenario,
    ).length;
    if (count !== 21) {
      issues.push(`Core sample scenario ${scenario} must occur exactly 21 times.`);
    }
  }
  for (const kind of EDUCATIONAL_EVALUATION_STRESS_KINDS) {
    const count = manifest.items.filter(
      (item) => item.selectionRole === "stress_anchor" && item.scenario === kind,
    ).length;
    if (count !== 21) {
      issues.push(`Stress sample kind ${kind} must occur exactly 21 times.`);
    }
  }

  if (!isDeepStrictEqual(manifest, expected)) {
    issues.push("Expert-review sample differs from the frozen canonical selection or ordering.");
  }
  return issues;
}

export function validateBetaEducationalEvaluationCorpusManifest(
  input: unknown,
): BetaEducationalEvaluationCorpusInputManifest {
  const forbiddenIssues: string[] = [];
  if (input && typeof input === "object" && "cases" in input) {
    findForbiddenOutcomeKeys(
      (input as { cases?: unknown }).cases,
      "cases",
      forbiddenIssues,
    );
  }
  const parsed = betaEducationalEvaluationCorpusManifestSchema.safeParse(input);
  if (!parsed.success || forbiddenIssues.length > 0) {
    throw new BetaEducationalEvaluationManifestValidationError([
      ...forbiddenIssues,
      ...(parsed.success ? [] : zodIssues(parsed.error)),
    ]);
  }

  const manifest = parsed.data as BetaEducationalEvaluationCorpusInputManifest;
  const issues = corpusSemanticIssues(manifest);
  if (issues.length > 0) {
    throw new BetaEducationalEvaluationManifestValidationError(issues);
  }
  return manifest;
}

export function validateBetaEducationalEvaluationExpertSampleManifest(
  input: unknown,
): BetaEducationalEvaluationExpertSampleInputManifest {
  const forbiddenIssues: string[] = [];
  if (input && typeof input === "object" && "items" in input) {
    findForbiddenOutcomeKeys(
      (input as { items?: unknown }).items,
      "items",
      forbiddenIssues,
    );
  }
  const parsed = betaEducationalEvaluationExpertSampleManifestSchema.safeParse(input);
  if (!parsed.success || forbiddenIssues.length > 0) {
    throw new BetaEducationalEvaluationManifestValidationError([
      ...forbiddenIssues,
      ...(parsed.success ? [] : zodIssues(parsed.error)),
    ]);
  }

  const manifest = parsed.data as BetaEducationalEvaluationExpertSampleInputManifest;
  const issues = expertSampleSemanticIssues(manifest);
  if (issues.length > 0) {
    throw new BetaEducationalEvaluationManifestValidationError(issues);
  }
  return manifest;
}
