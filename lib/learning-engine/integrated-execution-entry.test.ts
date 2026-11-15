import { it, expect, vi } from 'vitest';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
it('bundles the real Edge import closure and executes its null-plan default-off entry without IO', async () => {
  const require = createRequire(import.meta.url);
  const built = await build({ entryPoints: ['supabase/functions/learning-integrated-execution/index.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node24', write: false, metafile: true,
    plugins: [{ name: 'cached-jsr-types-and-sdk', setup(build) {
      build.onResolve({ filter: /^jsr:@supabase\/functions-js/ }, () => ({ path: 'runtime-types', namespace: 'empty-types' }));
      build.onLoad({ filter: /.*/, namespace: 'empty-types' }, () => ({ contents: '', loader: 'js' }));
      build.onResolve({ filter: /^jsr:@supabase\/supabase-js@2$/ }, () => ({ path: require.resolve('@supabase/supabase-js') }));
    } }] });
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const env: Record<string, string> = {};
  const fetch = vi.fn().mockRejectedValue(new Error('network forbidden'));
  const context = vm.createContext({ require, exports: {}, module: { exports: {} }, process, Buffer,
    TextEncoder, TextDecoder, Request, Response, Headers, URL, URLSearchParams, AbortSignal, AbortController,
    crypto: globalThis.crypto, setTimeout, clearTimeout, setInterval, clearInterval, console, fetch,
    Deno: { env: { get: (key: string) => env[key] }, serve: (callback: typeof handler) => { handler = callback; } } });
  vm.runInContext(built.outputFiles[0].text, context);
  expect(handler).toBeTypeOf('function');
  const response = await handler!(new Request('https://local.test', { method: 'POST', body: '{}' }));
  expect(response.status).toBe(404); expect(fetch).not.toHaveBeenCalled();
  env.DIANA_INTEGRATED_EXECUTION_ENABLED = 'true';
  expect((await handler!(new Request('https://local.test', { method: 'POST', body: '{}' }))).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
  expect(Object.keys(built.metafile!.inputs).some(path => path.includes('hybrid-approved-fixtures'))).toBe(false);
  expect(JSON.parse(readFileSync('supabase/functions/learning-integrated-execution/approved-plan.json', 'utf8'))).toBeNull();
  expect(JSON.parse(readFileSync('supabase/functions/learning-integrated-execution/deno.json', 'utf8')).imports.zod).toBe('npm:zod@3.25.76');
});
