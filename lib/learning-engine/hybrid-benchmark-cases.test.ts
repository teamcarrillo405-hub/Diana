import { describe, expect, it } from 'vitest'
import {
  HYBRID_BENCHMARK_BANDS,
  HYBRID_BENCHMARK_CASES,
  HYBRID_BENCHMARK_SCOPE,
  HYBRID_BENCHMARK_SUBJECTS,
  buildHybridBenchmarkUserPrompt,
  getHybridBenchmarkModelInput,
  type HybridBenchmarkCase,
} from './hybrid-benchmark-cases'

describe('original hybrid development corpus', () => {
  it('covers every subject and band with four distinct scenarios', () => {
    expect(HYBRID_BENCHMARK_CASES).toHaveLength(96)
    expect(new Set(HYBRID_BENCHMARK_CASES.map(item => item.id)).size).toBe(96)
    expect(new Set(HYBRID_BENCHMARK_CASES.map(item => item.input.problem)).size).toBe(96)
    for (const subject of HYBRID_BENCHMARK_SUBJECTS) {
      for (const band of HYBRID_BENCHMARK_BANDS) {
        const rows = HYBRID_BENCHMARK_CASES.filter(item => item.subject === subject && item.band === band)
        expect(rows, `${subject}/${band}`).toHaveLength(4)
        expect(new Set(rows.map(item => item.evaluation.focus))).toEqual(new Set([
          'misconception', 'missing_input', 'evidence_conflict', 'transfer',
        ]))
        expect(rows.filter(item => item.evaluation.sourceStatus === 'sufficient')).toHaveLength(2)
        expect(rows.filter(item => item.evaluation.sourceStatus === 'missing')).toHaveLength(1)
        expect(rows.filter(item => item.evaluation.sourceStatus === 'conflicting')).toHaveLength(1)
      }
    }
  })

  it('records an attempt, a substantive teaching rubric and concrete evidence requirements for every case', () => {
    for (const item of HYBRID_BENCHMARK_CASES) {
      expect(item.id).toMatch(/^hybrid-dev-[a-z_]+-[a-z_]+-[a-z0-9-]+$/)
      expect(item.provenance).toEqual({
        kind: 'authored_synthetic', rights: 'Original synthetic text; no external text or student data.',
      })
      expect(item.input.problem.length, item.id).toBeGreaterThan(15)
      expect(item.input.problem.length + (item.input.sourceText?.length ?? 0), item.id).toBeGreaterThan(40)
      expect(item.input.studentAttempt.length).toBeGreaterThan(25)
      expect(item.input.targetSkill.length).toBeGreaterThan(12)
      expect(item.input.taskType.length).toBeGreaterThan(5)
      expect(item.evaluation.requiredKnownInputs.length).toBeGreaterThan(0)
      expect(item.evaluation.referenceAnswer.length, item.id).toBeGreaterThan(20)
      expect(item.evaluation.expectedTeachingAction.length).toBeGreaterThan(60)
      expect(item.evaluation.disallowedMoves.length).toBeGreaterThanOrEqual(2)
      for (const criterion of Object.values(item.evaluation.rubric)) expect(criterion.length, item.id).toBeGreaterThan(40)
      if (item.evaluation.sourceStatus !== 'sufficient') {
        expect(item.evaluation.requiredMissingInputs.length, item.id).toBeGreaterThan(0)
      }
      if (item.evaluation.sourceStatus === 'conflicting') {
        expect(item.input.sourceText?.length, item.id).toBeGreaterThan(80)
      }
    }
  })

  it('keeps all model inputs bounded, deterministic and serializable without evaluation fields', () => {
    const allowed = new Set(['id', 'subject', 'band', 'targetSkill', 'taskType', 'problem', 'studentAttempt', 'sourceText'])
    for (const item of HYBRID_BENCHMARK_CASES) {
      const input = getHybridBenchmarkModelInput(item)
      const prompt = buildHybridBenchmarkUserPrompt(item)
      expect(Object.keys(input).every(key => allowed.has(key))).toBe(true)
      expect(JSON.parse(prompt)).toEqual(input)
      expect(buildHybridBenchmarkUserPrompt(item.id)).toBe(prompt)
      expect(Buffer.byteLength(prompt, 'utf8'), item.id).toBeLessThanOrEqual(4_000)
      expect(prompt).not.toContain(item.evaluation.referenceAnswer)
      for (const field of ['evaluation', 'rubric', 'referenceAnswer', 'numericAnswer', 'expectedTeachingAction', 'requiredMissingInputs']) {
        expect(Object.hasOwn(input, field), `${item.id}: ${field}`).toBe(false)
      }
    }
  })

  it('does not leak newly added answer or rubric fields through its allowlist', () => {
    const original = HYBRID_BENCHMARK_CASES[0]
    const mutated = structuredClone(original) as HybridBenchmarkCase & {
      goldAnswer: string
      input: HybridBenchmarkCase['input'] & { secretGoldAnswer: string }
    }
    const sentinel = 'PRIVATE_EVALUATOR_TARGET_84e3a6'
    Object.assign(mutated, { goldAnswer: sentinel })
    Object.assign(mutated.input, { secretGoldAnswer: sentinel })
    Object.assign(mutated.evaluation, {
      referenceAnswer: sentinel, expectedTeachingAction: sentinel,
      numericAnswer: { value: 987654321, unit: sentinel, tolerance: 0 },
      requiredKnownInputs: [sentinel], requiredMissingInputs: [sentinel],
      rubric: { accuracy: sentinel, teaching: sentinel, evidence: sentinel, restraint: sentinel },
      disallowedMoves: [sentinel],
    })
    expect(buildHybridBenchmarkUserPrompt(mutated)).not.toContain(sentinel)
    expect(buildHybridBenchmarkUserPrompt(mutated)).not.toContain('987654321')
    expect(getHybridBenchmarkModelInput(mutated)).toEqual(getHybridBenchmarkModelInput(original))
  })

  it('checks numerical reference targets against independent arithmetic and traces', () => {
    const expected: Record<string, number> = {
      'ribbon-fractions': 3 / 8 + 1 / 4,
      'successive-percent-changes': 50 * 1.2 * .8,
      'halving-inventory': 800 / 2 ** (9 / 3),
      'integral-vs-endpoint': 2 ** 3 - 0 ** 3,
      'jordan-eigenspace': 1,
      'density-ratio': 36 / 12,
      'limiting-reactant': Math.min(5, 2 * 2),
      'reaction-average-rate': (.8 - .5) / 20,
      'ph-logarithmic-ratio': 10 ** (-3 - -5),
      'central-difference-order': .5 ** 2,
      'repeat-accumulator': [1, 2, 3].reduce(value => value + 4, 2),
      'range-stop-exclusive': [1, 2, 3, 4].filter(value => value % 2 === 1).reduce((a, b) => a + b, 0),
      'nested-loop-transfer': 3 * 4,
      'list-aliasing': 3,
      'recurrence-level-transfer': 8 + 2 * 4 + 4 * 2,
      'lost-update-schedule': 1,
      'amortized-queue-transfer': 6 * 2 + 1,
    }
    const numericCases = HYBRID_BENCHMARK_CASES.filter(item => item.evaluation.numericAnswer)
    expect(numericCases).toHaveLength(Object.keys(expected).length)
    for (const item of numericCases) {
      const slug = Object.keys(expected).find(key => item.id.endsWith(`-${key}`))
      expect(slug, item.id).toBeDefined()
      const target = item.evaluation.numericAnswer!
      expect(target.value).toBeCloseTo(expected[slug!], 12)
      expect(Number.isFinite(target.value)).toBe(true)
      expect(target.tolerance).toBeGreaterThanOrEqual(0)
      expect(target.unit.length).toBeGreaterThan(0)
      expect(item.evaluation.sourceStatus).toBe('sufficient')
    }
  })

  it('labels draft development limits and prevents accidental mutations of the authored cases', () => {
    expect(HYBRID_BENCHMARK_SCOPE).toMatchObject({
      partition: 'development', cases: 96, educatorReviewed: false,
      representativeCurriculum: false, independentlyAudited: false,
      frozenForEvaluation: false, productionEligible: false,
    })
    expect(Object.isFrozen(HYBRID_BENCHMARK_CASES)).toBe(true)
    for (const item of HYBRID_BENCHMARK_CASES) {
      expect(Object.isFrozen(item.input)).toBe(true)
      expect(Object.isFrozen(item.evaluation.rubric)).toBe(true)
      expect(Object.isFrozen(item.evaluation.requiredKnownInputs)).toBe(true)
    }
    expect(() => getHybridBenchmarkModelInput('a-nonexistent-case')).toThrow('Unknown hybrid development case')
  })
})
