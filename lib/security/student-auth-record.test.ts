import { beforeAll, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';

const owner = '00000000-0000-4000-8000-000000000001', resourceId = '00000000-0000-4000-8000-000000000002';
let bundle: string;
beforeAll(async () => {
  const result = await build({ entryPoints: ['supabase/functions/_shared/student-auth.ts'], bundle: true,
    platform: 'node', format: 'cjs', write: false, plugins: [{ name: 'mock-supabase-io', setup(builder) {
      builder.onResolve({ filter: /^jsr:@supabase\/supabase-js@2$/ }, () => ({ path: 'sdk', namespace: 'auth-test' }));
      builder.onLoad({ filter: /.*/, namespace: 'auth-test' }, () => ({
        contents: 'export const createClient = (...args) => globalThis.authTest.createClient(...args);', loader: 'js',
      }));
    } }] });
  bundle = result.outputFiles[0].text;
});

async function authorize(data: unknown, custom = false) {
  const eq = vi.fn(), from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'in', 'limit']) query[method] = () => query;
    query.eq = (...args: unknown[]) => { eq(...args); return query; };
    query.maybeSingle = async () => ({ data: table === 'profiles' ? { user_id: owner, age_bracket: 'adult', consent_ai: true }
      : table === 'data_deletion_requests' ? null : data, error: null });
    return query;
  });
  const client = { from, auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) } };
  const createClient = vi.fn(() => client), testModule = { exports: {} };
  const env: Record<string, string> = { SUPABASE_URL: 'https://synthetic.test', SUPABASE_ANON_KEY: 'synthetic-public', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service' };
  runInNewContext(bundle, { module: testModule, exports: testModule.exports, Response, Request, Headers,
    Deno: { env: { get: (key: string) => env[key] } }, authTest: { createClient } });
  const api = testModule.exports as { requireStudentContext(request: Request, options: unknown): Promise<Response | { ownerId: string }> };
  const result = await api.requireStudentContext(new Request('https://synthetic.test', { headers: { Authorization: 'Bearer synthetic-user-token' } }), {
    ownedResource: { table: 'opaque_resources', id: resourceId, ...(custom ? { idColumn: 'resource_key', ownerColumn: 'user_key' } : {}) },
  });
  return { result, createClient, eq };
}

describe('shared Edge dynamic resource record validation', () => {
  it.each(['malformed-string', '', 1, 0, false, undefined, [], [{ id: resourceId, owner_id: owner }], {},
    { id: resourceId, owner_id: resourceId }, { id: owner, owner_id: owner }])('rejects malformed or mismatched resource data %j before creating a service client', async data => {
    const { result, createClient } = await authorize(data);
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'authorization_unavailable' });
    expect(createClient).toHaveBeenCalledTimes(1);
  });
  it('keeps an absent record distinct from malformed query output', async () => {
    const { result, createClient } = await authorize(null);
    expect((result as Response).status).toBe(404);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])('accepts a validated owned record with custom columns=%s', async custom => {
    const row = custom ? { resource_key: resourceId, user_key: owner } : { id: resourceId, owner_id: owner };
    const { result, createClient, eq } = await authorize(row, custom);
    expect(result).toMatchObject({ ownerId: owner });
    expect(eq).toHaveBeenCalledWith(custom ? 'resource_key' : 'id', resourceId);
    expect(eq).toHaveBeenCalledWith(custom ? 'user_key' : 'owner_id', owner);
    expect(createClient).toHaveBeenCalledTimes(2);
  });
  it('pins only the new function import map to installed SDK package versions', () => {
    const config = JSON.parse(readFileSync('supabase/functions/learning-integrated-execution/deno.json', 'utf8'));
    const sdk = JSON.parse(readFileSync('node_modules/@supabase/supabase-js/package.json', 'utf8'));
    const functions = JSON.parse(readFileSync('node_modules/@supabase/functions-js/package.json', 'utf8'));
    expect(sdk.version).toBe('2.106.2'); expect(functions.version).toBe('2.106.2');
    expect(config.imports['jsr:@supabase/supabase-js@2']).toBe(`npm:@supabase/supabase-js@${sdk.version}`);
    expect(config.imports['jsr:@supabase/functions-js/edge-runtime.d.ts']).toBe(`jsr:@supabase/functions-js@${functions.version}/edge-runtime.d.ts`);
  });
});
