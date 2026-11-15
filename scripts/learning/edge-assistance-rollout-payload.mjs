// Offline payload assembly: only reviewed candidate bytes, never dirty Edge code.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('artifacts/learning-engine/research/edge-assistance-candidates-v1');
const hash = value => createHash('sha256').update(value).digest('hex');
const manifestBytes = readFileSync(resolve(root, 'manifest.json'));
const approved = 'c82516284924e4b1d4bd67a9e9f257195039d78fad1d7416bd539691b3904e1b';
if (hash(manifestBytes) !== approved) throw new Error('Approved manifest changed');
const manifest = JSON.parse(manifestBytes);
const slug = process.argv[2];
const item = manifest.functions.find(fn => fn.slug === slug);
if (!item || !item.verifyJwt) throw new Error('Unknown or unprotected function');
const raw = readFileSync(resolve(root, slug, 'remote-source.json'));
if (hash(raw) !== item.remoteSourceSha256) throw new Error('Remote snapshot changed');
const baseline = JSON.parse(raw);
const files = item.files.map(file => {
  const bytes = readFileSync(resolve(root, slug, 'candidate', file.name));
  if (hash(bytes) !== file.candidateSha256) throw new Error('Candidate changed: ' + file.name);
  if (file.baselineSha256) {
    const original = baseline.files.find(source => source.name === file.name);
    if (!original || hash(original.content) !== file.baselineSha256) throw new Error('Baseline changed');
    if (file.name !== item.entry && original.content !== bytes.toString('utf8')) throw new Error('Dependency changed');
  }
  return { name: file.name, content: bytes.toString('utf8') };
});
// Caller orchestrates read-only baseline check, deployment, and post-check in order.
process.stdout.write(JSON.stringify({ approvedManifestSha256: approved, item, baseline, files }));
