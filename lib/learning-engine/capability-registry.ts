import { CAPABILITIES, COURSE_ACTIVITY_VERSION } from './course-activities'
import { LOCAL_TUTOR_VERSION } from './local-tutor'
import { CHAPTER_VERIFIER_VERSION } from './chapter-verifier'
import { LOCAL_SKILL_COVERAGE, problemSpecificationSchema } from './problem-specification'

/** Inactive foundation: a source contract inventory, never an activation grant. */
export const CAPABILITY_REGISTRY_VERSION = 'diana-capability-registry-v1' as const
export type CapabilityClaimScope = 'bounded_result' | 'source_correspondence' | 'guided_scaffold'
export type CapabilityRecord = Readonly<{
  id: string
  version: typeof CAPABILITY_REGISTRY_VERSION
  adapter: 'local_tutor' | 'course_tutor'
  method: string
  implementationVersion: string
  claimScope: CapabilityClaimScope
  limits: string
  evidence: Readonly<{
    kind: 'source_contract'
    sourcePaths: readonly string[]
    evaluatorPaths: readonly string[]
    executionVerified: false
    semanticQualityQualified: false
  }>
}>

const localRecords: CapabilityRecord[] = problemSpecificationSchema.options.map(option => {
  const method = option.shape.kind.value
  const coverage = LOCAL_SKILL_COVERAGE.filter(row => (row.kinds as readonly string[]).includes(method))
  return {
    id: `local_tutor:${method}`, version: CAPABILITY_REGISTRY_VERSION, adapter: 'local_tutor', method,
    implementationVersion: `${LOCAL_TUTOR_VERSION}/${CHAPTER_VERIFIER_VERSION}`,
    claimScope: method === 'reading' ? 'source_correspondence' : 'bounded_result',
    limits: method === 'reading'
      ? 'Declared reading skills only. Exact quotation correspondence; no verified interpretation, relevance, correctness or mastery.'
      : coverage.map(row => row.bounds).join(' '),
    evidence: { kind: 'source_contract', sourcePaths: ['lib/learning-engine/problem-specification.ts',
      'lib/learning-engine/local-tutor.ts', 'lib/learning-engine/chapter-verifier.ts',
      'supabase/functions/_shared/learning/algebra.ts', 'supabase/functions/_shared/learning/advanced-math.ts',
      'supabase/functions/_shared/learning/reading.ts'],
    evaluatorPaths: ['lib/learning-engine/local-tutor.test.ts', 'lib/learning-engine/chapter-verifier.test.ts'],
    executionVerified: false, semanticQualityQualified: false },
  }
})

const courseRecords: CapabilityRecord[] = Object.entries(CAPABILITIES).map(([method, capability]) => ({
  id: `course_tutor:${method}`, version: CAPABILITY_REGISTRY_VERSION, adapter: 'course_tutor', method,
  implementationVersion: COURSE_ACTIVITY_VERSION,
  claimScope: capability.check === 'source_correspondence_only' ? 'source_correspondence'
    : capability.check === 'guided_rubric' ? 'guided_scaffold' : 'bounded_result',
  limits: capability.limits,
  evidence: { kind: 'source_contract', sourcePaths: ['lib/learning-engine/course-activities.ts',
    'lib/learning-engine/course-tutor.ts', 'lib/learning-engine/science-checks.ts',
    'lib/assignment-help/deterministic-verifiers.ts'],
  evaluatorPaths: ['lib/learning-engine/course-tutor.test.ts', 'lib/learning-engine/science-checks.test.ts'],
  executionVerified: false, semanticQualityQualified: false },
}))

function freezeRecord(record: CapabilityRecord): CapabilityRecord {
  Object.freeze(record.evidence.sourcePaths)
  Object.freeze(record.evidence.evaluatorPaths)
  Object.freeze(record.evidence)
  return Object.freeze(record)
}

export const CAPABILITY_REGISTRY: readonly CapabilityRecord[] = Object.freeze(
  [...localRecords, ...courseRecords].map(freezeRecord),
)

/** No candidate model has qualification authority in this foundation. */
export const QUALIFIED_LANGUAGE_MODELS: readonly never[] = Object.freeze([])

/** Lookup uses only the compiled registry. Caller-supplied capability records are never accepted. */
export function findCapability(adapter: CapabilityRecord['adapter'], method: string): CapabilityRecord | null {
  return CAPABILITY_REGISTRY.find(record => record.adapter === adapter && record.method === method) ?? null
}
