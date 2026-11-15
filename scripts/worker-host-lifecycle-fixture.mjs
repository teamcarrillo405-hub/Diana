// Isolated protocol fixture. It never contacts production or uses a real student.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';

const stateFile = '/evidence/state.json';
let state;
try { state = JSON.parse(await readFile(stateFile, 'utf8')); } catch { state = { boots: 0, completed: [], denied: [], providerCalls: 0 }; }
state.boots++;
const persist = () => writeFile(stateFile, JSON.stringify(state, null, 2));
await persist();
const token = 'isolated-synthetic-worker-token';
const capability = 'a'.repeat(64);
let claimed = null;
const pending = state.boots === 1 ? ['before-restart'] : ['after-restart', 'cancelled-before-authorization'];
const server = createServer(async (req, res) => {
  try {
    res.setHeader('content-type', 'application/json');
    if (req.url.startsWith('/api/workers/') && req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401); res.end('{"ok":false}'); return;
    }
    const chunks = []; for await (const part of req) chunks.push(part);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    if (req.url.startsWith('/api/workers/metrics')) { res.end('{"ok":true}'); return; }
    if (req.url === '/api/workers/claim') {
      assert.equal(body.queueName, 'host-isolated-acceptance');
      const id = pending.find(id => !state.completed.includes(id) && !state.denied.includes(id));
      claimed = id ?? null;
      res.end(JSON.stringify({ ok: true, job: id ? { traceId: id, tenantId: 'synthetic', capability, expiresAt: new Date(Date.now() + 60000).toISOString() } : null }));
    } else if (req.url === '/api/workers/authorize') {
      assert.equal(body.capability, capability); assert.equal(body.traceId, claimed);
      if (claimed === 'cancelled-before-authorization') {
        state.denied.push(claimed); await persist(); res.writeHead(409); res.end('{"ok":false}'); return;
      }
      res.end(JSON.stringify({ ok: true, permit: { input: { transcript: 'Synthetic host check: ask which step is next.', source: 'typed' }, timeoutMs: 30000, expiresAt: new Date(Date.now() + 30000).toISOString() } }));
    } else if (req.url === '/v1/chat/completions') {
      assert.notEqual(claimed, 'cancelled-before-authorization');
      assert.equal(body.model, 'synthetic-host-fixture'); assert.equal(body.max_tokens, 500);
      state.providerCalls++; await persist();
      res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Which step would you like to try next?' } }] }));
    } else if (req.url === '/api/workers/complete') {
      assert.equal(body.capability, capability); assert.equal(body.traceId, claimed); assert.equal(body.status, 'succeeded');
      assert.equal(body.result.response, 'Which step would you like to try next?');
      assert(!state.completed.includes(claimed)); state.completed.push(claimed); await persist(); res.end('{"ok":true}');
    } else { res.writeHead(404); res.end('{}'); }
  } catch (error) {
    state.failure = error.message; await persist(); res.writeHead(500); res.end('{}');
  }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const env = { PATH: process.env.PATH, WORKER_API_TOKEN: token, DIANA_WORKER_BASE_URL: origin, DIANA_WORKER_ID: 'isolated-host-worker',
  DIANA_WORKER_QUEUE: 'host-isolated-acceptance', DIANA_WORKER_IMAGE_SHA: process.env.PROOF_IMAGE_ID,
  OPENJARVIS_BASE_URL: origin, OPENJARVIS_MODEL: 'synthetic-host-fixture' };
const launch = args => spawn(process.execPath, ['/app/dist/worker/run-diana-worker.cjs', ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
const health = launch(['--health']); let healthLog = ''; health.stdout.on('data', part => { healthLog += part; });
assert.equal((await once(health, 'exit'))[0], 0); assert.match(healthLog, /"status":"healthy"/);
assert.equal((await fetch(`${origin}/api/workers/metrics`)).status, 401);
state.healthPassed = true; state.unauthenticatedRejected = true; await persist();
const child = launch(['--poll-ms=250']); let output = '';
child.stdout.on('data', part => { output += part; }); child.stderr.on('data', part => { output += part; });
child.on('exit', code => { if (code !== 0) { state.childExit = code; void persist(); } });
const started = Date.now();
const timer = setInterval(async () => {
  if (state.failure || Date.now() - started > 45000) { clearInterval(timer); process.exit(2); }
  if (state.boots === 1 && state.completed.includes('before-restart') && Date.now() - started > 11000) {
    clearInterval(timer); state.deliberateCrash = true; await persist(); process.exit(17);
  }
  if (state.boots >= 2 && state.completed.length === 2 && state.denied.length === 1) {
    assert.equal(state.providerCalls, 2); assert.doesNotMatch(output, /isolated-synthetic-worker-token|Synthetic host check|Which step would/);
    state.accepted = true; state.browserRequired = false; state.scope = 'synthetic_container_protocol_only'; await persist();
    clearInterval(timer); // Keep supervisor/worker idle so Docker state is inspectable.
  }
}, 200);
process.on('SIGTERM', () => { child.kill('SIGTERM'); server.close(); process.exit(0); });
