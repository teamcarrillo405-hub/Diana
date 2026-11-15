import { describe, expect, it, vi } from 'vitest';
import { captureOfflineAssignmentRetrieval, type OfflineAssignmentRetrievalInput } from './offline-assignment-retrieval';
import { structureDocument, validateDocumentAnchor } from './curriculum';
import { retrieveCurriculum } from './retrieval';
import { renderCurriculumPromptContext } from './curriculum-prompt-context';
import { hashHybridValue } from './hybrid-benchmark-contract';

const owner = '00000000-0000-4000-8000-000000000001', assignment = '00000000-0000-4000-8000-000000000002', other = '00000000-0000-4000-8000-000000000003';
// Opaque token/paragraph graphs test protocol plumbing, not educational tasks or held-out cases.
async function source(documentId = 'opaque-source', text = 'alpha beta gamma', edition = '1') {
  const metadata = { documentId, ownerId: owner, assignmentId: assignment, classId: null,
    title: 'Opaque source', edition, subject: 'other' as const, instructionRights: 'owner_provided' as const };
  const pages = [{ page: 1, pageLabel: 'opaque-page', text, interpretation: 'confirmed' as const }];
  const document = await structureDocument(metadata, pages);
  return { source: { provenance: 'authored_synthetic' as const, confirmed: true as const, metadata, pages, versionId: document.version.id, contentHash: document.version.contentHash }, document };
}
async function fixture() {
  const built = await source();
  const input: OfflineAssignmentRetrievalInput = { schema: 'offline-authored-assignment-lexical-v1', ownerId: owner, assignmentId: assignment,
    classId: null, query: 'alpha', versionIds: [built.source.versionId], documents: [built.source] };
  return { input, ...built };
}

describe('offline authored assignment local ranking capture', () => {
  it('reuses the production indexer, validator, ranker and exact prompt while making no network call', async () => {
    const f = await fixture(), fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network'));
    try {
      const capture = await captureOfflineAssignmentRetrieval(f.input);
      const ranked = retrieveCurriculum(f.input.query, f.document.chunks, { ownerId: owner, assignmentId: assignment, classId: null, versionIds: f.input.versionIds, problemNumber: null });
      expect(capture.result).toEqual(ranked);
      expect(capture.promptContext).toBe(renderCurriculumPromptContext(ranked));
      expect(capture.candidatePool).toEqual(f.document.chunks);
      expect(capture.selectedChunkIds).toEqual(ranked.chunks.map(item => item.id));
      expect(capture).toMatchObject({ authenticatedScopeVerified: false, hostedDatabaseFtsExecuted: false, executionAuthorityVerified: false, productionEligible: false });
      expect(capture.digests.candidatePoolSha256).toBe(await hashHybridValue(capture.candidatePool));
      expect(capture.digests.evidenceSha256).toBe(await hashHybridValue(capture.actualPromptAnchors));
      expect(capture.digests.promptContextSha256).toBe(await hashHybridValue(capture.promptContext));
      const { digests: _digests, ...body } = capture;
      expect(capture.digests.captureSha256).toBe(await hashHybridValue(body));
      expect(fetcher).not.toHaveBeenCalled();
    } finally { fetcher.mockRestore(); }
  });

  it.each(['owner', 'assignment', 'classwide', 'class'])('rejects %s scope before an evidence capture can be made', async kind => {
    const f = await fixture();
    if (kind === 'owner') f.input.documents[0].metadata.ownerId = other;
    if (kind === 'assignment') f.input.documents[0].metadata.assignmentId = other;
    if (kind === 'classwide') { f.input.documents[0].metadata.assignmentId = null; f.input.documents[0].metadata.classId = other; f.input.classId = other; }
    if (kind === 'class') f.input.documents[0].metadata.classId = other;
    await expect(captureOfflineAssignmentRetrieval(f.input)).rejects.toThrow('source_scope_mismatch');
  });

  it('rejects changed source text or a falsely declared content hash under pinned versions', async () => {
    const f = await fixture(); f.input.documents[0].pages[0].text = 'changed opaque text';
    await expect(captureOfflineAssignmentRetrieval(f.input)).rejects.toThrow('source_version_mismatch');
    const next = await fixture(); next.input.documents[0].contentHash = 'f'.repeat(64);
    await expect(captureOfflineAssignmentRetrieval(next.input)).rejects.toThrow('source_version_mismatch');
  });

  it.each(['provenance', 'confirmation', 'interpretation', 'raw_chunks'])('rejects unsupported %s declarations rather than accepting fabricated index inputs', async kind => {
    const f = await fixture();
    if (kind === 'provenance') Object.assign(f.input.documents[0], { provenance: 'student_upload' });
    if (kind === 'confirmation') Object.assign(f.input.documents[0], { confirmed: false });
    if (kind === 'interpretation') Object.assign(f.input.documents[0].pages[0], { interpretation: 'model_extraction' });
    if (kind === 'raw_chunks') Object.assign(f.input, { chunks: f.document.chunks });
    await expect(captureOfflineAssignmentRetrieval(f.input)).rejects.toThrow();
  });

  it('excludes an unpinned owned edition and does not silently choose newest source', async () => {
    const f = await fixture(), next = await source('opaque-source', 'delta epsilon', '2');
    f.input.documents.unshift(next.source);
    const capture = await captureOfflineAssignmentRetrieval(f.input);
    expect(capture.excludedUnpinnedVersionIds).toEqual([next.source.versionId]);
    expect(capture.candidatePool.every(chunk => chunk.versionId === f.source.versionId)).toBe(true);
    expect(capture.promptContext).not.toContain('delta');
  });

  it('returns source_conflict with no evidence when two pinned editions name one source', async () => {
    const f = await fixture(), next = await source('opaque-source', 'delta epsilon', '2');
    f.input.documents.push(next.source); f.input.versionIds.push(next.source.versionId);
    const capture = await captureOfflineAssignmentRetrieval(f.input);
    expect(capture).toMatchObject({ sourceConflict: true, result: { status: 'source_conflict', chunks: [] }, candidatePool: [], actualPromptAnchors: [], promptContext: '' });
  });

  it('keeps unavailable pinned versions distinct from an available nonmatch', async () => {
    const f = await fixture(); f.input.versionIds.push('f'.repeat(64));
    const missing = await captureOfflineAssignmentRetrieval(f.input);
    expect(missing).toMatchObject({ missingVersionIds: ['f'.repeat(64)], result: { status: 'index_unavailable' }, candidatePool: [], promptContext: '' });
    f.input.versionIds.pop(); f.input.query = 'notpresent';
    const noMatch = await captureOfflineAssignmentRetrieval(f.input);
    expect(noMatch.result.status).toBe('no_evidence'); expect(noMatch.candidatePool).toHaveLength(1); expect(noMatch.actualPromptAnchors).toEqual([]);
  });

  it('supports an explicitly empty source selection without expanding scope', async () => {
    const f = await fixture(); f.input.versionIds = [];
    const capture = await captureOfflineAssignmentRetrieval(f.input);
    expect(capture.result.status).toBe('no_evidence'); expect(capture.candidatePool).toEqual([]);
    expect(capture.excludedUnpinnedVersionIds).toEqual([f.source.versionId]);
  });

  it('records actual clipped evidence, recalculated offsets and all pre-ranking candidates', async () => {
    const text = Array.from({ length: 8 }, (_, index) => `${index + 1}. alpha ${'x'.repeat(1100)}`).join('\n\n');
    const built = await source('opaque-long', text), f = await fixture();
    f.input.documents = [built.source]; f.input.versionIds = [built.source.versionId];
    const capture = await captureOfflineAssignmentRetrieval(f.input);
    expect(capture.candidatePool).toHaveLength(8); expect(capture.result.chunks).toHaveLength(6); expect(capture.actualPromptAnchors).toHaveLength(6);
    for (const anchor of capture.actualPromptAnchors) {
      expect(anchor.exactText.length).toBe(1000);
      expect(anchor.location.endOffset - anchor.location.startOffset).toBe(1000);
      expect(validateDocumentAnchor(anchor, built.document)).toBe(true);
    }
    expect(capture.promptContext.endsWith(JSON.stringify(capture.actualPromptAnchors))).toBe(true);
  });

  it('preserves the production exact-number lookup without semantic fallback', async () => {
    const built = await source('opaque-numbered', '1. alpha\n\n2. beta'), f = await fixture();
    f.input.documents = [built.source]; f.input.versionIds = [built.source.versionId]; f.input.query = 'problem 2';
    const capture = await captureOfflineAssignmentRetrieval(f.input);
    expect(capture.problemNumber).toBe('2'); expect(capture.result.method).toBe('keyword');
    expect(capture.result.chunks[0].problemNumber).toBe('2');
  });

  it('rejects duplicate pins, duplicate versions and page identities', async () => {
    const f = await fixture(); f.input.versionIds.push(f.input.versionIds[0]);
    await expect(captureOfflineAssignmentRetrieval(f.input)).rejects.toThrow('duplicate_pinned_version');
    f.input.versionIds.pop(); f.input.documents.push(f.input.documents[0]);
    await expect(captureOfflineAssignmentRetrieval(f.input)).rejects.toThrow('duplicate_source_version');
    f.input.documents.pop(); f.input.documents[0].pages.push(f.input.documents[0].pages[0]);
    await expect(captureOfflineAssignmentRetrieval(f.input)).rejects.toThrow('repeats a page');
  });
});
