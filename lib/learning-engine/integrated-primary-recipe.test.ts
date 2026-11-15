import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { STUDY_BUDDY_PROMPT, buildUserPrompt, parseResult } from '@/supabase/functions/_shared/study-buddy-prompt';
import { buildStudentResponseRequest, type StudentModelPart } from '@/supabase/functions/_shared/student-response-request';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
import baseline from './fixtures/recovered-primary-contract.json';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
describe('exact primary Edge recipe extraction', () => {
  it('matches the recovered prompt and parser regression contract over opaque boundary inputs', () => {
    expect(hash(STUDY_BUDDY_PROMPT)).toBe(baseline.systemPromptSha256);
    for (const size of [0, 1, 799, 1000, 20_000, 20_001]) for (const mode of ['hint', 'quiz', 'guide'] as const) {
      const input = { mode, tutorPersona: 'diana', tutorStyle: 'socratic', complexity: 'balanced', source: 'Ω'.repeat(size), question: 'opaque',
        conversation: [], routing: {}, sourceAnchors: [], specialistContext: '' };
      const expected = baseline.prompts.find(row => row.size === size && row.mode === mode);
      expect(expected).toBeDefined();
      expect(hash(buildUserPrompt(input))).toBe(expected!.sha256);
    }
    for (const { raw, result } of baseline.parses) expect(parseResult(raw)).toEqual(result);
  });
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
