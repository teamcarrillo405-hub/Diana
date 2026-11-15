// Sends no credentials, source text or model prompt. JWT rejection is required.
import { readFileSync, writeFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('artifacts/learning-engine/research/edge-assistance-candidates-v1/manifest.json'));
const results = [];
for (const item of manifest.functions) {
  const response = await fetch(`https://oitipayrriupcitgmzju.supabase.co/functions/v1/${item.slug}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  const result = { slug: item.slug, checkedAt: new Date().toISOString(), status: response.status, body, sentAuthorization: false, sentApiKey: false };
  results.push(result);
  writeFileSync('artifacts/learning-engine/rollouts/edge-assistance-stage-001/unauthenticated-preflight.json', JSON.stringify(results, null, 2) + '\n');
  if (response.status !== 401) throw new Error(`Unexpected unauthenticated status for ${item.slug}: ${response.status}`);
}
console.log(JSON.stringify({ functions: results.length, allRejected401: true }));
