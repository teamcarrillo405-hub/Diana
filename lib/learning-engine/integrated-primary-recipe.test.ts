import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { STUDY_BUDDY_PROMPT, buildUserPrompt, parseResult } from '@/supabase/functions/_shared/study-buddy-prompt';
import { buildStudentResponseRequest } from '@/supabase/functions/_shared/student-response-request';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
const baseline = 'artifacts/learning-engine/release/disclosure-candidate-20260929-v3/supabase/functions/';
function declared(source: string, names: string[]) {
  const file = ts.createSourceFile('f.ts', source, ts.ScriptTarget.Latest, true);
  const nodes = file.statements.filter(node => ts.isFunctionDeclaration(node) ? names.includes(node.name?.text ?? '')
    : ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.includes(item.name.getText(file))));
  if (nodes.length !== names.length) throw new Error('baseline_declaration_missing');
  return ts.transpileModule(nodes.map(node => node.getText(file)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
describe('exact primary Edge recipe extraction', () => {
  it('matches frozen production prompt and parser declarations over opaque boundary inputs', () => {
    const source = readFileSync(baseline + 'study-buddy/index.ts', 'utf8');
    const original = new Function(declared(source, ['STUDY_BUDDY_PROMPT', 'buildUserPrompt', 'FALLBACK_RESULT', 'parseResult']) + ';return {STUDY_BUDDY_PROMPT,buildUserPrompt,parseResult};')();
    expect(STUDY_BUDDY_PROMPT).toBe(original.STUDY_BUDDY_PROMPT);
    for (const size of [0, 1, 799, 1000, 20_000, 20_001]) for (const mode of ['hint', 'quiz', 'guide'] as const) {
      const input = { mode, tutorPersona: 'diana', tutorStyle: 'socratic', complexity: 'balanced', source: 'Ω'.repeat(size), question: 'opaque',
        conversation: [], routing: {}, sourceAnchors: [], specialistContext: '' };
      expect(buildUserPrompt(input)).toBe(original.buildUserPrompt(input));
    }
    for (const raw of ['{}', 'bad-json', JSON.stringify({ title: 'T', main: 'M', reason: 'R', anchor: 'A', steps: ['a', 'b', 'c'] })]) expect(parseResult(raw)).toEqual(original.parseResult(raw));
  });
  it('matches exact frozen Responses body including multipart and JSON instruction bytes', () => {
    const source = readFileSync(baseline + '_shared/student-model.ts', 'utf8');
    const file = ts.createSourceFile('f.ts', source, ts.ScriptTarget.Latest, true);
    let expression = '';
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node) && node.name.getText(file) === 'body' && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(file) === 'JSON.stringify' && node.initializer.arguments[0]?.getText(file).includes('model: openAiModel')) expression = node.initializer.arguments[0].getText(file);
      node.forEachChild(visit);
    }; visit(file); expect(expression).not.toBe('');
    const original = new Function('openAiModel', 'system', 'user', 'maxTokens', 'quality', 'json', 'parts',
      declared(source, ['OPENAI_REASONING_EFFORT', 'toOpenAiResponseParts']) + `;return ${expression};`);
    for (const quality of ['fast', 'quality', 'complex'] as const) for (const json of [true, false]) for (const parts of [undefined, [{ type: 'text' as const, text: 'opaque' }], [{ type: 'image' as const, mediaType: 'image/png', data: 'AA==' }]]) {
      const args = { model: 'frozen-test-model', system: 'opaque system', user: 'opaque user', maxTokens: 800, quality, json, parts };
      expect(JSON.stringify(buildStudentResponseRequest(args))).toBe(JSON.stringify(original(args.model, args.system, args.user, 800, quality, json, parts)));
    }
  });
  it('captures final primary source clipping, not the unrelated 800-character sidecar limit', () => {
    const recipe = prepareIntegratedPrimaryRecipe({ promptContext: 'x'.repeat(21_000), actualPromptAnchors: [], query: 'opaque' }, 'frozen-test-model');
    expect(recipe.sourceAfterFinalClipping).toHaveLength(20_000);
    expect(recipe.user).toContain('x'.repeat(20_000));
    expect(recipe).toMatchObject({ providerDispatchEnabled: false, productionEligible: false });
  });
});
