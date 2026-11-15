import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildIntegratedFamilyInventory, INVENTORY_METADATA_PATHS, prepareIntegratedFamilyInventory } from '../../scripts/learning/prepare-integrated-family-inventory'

// Opaque protocol metadata only. No questions, source passages, answers or evaluation cases.
const sha = (n: number) => n.toString(16).padStart(64, '0')
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
function fixture() {
  const documents = {
    hybridAudit: { corpusSha256: sha(1), sourceSha256: sha(2), count: 96 },
    hybridPlan: { schema: 'diana-hybrid-benchmark-plan-v1', partition: 'development', corpusSha256: sha(1) },
    localProtocol: { schemaVersion: 1, dataset: { path: 'do-not-follow.json', sha256: sha(3), canonicalSha256: sha(4), count: 48 } },
    historicalManifest: { version: 'opaque-v1', modulePath: 'do-not-import.py', moduleSha256: sha(5), testRowsSha256: sha(6), testCases: 100, serialization: 'opaque-a' },
    freshManifest: { schema_version: 1, revision: 2, dataset_id: 'opaque', source_path: 'also-do-not-import.py', source_sha256: sha(7),
      canonical_rows_sha256: sha(8), canonical_serialization: 'opaque-b', counts: { total: 100 },
      revision_history: [{ revision: 1, source_sha256: sha(9), canonical_rows_sha256: sha(10), manifest_sha256: sha(11) }] },
    exposureAudit: { schemaVersion: 'integrated-grounding-exposure-audit-v1', exposure: [
      { path: 'do-not-import.py', manifestSourceSha256: sha(5), manifestRowsSha256: sha(6) },
      { path: 'also-do-not-import.py', manifestSourceSha256: sha(7), manifestRowsSha256: sha(8) },
    ] },
  }
  const input = { schema: 'integrated-family-inventory-input-v1', sources: Object.fromEntries(
    Object.entries(documents).map(([key, value]) => [key, { sha256: hash(JSON.stringify(value)) }])) }
  return { input, documents }
}
function inWorkspace(run: (root: string, inputHash: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'diana-family-metadata-'))
  try {
    const { input, documents } = fixture()
    for (const key of Object.keys(INVENTORY_METADATA_PATHS) as (keyof typeof documents)[]) {
      const file = join(root, INVENTORY_METADATA_PATHS[key])
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(documents[key]))
    }
    const inputBytes = JSON.stringify(input)
    writeFileSync(join(root, 'input.json'), inputBytes)
    run(root, hash(inputBytes))
  } finally { rmSync(root, { recursive: true, force: true }) }
}

describe('integrated exclusion inventory preparation', () => {
  it('retains seals, their byte domains, and every unknown without promoting readiness', () => {
    const { input, documents } = fixture()
    const report = buildIntegratedFamilyInventory(input, documents)
    expect(report).toMatchObject({ status: 'pending_custodian_metadata', inventoryComplete: false, readyForFamilySubmission: false,
      familyAuthorityVerified: false, semanticFamilyIndependenceProven: false, thresholdMet: false, productionEligible: false,
      counts: { inventoriedSeeds: 6, seedsWithDigestEvidence: 5, newEvaluationCases: 0, reviewedEvaluationFamilies: 0, qualifiedSubjectBandCells: 0 } })
    expect(report.entries[0].pins[0]).toMatchObject({ kind: 'module_bytes', sha256: sha(2) })
    expect(report.entries[1].pins[0]).toMatchObject({ kind: 'dataset_bytes', sha256: sha(3) })
    expect(report.entries[0].pins[1].serialization).toBeNull()
    expect(report.entries[2].pins[1].serialization).toBe('opaque-a')
    expect(report.entries[4].pins[1].serialization).toBe('opaque-b')
    expect(report.entries.every(row => Object.values(row.familyRegistry).every(value => value === null))).toBe(true)
    expect(report.entries.every(row => row.excludedFromFreshEvaluation)).toBe(true)
  })
  it('preserves the earlier test revision without inventing its count or summing repeated examples', () => {
    const { input, documents } = fixture()
    const report = buildIntegratedFamilyInventory(input, documents)
    expect(report.entries[3]).toMatchObject({ declaredCases: null, role: 'prior_test_status_unknown', pins: [
      { kind: 'module_bytes', sha256: sha(9) }, { kind: 'canonical_rows', sha256: sha(10) }, { kind: 'manifest_bytes', sha256: sha(11) },
    ] })
    expect(report.declaredRevisionRelationships[0]).toMatchObject({ parentId: report.entries[3].artifactId, childId: report.entries[4].artifactId })
    expect(report.counts).not.toHaveProperty('totalCases')
    expect(report.entries[5].pins).toEqual([])
  })
  it('omits all unselected source fields from the output', () => {
    const { input, documents } = fixture()
    Object.assign(documents.hybridAudit, { privatePayload: 'NEVER_COPY_THIS_OPAQUE_SENTINEL' })
    Object.assign(documents.freshManifest, { authorship: { authorId: 'UNVERIFIED_AUTHOR_SENTINEL' } })
    const output = JSON.stringify(buildIntegratedFamilyInventory(input, documents))
    expect(output).not.toContain('SENTINEL')
  })
  it('rejects disagreement between metadata corroborating the same corpus', () => {
    const { input, documents } = fixture()
    documents.hybridPlan.corpusSha256 = sha(123)
    expect(() => buildIntegratedFamilyInventory(input, documents)).toThrow('hybrid_canonical_seal_disagreement')
  })
  it.each(['manifestSourceSha256', 'manifestRowsSha256'] as const)('rejects changed exposure %s', key => {
    const { input, documents } = fixture()
    documents.exposureAudit.exposure[0][key] = sha(123)
    expect(() => buildIntegratedFamilyInventory(input, documents)).toThrow('exposure_manifest_seal_disagreement')
  })
  it('rejects duplicate exposure entries, missing revisions and malformed seals', () => {
    const { input, documents } = fixture()
    documents.exposureAudit.exposure.push(documents.exposureAudit.exposure[0])
    expect(() => buildIntegratedFamilyInventory(input, documents)).toThrow('exposure_manifest_seal_disagreement')
    documents.exposureAudit.exposure.pop()
    documents.freshManifest.revision_history = []
    expect(() => buildIntegratedFamilyInventory(input, documents)).toThrow('metadata_shape_invalid:freshManifest')
    documents.hybridAudit.sourceSha256 = 'invalid'
    expect(() => buildIntegratedFamilyInventory(input, documents)).toThrow('metadata_shape_invalid:hybridAudit')
  })
  it('rejects caller-supplied paths or completion claims', () => {
    const { input, documents } = fixture()
    expect(() => buildIntegratedFamilyInventory({ ...input, inventoryComplete: true }, documents)).toThrow()
    input.sources.hybridAudit = { ...input.sources.hybridAudit, path: 'protected.json' } as { sha256: string }
    expect(() => buildIntegratedFamilyInventory(input, documents)).toThrow()
  })
  it('reads only six pinned metadata files and produces reproducible output without following embedded paths', () => inWorkspace((root, inputHash) => {
    const report = prepareIntegratedFamilyInventory(['prepare', 'input.json', '--input-sha256', inputHash, 'output.json'], root)
    expect(report.preparation).toMatchObject({ inputSha256: inputHash, embeddedPathsFollowed: 0, corpusModulesImported: 0 })
    expect(report.preparation.metadataFilesRead).toHaveLength(6)
    prepareIntegratedFamilyInventory(['prepare', 'input.json', '--input-sha256', inputHash, 'output-2.json'], root)
    expect(readFileSync(join(root, 'output.json'))).toEqual(readFileSync(join(root, 'output-2.json')))
  }))
  it('rejects stale input and metadata pins without producing an output', () => inWorkspace((root, inputHash) => {
    expect(() => prepareIntegratedFamilyInventory(['prepare', 'input.json', '--input-sha256', sha(1), 'output.json'], root)).toThrow('preparation_input_digest_mismatch')
    writeFileSync(join(root, INVENTORY_METADATA_PATHS.hybridAudit), '{}')
    expect(() => prepareIntegratedFamilyInventory(['prepare', 'input.json', '--input-sha256', inputHash, 'output.json'], root)).toThrow('metadata_digest_mismatch:hybridAudit')
    expect(() => readFileSync(join(root, 'output.json'))).toThrow()
  }))
  it('refuses output overwrites and leaves source metadata untouched', () => inWorkspace((root, inputHash) => {
    const args = ['prepare', 'input.json', '--input-sha256', inputHash, 'output.json']
    const before = Object.values(INVENTORY_METADATA_PATHS).map(path => hash(readFileSync(join(root, path))))
    prepareIntegratedFamilyInventory(args, root)
    const output = readFileSync(join(root, 'output.json'))
    expect(() => prepareIntegratedFamilyInventory(args, root)).toThrow()
    expect(readFileSync(join(root, 'output.json'))).toEqual(output)
    expect(Object.values(INVENTORY_METADATA_PATHS).map(path => hash(readFileSync(join(root, path))))).toEqual(before)
  }))
})
