/** Derive research priorities from validated reviews, never training data or activation. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { canonicalHybridJson } from '../../lib/learning-engine/hybrid-benchmark-contract'
import { DIMENSIONS, valueSha, writeReviewReport, type ReviewPacket } from './review-hybrid-benchmark'

type Report = Awaited<ReturnType<typeof writeReviewReport>>
type GapEvidence = Pick<Report, 'packetHash' | 'rubricSha256'> & {
  quality: Pick<Report['quality'], 'cases' | 'suspectedKeyErrors'>
}

export function deriveGapResearch(packet: ReviewPacket, report: GapEvidence) {
  if (report.packetHash !== valueSha(packet) || report.rubricSha256 !== packet.rubricSha256)
    throw new Error('Review and packet identity differ')
  const entries = new Map(packet.entries.map(entry => [entry.id, entry]))
  const rated = report.quality.cases
  if (entries.size !== 96 || rated.length !== 96 || new Set(rated.map(row => row.id)).size !== 96
    || rated.some(row => !entries.has(row.id))) throw new Error('Complete fixed population required')
  const groups = new Map<string, { subject: string; focus: string; dimension: string; caseIds: string[]; bands: string[] }>()
  const unavailable: string[] = [], unresolved: string[] = []
  for (const row of rated) {
    const entry = entries.get(row.id)!
    if (entry.response === null) { unavailable.push(row.id); continue }
    if (!row.dimensions || DIMENSIONS.some(key => row.dimensions?.[key] === null)) unresolved.push(row.id)
    for (const dimension of DIMENSIONS) {
      // Only resolved semantic failures inform this queue; absence is not a label.
      if (row.dimensions?.[dimension] !== false) continue
      const key = `${entry.case.subject}/${entry.case.evaluation.focus}/${dimension}`
      const group = groups.get(key) ?? { subject: entry.case.subject, focus: entry.case.evaluation.focus,
        dimension, caseIds: [], bands: [] }
      group.caseIds.push(row.id)
      if (!group.bands.includes(entry.case.band)) group.bands.push(entry.case.band)
      groups.set(key, group)
    }
  }
  return {
    schema: 'hybrid-gap-research-v1', packetHash: report.packetHash, reviewReportHash: valueSha(report),
    rubricSha256: packet.rubricSha256, scope: 'authored-development-diagnostics',
    priorities: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, group]) => ({
      id, ...group, observations: group.caseIds.length,
      disposition: group.caseIds.length >= 2 ? 'recurring_in_authored_cases' : 'single_observation',
      nextAction: group.dimension === 'premiseIntegrity' || group.dimension === 'evidence'
        ? 'Review source handling and verification first; then test new disjoint examples.'
        : 'Review the teaching or subject-checking mechanism; compare unchanged local and API baselines on new examples.',
    })),
    unavailableCaseIds: unavailable, unresolvedCaseIds: unresolved,
    reviewComplete: unresolved.length === 0 && report.quality.suspectedKeyErrors.length === 0,
    exclusions: packet.entries.map(entry => ({ caseId: entry.id, caseHash: entry.caseHash,
      inputHash: entry.inputHash, responseHash: entry.responseHash })),
    trainingExamples: [], trainingAuthorized: false, modelSelected: null, productionEligible: false,
    requiredBeforeTraining: [
      'A recurring API-baseline failure does not establish a local-model training need. First compare unchanged local and API behavior.',
      'Write new rights-cleared examples from different problem and source families. Never copy these evaluation cases, answers or outputs into training.',
      'Independently review complete target responses and record author, rights, family and review provenance.',
      'Freeze disjoint training, development and held-out families and the unchanged-base comparison before training.',
      'Obtain the required model and compute approval for a concrete new training run.',
    ],
    limitations: ['Counts are observations within authored cases, not independent-family counts or prevalence estimates.',
      'Hashes prevent exact record substitution; they do not prove semantic family independence.',
      'Engineering fixes and local tools may address gaps without language-model fine-tuning.'],
  }
}

async function main() {
  const [packetDirectory, disputeDirectory, adjudication, output] = process.argv.slice(2)
  if (!packetDirectory || !disputeDirectory || !adjudication || !output)
    throw new Error('Usage: plan-hybrid-gap-research <packet-dir> <dispute-dir> <adjudication-or-dash> <new-output-dir>')
  const target = resolve(output)
  mkdirSync(target)
  // Rebuild from preserved primary reviews and dispute-only resolutions. Never
  // grant research authority to an arbitrary caller-authored summary report.
  const report = await writeReviewReport(resolve(packetDirectory), resolve(disputeDirectory),
    adjudication === '-' ? null : resolve(adjudication), resolve(target, 'validated-review.json'))
  const packet = JSON.parse(readFileSync(resolve(packetDirectory, 'packet.json'), 'utf8')) as ReviewPacket
  const plan = deriveGapResearch(packet, report)
  writeFileSync(resolve(target, 'gap-research.json'), canonicalHybridJson(plan) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ priorities: plan.priorities.length, reviewComplete: plan.reviewComplete,
    trainingAuthorized: false, productionEligible: false }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Gap research planning did not complete'); process.exitCode = 1
})
