/** Partial exclusion inventory from six explicit, pinned metadata files. Never imports corpus modules. */
import { createHash } from 'node:crypto'
import { closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

const sha = z.string().regex(/^[a-f0-9]{64}$/)
const count = z.number().int().min(0)
const label = z.string().min(1).max(400).refine(s => s.trim() === s && !/[\p{Cc}\p{Cf}]/u.test(s))
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

// Paths are deliberately fixed: adding a new metadata adapter requires code review.
// Neither these files' embedded paths nor arrays of corpus rows are followed.
export const INVENTORY_METADATA_PATHS = {
  hybridAudit: 'docs/engineering/hybrid-benchmark-corpus-audit.json',
  hybridPlan: 'artifacts/learning-engine/research/hybrid-api-baseline-002/plan.json',
  localProtocol: 'artifacts/learning-engine/research/local-large-model-run-001/protocol.json',
  historicalManifest: 'docs/engineering/grounding-v3-test-manifest.json',
  freshManifest: 'docs/engineering/qwen3-fresh-test-manifest.json',
  exposureAudit: 'docs/engineering/integrated-grounding-exposure-audit.json',
} as const
type Source = keyof typeof INVENTORY_METADATA_PATHS
const sourceKeys = Object.keys(INVENTORY_METADATA_PATHS) as Source[]
const pin = z.object({ sha256: sha }).strict()
export const inventoryPreparationSchema = z.object({
  schema: z.literal('integrated-family-inventory-input-v1'),
  sources: z.object({ hybridAudit: pin, hybridPlan: pin, localProtocol: pin,
    historicalManifest: pin, freshManifest: pin, exposureAudit: pin }).strict(),
}).strict()
type Preparation = z.infer<typeof inventoryPreparationSchema>

const parsers = {
  hybridAudit: z.object({ corpusSha256: sha, sourceSha256: sha, count }),
  hybridPlan: z.object({ schema: z.literal('diana-hybrid-benchmark-plan-v1'), partition: z.literal('development'), corpusSha256: sha }),
  localProtocol: z.object({ schemaVersion: z.literal(1), dataset: z.object({ path: label, sha256: sha, canonicalSha256: sha, count }) }),
  historicalManifest: z.object({ version: label, modulePath: label, moduleSha256: sha, testRowsSha256: sha, testCases: count, serialization: label }),
  freshManifest: z.object({ schema_version: z.literal(1), revision: z.literal(2), dataset_id: label, source_path: label,
    source_sha256: sha, canonical_rows_sha256: sha, canonical_serialization: label, counts: z.object({ total: count }),
    revision_history: z.array(z.object({ revision: z.literal(1), source_sha256: sha, canonical_rows_sha256: sha, manifest_sha256: sha })).length(1) }),
  exposureAudit: z.object({ schemaVersion: z.literal('integrated-grounding-exposure-audit-v1'),
    exposure: z.array(z.object({ path: label, manifestSourceSha256: sha.optional(), manifestRowsSha256: sha.optional() })).min(1) }),
}

type Evidence = { metadataSource: Source; jsonPointer: string }
type InventoryPin = { kind: 'module_bytes' | 'dataset_bytes' | 'canonical_rows' | 'manifest_bytes'; sha256: string;
  serialization: string | null; evidence: Evidence[] }
type Entry = { artifactId: string; role: 'development' | 'prior_test_status_unknown' | 'visible_probe';
  declaredCases: number | null; contentPathReference: string | null; pins: InventoryPin[];
  excludedFromFreshEvaluation: true; familyRegistry: {
    normalizedSha256: null; normalization: null; documentFamily: null; templateFamily: null; reasoningFamily: null;
    aliases: null; parentIds: null; sourceAssetSha256: null; authorId: null; reviewerId: null;
  } }
const evidence = (metadataSource: Source, jsonPointer: string): Evidence => ({ metadataSource, jsonPointer })
const entry = (artifactId: string, role: Entry['role'], declaredCases: number | null,
  contentPathReference: string | null, pins: InventoryPin[]): Entry => ({ artifactId, role, declaredCases, contentPathReference, pins,
  excludedFromFreshEvaluation: true,
  familyRegistry: { normalizedSha256: null, normalization: null, documentFamily: null, templateFamily: null,
    reasoningFamily: null, aliases: null, parentIds: null, sourceAssetSha256: null, authorId: null, reviewerId: null } })

/** Unknown properties in source reports are dropped, never copied into this content-free report. */
export function buildIntegratedFamilyInventory(rawInput: unknown, rawDocuments: Record<Source, unknown>) {
  const input = inventoryPreparationSchema.parse(rawInput)
  const parse = <K extends Source>(key: K): z.infer<(typeof parsers)[K]> => {
    const result = parsers[key].safeParse(rawDocuments[key])
    if (!result.success) throw new Error('metadata_shape_invalid:' + key)
    return result.data as z.infer<(typeof parsers)[K]>
  }
  const h = parse('hybridAudit'), plan = parse('hybridPlan'), local = parse('localProtocol')
  const old = parse('historicalManifest'), fresh = parse('freshManifest'), exposure = parse('exposureAudit')
  if (plan.corpusSha256 !== h.corpusSha256) throw new Error('hybrid_canonical_seal_disagreement')
  for (const [path, raw, rows] of [[old.modulePath, old.moduleSha256, old.testRowsSha256],
    [fresh.source_path, fresh.source_sha256, fresh.canonical_rows_sha256]]) {
    const matches = exposure.exposure.filter(item => item.path === path)
    if (matches.length !== 1 || matches[0].manifestSourceSha256 !== raw || matches[0].manifestRowsSha256 !== rows) {
      throw new Error('exposure_manifest_seal_disagreement')
    }
  }
  const p = (kind: InventoryPin['kind'], value: string, source: Source, pointer: string, serialization: string | null = null): InventoryPin =>
    ({ kind, sha256: value, serialization, evidence: [evidence(source, pointer)] })
  const original = fresh.revision_history[0]
  const entries = [
    entry('hybrid-development-96', 'development', h.count, null, [
      p('module_bytes', h.sourceSha256, 'hybridAudit', '/sourceSha256'),
      { ...p('canonical_rows', h.corpusSha256, 'hybridAudit', '/corpusSha256'), evidence: [evidence('hybridAudit', '/corpusSha256'), evidence('hybridPlan', '/corpusSha256')] },
    ]),
    entry('local-development-48', 'development', local.dataset.count, local.dataset.path, [
      p('dataset_bytes', local.dataset.sha256, 'localProtocol', '/dataset/sha256'),
      p('canonical_rows', local.dataset.canonicalSha256, 'localProtocol', '/dataset/canonicalSha256'),
    ]),
    entry('historical-v3-test', 'prior_test_status_unknown', old.testCases, old.modulePath, [
      p('module_bytes', old.moduleSha256, 'historicalManifest', '/moduleSha256'),
      p('canonical_rows', old.testRowsSha256, 'historicalManifest', '/testRowsSha256', old.serialization),
    ]),
    entry('qwen3-test-revision-1', 'prior_test_status_unknown', null, null, [
      p('module_bytes', original.source_sha256, 'freshManifest', '/revision_history/0/source_sha256'),
      p('canonical_rows', original.canonical_rows_sha256, 'freshManifest', '/revision_history/0/canonical_rows_sha256'),
      p('manifest_bytes', original.manifest_sha256, 'freshManifest', '/revision_history/0/manifest_sha256'),
    ]),
    entry('qwen3-test-revision-2', 'prior_test_status_unknown', fresh.counts.total, fresh.source_path, [
      p('module_bytes', fresh.source_sha256, 'freshManifest', '/source_sha256'),
      p('canonical_rows', fresh.canonical_rows_sha256, 'freshManifest', '/canonical_rows_sha256', fresh.canonical_serialization),
    ]),
    // The named retrieval report also embeds probe text. No such report or probe module is read here.
    entry('visible-textbook-topic-probes', 'visible_probe', null, 'lib/learning-engine/textbook-retrieval-probes.ts', []),
  ]
  return {
    schema: 'integrated-family-inventory-preparation-v1', status: 'pending_custodian_metadata',
    sources: sourceKeys.map(key => ({ id: key, path: INVENTORY_METADATA_PATHS[key], sha256: input.sources[key].sha256 })),
    entries,
    declaredRevisionRelationships: [{ parentId: 'qwen3-test-revision-1', childId: 'qwen3-test-revision-2',
      evidence: evidence('freshManifest', '/revision_history/0'), scope: 'declared_module_revision_only' }],
    corroboration: { hybridCanonicalSealAgrees: true, historicalAndFreshExposureSealsAgree: true },
    counts: { inventoriedSeeds: entries.length, seedsWithDigestEvidence: entries.filter(e => e.pins.length).length,
      newEvaluationCases: 0, reviewedEvaluationFamilies: 0, qualifiedSubjectBandCells: 0 },
    inventoryComplete: false, readyForFamilySubmission: false, familyAuthorityVerified: false,
    semanticFamilyIndependenceProven: false, thresholdMet: false, productionEligible: false,
    pending: [
      'Custodian must attest completeness across training, development, visible probes, consumed and reserved tests, reviewed outputs, demonstrations and smoke material.',
      'Supply opaque case and source-asset hashes, compatible canonical/normalization contracts, family IDs, aliases, all ancestry and exposure references.',
      'Supply a metadata-only visible-probe seal; the embedded-probe retrieval report was not opened by this preparation.',
      'Resolve consumed versus reserved status for every prior test revision; all are already excluded here.',
      'Supply eligible fresh-author and separate family-reviewer identities, exposure declarations, actual references/rubrics and a preregistered sampling allocation.',
    ],
    limitations: [
      'Whole-module and whole-dataset seals are distinct from case-level input, source, reference and rubric pins.',
      'Only six named metadata files are inspected; all reported corpus seals are inherited claims and underlying content is not opened or rehashed.',
      'A recorded module revision relationship does not establish complete family lineage. Unknown arrays remain null, not empty.',
      'Repeated test revisions are not independent examples; declared case counts are not summed.',
      'Hashes corroborate bytes and claims only. This preparation cannot establish complete exclusions, authority or semantic independence.',
    ],
  }
}

function readRegularJson(path: string) {
  if (lstatSync(path).isSymbolicLink()) throw new Error('symlink_input_rejected')
  const fd = openSync(path, 'r')
  try {
    const before = fstatSync(fd)
    if (!before.isFile() || before.size > 16 * 1024 * 1024) throw new Error('metadata_file_invalid_or_too_large')
    const buffer = Buffer.alloc(before.size + 1)
    let offset = 0
    while (offset < buffer.length) {
      const size = readSync(fd, buffer, offset, buffer.length - offset, null)
      if (!size) break
      offset += size
    }
    const after = fstatSync(fd)
    if (offset !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('metadata_changed_during_read')
    const bytes = buffer.subarray(0, offset)
    let value: unknown
    try { value = JSON.parse(bytes.toString('utf8')) } catch { throw new Error('invalid_metadata_json') }
    return { value, sha256: digest(bytes), byteLength: bytes.length }
  } finally { closeSync(fd) }
}

/** Exit success means a partial report was written, never that an evaluation is ready. */
export function prepareIntegratedFamilyInventory(args: string[], workspace = process.cwd()) {
  if (args.length !== 5 || args[0] !== 'prepare' || args[2] !== '--input-sha256') {
    throw new Error('Usage: prepare-integrated-family-inventory.ts prepare <metadata-pins.json> --input-sha256 <raw-file-digest> <new-report.json>')
  }
  sha.parse(args[3])
  const root = realpathSync(workspace), inputPath = resolve(workspace, args[1]), output = resolve(workspace, args[4])
  const read = readRegularJson(inputPath)
  if (read.sha256 !== args[3]) throw new Error('preparation_input_digest_mismatch')
  const input: Preparation = inventoryPreparationSchema.parse(read.value)
  const sourceReads: { path: string; sha256: string; byteLength: number }[] = []
  const documents = {} as Record<Source, unknown>
  for (const key of sourceKeys) {
    const source = resolve(root, INVENTORY_METADATA_PATHS[key])
    const resolvedSource = realpathSync(source), distance = relative(root, resolvedSource)
    if (distance === '..' || distance.startsWith('..' + sep) || isAbsolute(distance)) throw new Error('metadata_path_escapes_workspace')
    if (source !== resolvedSource) throw new Error('metadata_redirect_rejected')
    const read = readRegularJson(source)
    if (read.sha256 !== input.sources[key].sha256) throw new Error('metadata_digest_mismatch:' + key)
    documents[key] = read.value
    sourceReads.push({ path: INVENTORY_METADATA_PATHS[key], sha256: read.sha256, byteLength: read.byteLength })
  }
  const report = { ...buildIntegratedFamilyInventory(input, documents),
    preparation: { inputSha256: read.sha256, metadataFilesRead: sourceReads, embeddedPathsFollowed: 0, corpusModulesImported: 0 } }
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const report = prepareIntegratedFamilyInventory(process.argv.slice(2))
    console.log(JSON.stringify({ status: report.status, ...report.counts, inventoryComplete: false, thresholdMet: false }))
  } catch (error) {
    console.error(error instanceof z.ZodError ? 'Invalid preparation input' : error instanceof Error ? error.message : 'Preparation rejected')
    process.exitCode = 1
  }
}
