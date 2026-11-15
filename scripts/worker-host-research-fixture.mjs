// One synthetic protocol attempt using already installed, explicitly approved
// research weights. No live application, student queue, downloads or retries.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { once } from 'node:events';
const base = 'http://host.docker.internal:11434';
const model = 'qwen3.8:27b';
const digest = 'aaee06c39dcf2437cde036998d960e1fc1494b8191be7cc9657d01e509097813';
const token = 'synthetic-research-host-token'; const capability = 'b'.repeat(64);
const evidence = { startedAt: new Date().toISOString(), model, digest, realStudentData: false, productionEligible: false, attempts: 0, exchanges: [] };
async function ollama(path, body, signal = AbortSignal.timeout(10000)) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal, redirect: 'error' });
  assert(response.ok, `Local server returned ${response.status}`); return response.json();
}
evidence.tagsBefore = await ollama('/api/tags');
assert(evidence.tagsBefore.models.some(row => row.name === model && row.digest === digest));
evidence.psBefore = await ollama('/api/ps'); assert.equal(evidence.psBefore.models.length, 0, 'Refuse to disturb a resident model');
let providerWork; let child; let server;
try {
  server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (req.url.startsWith('/api/workers/')) assert.equal(req.headers.authorization, `Bearer ${token}`);
      if (req.url === '/api/workers/claim') {
        assert.equal(body.queueName, 'host-isolated-research-20260929');
        res.end(JSON.stringify({ ok: true, job: { traceId: 'synthetic-research-one', tenantId: 'synthetic-only', capability, expiresAt: new Date(Date.now() + 60000).toISOString() } }));
      } else if (req.url === '/api/workers/authorize') {
        assert.equal(body.capability, capability);
        res.end(JSON.stringify({ ok: true, permit: { input: { transcript: 'This is a synthetic host test. Ask which step I want to start.', source: 'typed' }, timeoutMs: 30000, expiresAt: new Date(Date.now() + 30000).toISOString() } }));
      } else if (req.url === '/v1/chat/completions') {
        evidence.attempts++; assert.equal(evidence.attempts, 1); assert.equal(body.model, model); assert.equal(body.max_tokens, 500); assert.equal(body.temperature, 0);
        const exchange = { request: body, startedAt: new Date().toISOString() }; evidence.exchanges.push(exchange);
        const controller = new AbortController(); res.on('close', () => { if (!res.writableEnded) controller.abort(); });
        const start = Date.now();
        providerWork = (async () => {
          try { exchange.response = await ollama('/v1/chat/completions', body, AbortSignal.any([controller.signal, AbortSignal.timeout(35000)])); res.end(JSON.stringify(exchange.response)); }
          catch (error) { exchange.errorName = error.name; if (!res.destroyed) { res.writeHead(502); res.end('{}'); } }
          finally { exchange.wallMs = Date.now() - start; }
        })();
        await providerWork;
      } else if (req.url === '/api/workers/complete') {
        assert.equal(body.capability, capability); evidence.completion = { status: body.status, result: body.result ?? null, errorCode: body.errorCode ?? null, errorMetadata: body.errorMetadata ?? null }; res.end('{"ok":true}');
      } else { res.writeHead(404); res.end('{}'); }
    } catch (error) { evidence.fixtureError = error.message; res.writeHead(500); res.end('{}'); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  child = spawn(process.execPath, ['/app/dist/worker/run-diana-worker.cjs', '--once'], { env: { PATH: process.env.PATH, WORKER_API_TOKEN: token,
    DIANA_WORKER_BASE_URL: origin, DIANA_WORKER_ID: 'research-only-host-worker', DIANA_WORKER_IMAGE_SHA: process.env.PROOF_IMAGE_ID,
    DIANA_WORKER_QUEUE: 'host-isolated-research-20260929', OPENJARVIS_BASE_URL: origin, OPENJARVIS_MODEL: model }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout.on('data', part => { logs += part; }); child.stderr.on('data', part => { logs += part; });
  const timer = setTimeout(() => child.kill('SIGKILL'), 45000);
  evidence.workerExitCode = (await once(child, 'exit'))[0]; clearTimeout(timer);
  await providerWork;
  assert.doesNotMatch(logs, /synthetic-research-host-token|This is a synthetic host test/); evidence.workerLogs = logs;
  evidence.psAfterAttempt = await ollama('/api/ps');
  evidence.tagsAfter = await ollama('/api/tags'); assert(evidence.tagsAfter.models.some(row => row.name === model && row.digest === digest));
  const response = evidence.exchanges[0]?.response;
  evidence.completeFinalResponse = evidence.completion?.status === 'succeeded' && response?.choices?.[0]?.finish_reason === 'stop' && Boolean(response?.choices?.[0]?.message?.content?.trim());
  evidence.residencyMeasurement = 'Ollama reported resident size_vram only; not peak GPU memory or full GPU execution guarantee';
} finally {
  if (child && child.exitCode === null) child.kill('SIGKILL');
  await providerWork;
  evidence.unload = await ollama('/api/generate', { model, keep_alive: 0 });
  evidence.psAfterUnload = await ollama('/api/ps'); evidence.modelUnloaded = !evidence.psAfterUnload.models.some(row => row.name === model);
  evidence.finishedAt = new Date().toISOString();
  await writeFile('/evidence/research-attempt.json', JSON.stringify(evidence, null, 2), { flag: 'wx' });
  server?.close();
}
console.log(JSON.stringify({ model, digest, attempts: evidence.attempts, workerStatus: evidence.completion?.status, errorCode: evidence.completion?.errorCode,
  completeFinalResponse: evidence.completeFinalResponse, modelUnloaded: evidence.modelUnloaded, productionEligible: false }));
