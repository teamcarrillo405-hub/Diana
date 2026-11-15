// OFFLINE ONLY: uses already-fetched live snapshots. No deployment/model/network.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const root = resolve('artifacts/learning-engine/research/edge-assistance-candidates-v1');
const receiptPath = 'functions/_shared/learning/assignment-help-receipt.ts';
const receipt = readFileSync('supabase/' + receiptPath, 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(path, 'utf8');
const put = (path, content) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); };
const invocation = `import { recordEdgeAssignmentHelp, assignmentHelpRequestKey, type AssignmentHelpContext } from "./assignment-help-receipt.ts";
export async function runWithAssignmentHelp<T extends { ownerId: string; supabase?: unknown }, R>(
  context: AssignmentHelpContext, parameters: T, invoke: (parameters: T) => Promise<R>,
): Promise<R> {
  if (Deno.env.get("DIANA_DURABLE_TASK_ASSISTANCE_ENABLED") === "true") {
    const { supabase: _client, ...recipe } = parameters;
    await recordEdgeAssignmentHelp(context, { ownerId: parameters.ownerId, recipe,
      idempotencyKey: assignmentHelpRequestKey(context.body.idempotencyKey),
      kind: context.feature === "math-step" ? "hint" : context.feature === "math-example" ? "example" : context.feature === "assignment-review" ? "check" : "guide" });
  }
  return invoke(parameters);
}
`;
function calls(source, name) {
  const tree = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result = [];
  const visit = node => { if (ts.isCallExpression(node) && node.expression.getText(tree) === name) result.push({ node, tree }); ts.forEachChild(node, visit); };
  visit(tree); return result;
}
function recipeObject(source, endpoint) {
  const target = calls(source, 'fetch').find(({ node, tree }) => node.arguments[0].getText(tree) === JSON.stringify(endpoint));
  if (!target) throw new Error('Expected fetch endpoint absent: ' + endpoint);
  const body = target.node.arguments[1].properties.find(property => property.name?.getText(target.tree) === 'body');
  if (!body || !ts.isCallExpression(body.initializer) || body.initializer.expression.getText(target.tree) !== 'JSON.stringify') throw new Error('Unexpected request body');
  return { start: body.initializer.arguments[0].getStart(target.tree), end: body.initializer.arguments[0].end, text: body.initializer.arguments[0].getText(target.tree) };
}
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected unique patch context: ' + before);
  return source.replace(before, after);
}
const manifest = { schemaVersion: 'edge-assistance-candidates-v1', deployed: false, flagEnabled: false, providerCallsMade: false, functions: [] };
const slugs = ['math-step', 'history-scaffold', 'assignment-realtime', 'math-example', 'math-scaffold', 'reading-scaffold',
  'reading-level', 'vocab-hover', 'writing-aid', 'writing-cowrite', 'science-scaffold', 'cs-scaffold', 'language-scaffold',
  'arts-scaffold', 'health-scaffold', 'ap-scaffold', 'citation-gen', 'study-artifacts', 'assignment-review',
  'assignment-realtime-reason', 'task-breakdown', 'note-synthesis', 'visual-tools'];
for (const slug of slugs) {
  const folder = resolve(root, slug), metadata = JSON.parse(read(resolve(folder, 'remote-metadata.json')));
  const remote = JSON.parse(read(resolve(folder, 'remote-source.json')));
  if (remote.version !== metadata.version || remote.ezbr_sha256 !== metadata.ezbr_sha256) throw new Error('Snapshot metadata mismatch');
  // Preserve the exact fetched strings, including CRLF in some deployed files.
  for (const file of remote.files) for (const version of ['baseline', 'candidate']) put(resolve(folder, version, file.name), file.content);
  const entry = `functions/${slug}/index.ts`, baseline = read(resolve(folder, 'baseline', entry));
  let source = baseline.replaceAll('\r\n', '\n');
  // Keep the deployed model helper, its inputs and all downstream policy intact.
  const providerCalls = [...calls(source, 'callSafeStudentTextModel'), ...calls(source, 'runOpenAIHomeworkAdapter')].sort((a, b) => b.node.pos - a.node.pos);
  for (const { node, tree } of providerCalls) {
    if (node.arguments.length !== 1) throw new Error('Unexpected provider signature');
    const request = slug === 'assignment-realtime-reason' ? 'request' : 'req';
    const insideDiagram = slug === 'visual-tools' && node.pos < source.indexOf('Deno.serve(');
    const context = insideDiagram ? 'assistanceContext' : `{ request: ${request}, body, feature: "${slug}"${slug === 'note-synthesis' ? ', sourceNoteIds: notes.map(note => note.id)' : ''} }`;
    source = source.slice(0, node.getStart(tree)) + `runWithAssignmentHelp(${context}, ${node.arguments[0].getText(tree)}, ${node.expression.getText(tree)})` + source.slice(node.end);
  }
  if (slug === 'visual-tools') {
    source = replaceOnce(source, 'async function runDiagramAnnotation(\n', 'async function runDiagramAnnotation(\n  assistanceContext: import("../_shared/learning/assignment-help-receipt.ts").AssignmentHelpContext,\n');
    source = replaceOnce(source, 'runDiagramAnnotation(supabase, ownerId, storageKey, bucket)', 'runDiagramAnnotation({ request: req, body, feature: "visual-tools" }, supabase, ownerId, storageKey, bucket)');
  }
  if (slug === 'history-scaffold') {
    const object = recipeObject(source, 'https://api.openai.com/v1/chat/completions');
    source = source.slice(0, object.start) + 'recipe' + source.slice(object.end);
    source = replaceOnce(source, 'async function runMapAnnotation(', `function mapAnnotationRecipe(image: SafetyMediaInput) { return ${object.text}; }\n\nasync function runMapAnnotation(`);
    source = replaceOnce(source, 'async function runMapAnnotation(\n  image: SafetyMediaInput,', 'async function runMapAnnotation(\n  recipe: ReturnType<typeof mapAnnotationRecipe>,');
    source = replaceOnce(source, '      const image = await loadMapImage(supabase, storageKey, bucket);',
      `      const image = await loadMapImage(supabase, storageKey, bucket);\n      const mapRecipe = mapAnnotationRecipe(image);\n      await recordEdgeAssignmentHelp({ request: req, body, feature: "history-scaffold" }, { ownerId, recipe: mapRecipe, kind: "guide" });`);
    source = replaceOnce(source, 'runMapAnnotation(image, markProviderUsage)', 'runMapAnnotation(mapRecipe, markProviderUsage)');
  }
  if (slug === 'assignment-realtime') {
    const object = recipeObject(source, 'https://api.openai.com/v1/realtime/client_secrets');
    source = source.slice(0, object.start) + 'args.recipe' + source.slice(object.end);
    const recipe = object.text.replaceAll('args.model', 'model').replaceAll('args.instructions', 'instructions');
    source = replaceOnce(source, 'async function createRealtimeClientSecret(args: {', `function realtimeSessionRecipe(model: string, instructions: string) { return ${recipe}; }\n\nasync function createRealtimeClientSecret(args: {`);
    source = replaceOnce(source, '  instructions: string;\n  idempotencyKey: string;', '  recipe: ReturnType<typeof realtimeSessionRecipe>;\n  idempotencyKey: string;');
    source = replaceOnce(source, '    const instructions = buildRealtimeInstructions(context);',
      `    const instructions = buildRealtimeInstructions(context);\n    const recipe = realtimeSessionRecipe(model, instructions);\n    await recordEdgeAssignmentHelp({ request, body, feature: "assignment-realtime" }, { ownerId, recipe, kind: "guide", idempotencyKey });`);
    source = replaceOnce(source, 'createRealtimeClientSecret({ apiKey, model, instructions, idempotencyKey })', 'createRealtimeClientSecret({ apiKey, model, recipe, idempotencyKey })');
    source = replaceOnce(source, '  } catch (error) {\n    const code =', '  } catch (error) {\n    if (error instanceof Response) return error;\n    const code =');
  }
  source = 'import { recordEdgeAssignmentHelp } from "../_shared/learning/assignment-help-receipt.ts";\n'
    + (slug === 'assignment-realtime' ? '' : 'import { runWithAssignmentHelp } from "../_shared/learning/assignment-help-call.ts";\n') + source;
  put(resolve(folder, 'candidate', entry), source);
  put(resolve(folder, 'candidate', receiptPath), receipt);
  if (slug !== 'assignment-realtime') put(resolve(folder, 'candidate/functions/_shared/learning/assignment-help-call.ts'), invocation);
  const files = [];
  for (const { name } of metadata.files) {
    const old = read(resolve(folder, 'baseline', name)), candidate = read(resolve(folder, 'candidate', name));
    if (name !== entry && old !== candidate) throw new Error('Deployed dependency changed: ' + name);
    const localPath = resolve('supabase', name);
    files.push({ name, baselineSha256: hash(old), candidateSha256: hash(candidate), unchanged: old === candidate,
      inheritedLocalDiffersFromRemote: existsSync(localPath) ? read(localPath).replaceAll('\r\n', '\n') !== old.replaceAll('\r\n', '\n') : null });
  }
  for (const name of [receiptPath, ...(slug === 'assignment-realtime' ? [] : ['functions/_shared/learning/assignment-help-call.ts'])]) {
    files.push({ name, baselineSha256: null, candidateSha256: hash(read(resolve(folder, 'candidate', name))), unchanged: false, addedBoundaryOnly: true });
  }
  manifest.functions.push({ slug, remoteVersion: metadata.version, verifyJwt: metadata.verify_jwt, remoteBundleSha256: metadata.ezbr_sha256,
    remoteSourceSha256: hash(read(resolve(folder, 'remote-source.json'))), entry, existingDependencyContentsPreserved: true, files });
}
put(resolve(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ functions: manifest.functions.map(({ slug, remoteVersion }) => ({ slug, remoteVersion })), deployed: false }));
