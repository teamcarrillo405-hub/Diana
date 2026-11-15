/** Existing-account, zero-generation capture. Run with Node's react-server condition. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { structureDocument } from '../../lib/learning-engine/curriculum';
import { prepareIntegratedPrimaryRecipe } from '../../lib/learning-engine/integrated-primary-recipe';
import type { LearningDatabase } from '../../lib/learning-engine/database';
import { captureIntegratedAssignmentBatch } from '../../lib/learning-engine/integrated-assignment-capture';
import { integratedProviderBytesSha256 as sha256 } from '../../lib/learning-engine/integrated-provider-response';
import { readIntegratedCaptureFile } from './integrated-capture-files';

export function readPublicCaptureConfiguration(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^(?:export\s+)?(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const raw = match[2].trim();
    const quoted = /^(["'])(.*?)\1\s*(?:#.*)?$/.exec(raw);
    const value = quoted ? quoted[2] : raw.replace(/\s+#.*$/, '').trim();
    if (value && !/[\r\n]/.test(value)) result[match[1]] = value;
  }
  return result;
}

async function boundedJson(path: string) {
  const raw = await readIntegratedCaptureFile(path, 128_000);
  return { raw, parsed: JSON.parse(raw) as unknown };
}
/** Hard transport boundary: authentication, owned reads and the lexical RPC only. */
export function retrievalOnlyFetch(baseUrl: string, transport: typeof fetch = fetch): typeof fetch {
  const origin = new URL(baseUrl).origin;
  const readTables = new Set(['profiles', 'data_deletion_requests', 'assignments', 'classes', 'learning_documents', 'learning_chunks', 'learning_blocks']);
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const auth = (method === 'POST' && url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') ||
      (method === 'GET' && url.pathname === '/auth/v1/user') || (method === 'POST' && url.pathname === '/auth/v1/logout');
    const read = method === 'GET' && readTables.has(url.pathname.replace(/^\/rest\/v1\//, ''));
    const search = method === 'POST' && url.pathname === '/rest/v1/rpc/learning_search';
    if (url.origin !== origin || (!auth && !read && !search)) throw new Error('non_retrieval_network_request_rejected');
    if (search) {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : null;
      if (!body || Object.keys(body).some(key => !['p_assignment', 'p_versions', 'p_query'].includes(key))) throw new Error('non_lexical_search_rejected');
    }
    return transport(input, { ...init, redirect: 'error' });
  };
}
export async function runAuthenticatedAssignmentCapture(args: string[]) {
  if (args.length !== 6 || args[0] !== 'authenticated-retrieval' || args[2] !== '--input-sha256' || args[4] !== '--out' || !/^[a-f0-9]{64}$/.test(args[3])) throw new Error('capture_usage');
  const input = await boundedJson(args[1]);
  if (sha256(input.raw) !== args[3] || !Array.isArray(input.parsed)) throw new Error('input_digest_or_shape_rejected');
  const email = process.env.DIANA_CAPTURE_QA_EMAIL, password = process.env.DIANA_CAPTURE_QA_PASSWORD;
  if (!email || !password) throw new Error('qa_credentials_missing');
  // Read public configuration only; never load or spread the complete .env.local.
  const envText = await readFile(resolve('.env.local'), 'utf8');
  const publicConfig = readPublicCaptureConfiguration(envText);
  const publicValue = (key: string) => publicConfig[key];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? publicValue('NEXT_PUBLIC_SUPABASE_URL');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publicValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? publicValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) throw new Error('public_configuration_missing');
  const client = createClient<LearningDatabase>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: retrievalOnlyFetch(url) } });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user) throw new Error('qa_authentication_rejected');
  try {
    const report = { execution: 'authenticated_supabase_lexical_retrieval_no_generation', inputFileSha256: args[3],
      ...await captureIntegratedAssignmentBatch(client, input.parsed) };
    await writeFile(args[5], JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { ok: true, planned: report.planned, completed: report.completed, providerCalls: 0, productionEligible: false,
      reportSha256: sha256(JSON.stringify(report)), statuses: report.rows.map(row => 'status' in row ? row.status : 'unknown') };
  } finally { await client.auth.signOut({ scope: 'local' }); }
}
/** One opaque protocol graph, no educational corpus and no network-capable client. */
export async function runSyntheticAssignmentCapture(output: string) {
  const owner = '00000000-0000-4000-8000-000000000001', assignment = '00000000-0000-4000-8000-000000000002', course = '00000000-0000-4000-8000-000000000003';
  const doc = await structureDocument({ documentId: 'opaque', ownerId: owner, assignmentId: assignment, classId: course, title: 'Opaque protocol graph', edition: '1', subject: 'other', instructionRights: 'owner_provided' },
    [{ page: 1, pageLabel: 'P', text: 'alpha beta gamma', interpretation: 'confirmed' }]);
  const tables: Record<string, unknown> = { profiles: { age_bracket: 'adult', consent_ai: true }, data_deletion_requests: null,
    assignments: { class_id: course, ai_mode_override: null }, classes: { ai_mode: 'green' }, learning_chunks: [],
    learning_documents: [{ id: doc.version.id, owner_id: owner, assignment_id: assignment, document_id: 'opaque', content_hash: doc.version.contentHash, metadata: doc.version, pages: doc.pages }],
    learning_blocks: doc.blocks.map(payload => ({ payload })) };
  const client = { auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) },
    from(table: string) {
      if (!(table in tables)) throw new Error('unsupported_synthetic_table');
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'not', 'in', 'order', 'limit']) query[method] = () => query;
      query.maybeSingle = () => Promise.resolve({ data: tables[table], error: null });
      query.then = (resolve: (value: unknown) => void) => Promise.resolve({ data: tables[table], error: null }).then(resolve);
      return query;
    },
    rpc: async (name: string) => { if (name !== 'learning_search') throw new Error('unsupported_synthetic_rpc'); return { data: doc.chunks.map((payload, index) => ({ payload, lexical_rank: index + 1, semantic_rank: null })), error: null }; },
    functions: { invoke: async () => { throw new Error('synthetic_provider_forbidden'); } },
  } as unknown as SupabaseClient<LearningDatabase>;
  const batch = await captureIntegratedAssignmentBatch(client, [{ schema: 'integrated-assignment-retrieval-request-v1', caseId: 'opaque-protocol-graph', expectedOwnerId: owner, assignmentId: assignment, query: 'alpha', versionPins: [{ id: doc.version.id, contentHash: doc.version.contentHash }] }]);
  const row = batch.rows[0];
  const recipe = 'kind' in row && row.kind === 'retrieved' ? prepareIntegratedPrimaryRecipe({ ...row, query: 'alpha' }, 'synthetic-not-a-provider-model') : null;
  const report = { execution: 'offline_synthetic_client_real_product_helpers', authenticatedScopeVerified: false,
    hostedDatabaseFtsExecuted: false, ...batch, recipe };
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { ok: true, planned: batch.planned, completed: batch.completed, providerCalls: 0, productionEligible: false, reportSha256: sha256(JSON.stringify(report)) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const run = args.length === 3 && args[0] === 'dry-run' && args[1] === '--out' ? runSyntheticAssignmentCapture(args[2]) : runAuthenticatedAssignmentCapture(args);
  run.then(value => console.log(JSON.stringify(value))).catch(() => {
    console.error(JSON.stringify({ ok: false, error: 'authenticated_capture_not_completed', providerCalls: 0 })); process.exitCode = 1;
  });
}
