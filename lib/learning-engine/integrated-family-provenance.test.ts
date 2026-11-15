import { describe, expect, it } from 'vitest'
import { integratedHash as h } from './integrated-grounding-evaluation'
import { inspectIntegratedFamilies, type IntegratedFamilySubmission } from './integrated-family-provenance'
import { inspectIntegratedFamilyFile } from '../../scripts/learning/integrated-family-provenance'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, truncateSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Opaque metadata protocol fixtures only. No teaching questions, references, answers or sealed content.
const sha = (n: number) => n.toString(16).padStart(64, '0')
function artifact(id: string, role: IntegratedFamilySubmission['proposal']['artifacts'][number]['role'], n: number) {
  return { id, role, rawSha256: sha(n), canonicalSha256: sha(n+1), normalizedSha256: sha(n+2),
    canonicalSerialization: 'opaque-canonical-v1', normalization: 'opaque-normalized-v1', documentFamily: id+'-d',
    templateFamily: id+'-t', reasoningFamily: id+'-r', aliases: [], parentIds: [], sourceAssetSha256: [sha(n+3)],
    exposureReferences: ['declared-exposure'], provenanceReference: 'declared-provenance' }
}
async function fixture(): Promise<IntegratedFamilySubmission> {
  const proposal: IntegratedFamilySubmission['proposal'] = {
    schema: 'integrated-family-proposal-v1', proposalId: 'opaque', scope: 'authored-confirmed-text-document-disjoint',
    inventory: { complete: true, custodianId: 'custodian', reference: 'inventory', exposureAuditSha256: sha(9) },
    author: { id: 'author', contextDisclosure: 'Synthetic protocol fixture, not a real author.', freshContextDeclared: true, exposureReference: 'author-exposure' },
    artifacts: [artifact('old', 'development',10), artifact('fresh','candidate_evaluation',20)],
    sources: [{ id: 'source', assetSha256: sha(23), versionSha256: sha(30), contentSha256: sha(31), provenance: 'authored_synthetic', rightsReference: 'rights', confirmationReference: 'confirmation' }],
    cases: [{ id: 'case', familyId: 'fresh', subject: 'math', band: 'middle_school', inputSha256: sha(40), sourceIds: ['source'], privateReferenceSha256: sha(41), privateRubricSha256: sha(42), answerability: 'sufficient' }],
    coverage: [{ subject: 'math', band: 'middle_school', minimumCases: 1, minimumComponents: 1, allocationReference: 'allocation' }],
  }
  return { proposal, relationships: [], reviews: [{ familyId: 'fresh', reviewScopeSha256: await h({ proposal, relationships: [] }), reviewerId: 'reviewer',
    contextDisclosure: 'Synthetic protocol fixture, not a real review.', exposureReference: 'reviewer-exposure', decisionReference: 'decision',
    dimensions: { derivation: 'independent', solutionStructure: 'independent', misconception: 'independent', sourceRelationships: 'independent', taskDemand: 'independent' },
    sourceTruthReviewed: true, taskRubricReviewed: true }] }
}
async function run(data: IntegratedFamilySubmission, resealReview = true) {
  if (resealReview) for (const review of data.reviews) review.reviewScopeSha256 = await h({ proposal: data.proposal, relationships: data.relationships })
  return inspectIntegratedFamilies(data, await h(data))
}
describe('integrated fresh-family metadata contract', () => {
  it('reports all 24 cells without claiming authority or outcome', async () => {
    const r = await run(await fixture())
    expect(r.status).toBe('submitted_metadata_consistent')
    expect(r.coverage).toHaveLength(24)
    expect(r.coverage.filter(c=>!c.inScope)).toHaveLength(23)
    expect(r.coverage[0]).toMatchObject({ submittedUnblockedCases:1, submittedUnblockedComponents:1, caseDeficit:0 })
    expect(r).toMatchObject({ thresholdMet:false, productionEligible:false, familyAuthorityVerified:false, semanticFamilyIndependenceProven:false })
    expect(r.packet.families[0].cases[0]).toHaveProperty('privateRubricSha256')
    expect(r.packet.families[0].cases[0]).not.toHaveProperty('answer')
  })
  it.each(['rawSha256','canonicalSha256','normalizedSha256','documentFamily','templateFamily','reasoningFamily'] as const)('blocks collision on %s despite new labels', async key => {
    const data = await fixture(); data.proposal.artifacts[1][key] = data.proposal.artifacts[0][key]
    const r = await run(data)
    expect(r.families[0].reasons).toContain('excluded_or_development_component')
    expect(r.coverage[0].submittedUnblockedCases).toBe(0)
  })
  it('joins aliases and uncertain relationships transitively across partitions', async () => {
    const data = await fixture(); data.proposal.artifacts.push(artifact('bridge','candidate_development',50))
    data.proposal.artifacts[2].aliases.push('old-d')
    data.relationships.push({left:'bridge',right:'fresh',relation:'uncertain',reference:'uncertain-link'})
    const r = await run(data)
    expect(r.graph.components).toHaveLength(1)
    expect(r.families[0].reasons).toContain('excluded_or_development_component')
  })
  it.each(['inputSha256','privateReferenceSha256','privateRubricSha256'] as const)('excludes exact prior content reused through case %s', async key => {
    const data = await fixture()
    data.proposal.cases[0][key] = data.proposal.artifacts[0].rawSha256
    const r = await run(data)
    expect(r.families[0].reasons).toContain('excluded_or_development_component')
    expect(r.coverage[0].submittedUnblockedCases).toBe(0)
  })
  it('joins case content reuse across development and evaluation families transitively', async () => {
    const data = await fixture()
    data.proposal.artifacts.push(artifact('dev','candidate_development',70))
    data.proposal.cases.push({ ...data.proposal.cases[0], id:'dev-case', familyId:'dev', inputSha256:sha(80), sourceIds:[], answerability:'missing' })
    const r = await run(data)
    expect(r.families[0].reasons).toContain('excluded_or_development_component')
    expect(r.coverage[0].submittedUnblockedCases).toBe(0)
    data.proposal.cases.reverse()
    expect((await run(data)).graphSha256).toBe(r.graphSha256)
  })
  it.each([' author','author ','\t','author\nreviewer','author\u007f','author\u0085','author\u009f','author\u200b','author\u034f','author\ufe0f','e\u0301'])('rejects ambiguous identity %j', async value => {
    const data = await fixture(); data.proposal.author.id = value
    await expect(run(data)).rejects.toThrow('Identity')
  })
  it('derives a locale-independent graph with Unicode identities and registry permutations', async () => {
    const data = await fixture()
    for (const name of ['é','É','a','A']) data.proposal.artifacts.push({ ...artifact(name,'development',90), rawSha256:sha(10) })
    const first = await run(data)
    data.proposal.artifacts.reverse()
    expect((await run(data)).graphSha256).toBe(first.graphSha256)
    data.proposal.artifacts.sort((a,b) => a.id.localeCompare(b.id))
    expect((await run(data)).graphSha256).toBe(first.graphSha256)
  })
  it('joins reused source assets and shared provenance parents', async () => {
    for (const collision of ['source','parent']) {
      const data = await fixture()
      if (collision === 'source') data.proposal.artifacts[0].sourceAssetSha256.push(sha(23))
      else data.proposal.artifacts[1].parentIds.push('old')
      expect((await run(data)).families[0].reasons).toContain('excluded_or_development_component')
    }
  })
  it('excludes reserved test components without reading their content', async () => {
    const data=await fixture(); data.proposal.artifacts[0].role='reserved_test'; data.proposal.artifacts[1].parentIds=['old']
    expect((await run(data)).families[0].reasons).toContain('excluded_or_development_component')
  })
  it('rejects unknown parents and mismatched hash serialization contracts', async () => {
    const data=await fixture(); data.proposal.artifacts[1].parentIds=['absent']; data.proposal.artifacts[1].normalization='different'
    const r=await run(data)
    expect(r.errors).toEqual(expect.arrayContaining(['invalid_parent:fresh','incomparable_normalization']))
    expect(r.coverage[0].submittedUnblockedCases).toBe(0)
  })
  it('never counts development cases toward evaluation coverage', async () => {
    const data=await fixture(); data.proposal.artifacts[1].role='candidate_development'; data.reviews=[]
    const r=await run(data)
    expect(r.coverage[0]).toMatchObject({ declaredCases:0, submittedUnblockedCases:0, developmentCases:1, caseDeficit:1 })
  })
  it('does not count variations from one component as independent families', async () => {
    const data=await fixture(); data.proposal.coverage[0].minimumCases=2; data.proposal.coverage[0].minimumComponents=2
    data.proposal.cases.push({...data.proposal.cases[0],id:'case2',inputSha256:sha(60)})
    expect((await run(data)).coverage[0]).toMatchObject({ declaredCases:2, submittedUnblockedComponents:1, caseDeficit:0, componentDeficit:1 })
  })
  it('blocks incomplete inventory, missing review and nonfresh author declarations', async () => {
    const data=await fixture(); data.proposal.inventory.complete=false; data.proposal.author.freshContextDeclared=false; data.reviews=[]
    const r=await run(data)
    expect(r.families[0].reasons).toEqual(expect.arrayContaining(['inventory_incomplete','author_context','family_review_missing']))
  })
  it('rejects stale or self review even if the submission is resealed', async () => {
    const data=await fixture(); data.proposal.proposalId='changed'; data.reviews[0].reviewerId='author'
    expect((await run(data,false)).errors).toEqual(expect.arrayContaining(['stale_family_review:fresh','self_family_review:fresh']))
  })
  it('invalidates reviews after changing relationship declarations', async () => {
    const data=await fixture()
    data.relationships.push({left:'old',right:'fresh',relation:'related',reference:'later-discovery'})
    expect((await run(data,false)).errors).toContain('stale_family_review:fresh')
  })
  it.each(['related','uncertain'] as const)('blocks %s review and missing source/rubric review', async v => {
    const data=await fixture(); data.reviews[0].dimensions.derivation=v; data.reviews[0].sourceTruthReviewed=false
    expect((await run(data)).families[0].reasons).toEqual(expect.arrayContaining(['related_or_uncertain_review','source_or_rubric_review_missing']))
  })
  it('rejects duplicate identity/input/allocation and extra content fields', async () => {
    const data=await fixture(); data.proposal.cases.push({...data.proposal.cases[0]})
    await expect(run(data)).rejects.toThrow('duplicate_case')
    const clean=await fixture(); Object.assign(clean.proposal.cases[0],{answer:'must not be accepted'})
    await expect(run(clean)).rejects.toThrow()
  })
  it('blocks unpinned sources and unsupported figure scope', async () => {
    const data=await fixture(); data.proposal.sources[0].assetSha256=sha(99); data.proposal.cases[0].answerability='figure_dependent'
    expect((await run(data)).errors).toEqual(expect.arrayContaining(['unpinned_source_asset:case','outside_confirmed_text_scope:case']))
  })
  it('allows a declared missing-source case but rejects source-free sufficient claims', async () => {
    const data=await fixture(); data.proposal.cases[0].sourceIds=[]
    expect((await run(data)).errors).toContain('source_required_for_answerability:case')
    data.proposal.cases[0].answerability='missing'
    expect((await run(data)).status).toBe('submitted_metadata_consistent')
  })
  it('rejects a changed trusted submission and keeps graph stable under registry reorder', async () => {
    const data=await fixture(); await expect(inspectIntegratedFamilies(data,sha(0))).rejects.toThrow('digest_mismatch')
    const first=await run(data); data.proposal.artifacts.reverse()
    expect((await run(data)).graphSha256).toBe(first.graphSha256)
  })
  it('writes exclusive CLI output, binds input and rejects oversized files', async () => {
    const dir=mkdtempSync(join(tmpdir(),'integrated-family-'))
    try {
      const data=await fixture(), input=join(dir,'metadata.json'), output=join(dir,'report.json')
      writeFileSync(input,JSON.stringify(data))
      const args=['inspect',input,'--submission-sha256',await h(data),output]
      expect((await inspectIntegratedFamilyFile(args)).status).toBe('submitted_metadata_consistent')
      expect(JSON.parse(readFileSync(output,'utf8')).thresholdMet).toBe(false)
      await expect(inspectIntegratedFamilyFile(args)).rejects.toThrow()
      await expect(inspectIntegratedFamilyFile([...args.slice(0,4),input])).rejects.toThrow('must differ')
      truncateSync(input,17*1024*1024)
      await expect(inspectIntegratedFamilyFile([...args.slice(0,4),join(dir,'next.json')])).rejects.toThrow('16 MiB')
    } finally { rmSync(dir,{recursive:true,force:true}) }
  })
})
