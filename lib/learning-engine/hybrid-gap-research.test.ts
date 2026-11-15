import { describe, expect, it } from 'vitest'
import { deriveGapResearch } from '../../scripts/learning/plan-hybrid-gap-research'
import { valueSha, type ReviewPacket } from '../../scripts/learning/review-hybrid-benchmark'
import { HYBRID_BENCHMARK_CASES } from './hybrid-benchmark-cases'

function fixture() {
  const packet: ReviewPacket = { schema: 'hybrid-review-packet-v1', rubricSha256: 'a'.repeat(64), rubric: 'Test rubric',
    scope: 'authored-development-only', denominator: 96, entries: HYBRID_BENCHMARK_CASES.map(row => ({
      id: row.id, caseHash: valueSha(row), inputHash: 'b'.repeat(64), responseHash: 'c'.repeat(64),
      case: row, input: { caseId: row.id, system: 'Test instructions', user: 'Test request' }, response: 'PRIVATE RESPONSE DO NOT EXPORT',
    })) }
  // The pure prioritizer consumes results, while the CLI obtains these through
  // writeReviewReport's preserved-review validation, tested separately.
  const report = { packetHash: valueSha(packet), rubricSha256: packet.rubricSha256, quality: {
    suspectedKeyErrors: [], cases: packet.entries.map(row => ({ id: row.id, pass: true,
      dimensions: { accuracy: true, teaching: true, evidence: true, restraint: true, premiseIntegrity: true } as Record<string, boolean | null> })),
  } } as Parameters<typeof deriveGapResearch>[1]
  return { packet, report }
}
describe('reviewed gap research planning', () => {
  it('preserves every exclusion and produces no training examples or model authorization from a passing report', () => {
    const { packet, report } = fixture(), plan = deriveGapResearch(packet, report)
    expect(plan.priorities).toEqual([]); expect(plan.exclusions).toHaveLength(96)
    expect(plan.trainingExamples).toEqual([]); expect(plan.trainingAuthorized).toBe(false)
    expect(plan.modelSelected).toBeNull(); expect(plan.productionEligible).toBe(false)
    expect(JSON.stringify(plan)).not.toContain('PRIVATE RESPONSE')
    expect(JSON.stringify(plan)).not.toContain(packet.entries[0].case.evaluation.referenceAnswer)
  })
  it('groups recurring resolved failures without confusing unavailable or unresolved outputs with failures', () => {
    const { packet, report } = fixture()
    report.quality.cases[0].dimensions!.evidence = false
    report.quality.cases[4].dimensions!.evidence = false
    report.quality.cases[1].dimensions!.accuracy = null
    packet.entries[2].response = null; report.packetHash = valueSha(packet)
    const plan = deriveGapResearch(packet, report)
    expect(plan.priorities).toHaveLength(1)
    expect(plan.priorities[0]).toMatchObject({ observations: 2, disposition: 'recurring_in_authored_cases',
      dimension: 'evidence', subject: 'math', bands: ['middle_school', 'high_school'] })
    expect(plan.unavailableCaseIds).toEqual([packet.entries[2].id])
    expect(plan.unresolvedCaseIds).toEqual([packet.entries[1].id]); expect(plan.reviewComplete).toBe(false)
  })
  it('leaves isolated defects as single observations and key issues unresolved', () => {
    const { packet, report } = fixture()
    report.quality.cases[0].dimensions!.premiseIntegrity = false
    report.quality.suspectedKeyErrors.push({ id: packet.entries[1].id, caseHash: packet.entries[1].caseHash,
      responseHash: packet.entries[1].responseHash!, details: 'Synthetic test of unresolved key concern.' })
    const plan = deriveGapResearch(packet, report)
    expect(plan.priorities[0].disposition).toBe('single_observation')
    expect(plan.reviewComplete).toBe(false); expect(plan.trainingAuthorized).toBe(false)
  })
  it('rejects mismatched or incomplete evidence instead of dropping cases', () => {
    const { packet, report } = fixture()
    expect(() => deriveGapResearch(packet, { ...report, packetHash: '0'.repeat(64) })).toThrow(/identity/)
    report.quality.cases.pop(); expect(() => deriveGapResearch(packet, report)).toThrow(/population/)
  })
})
