import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { STUDY_BUDDY_PROMPT, buildUserPrompt, parseResult } from '@/supabase/functions/_shared/study-buddy-prompt';
import { buildStudentResponseRequest, type StudentModelPart } from '@/supabase/functions/_shared/student-response-request';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
import baseline from './fixtures/recovered-primary-contract.json';
import current from './fixtures/current-primary-contract.json';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
describe('exact primary Edge recipe extraction', () => {
  it('matches the current source-only prompt regression contract over opaque boundary inputs', () => {
    // The recovered snapshot remains historical evidence; deliberate privacy and
    // source-trust hardening changes the current prompt and invalidates its hashes.
    expect(baseline.schema).toBe('learning-recovered-regression-contract-v1');
    expect(current.historicalContract).toBe('recovered-primary-contract.json');
    expect(current.systemPromptSha256).not.toBe(baseline.systemPromptSha256);
    expect(hash(STUDY_BUDDY_PROMPT)).toBe(current.systemPromptSha256);
    for (const size of [0, 1, 799, 1000, 20_000, 20_001]) for (const mode of ['hint', 'quiz', 'guide'] as const) {
      const input = { mode, tutorPersona: 'diana', tutorStyle: 'socratic', complexity: 'balanced', source: 'Ω'.repeat(size), question: 'opaque',
        conversation: [], routing: {}, sourceAnchors: [], specialistContext: '' };
      const expected = current.prompts.find(row => row.size === size && row.mode === mode);
      expect(expected).toBeDefined();
      expect(hash(buildUserPrompt(input))).toBe(expected!.sha256);
    }
    // Historic examples remain stable; one- and two-step handling below is an
    // intentional current change, not retroactive qualification of the old recipe.
    for (const { raw, result } of baseline.parses) expect(parseResult(raw)).toEqual(result);
  });
  it.each([['one'], ['one', 'two'], ['one', 'two', 'three']])(
    'accepts %j concise next moves without padding', (...steps) => {
      const moves = Array.isArray(steps[0]) ? steps[0] : steps;
      const parsed = parseResult(JSON.stringify({ title: 'T', main: 'M', reason: 'R', anchor: 'A', steps: moves }));
      expect(parsed.usedFallback).toBe(false);
      expect(parsed.response.steps).toEqual(moves);
    },
  );
  it.each([[], ['one', 'two', 'three', 'four'], ['one', ''], ['one', 42]])(
    'rejects empty, overflow or invalid steps %j rather than silently changing the response', (...steps) => {
      const moves = Array.isArray(steps[0]) ? steps[0] : steps;
      expect(parseResult(JSON.stringify({ title: 'T', main: 'M', reason: 'R', anchor: 'A', steps: moves })).usedFallback).toBe(true);
    },
  );
  it('matches exact recovered Responses bodies including multipart and JSON instruction bytes', () => {
    const variants: (StudentModelPart[] | undefined)[] = [undefined, [{ type: 'text', text: 'opaque' }],
      [{ type: 'image', mediaType: 'image/png', data: 'AA==' }],
      [{ type: 'file', mediaType: 'application/pdf', data: 'AA==', filename: 'opaque.pdf' }]];
    for (const quality of ['fast', 'quality', 'complex'] as const) for (const json of [true, false]) for (const [partIndex, parts] of variants.entries()) {
      const args = { model: 'frozen-test-model', system: 'opaque system', user: 'opaque user', maxTokens: 800, quality, json, parts };
      const expected = baseline.requests.find(row => row.quality === quality && row.json === json && row.partIndex === partIndex);
      expect(expected).toBeDefined();
      expect(hash(JSON.stringify(buildStudentResponseRequest(args)))).toBe(expected!.sha256);
    }
  });
  it('captures final primary source clipping, not the unrelated 800-character sidecar limit', () => {
    const recipe = prepareIntegratedPrimaryRecipe({ promptContext: 'x'.repeat(21_000), actualPromptAnchors: [], query: 'opaque' }, 'frozen-test-model');
    expect(recipe.sourceAfterFinalClipping).toHaveLength(20_000);
    expect(recipe.user).toContain('x'.repeat(20_000));
    expect(recipe).toMatchObject({ providerDispatchEnabled: false, productionEligible: false });
  });
});
