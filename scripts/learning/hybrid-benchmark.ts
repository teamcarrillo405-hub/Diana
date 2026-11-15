/** Offline preparation and authenticated Edge execution. Never calls a model provider directly. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  buildHybridBenchmarkPlan, canonicalHybridJson, hashHybridValue, validateHybridBenchmarkPlan,
  type HybridBenchmarkInput, type HybridBenchmarkPlan, type HybridPriceSnapshot,
} from '../../lib/learning-engine/hybrid-benchmark-contract'
import { HYBRID_BENCHMARK_CASES, buildHybridBenchmarkUserPrompt } from '../../lib/learning-engine/hybrid-benchmark-cases'
import { HYBRID_BENCHMARK_SYSTEM, HYBRID_RESPONSE_JSON_SCHEMA } from '../../supabase/functions/_shared/learning/hybrid-benchmark-prompt'
import { knownModel, parseFeedback } from '../../supabase/functions/_shared/learning/hybrid-experiment-handler'

export const HYBRID_EDGE_URL = 'https://oitipayrriupcitgmzju.supabase.co/functions/v1/hybrid-learning-experiment'
const registryPath = 'supabase/functions/_shared/learning/hybrid-approved-fixtures.ts'
const roots = [
  'scripts/learning/hybrid-benchmark.ts',
  'scripts/learning/run-hybrid-operator.ts',
  'lib/learning-engine/hybrid-benchmark-contract.ts',
  'lib/learning-engine/hybrid-benchmark-cases.ts',
  'supabase/functions/hybrid-learning-experiment/index.ts',
  'supabase/functions/_shared/learning/hybrid-benchmark-prompt.ts',
  'docs/engineering/hybrid-benchmark-review-protocol.md',
  'docs/engineering/hybrid-benchmark-corpus-audit.json',
]
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const json = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'))
const save = (file: string, value: unknown) => writeFileSync(file, canonicalHybridJson(value) + '\n', { flag: 'wx' })
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function uuid(seed: string) {
  const hash = sha(seed)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

/** Bind actual relative dependency bytes, recording external import specifiers separately. */
export function benchmarkCodeClosure(workspace: string) {
  const files: Record<string, string> = {}, external = new Set<string>()
  function visit(name: string) {
    name = name.replaceAll('\\', '/')
    if (name === registryPath || files[name]) return
    const full = resolve(workspace, name), rel = relative(workspace, full)
    assert(rel && !rel.startsWith('..') && !rel.startsWith(sep), 'Code dependency escaped workspace')
    const raw = readFileSync(full)
    files[name] = sha(raw)
    if (!name.endsWith('.ts')) return
    for (const match of raw.toString('utf8').matchAll(/(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g)) {
      const specifier = match[1]
      if (!specifier.startsWith('.')) { external.add(specifier); continue }
      let target = resolve(dirname(full), specifier)
      if (!existsSync(target)) target += '.ts'
      visit(relative(workspace, target))
    }
  }
  roots.forEach(visit)
  visit('package-lock.json')
  return { files, externalImports: [...external].sort(), excludedGeneratedRegistry: registryPath }
}

export type HybridDispatch = { caseId: string; requestId: string; batchId: string }
export function dispatchFor(plan: HybridBenchmarkPlan): HybridDispatch[] {
  return plan.calls.map(call => ({ caseId: call.caseId,
    requestId: uuid(`${plan.fingerprint}:case:${call.caseId}`), batchId: uuid(`${plan.fingerprint}:batch:${call.batchIndex}`) }))
}

export function renderHybridRegistry(plan: HybridBenchmarkPlan, inputs: readonly HybridBenchmarkInput[]) {
  const requests = Object.fromEntries(dispatchFor(plan).map((entry, index) => [entry.requestId, { ...entry,
    input: inputs[index].user, inputSha256: sha(inputs[index].user), reservedCents: plan.calls[index].reservationCents }]))
  const registry = { sha256: plan.fingerprint, model: plan.request.model, systemSha256: sha(HYBRID_BENCHMARK_SYSTEM),
    priceReviewedAt: plan.priceSnapshot.verifiedAt, inputRate: 1250, outputRate: 5000, requests }
  return '// Generated frozen research inputs only. Installing this file does not authorize execution.\n' +
    'export type ApprovedHybridCase = { requestId: string; batchId: string; caseId: string; input: string; inputSha256: string; reservedCents: number };\n' +
    'export const APPROVED_HYBRID_PLAN: { sha256: string; model: string; systemSha256: string; priceReviewedAt: string; inputRate: number; outputRate: number; requests: Readonly<Record<string, ApprovedHybridCase>> } = ' +
    canonicalHybridJson(registry) + ';\n'
}

/** A separate exact-plan operator attestation is necessary; preparation never grants approval. */
export function validateBenchmarkApproval(value: unknown, plan: HybridBenchmarkPlan) {
  assert(value && typeof value === 'object', 'Explicit model and budget approval is required')
  const approval = value as Record<string, unknown>
  assert(Object.keys(approval).sort().join(',') === 'approvedAt,approvedBy,hardCapCents,model,planFingerprint,userAuthorization', 'Unexpected approval fields')
  assert(approval.planFingerprint === plan.fingerprint && approval.model === plan.request.model && approval.hardCapCents === 4000,
    'Approval must bind the exact model, plan fingerprint and $40 cap')
  assert(typeof approval.approvedBy === 'string' && approval.approvedBy.trim().length > 0 &&
    typeof approval.userAuthorization === 'string' && approval.userAuthorization.trim().length >= 20, 'Record the actual user authorization and approving operator')
  assert(typeof approval.approvedAt === 'string' && Number.isFinite(Date.parse(approval.approvedAt)) &&
    Date.parse(approval.approvedAt) >= Date.parse(plan.createdAt) && Date.parse(approval.approvedAt) <= Date.now(), 'Approval timestamp must follow preparation')
}

export function validateSavedHybridResponse(directory: string, entry: HybridDispatch, plan: HybridBenchmarkPlan) {
  const record = json(resolve(directory, 'response.json')) as { accepted?: boolean; responseSha256?: string; status?: number; body?: unknown }
  const raw = readFileSync(resolve(directory, 'response-body.txt'), 'utf8')
  assert(record.accepted === true && record.status === 200 && sha(raw) === record.responseSha256 &&
    canonicalHybridJson(JSON.parse(raw)) === canonicalHybridJson(record.body), 'Saved response content or digest changed')
  const body = record.body as { ok?: boolean; result?: {
    requestId?: string; caseId?: string; planSha256?: string; actualCents?: number; resolvedModel?: string;
    providerResponseId?: string; output?: string; feedback?: unknown; syntheticInput?: boolean; researchOnly?: boolean;
    semanticAcceptance?: boolean; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  } }
  const call = plan.calls.find(item => item.caseId === entry.caseId)!
  assert(body.ok === true && body.result?.requestId === entry.requestId && body.result.caseId === entry.caseId &&
    body.result.planSha256 === plan.fingerprint && Number.isSafeInteger(body.result.actualCents) && body.result.actualCents! >= 0 &&
    body.result.actualCents! <= call.reservationCents, 'Saved response identity or cost does not match reserved attempt')
  const result = body.result, usage = result.usage
  assert(typeof result.resolvedModel === 'string' && knownModel(result.resolvedModel, plan.request.model) &&
    typeof result.providerResponseId === 'string' && /^[A-Za-z0-9_.:-]{1,200}$/.test(result.providerResponseId) &&
    result.syntheticInput === true && result.researchOnly === true && result.semanticAcceptance === false,
    'Saved result is not a completed response from the approved research model')
  assert(typeof result.output === 'string' && result.output.length > 0 &&
    canonicalHybridJson(parseFeedback(result.output)) === canonicalHybridJson(result.feedback), 'Saved output and structured feedback disagree')
  assert(usage && [usage.input_tokens, usage.output_tokens, usage.total_tokens].every(value => Number.isSafeInteger(value) && value! >= 0) &&
    usage.total_tokens! > 0 && usage.input_tokens! + usage.output_tokens! === usage.total_tokens &&
    usage.input_tokens! <= call.inputBytes + plan.policy.inputOverheadTokens && usage.output_tokens! <= plan.request.max_output_tokens &&
    Math.max(1, Math.ceil((usage.input_tokens! * 1250 + usage.output_tokens! * 5000) / 1_000_000)) === result.actualCents,
    'Saved usage or cost is inconsistent with the approved request')
}

/** Operator reconciliation may retain a rejected case as a failure, never turn it into a success or retry. */
export function validateTerminalReconciliation(directory: string, entry: HybridDispatch, plan: HybridBenchmarkPlan) {
  const reconciliation = json(resolve(directory, 'reconciliation.json')) as {
    action: string; planFingerprint: string; requestSha256: string; verifiedAt: string; verifiedBy: string;
    reservation: { id: string; manifest_hash: string; batch_id: string; reserved_cents: number; actual_cents: number; state: string };
    receipt: { request_id: string; requested_model: string; resolved_model: string; provider_response_id: string;
      input_tokens: number; output_tokens: number; total_tokens: number; actual_cents: number; usage_received_at: string; output_state: string };
  }
  const call = plan.calls.find(item => item.caseId === entry.caseId)!, r = reconciliation.reservation, receipt = reconciliation.receipt
  assert(existsSync(resolve(directory, 'interruption.json')) && reconciliation.action === 'retain-failure-and-continue' &&
    reconciliation.planFingerprint === plan.fingerprint && reconciliation.requestSha256 === sha(readFileSync(resolve(directory, 'request.json'))) &&
    typeof reconciliation.verifiedBy === 'string' && reconciliation.verifiedBy.trim().length > 0 &&
    Date.parse(reconciliation.verifiedAt) >= Date.parse(plan.createdAt) && Date.parse(reconciliation.verifiedAt) <= Date.now(),
    'Terminal reconciliation must bind this interrupted attempt and an actual operator verification')
  assert(r && r.id === entry.requestId && r.manifest_hash === plan.fingerprint && r.batch_id === entry.batchId &&
    r.state === 'settled' && r.reserved_cents === call.reservationCents && Number.isSafeInteger(r.actual_cents) &&
    r.actual_cents > 0 && r.actual_cents <= r.reserved_cents, 'Unsettled or over-budget reservation cannot be skipped')
  assert(receipt && receipt.request_id === entry.requestId && receipt.requested_model === plan.request.model &&
    typeof receipt.resolved_model === 'string' && knownModel(receipt.resolved_model, plan.request.model) &&
    typeof receipt.provider_response_id === 'string' && receipt.provider_response_id.length > 0 &&
    ['accounting_error', 'generation_error', 'blocked', 'screening_unavailable'].includes(receipt.output_state) &&
    Date.parse(receipt.usage_received_at) >= Date.parse(plan.createdAt) && Date.parse(receipt.usage_received_at) <= Date.parse(reconciliation.verifiedAt) &&
    [receipt.input_tokens, receipt.output_tokens, receipt.total_tokens].every(value => Number.isSafeInteger(value) && value >= 0) &&
    receipt.total_tokens > 0 && receipt.input_tokens + receipt.output_tokens === receipt.total_tokens &&
    receipt.actual_cents === r.actual_cents && Math.max(1, Math.ceil((receipt.input_tokens * 1250 + receipt.output_tokens * 5000) / 1_000_000)) === receipt.actual_cents,
    'A matching durable provider usage receipt is required; unknown charges must remain paused')
  return receipt.actual_cents
}

export async function prepareBenchmark(workspace: string, output: string, priceFile: string) {
  const evidence = json(priceFile) as { snapshot: HybridPriceSnapshot; evidence: unknown }
  assert(evidence && evidence.snapshot && evidence.evidence, 'Price file must contain snapshot and source evidence')
  assert(await hashHybridValue(evidence.evidence) === evidence.snapshot.sourceSha256, 'Price evidence digest does not match')
  const inputs: HybridBenchmarkInput[] = HYBRID_BENCHMARK_CASES.map(item => ({ caseId: item.id,
    system: HYBRID_BENCHMARK_SYSTEM, user: buildHybridBenchmarkUserPrompt(item) }))
  const closure = benchmarkCodeClosure(workspace)
  const plan = await buildHybridBenchmarkPlan({ inputs, corpusSha256: await hashHybridValue(HYBRID_BENCHMARK_CASES),
    promptSha256: await hashHybridValue({ system: HYBRID_BENCHMARK_SYSTEM, schema: HYBRID_RESPONSE_JSON_SCHEMA }),
    codeSha256: await hashHybridValue(closure), priceSnapshot: evidence.snapshot, createdAt: new Date().toISOString() })
  // Exclusive directory creation: existing evidence is never replaced, even on preparation failure.
  mkdirSync(output)
  save(resolve(output, 'corpus.json'), HYBRID_BENCHMARK_CASES)
  save(resolve(output, 'inputs.json'), inputs)
  save(resolve(output, 'code-closure.json'), closure)
  save(resolve(output, 'price-evidence.json'), evidence)
  save(resolve(output, 'corpus-review.json'), json(resolve(workspace, 'docs/engineering/hybrid-benchmark-corpus-audit.json')))
  save(resolve(output, 'plan.json'), plan)
  const dispatch = dispatchFor(plan)
  save(resolve(output, 'dispatch.json'), dispatch)
  writeFileSync(resolve(output, 'hybrid-approved-fixtures.ts'), renderHybridRegistry(plan, inputs), { flag: 'wx' })
  save(resolve(output, 'preparation.json'), { status: 'awaiting-independent-corpus-review-and-exact-model-budget-approval',
    planFingerprint: plan.fingerprint, cases: 96, reservationCeilingCents: plan.quoteCents, hardCapCents: 4000,
    productionEligible: false, paidCallsMade: 0, generatedRegistrySha256: sha(readFileSync(resolve(output, 'hybrid-approved-fixtures.ts'))) })
  return plan
}

export async function verifyBenchmark(workspace: string, directory: string) {
  const plan = json(resolve(directory, 'plan.json')) as HybridBenchmarkPlan
  const inputs = json(resolve(directory, 'inputs.json')) as HybridBenchmarkInput[]
  await validateHybridBenchmarkPlan(plan, inputs, new Date().toISOString())
  assert(await hashHybridValue(json(resolve(directory, 'corpus.json'))) === plan.corpusSha256, 'Frozen corpus changed')
  assert(await hashHybridValue(HYBRID_BENCHMARK_CASES) === plan.corpusSha256, 'Source corpus changed; prepare a new plan')
  assert(await hashHybridValue(benchmarkCodeClosure(workspace)) === plan.codeSha256, 'Executable code changed; prepare a new plan')
  assert(await hashHybridValue(json(resolve(directory, 'code-closure.json'))) === plan.codeSha256, 'Saved code closure changed')
  assert(await hashHybridValue({ system: HYBRID_BENCHMARK_SYSTEM, schema: HYBRID_RESPONSE_JSON_SCHEMA }) === plan.promptSha256, 'Prompt or response schema changed')
  assert(canonicalHybridJson(json(resolve(directory, 'dispatch.json'))) === canonicalHybridJson(dispatchFor(plan)), 'Request identities changed')
  const prices = json(resolve(directory, 'price-evidence.json')) as { snapshot: HybridPriceSnapshot; evidence: unknown }
  assert(canonicalHybridJson(prices.snapshot) === canonicalHybridJson(plan.priceSnapshot) &&
    await hashHybridValue(prices.evidence) === plan.priceSnapshot.sourceSha256, 'Price evidence changed')
  assert(readFileSync(resolve(directory, 'hybrid-approved-fixtures.ts'), 'utf8') === renderHybridRegistry(plan, inputs), 'Generated registry differs from frozen inputs')
  return { plan, inputs }
}

/** A reserved request is never repeated, including after timeout, crash or incomplete provider output. */
export async function executeBenchmark(workspace: string, directory: string, approvalFile: string) {
  const { plan } = await verifyBenchmark(workspace, directory)
  const approval = json(approvalFile)
  validateBenchmarkApproval(approval, plan)
  const review = json(resolve(directory, 'corpus-review.json')) as Record<string, unknown>
  assert(review.corpusSha256 === plan.corpusSha256 && review.status === 'engineering-audit-passed' &&
    review.independentOfAuthor === true && typeof review.reviewer === 'string' && review.reviewer.length > 0,
    'Independent engineering corpus audit is required; this is not educator validation')
  assert(canonicalHybridJson(review) === canonicalHybridJson(json(resolve(workspace, 'docs/engineering/hybrid-benchmark-corpus-audit.json'))),
    'Corpus review differs from the independently audited, code-bound record')
  assert(sha(readFileSync(resolve(workspace, registryPath))) === sha(readFileSync(resolve(directory, 'hybrid-approved-fixtures.ts'))), 'Installed Edge fixture registry does not match prepared artifact')
  const deployment = json(resolve(directory, 'deployment-verification.json')) as Record<string, unknown>
  assert(deployment.planFingerprint === plan.fingerprint && deployment.codeSha256 === plan.codeSha256 &&
    deployment.registrySha256 === sha(readFileSync(resolve(workspace, registryPath))) && deployment.endpoint === HYBRID_EDGE_URL &&
    deployment.verifyJwt === true && deployment.remoteFilesMatch === true && typeof deployment.verifiedAt === 'string' &&
    Date.parse(deployment.verifiedAt) >= Date.parse(plan.createdAt) && Date.parse(deployment.verifiedAt) <= Date.now(),
    'Deployed Edge files and JWT configuration must be independently verified against the frozen plan')
  const readOperatorToken = () => {
    const token = process.env.DIANA_HYBRID_OPERATOR_ACCESS_TOKEN
    assert(token && token.length > 30, 'Authenticated approved operator access token is required')
    return token
  }
  readOperatorToken()
  const attempts = resolve(directory, 'attempts')
  if (!existsSync(attempts)) mkdirSync(attempts)
  if (!existsSync(resolve(directory, 'approval-used.json'))) save(resolve(directory, 'approval-used.json'), approval)
  else assert(canonicalHybridJson(json(resolve(directory, 'approval-used.json'))) === canonicalHybridJson(approval), 'Execution approval changed')
  let completedCases = 0, reconciledFailures = 0
  for (const entry of dispatchFor(plan)) {
    // Recheck the full closure and remaining price validity before every paid call.
    await verifyBenchmark(workspace, directory)
    const attempt = resolve(attempts, entry.requestId)
    if (existsSync(attempt)) {
      const resultFile = resolve(attempt, 'response.json')
      if (existsSync(resolve(attempt, 'reconciliation.json'))) {
        validateTerminalReconciliation(attempt, entry, plan)
        reconciledFailures++
        continue
      }
      assert(existsSync(resultFile) && (json(resultFile) as { accepted?: boolean }).accepted === true,
        `Attempt ${entry.caseId} needs reconciliation; automatic retries are forbidden`)
      validateSavedHybridResponse(attempt, entry, plan)
      completedCases++
      continue
    }
    mkdirSync(attempt)
    const startedAt = new Date().toISOString(), started = Date.now()
    save(resolve(attempt, 'request.json'), { ...entry, planFingerprint: plan.fingerprint, startedAt,
      reservationCents: plan.calls.find(call => call.caseId === entry.caseId)!.reservationCents })
    let status: number | null = null, body: unknown = null
    try {
      const response = await fetch(HYBRID_EDGE_URL, { method: 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${readOperatorToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSha256: plan.fingerprint, requestId: entry.requestId }), signal: AbortSignal.timeout(240_000) })
      status = response.status
      const raw = await response.text()
      writeFileSync(resolve(attempt, 'response-body.txt'), raw, { flag: 'wx' })
      body = JSON.parse(raw)
      const payload = body as { ok?: boolean; result?: { requestId?: string; caseId?: string; planSha256?: string } }
      const accepted = response.ok && payload.ok === true && payload.result?.requestId === entry.requestId &&
        payload.result.caseId === entry.caseId && payload.result.planSha256 === plan.fingerprint
      save(resolve(attempt, 'response.json'), { status, body, accepted, completedAt: new Date().toISOString(), latencyMs: Date.now() - started,
        semanticAcceptance: false, responseSha256: sha(raw) })
      assert(accepted, `Attempt ${entry.caseId} needs review; run paused with reservation preserved`)
      validateSavedHybridResponse(attempt, entry, plan)
      completedCases++
    } catch (error) {
      save(resolve(attempt, 'interruption.json'), { status, completedAt: new Date().toISOString(), latencyMs: Date.now() - started,
        disposition: 'uncertain-or-rejected-no-retry', error: error instanceof Error ? error.name : 'UnknownError' })
      throw new Error(`Stopped at ${entry.caseId}. Inspect retained receipts before proceeding. No automatic retry.`, { cause: error })
    }
  }
  await verifyBenchmark(workspace, directory)
  save(resolve(directory, 'execution-complete.json'), { planFingerprint: plan.fingerprint, completedAt: new Date().toISOString(),
    cases: 96, completedCases, reconciledFailures, semanticAcceptance: false, productionEligible: false, nextStep: 'independent-response-review' })
}

async function main() {
  const [command, directory, extra] = process.argv.slice(2)
  assert(directory && ['prepare', 'verify', 'execute'].includes(command), 'Usage: tsx scripts/learning/hybrid-benchmark.ts prepare|verify|execute <artifact-directory> [price-file|approval-file]')
  if (command === 'prepare') {
    assert(extra, 'A current independently verified price-evidence file is required')
    const plan = await prepareBenchmark(process.cwd(), resolve(directory), resolve(extra))
    console.log(JSON.stringify({ fingerprint: plan.fingerprint, reservationCeilingCents: plan.quoteCents, hardCapCents: 4000, expiresAt: plan.expiresAt, paidCallsMade: 0 }))
  } else if (command === 'verify') {
    const { plan } = await verifyBenchmark(process.cwd(), resolve(directory))
    console.log(JSON.stringify({ status: 'verified', fingerprint: plan.fingerprint, productionEligible: false }))
  } else {
    assert(extra, 'An exact-plan approval file is required')
    await executeBenchmark(process.cwd(), resolve(directory), resolve(extra))
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Benchmark error'); process.exitCode = 1 })
}
