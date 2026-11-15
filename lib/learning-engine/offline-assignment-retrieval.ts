/** Offline local ranking only. No hosted FTS, authenticated DB, provider or corpus IO. */
import { z } from 'zod';
import { documentVersionSchema, RETRIEVAL_VERSION, type RetrievalResult } from './contracts';
import { structureDocument, validateDocumentAnchor } from './curriculum';
import { retrieveCurriculum } from './retrieval';
import { curriculumPromptAnchors, renderCurriculumPromptContext } from './curriculum-prompt-context';
import { hashHybridValue } from './hybrid-benchmark-contract';

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const metadata = documentVersionSchema.pick({ documentId: true, ownerId: true, assignmentId: true, classId: true, title: true, edition: true, subject: true })
  .extend({ instructionRights: z.literal('owner_provided') }).strict();
const source = z.object({
  provenance: z.literal('authored_synthetic'), confirmed: z.literal(true), metadata,
  versionId: hash, contentHash: hash,
  pages: z.array(z.object({ page: z.number().int().min(1).max(1500), pageLabel: z.string().min(1).max(120),
    text: z.string().max(250000), interpretation: z.literal('confirmed') }).strict()).min(1).max(100),
}).strict();
export const offlineAssignmentRetrievalInputSchema = z.object({
  schema: z.literal('offline-authored-assignment-lexical-v1'),
  ownerId: z.string().uuid(), assignmentId: z.string().uuid(), classId: z.string().uuid().nullable(),
  query: z.string().min(1).max(1000), versionIds: z.array(hash).max(12), documents: z.array(source).max(100),
}).strict();
export type OfflineAssignmentRetrievalInput = z.infer<typeof offlineAssignmentRetrievalInputSchema>;

export async function captureOfflineAssignmentRetrieval(raw: unknown) {
  const input = offlineAssignmentRetrievalInputSchema.parse(raw);
  if (new Set(input.versionIds).size !== input.versionIds.length) throw new Error('duplicate_pinned_version');
  if (new Set(input.documents.map(item => item.versionId)).size !== input.documents.length) throw new Error('duplicate_source_version');
  if (input.documents.reduce((sum, item) => sum + item.pages.reduce((count, page) => count + page.text.length, 0), 0) > 8_000_000) throw new Error('source_text_budget');
  // A supplied scope is a declaration, never authentication. Reject foreign/class-wide
  // documents before indexing; this adapter's supported domain is exact assignment only.
  if (input.documents.some(item => item.metadata.ownerId !== input.ownerId || item.metadata.assignmentId !== input.assignmentId || item.metadata.classId !== input.classId)) throw new Error('source_scope_mismatch');
  const selectedSources = input.documents.filter(item => input.versionIds.includes(item.versionId));
  const documents = await Promise.all(selectedSources.map(async item => {
    const document = await structureDocument(item.metadata, item.pages);
    if (document.version.id !== item.versionId || document.version.contentHash !== item.contentHash) throw new Error('source_version_mismatch');
    if (document.blocks.some(block => block.needsConfirmation) || document.chunks.some(chunk => chunk.anchors.some(anchor => !validateDocumentAnchor(anchor, document)))) throw new Error('source_anchor_invalid');
    return document;
  }));
  const missingVersionIds = input.versionIds.filter(versionId => !documents.some(item => item.version.id === versionId));
  const sourceConflict = new Set(documents.map(item => item.version.documentId)).size !== documents.length;
  const problemNumber = /\bproblem\s+(\d+[a-z]?)/i.exec(input.query)?.[1] ?? null;
  const candidates = missingVersionIds.length || sourceConflict ? [] : documents.flatMap(item => item.chunks);
  const result: RetrievalResult = missingVersionIds.length ? { version: RETRIEVAL_VERSION, status: 'index_unavailable', method: 'keyword', chunks: [] }
    : sourceConflict ? { version: RETRIEVAL_VERSION, status: 'source_conflict', method: 'keyword', chunks: [] }
      : retrieveCurriculum(input.query, candidates, { ownerId: input.ownerId, assignmentId: input.assignmentId,
        classId: null, versionIds: input.versionIds, problemNumber });
  // classId:null prevents the pure ranker's optional class-wide expansion.
  const promptAnchors = curriculumPromptAnchors(result);
  for (const anchor of promptAnchors) {
    const document = documents.find(item => item.version.id === anchor.versionId);
    if (!document || !validateDocumentAnchor(anchor, document)) throw new Error('clipped_anchor_invalid');
  }
  const promptContext = renderCurriculumPromptContext(result);
  const capture = {
    schema: 'offline-assignment-retrieval-capture-v1' as const,
    evidenceScope: 'offline_local_ranking_of_supplied_authored_confirmed_assignment_text' as const,
    authenticatedScopeVerified: false as const, hostedDatabaseFtsExecuted: false as const,
    executionAuthorityVerified: false as const, productionEligible: false as const,
    scope: { ownerId: input.ownerId, assignmentId: input.assignmentId, classId: input.classId, versionIds: input.versionIds },
    query: input.query, problemNumber,
    sources: documents.map(item => ({ version: item.version, pages: item.pages, blocks: item.blocks })),
    excludedUnpinnedVersionIds: input.documents.filter(item => !input.versionIds.includes(item.versionId)).map(item => item.versionId),
    missingVersionIds, sourceConflict,
    candidatePool: candidates, result, selectedChunkIds: result.chunks.map(item => item.id),
    actualPromptAnchors: promptAnchors, promptContext,
  };
  return { ...capture, digests: {
    serialization: 'canonical-hybrid-json-v1' as const,
    inputSha256: await hashHybridValue(input), candidatePoolSha256: await hashHybridValue(candidates),
    retrievalSha256: await hashHybridValue(result), evidenceSha256: await hashHybridValue(promptAnchors),
    promptContextSha256: await hashHybridValue(promptContext), captureSha256: await hashHybridValue(capture),
  } };
}
