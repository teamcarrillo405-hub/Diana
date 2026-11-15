/** Metadata only: no source text, answers, corpus imports, provider calls or review authority. */
import { z } from 'zod'
import { integratedHash } from './integrated-grounding-evaluation'

const id = z.string().min(1).max(200).refine(value => value.trim() === value
  && value.normalize('NFC') === value && !/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/u.test(value),
  'Identity must be NFC text without padding, control or invisible format characters')
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const closed = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict()
export const FAMILY_SUBJECTS = ['math', 'reading', 'english', 'science', 'history', 'computing'] as const
export const FAMILY_BANDS = ['middle_school', 'high_school', 'college_intro', 'college_advanced'] as const
const subject = z.enum(FAMILY_SUBJECTS), band = z.enum(FAMILY_BANDS)
const role = z.enum(['train', 'development', 'visible_probe', 'consumed_test', 'reserved_test', 'candidate_development', 'candidate_evaluation'])
const verdict = z.enum(['independent', 'related', 'uncertain'])
export const integratedFamilyProposalSchema = closed({
  schema: z.literal('integrated-family-proposal-v1'), proposalId: id,
  scope: z.literal('authored-confirmed-text-document-disjoint'),
  inventory: closed({ complete: z.boolean(), custodianId: id, reference: id, exposureAuditSha256: hash }),
  author: closed({ id, contextDisclosure: z.string().min(1).max(4000), freshContextDeclared: z.boolean(), exposureReference: id }),
  artifacts: z.array(closed({ id, role, rawSha256: hash, canonicalSha256: hash,
    canonicalSerialization: id, normalizedSha256: hash, normalization: id,
    documentFamily: id, templateFamily: id, reasoningFamily: id, aliases: z.array(id).max(100),
    parentIds: z.array(id).max(100), sourceAssetSha256: z.array(hash).max(100),
    exposureReferences: z.array(id).min(1).max(100), provenanceReference: id,
  })).min(1).max(10000),
  sources: z.array(closed({ id, assetSha256: hash, versionSha256: hash, contentSha256: hash,
    provenance: z.literal('authored_synthetic'), rightsReference: id, confirmationReference: id,
  })).max(1000),
  cases: z.array(closed({ id, familyId: id, subject, band, inputSha256: hash,
    sourceIds: z.array(id).max(100), privateReferenceSha256: hash, privateRubricSha256: hash,
    answerability: z.enum(['sufficient', 'missing', 'conflicting', 'figure_dependent']),
  })).max(2000),
  coverage: z.array(closed({ subject, band, minimumCases: z.number().int().min(1).max(2000),
    minimumComponents: z.number().int().min(1).max(2000), allocationReference: id,
  })).min(1).max(24),
})
export const integratedFamilySubmissionSchema = closed({
  proposal: integratedFamilyProposalSchema,
  relationships: z.array(closed({ left: id, right: id, relation: z.enum(['related', 'uncertain']), reference: id })).max(10000),
  reviews: z.array(closed({ familyId: id, reviewScopeSha256: hash, reviewerId: id,
    contextDisclosure: z.string().min(1).max(4000), exposureReference: id, decisionReference: id,
    dimensions: closed({ derivation: verdict, solutionStructure: verdict, misconception: verdict, sourceRelationships: verdict, taskDemand: verdict }),
    sourceTruthReviewed: z.boolean(), taskRubricReviewed: z.boolean(),
  })).max(2000),
})
export type IntegratedFamilySubmission = z.infer<typeof integratedFamilySubmissionSchema>
export type IntegratedFamilyProposal = z.infer<typeof integratedFamilyProposalSchema>
const unique = (values: string[]) => new Set(values).size === values.length
const cellKey = (s: string, b: string) => s + '/' + b

/** Caller supplies an independently selected digest; successful consistency is not a family attestation. */
export async function inspectIntegratedFamilies(raw: unknown, trustedSubmissionSha256: string) {
  hash.parse(trustedSubmissionSha256)
  const submission = integratedFamilySubmissionSchema.parse(raw)
  if (await integratedHash(submission) !== trustedSubmissionSha256) throw new Error('family_submission_digest_mismatch')
  const { proposal: p, reviews, relationships } = submission
  const proposalSha256 = await integratedHash(p)
  const reviewScopeSha256 = await integratedHash({ proposal: p, relationships })
  const errors: string[] = [], pending: string[] = []
  const require = (ok: boolean, code: string) => { if (!ok) errors.push(code) }
  require(unique(p.artifacts.map(a => a.id)), 'duplicate_artifact')
  require(unique(p.sources.map(a => a.id)), 'duplicate_source')
  require(unique(p.cases.map(a => a.id)), 'duplicate_case')
  require(unique(p.cases.map(a => a.inputSha256)), 'duplicate_case_input')
  require(unique(p.coverage.map(a => cellKey(a.subject, a.band))), 'duplicate_allocation')
  require(unique(reviews.map(a => a.familyId)), 'duplicate_family_review')
  if (errors.length) throw new Error(errors.join(','))
  const artifacts = new Map(p.artifacts.map(a => [a.id, a]))
  const parents = new Map(p.artifacts.map(a => [a.id, a.id]))
  function find(value: string): string {
    let root = value
    while (parents.get(root)! !== root) root = parents.get(root)!
    while (value !== root) { const next = parents.get(value)!; parents.set(value, root); value = next }
    return root
  }
  const edges: { left: string; right: string; reason: string }[] = []
  function join(left: string, right: string, reason: string) {
    if (left === right) return
    const [a, b] = [left, right].sort()
    edges.push({ left: a, right: b, reason })
    const l = find(left), r = find(right)
    if (l !== r) parents.set(l < r ? r : l, l < r ? l : r)
  }
  const tokens = new Map<string, string>()
  function token(value: string, artifactId: string) {
    const previous = tokens.get(value)
    if (previous) join(previous, artifactId, value)
    else tokens.set(value, artifactId)
  }
  // Sort before building edges so array order does not alter derived components/graph.
  for (const a of [...p.artifacts].sort((a,b) => compare(a.id, b.id))) {
    require(unique(a.parentIds) && unique(a.aliases) && unique(a.sourceAssetSha256), 'duplicate_provenance:' + a.id)
    token('raw:' + a.rawSha256, a.id)
    token('canonical:' + a.canonicalSerialization + ':' + a.canonicalSha256, a.id)
    token('normalized:' + a.normalization + ':' + a.normalizedSha256, a.id)
    for (const value of [a.documentFamily, a.templateFamily, a.reasoningFamily, ...a.aliases]) token('family:' + value, a.id)
    for (const value of a.sourceAssetSha256) token('asset:' + value, a.id)
    for (const parent of a.parentIds) {
      require(parent !== a.id && artifacts.has(parent), 'invalid_parent:' + a.id)
      if (parent !== a.id && artifacts.has(parent)) join(a.id, parent, 'lineage')
    }
  }
  // Case pins hash exact content bytes, including the serialized model-visible input.
  // Match raw artifact pins and other case pins before deriving exclusion components.
  for (const c of [...p.cases].sort((a,b) => compare(a.id, b.id))) {
    if (!artifacts.has(c.familyId)) continue
    for (const digest of [c.inputSha256, c.privateReferenceSha256, c.privateRubricSha256]) {
      token('raw:' + digest, c.familyId)
    }
  }
  // Different normalizers cannot be compared safely; custodian must return compatible opaque hashes.
  require(new Set(p.artifacts.map(a => a.normalization)).size === 1, 'incomparable_normalization')
  require(new Set(p.artifacts.map(a => a.canonicalSerialization)).size === 1, 'incomparable_serialization')
  for (const edge of relationships) {
    require(artifacts.has(edge.left) && artifacts.has(edge.right) && edge.left !== edge.right, 'unknown_or_self_relationship')
    if (artifacts.has(edge.left) && artifacts.has(edge.right)) join(edge.left, edge.right, edge.relation + ':' + edge.reference)
  }
  const groups = new Map<string, string[]>()
  for (const a of p.artifacts) {
    const root = find(a.id), members = groups.get(root)
    if (members) members.push(a.id)
    else groups.set(root, [a.id])
  }
  const components = await Promise.all([...groups.values()].map(async members => {
    members.sort()
    return { id: await integratedHash(members), members, roles: [...new Set(members.map(m => artifacts.get(m)!.role))].sort() }
  }))
  components.sort((a,b) => compare(a.id, b.id))
  const componentByArtifact = new Map(components.flatMap(c => c.members.map(m => [m,c] as const)))
  const evaluation = p.artifacts.filter(a => a.role === 'candidate_evaluation')
  if (!p.inventory.complete) pending.push('custodian_inventory_incomplete')
  if (evaluation.length && !p.author.freshContextDeclared) pending.push('author_fresh_context_not_declared')
  for (const review of reviews) {
    require(evaluation.some(a => a.id === review.familyId), 'review_outside_evaluation:' + review.familyId)
    require(review.reviewScopeSha256 === reviewScopeSha256, 'stale_family_review:' + review.familyId)
    require(review.reviewerId !== p.author.id, 'self_family_review:' + review.familyId)
  }
  const families = evaluation.map(a => {
    const reasons: string[] = [], component = componentByArtifact.get(a.id)!
    if (component.roles.some(role => role !== 'candidate_evaluation')) reasons.push('excluded_or_development_component')
    const review = reviews.find(r => r.familyId === a.id)
    if (!review) reasons.push('family_review_missing')
    else {
      if (review.reviewScopeSha256 !== reviewScopeSha256 || review.reviewerId === p.author.id) reasons.push('family_review_binding')
      if (Object.values(review.dimensions).some(v => v !== 'independent')) reasons.push('related_or_uncertain_review')
      if (!review.sourceTruthReviewed || !review.taskRubricReviewed) reasons.push('source_or_rubric_review_missing')
    }
    if (!p.inventory.complete) reasons.push('inventory_incomplete')
    if (!p.author.freshContextDeclared) reasons.push('author_context')
    if (!p.cases.some(c => c.familyId === a.id)) reasons.push('no_declared_cases')
    return { familyId: a.id, componentId: component.id, reasons }
  })
  const sources = new Map(p.sources.map(s => [s.id, s]))
  const caseRows = p.cases.map(c => {
    const a = artifacts.get(c.familyId), reasons: string[] = []
    if (!a || !['candidate_evaluation', 'candidate_development'].includes(a.role)) reasons.push('unknown_candidate_family')
    if (!unique(c.sourceIds) || c.sourceIds.some(s => !sources.has(s))) reasons.push('unknown_or_duplicate_source')
    if (!c.sourceIds.length && c.answerability !== 'missing') reasons.push('source_required_for_answerability')
    if (a && c.sourceIds.some(s => !a.sourceAssetSha256.includes(sources.get(s)?.assetSha256 ?? ''))) reasons.push('unpinned_source_asset')
    if (c.answerability === 'figure_dependent') reasons.push('outside_confirmed_text_scope')
    if (!p.coverage.some(cell => cell.subject === c.subject && cell.band === c.band)) reasons.push('outside_declared_allocation')
    if (reasons.length) errors.push(...reasons.map(r => r + ':' + c.id))
    return { caseId: c.id, familyId: c.familyId, componentId: componentByArtifact.get(c.familyId)?.id ?? null,
      subject: c.subject, band: c.band, role: a?.role ?? null, answerability: c.answerability, reasons }
  })
  const coverage = FAMILY_SUBJECTS.flatMap(subject => FAMILY_BANDS.map(band => {
    const allocation = p.coverage.find(a => a.subject === subject && a.band === band)
    const declared = caseRows.filter(c => c.subject === subject && c.band === band && c.role === 'candidate_evaluation')
    const eligible = declared.filter(c => !errors.length && !c.reasons.length && families.some(f => f.familyId === c.familyId && !f.reasons.length))
    const countComponents = (rows: typeof caseRows) => new Set(rows.map(c => c.componentId).filter(Boolean)).size
    return { subject, band, inScope: !!allocation, minimumCases: allocation?.minimumCases ?? null,
      minimumComponents: allocation?.minimumComponents ?? null, declaredCases: declared.length,
      declaredComponents: countComponents(declared), submittedUnblockedCases: eligible.length,
      submittedUnblockedComponents: countComponents(eligible),
      caseDeficit: allocation ? Math.max(0, allocation.minimumCases - eligible.length) : null,
      componentDeficit: allocation ? Math.max(0, allocation.minimumComponents - countComponents(eligible)) : null,
      developmentCases: caseRows.filter(c => c.subject === subject && c.band === band && c.role === 'candidate_development').length }
  }))
  const graph = { components, edges: [...new Map(edges.map(e => [JSON.stringify(e),e])).values()].sort((a,b) => compare(JSON.stringify(a), JSON.stringify(b))) }
  const packet = {
    schema: 'integrated-family-author-review-packet-v1', handling: 'custodian_metadata_only_no_case_text',
    proposalSha256, reviewScopeSha256, relationships, submissionSha256: trustedSubmissionSha256, graphSha256: await integratedHash(graph),
    author: p.author, inventory: p.inventory,
    sources: p.sources, coverage, components,
    families: evaluation.map(a => ({ artifact: a, componentId: componentByArtifact.get(a.id)!.id,
      cases: p.cases.filter(c => c.familyId === a.id), submittedReview: reviews.find(r => r.familyId === a.id) ?? null,
      requiredReviewDimensions: ['derivation', 'solutionStructure', 'misconception', 'sourceRelationships', 'taskDemand', 'sourceTruthReviewed', 'taskRubricReviewed'] })),
    instructions: [
      'Custodian supplies pinned source, input, private reference and rubric bytes through a separate authorized channel. This packet never loads them.',
      'Author context and reviewer identities are declarations. Independently verify exposure and authority before sealing.',
      'Record related or uncertain relationships in the registry and review dimensions. Uncertainty never qualifies a family.',
      'Do not send private references, rubrics, exclusions or this packet to the teaching provider.',
      'This is a pre-generation family packet. Use the existing integrated-review-packet for response review after execution.',
    ],
  }
  return { schema: 'integrated-family-report-v1', proposalSha256, reviewScopeSha256, submissionSha256: trustedSubmissionSha256,
    status: errors.length ? 'invalid' : pending.length || families.some(f => f.reasons.length) || coverage.some(c => c.inScope && (c.caseDeficit || c.componentDeficit)) ? 'pending' : 'submitted_metadata_consistent',
    errors, pending, families, caseRows, coverage, graph, graphSha256: packet.graphSha256,
    manifestFamilyBindings: evaluation.map(a => ({ id: a.id, componentId: componentByArtifact.get(a.id)!.id,
      documentFamily: a.documentFamily, templateFamily: a.templateFamily, reasoningFamily: a.reasoningFamily })),
    packet, packetSha256: await integratedHash(packet),
    familyAuthorityVerified: false, semanticFamilyIndependenceProven: false, thresholdMet: false, productionEligible: false,
    limitations: ['Only declared metadata is checked. Omitted lineage, false digests, undisclosed exposure and semantic similarity require independent custodian review.',
      'A component is a conservative exclusion unit, not a discovered semantic family. All prior roles, including reserved tests, remain excluded.',
      'No case bytes were read or authored. This artifact does not modify or freeze an execution manifest, certify grade suitability, or establish a 95% result.'] }
}
