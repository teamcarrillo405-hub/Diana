/** Offline semantic-review artifacts. No provider calls and no automatic semantic judgments. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, relative, sep, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { canonicalHybridJson, validateHybridBenchmarkPlan, type HybridBenchmarkInput, type HybridBenchmarkPlan } from '../../lib/learning-engine/hybrid-benchmark-contract'
import { type HybridBenchmarkCase } from '../../lib/learning-engine/hybrid-benchmark-cases'
import { dispatchFor, validateSavedHybridResponse, validateTerminalReconciliation } from './hybrid-benchmark'

export const DIMENSIONS = ['accuracy', 'teaching', 'evidence', 'restraint', 'premiseIntegrity'] as const
type Dimension = typeof DIMENSIONS[number]
const KINDS = ['abstention', 'useful_clarification', 'scaffolding', 'direct_teaching'] as const
const PROTOCOL = 'docs/engineering/hybrid-benchmark-review-protocol.md'
export const rawSha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export const valueSha = (value: unknown) => rawSha(canonicalHybridJson(value))
const read = (path: string): any => JSON.parse(readFileSync(path, 'utf8'))
const save = (path: string, value: unknown) => writeFileSync(path, canonicalHybridJson(value) + '\n', { flag: 'wx' })
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function inside(root: string, path: string) {
  const full = resolve(root, path), rel = relative(root, full)
  check(rel && !rel.startsWith('..') && !rel.startsWith(sep), 'Artifact path escaped its root')
  return full
}
function outsideRun(path: string, run: string) {
  const normalized = (value: string) => process.platform === 'win32' ? resolve(value).toLowerCase() : resolve(value)
  check(normalized(path) !== normalized(run) && !normalized(path).startsWith(normalized(run) + sep), 'Review output must be outside frozen run')
}
function inventory(root: string, prefix = ''): Record<string, string> {
  const files: Record<string, string> = {}
  for (const item of readdirSync(resolve(root, prefix), { withFileTypes: true })) {
    check(!item.isSymbolicLink(), 'Symlink artifacts are unsupported')
    const name = prefix ? `${prefix}/${item.name}` : item.name
    if (item.isDirectory()) Object.assign(files, inventory(root, name))
    else { check(item.isFile(), 'Unsupported artifact'); files[name] = rawSha(readFileSync(inside(root, name))) }
  }
  return files
}
type Entry = { id: string; caseHash: string; inputHash: string; responseHash: string | null;
  case: HybridBenchmarkCase; input: HybridBenchmarkInput; response: string | null }
export type ReviewPacket = { schema: 'hybrid-review-packet-v1'; rubricSha256: string; rubric: string;
  scope: 'authored-development-only'; denominator: 96; entries: Entry[] }
type Attempt = { id: string; status: 'completed' | 'missing' | 'failed' | 'uncertain'; actualCents: number | null; latencyMs: number | null }

/** Reads outputs only when explicitly invoked after execution; accepted text alone enters the reviewer packet. */
export async function buildReviewSnapshot(workspace: string, run: string) {
  const sourceHashes = inventory(run)
  const plan = read(resolve(run, 'plan.json')) as HybridBenchmarkPlan
  const inputs = read(resolve(run, 'inputs.json')) as HybridBenchmarkInput[]
  const corpus = read(resolve(run, 'corpus.json')) as HybridBenchmarkCase[]
  await validateHybridBenchmarkPlan(plan, inputs, plan.createdAt) // historical validation, not a new spending authorization
  check(valueSha(corpus) === plan.corpusSha256 && corpus.length === 96 && new Set(corpus.map(c => c.id)).size === 96, 'Corpus binding changed')
  const closure = read(resolve(run, 'code-closure.json')) as { files: Record<string, string> }
  check(valueSha(closure) === plan.codeSha256, 'Frozen code closure changed')
  const archive = resolve(run, 'frozen-source')
  const sourceRoot = existsSync(archive) ? archive : workspace
  if (sourceRoot === archive) check(canonicalHybridJson(inventory(archive)) === canonicalHybridJson(closure.files), 'Frozen source archive differs from exact closure')
  for (const [path, hash] of Object.entries(closure.files)) check(rawSha(readFileSync(inside(sourceRoot, path))) === hash, `Frozen source changed: ${path}`)
  const rubric = readFileSync(inside(sourceRoot, PROTOCOL), 'utf8'), rubricSha256 = rawSha(rubric)
  check(closure.files[PROTOCOL] === rubricSha256, 'Review rubric was not frozen with execution')
  const dispatch = dispatchFor(plan)
  check(canonicalHybridJson(read(resolve(run, 'dispatch.json'))) === canonicalHybridJson(dispatch), 'Request identity binding changed')
  const allowed = new Set(dispatch.map(d => d.requestId))
  if (existsSync(resolve(run, 'attempts'))) for (const item of readdirSync(resolve(run, 'attempts'))) check(allowed.has(item), 'Unplanned attempt directory')
  const attempts: Attempt[] = []
  const entries: Entry[] = corpus.map((item, index) => {
    const input = inputs[index], call = plan.calls[index], entry = dispatch[index]
    check(item.id === input.caseId && item.id === call.caseId && item.id === entry.caseId, 'Case order or input binding changed')
    const dir = resolve(run, 'attempts', entry.requestId)
    let status: Attempt['status'] = 'missing', actualCents: number | null = null, latencyMs: number | null = null, response: string | null = null
    if (existsSync(dir)) {
      status = 'uncertain'
      if (existsSync(resolve(dir, 'request.json'))) {
        const request = read(resolve(dir, 'request.json'))
        check(request.caseId === item.id && request.requestId === entry.requestId && request.batchId === entry.batchId &&
          request.planFingerprint === plan.fingerprint && request.reservationCents === call.reservationCents, 'Attempt request changed')
      } else check(readdirSync(dir).length === 0, 'Attempt receipts have no bound request')
      if (existsSync(resolve(dir, 'response.json'))) {
        const receipt = read(resolve(dir, 'response.json')), raw = readFileSync(resolve(dir, 'response-body.txt'), 'utf8')
        check(rawSha(raw) === receipt.responseSha256 && canonicalHybridJson(JSON.parse(raw)) === canonicalHybridJson(receipt.body), 'Raw response binding changed')
        check(Number.isFinite(receipt.latencyMs) && receipt.latencyMs >= 0, 'Invalid response latency')
        latencyMs = receipt.latencyMs
        if (receipt.accepted === true && !existsSync(resolve(dir, 'interruption.json')) && !existsSync(resolve(dir, 'reconciliation.json'))) {
          validateSavedHybridResponse(dir, entry, plan)
          status = 'completed'; response = receipt.body.result.output; actualCents = receipt.body.result.actualCents
        } else { check(typeof receipt.accepted === 'boolean', 'Missing response disposition'); status = receipt.accepted ? 'uncertain' : 'failed' }
      }
      if (existsSync(resolve(dir, 'reconciliation.json'))) { actualCents = validateTerminalReconciliation(dir, entry, plan); status = 'failed' }
      if (latencyMs === null && existsSync(resolve(dir, 'interruption.json'))) {
        const interruption = read(resolve(dir, 'interruption.json'))
        check(Number.isFinite(interruption.latencyMs) && interruption.latencyMs >= 0, 'Invalid interruption latency')
        latencyMs = interruption.latencyMs
      }
    }
    attempts.push({ id: item.id, status, actualCents, latencyMs })
    return { id: item.id, caseHash: valueSha(item), inputHash: valueSha(input), responseHash: response === null ? null : valueSha(response), case: item, input, response }
  })
  const cells = new Map<string, number>()
  for (const item of corpus) { const key = `${item.subject}/${item.band}`; cells.set(key, (cells.get(key) ?? 0) + 1) }
  check(cells.size === 24 && [...cells.values()].every(n => n === 4), 'Expected 24 subject/band cells of four')
  const packet: ReviewPacket = { schema: 'hybrid-review-packet-v1', rubricSha256, rubric, scope: 'authored-development-only', denominator: 96, entries }
  check(canonicalHybridJson(inventory(run)) === canonicalHybridJson(sourceHashes), 'Run changed during packet creation')
  return { packet, provenance: { schema: 'hybrid-review-provenance-v1', runDirectory: resolve(run), workspace: resolve(workspace),
    packetHash: valueSha(packet), planFingerprint: plan.fingerprint, corpusSha256: plan.corpusSha256, rubricSha256,
    sourceHashes, attempts, productionEligible: false, qualitySuccess: false } }
}
/** Preserve executed source bytes after completion, before packet creation or later code changes. */
export async function archiveReviewSources(workspace: string, run: string) {
  const snapshot = await buildReviewSnapshot(workspace, run)
  const done = read(resolve(run, 'execution-complete.json'))
  check(done.planFingerprint === snapshot.provenance.planFingerprint && done.cases === 96
    && done.completedCases + done.reconciledFailures === 96
    && snapshot.provenance.attempts.every(item => item.status === 'completed' || item.status === 'failed'), 'Execution must stop before source archiving')
  const closure = read(resolve(run, 'code-closure.json')) as { files: Record<string, string> }
  const target = resolve(run, 'frozen-source'); mkdirSync(target)
  for (const [path, expected] of Object.entries(closure.files)) {
    const bytes = readFileSync(inside(workspace, path))
    check(rawSha(bytes) === expected, `Source changed while archiving: ${path}`)
    const destination = inside(target, path); mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, bytes, { flag: 'wx' })
  }
  check(canonicalHybridJson(inventory(target)) === canonicalHybridJson(closure.files), 'Incomplete source archive')
  return { files: Object.keys(closure.files).length, codeSha256: valueSha(closure) }
}
export async function writeReviewPacket(workspace: string, run: string, output: string) {
  const snapshot = await buildReviewSnapshot(workspace, run)
  outsideRun(output, run)
  mkdirSync(output)
  save(resolve(output, 'packet.json'), snapshot.packet)
  save(resolve(output, 'provenance.json'), snapshot.provenance)
  save(resolve(output, 'packet-receipt.json'), { packetHash: valueSha(snapshot.packet), packetRawSha256: rawSha(readFileSync(resolve(output, 'packet.json'))),
    provenanceRawSha256: rawSha(readFileSync(resolve(output, 'provenance.json'))), savedAt: new Date().toISOString(),
    instructions: 'Give only packet.json and the review schema to each independent first-pass reviewer. Withhold provenance, run files, prior scores and other reviews.' })
  return snapshot.provenance.packetHash
}
async function validatedPacket(directory: string) {
  const provenance = read(resolve(directory, 'provenance.json')), receipt = read(resolve(directory, 'packet-receipt.json'))
  const packet = read(resolve(directory, 'packet.json')) as ReviewPacket
  check(rawSha(readFileSync(resolve(directory, 'packet.json'))) === receipt.packetRawSha256 &&
    rawSha(readFileSync(resolve(directory, 'provenance.json'))) === receipt.provenanceRawSha256 && valueSha(packet) === receipt.packetHash, 'Packet receipt changed')
  const rebuilt = await buildReviewSnapshot(provenance.workspace, provenance.runDirectory)
  check(canonicalHybridJson(rebuilt.packet) === canonicalHybridJson(packet) && canonicalHybridJson(rebuilt.provenance) === canonicalHybridJson(provenance), 'Stale packet or changed source artifacts')
  return rebuilt
}

const hash = z.string().regex(/^[a-f0-9]{64}$/)
const dimension = z.object({ pass: z.boolean(), evidenceQuotes: z.array(z.string().min(3).max(2000)).min(1).max(8), rationale: z.string().trim().min(20).max(4000) }).strict()
const dimensions = z.object({ accuracy: dimension, teaching: dimension, evidence: dimension, restraint: dimension, premiseIntegrity: dimension }).strict()
const identity = z.object({ id: z.string().trim().min(1).max(160), kind: z.literal('ai'),
  independentOfProducer: z.literal(true), independentOfOtherReview: z.literal(true), freshContext: z.boolean(), credentialedEducator: z.literal(false),
  priorProjectExposure: z.string().trim().min(20), priorOutputExposure: z.string().trim().min(20) }).strict()
const reviewSchema = z.object({ schema: z.literal('hybrid-primary-review-v1'), packetHash: hash, rubricSha256: hash, reviewer: identity,
  savedAt: z.string().datetime(), ratings: z.array(z.object({ id: z.string(), caseHash: hash, responseHash: hash,
    responseKind: z.enum(KINDS), dimensions }).strict()),
  suspectedKeyErrors: z.array(z.object({ id: z.string(), caseHash: hash, responseHash: hash, details: z.string().trim().min(20) }).strict()),
}).strict()
export type PrimaryReview = z.infer<typeof reviewSchema>
function validateQuotes(entry: Entry, value: z.infer<typeof dimension>) {
  check(value.evidenceQuotes.every(quote => entry.response!.includes(quote)), `Evidence quote is absent from response: ${entry.id}`)
}
export function validatePrimaryReview(raw: unknown, packet: ReviewPacket): PrimaryReview {
  const review = reviewSchema.parse(raw)
  check(review.packetHash === valueSha(packet) && review.rubricSha256 === packet.rubricSha256, 'Stale review packet or rubric hash')
  check(Date.parse(review.savedAt) <= Date.now(), 'Review save time is in the future')
  const available = new Map(packet.entries.filter(e => e.response !== null).map(e => [e.id, e]))
  const seen = new Set<string>()
  for (const rating of [...review.ratings, ...review.suspectedKeyErrors]) {
    const entry = available.get(rating.id)
    check(entry && !seen.has(rating.id), 'Duplicate, unavailable or unknown case rating')
    seen.add(rating.id)
    check(rating.caseHash === entry.caseHash && rating.responseHash === entry.responseHash, 'Stale case or response hash')
    if ('dimensions' in rating) {
      for (const key of DIMENSIONS) validateQuotes(entry, rating.dimensions[key])
      check(rating.responseKind !== 'abstention' || rating.dimensions.teaching.pass === false, 'Bare abstention cannot pass teaching')
    }
  }
  check(seen.size === available.size, 'Every available complete response requires a rating or explicit key-error report')
  return review
}
export type Dispute = { id: string; caseHash: string; responseHash: string; dimension: Dimension; first: z.infer<typeof dimension>; second: z.infer<typeof dimension> }
function comparisons(packet: ReviewPacket, first: PrimaryReview, second: PrimaryReview) {
  check(first.reviewer.id.toLowerCase() !== second.reviewer.id.toLowerCase(), 'Two distinct independent reviewers are required')
  const disputes: Dispute[] = []
  for (const entry of packet.entries) {
    const a = first.ratings.find(r => r.id === entry.id), b = second.ratings.find(r => r.id === entry.id)
    if (!a || !b) continue
    for (const key of DIMENSIONS) if (a.dimensions[key].pass !== b.dimensions[key].pass) disputes.push({ id: entry.id,
      caseHash: entry.caseHash, responseHash: entry.responseHash!, dimension: key, first: a.dimensions[key], second: b.dimensions[key] })
  }
  return disputes
}
export async function writeDisputePacket(packetDirectory: string, firstFile: string, secondFile: string, output: string) {
  const { packet, provenance } = await validatedPacket(packetDirectory)
  outsideRun(output, provenance.runDirectory)
  const first = validatePrimaryReview(read(firstFile), packet), second = validatePrimaryReview(read(secondFile), packet)
  const packetSavedAt = read(resolve(packetDirectory, 'packet-receipt.json')).savedAt
  check([first, second].every(review => Date.parse(review.savedAt) >= Date.parse(packetSavedAt)), 'Primary review predates saved packet')
  const disputes = comparisons(packet, first, second)
  mkdirSync(output)
  // Preserve the complete original first passes before making disagreements visible.
  writeFileSync(resolve(output, 'first-review.json'), readFileSync(firstFile), { flag: 'wx' })
  writeFileSync(resolve(output, 'second-review.json'), readFileSync(secondFile), { flag: 'wx' })
  const value = { schema: 'hybrid-dispute-packet-v1', packetHash: valueSha(packet), rubricSha256: packet.rubricSha256, rubric: packet.rubric,
    firstRawSha256: rawSha(readFileSync(firstFile)), secondRawSha256: rawSha(readFileSync(secondFile)), disputes,
    entries: packet.entries.filter(e => disputes.some(d => d.id === e.id)) }
  save(resolve(output, 'disputes.json'), value)
  save(resolve(output, 'receipt.json'), { disputePacketHash: valueSha(value), firstRawSha256: value.firstRawSha256, secondRawSha256: value.secondRawSha256,
    savedAt: new Date().toISOString(), firstPath: resolve(firstFile), secondPath: resolve(secondFile), packetDirectory: resolve(packetDirectory) })
  return { disputes: disputes.length, disputePacketHash: valueSha(value) }
}
const adjudicationSchema = z.object({ schema: z.literal('hybrid-adjudication-v1'), disputePacketHash: hash, packetHash: hash, rubricSha256: hash,
  reviewer: identity, savedAt: z.string().datetime(), ratings: z.array(z.object({ id: z.string(), caseHash: hash, responseHash: hash,
    dimension: z.enum(DIMENSIONS), judgment: dimension }).strict()) }).strict()

export function resolveQuality(packet: ReviewPacket, first: PrimaryReview, second: PrimaryReview,
  resolved: Map<string, boolean> = new Map()) {
  const disputes = comparisons(packet, first, second)
  const disputeKeys = new Set(disputes.map(d => `${d.id}/${d.dimension}`))
  for (const key of resolved.keys()) check(disputeKeys.has(key), 'Adjudication cannot change an agreed dimension')
  const counts = Object.fromEntries(DIMENSIONS.map(d => [d, 0])) as Record<Dimension, number>
  const kinds: Record<string, number> = Object.fromEntries([...KINDS, 'disputed_or_unreviewed', 'unavailable'].map(k => [k, 0]))
  let passes = 0, fabricatedPremises = 0, unresolvedDimensions = 0
  const cells: Record<string, { denominator: 4; passes: number; available: number }> = {}
  const cases = packet.entries.map(entry => {
    const key = `${entry.case.subject}/${entry.case.band}`
    cells[key] ??= { denominator: 4, passes: 0, available: 0 }
    const a = first.ratings.find(r => r.id === entry.id), b = second.ratings.find(r => r.id === entry.id)
    const final: Record<string, boolean | null> = {}
    if (entry.response === null) { kinds.unavailable++; return { id: entry.id, pass: false, dimensions: null } }
    cells[key].available++
    kinds[a && b && a.responseKind === b.responseKind ? a.responseKind : 'disputed_or_unreviewed']++
    for (const d of DIMENSIONS) {
      const left = a?.dimensions[d].pass, right = b?.dimensions[d].pass
      const result = left !== undefined && left === right ? left : resolved.get(`${entry.id}/${d}`) ?? null
      final[d] = result
      if (result === true) counts[d]++
      if (result === null) unresolvedDimensions++
      if (d === 'premiseIntegrity' && result === false) fabricatedPremises++
    }
    const pass = DIMENSIONS.every(d => final[d] === true)
    if (pass) { passes++; cells[key].passes++ }
    return { id: entry.id, pass, dimensions: final }
  })
  const keyErrors = [...first.suspectedKeyErrors, ...second.suspectedKeyErrors]
  return { denominator: 96, passes, passRate: passes / 96, dimensionPassCounts: counts, responseKinds: kinds,
    responseKindsByReviewer: [first, second].map(r => ({ reviewerId: r.reviewer.id,
      counts: Object.fromEntries(KINDS.map(k => [k, r.ratings.filter(v => v.responseKind === k).length])) })),
    fabricatedPremises, unresolvedDimensions, suspectedKeyErrors: keyErrors, cells, cases,
    developmentThresholdMet: passes >= 92 && fabricatedPremises === 0 && unresolvedDimensions === 0 && keyErrors.length === 0,
    qualitySuccess: false, productionEligible: false, populationAccuracyEstablished: false, educatorValidated: false,
    reviewerDisclosures: [first.reviewer, second.reviewer],
    limitations: ['Authored development cases only; no population accuracy or student learning claim.',
      'AI reviewer context is disclosed per reviewer; no review is credentialed educator validation.',
      'Zero observed fabrication in reviewed text does not establish integrity of unavailable output.',
      'Identity, independence and exposure disclosures are attestations, not independently established by this tool.'] }
}
export async function writeReviewReport(packetDirectory: string, disputeDirectory: string, adjudicationFile: string | null, output: string) {
  const { packet, provenance } = await validatedPacket(packetDirectory)
  outsideRun(output, provenance.runDirectory)
  const receipt = read(resolve(disputeDirectory, 'receipt.json')), disputePacket = read(resolve(disputeDirectory, 'disputes.json'))
  check(valueSha(disputePacket) === receipt.disputePacketHash && disputePacket.packetHash === valueSha(packet) &&
    disputePacket.rubricSha256 === packet.rubricSha256, 'Stale dispute packet')
  const files = ['first-review.json', 'second-review.json'].map(name => resolve(disputeDirectory, name))
  const hashes = files.map(file => rawSha(readFileSync(file)))
  check(hashes[0] === receipt.firstRawSha256 && hashes[1] === receipt.secondRawSha256 &&
    hashes[0] === disputePacket.firstRawSha256 && hashes[1] === disputePacket.secondRawSha256 &&
    hashes[0] === rawSha(readFileSync(receipt.firstPath)) && hashes[1] === rawSha(readFileSync(receipt.secondPath)), 'First-pass reviews changed after comparison')
  const [first, second] = files.map(file => validatePrimaryReview(read(file), packet))
  const disputes = comparisons(packet, first, second)
  check(canonicalHybridJson(disputes) === canonicalHybridJson(disputePacket.disputes) &&
    canonicalHybridJson(packet.entries.filter(e => disputes.some(d => d.id === e.id))) === canonicalHybridJson(disputePacket.entries), 'Dispute content changed')
  const resolved = new Map<string, boolean>()
  let adjudicator: z.infer<typeof identity> | null = null
  if (adjudicationFile) {
    const review = adjudicationSchema.parse(read(adjudicationFile))
    check(review.disputePacketHash === receipt.disputePacketHash && review.packetHash === valueSha(packet) && review.rubricSha256 === packet.rubricSha256, 'Stale adjudication hashes')
    check(Date.parse(review.savedAt) >= Date.parse(receipt.savedAt) && Date.parse(review.savedAt) <= Date.now(), 'Invalid adjudication save time')
    check(![first.reviewer.id, second.reviewer.id].some(id => id.toLowerCase() === review.reviewer.id.toLowerCase()), 'Adjudicator must be independent of both first-pass reviewers')
    adjudicator = review.reviewer
    for (const rating of review.ratings) {
      const key = `${rating.id}/${rating.dimension}`, dispute = disputes.find(d => `${d.id}/${d.dimension}` === key)
      check(dispute && !resolved.has(key), 'Duplicate or undisputed adjudication')
      check(rating.caseHash === dispute.caseHash && rating.responseHash === dispute.responseHash, 'Stale adjudication case or response')
      validateQuotes(packet.entries.find(e => e.id === rating.id)!, rating.judgment)
      resolved.set(key, rating.judgment.pass)
    }
  }
  const counts = Object.fromEntries(['completed', 'missing', 'failed', 'uncertain'].map(s => [s, provenance.attempts.filter(a => a.status === s).length]))
  const report = { schema: 'hybrid-development-review-report-v1', savedAt: new Date().toISOString(), packetHash: valueSha(packet),
    planFingerprint: provenance.planFingerprint, corpusSha256: provenance.corpusSha256, rubricSha256: packet.rubricSha256,
    firstReviewRawSha256: hashes[0], secondReviewRawSha256: hashes[1], adjudicationRawSha256: adjudicationFile ? rawSha(readFileSync(adjudicationFile)) : null,
    adjudicator, sourceHashes: provenance.sourceHashes, quality: resolveQuality(packet, first, second, resolved),
    execution: { counts, attempted: 96 - counts.missing, withheldOrUnavailableText: 96 - counts.completed,
      knownActualCents: provenance.attempts.reduce((sum, a) => sum + (a.actualCents ?? 0), 0),
      unknownChargeAttempts: provenance.attempts.filter(a => a.status !== 'missing' && a.actualCents === null).length,
      latencyMs: provenance.attempts.map(a => ({ id: a.id, value: a.latencyMs })) } }
  save(output, report)
  return report
}
async function main() {
  const [command, first, second, third, fourth] = process.argv.slice(2)
  if (command === 'archive' && first) console.log(JSON.stringify(await archiveReviewSources(process.cwd(), resolve(first))))
  else if (command === 'packet' && first && second) console.log(JSON.stringify({ packetHash: await writeReviewPacket(process.cwd(), resolve(first), resolve(second)) }))
  else if (command === 'disputes' && first && second && third && fourth) console.log(JSON.stringify(await writeDisputePacket(resolve(first), resolve(second), resolve(third), resolve(fourth))))
  else if (command === 'report' && first && second && third && fourth) {
    const report = await writeReviewReport(resolve(first), resolve(second), third === '-' ? null : resolve(third), resolve(fourth))
    console.log(JSON.stringify({ passes: report.quality.passes, denominator: 96, developmentThresholdMet: report.quality.developmentThresholdMet, productionEligible: false }))
  } else throw new Error('Usage: review-hybrid-benchmark.ts packet RUN OUT | disputes PACKET_DIR REVIEW1 REVIEW2 OUT | report PACKET_DIR DISPUTE_DIR ADJUDICATION_OR_- OUT.json')
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error instanceof Error ? error.message : 'Review error'); process.exitCode = 1 })
