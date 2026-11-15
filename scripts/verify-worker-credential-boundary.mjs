// Offline compiled-replica check. Every HTTP response is synthetic on loopback.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { once } from 'node:events';

const bundle = resolve('dist/worker/run-diana-worker.cjs');
const code = await readFile(bundle, 'utf8');
assert.doesNotMatch(code, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|\/v1\/moderations|createAiServiceClient/);
assert.doesNotMatch(code, /loadEnvConfig|@next\/env/);
const cwd = await mkdtemp(join(tmpdir(), 'diana-worker-credential-proof-'));
const capability = 'a'.repeat(64);
const calls = [];
let failure;
const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    calls.push(req.url);
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/api/workers/')) assert.equal(req.headers.authorization, 'Bearer loopback-only-test-token');
    if (req.url === '/api/workers/claim') {
      res.end(JSON.stringify({ ok: true, job: { traceId: 'proof-1', tenantId: 'synthetic', capability, expiresAt: new Date(Date.now() + 60000).toISOString() } }));
    } else if (req.url === '/api/workers/authorize') {
      assert.deepEqual(body, { traceId: 'proof-1', workerId: 'proof-worker', capability });
      res.end(JSON.stringify({ ok: true, permit: { input: { transcript: 'Help me begin this synthetic equation.', source: 'typed' }, timeoutMs: 30000, expiresAt: new Date(Date.now() + 60000).toISOString() } }));
    } else if (req.url === '/v1/chat/completions') {
      assert.equal(body.model, 'synthetic-local-model');
      assert.equal(body.max_tokens, 500);
      assert.match(body.messages[1].content, /synthetic equation/);
      res.end(JSON.stringify({ choices: [{ message: { content: 'Which quantity do you know?' } }] }));
    } else if (req.url === '/api/workers/complete') {
      assert.equal(body.capability, capability);
      assert.equal(body.status, 'succeeded');
      assert.equal(body.result.response, 'Which quantity do you know?');
      res.end(JSON.stringify({ ok: true }));
    } else throw new Error('Unexpected endpoint');
  } catch (error) { failure = error; res.statusCode = 500; res.end('{}'); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const env = {
  SystemRoot: process.env.SystemRoot,
  PATH: process.env.PATH,
  TEMP: tmpdir(), TMP: tmpdir(),
  WORKER_API_TOKEN: 'loopback-only-test-token', DIANA_WORKER_BASE_URL: origin,
  DIANA_WORKER_ID: 'proof-worker', OPENJARVIS_BASE_URL: origin, OPENJARVIS_MODEL: 'synthetic-local-model',
};
const child = spawn(process.execPath, [bundle, '--once'], { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
const timer = setTimeout(() => child.kill(), 15000);
try {
  const [exitCode] = await once(child, 'exit');
  assert.equal(exitCode, 0, output);
  if (failure) throw failure;
  assert.deepEqual(calls, ['/api/workers/claim', '/api/workers/authorize', '/v1/chat/completions', '/api/workers/complete']);
  assert.match(output, /"status":"completed"/);
  assert.doesNotMatch(output, new RegExp(capability));
  assert.doesNotMatch(output, /synthetic equation|Which quantity/);
  console.log(JSON.stringify({ ok: true, compiledCycle: 'completed', credentialNames: ['WORKER_API_TOKEN'], network: 'loopback_synthetic_only', outputTokenLimit: 500, privateContentLogged: false }));
} finally {
  clearTimeout(timer);
  server.close();
}
