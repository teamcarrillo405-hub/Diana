import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyEvidence } from '../../scripts/verify-worker-image-evidence';
import { verifyWorkerContainer } from '../../scripts/verify-worker-container.mjs';
import ts from 'typescript';

const roots: string[] = [];
function fixtureRoot() { const root = mkdtempSync(join(tmpdir(), 'diana-worker-packaging-')); roots.push(root); return root; }
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !root.includes('diana-worker-packaging-')) throw new Error('Unexpected fixture cleanup target');
    rmSync(root, { recursive: true, force: true });
  }
});

const proof = { ok: true, compiledCycle: 'completed', credentialNames: ['WORKER_API_TOKEN'], network: 'loopback_synthetic_only', outputTokenLimit: 500, privateContentLogged: false };
function evidence() {
  const dir = fixtureRoot();
  const summary = { workflow: 'Worker image', sha: 'a'.repeat(40), runId: '123', runAttempt: '1',
    localImage: `diana-worker:${'a'.repeat(40)}`, remoteImage: `ghcr.io/example/diana-worker:${'a'.repeat(40)}`,
    imageId: `sha256:${'b'.repeat(64)}`, pushRequested: 'false' };
  const steps = Object.fromEntries(['setupNode', 'installDependencies', 'deploymentCheck', 'workerTests', 'runtimeSmoke',
    'credentialProof', 'buildImage', 'recordImageEvidence', 'commandSmoke', 'containerProof'].map(name => [name, 'success']));
  const outcome = { workflow: summary.workflow, sha: summary.sha, runId: summary.runId, runAttempt: summary.runAttempt,
    pushRequested: 'false', steps: { ...steps, loginRegistry: 'skipped', pushImage: 'skipped' } as Record<string, string> };
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary));
  writeFileSync(join(dir, 'outcome.json'), JSON.stringify(outcome));
  writeFileSync(join(dir, 'credential-proof.log'), `npm wrapper output\n${JSON.stringify(proof)}\n`);
  writeFileSync(join(dir, 'container-proof.log'), JSON.stringify({ ok: true, imageId: summary.imageId, runtimeUser: 'node', runtimeNodeModules: false,
    network: 'none_with_container_loopback', readOnlyRoot: true, compiledCycle: 'completed', outputTokenLimit: 500, privateContentLogged: false }));
  return { dir, outcome, summary };
}

describe('worker image protocol evidence', () => {
  it.each(['missing', 'other_image', 'root_user'])('rejects %s restricted-image evidence', failure => {
    const { dir } = evidence();
    const path = join(dir, 'container-proof.log');
    if (failure === 'missing') rmSync(path);
    else {
      const body = JSON.parse(readFileSync(path, 'utf8'));
      if (failure === 'other_image') body.imageId = 'sha256:' + 'c'.repeat(64);
      else body.runtimeUser = '0:0';
      writeFileSync(path, JSON.stringify(body));
    }
    expect(verifyEvidence({ dir, requirePushed: false }).find(check => check.name === 'restricted image protocol proof matches image identity')?.ok).toBe(false);
  });
  it('accepts a complete non-pushed image with the offline capability proof', () => {
    expect(verifyEvidence({ dir: evidence().dir, requirePushed: false }).every(check => check.ok)).toBe(true);
  });
  it('rejects legacy config-only image evidence without protocol proof', () => {
    const { dir, outcome } = evidence();
    delete outcome.steps.credentialProof;
    writeFileSync(join(dir, 'outcome.json'), JSON.stringify(outcome));
    rmSync(join(dir, 'credential-proof.log'));
    const checks = verifyEvidence({ dir, requirePushed: false });
    expect(checks.find(check => check.name === 'credentialProof completed successfully')?.ok).toBe(false);
    expect(checks.find(check => check.name === 'compiled capability protocol proof is present')?.ok).toBe(false);
  });
  it('rejects a copied pushed marker when no image was published', () => {
    const { dir } = evidence();
    writeFileSync(join(dir, 'pushed-image.txt'), `ghcr.io/example/diana-worker:${'a'.repeat(40)}`);
    for (const requirePushed of [false, true]) {
      const checks = verifyEvidence({ dir, requirePushed });
      expect(checks.find(check => check.name === 'pushed image has successful publishing outcomes')?.ok).toBe(false);
    }
  });
  it.each(['missing_marker', 'missing_digest', 'other_image', 'other_repository'])('rejects %s even without require-pushed when publishing was requested', failure => {
    const { dir, outcome, summary } = evidence();
    summary.pushRequested = 'true'; outcome.pushRequested = 'true'; outcome.steps.loginRegistry = 'success'; outcome.steps.pushImage = 'success';
    writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary)); writeFileSync(join(dir, 'outcome.json'), JSON.stringify(outcome));
    if (failure !== 'missing_marker') writeFileSync(join(dir, 'pushed-image.txt'), summary.remoteImage);
    if (failure !== 'missing_digest') writeFileSync(join(dir, 'pushed-image.json'), JSON.stringify({ remoteImage: summary.remoteImage,
      imageId: failure === 'other_image' ? 'sha256:' + 'c'.repeat(64) : summary.imageId,
      repositoryDigest: (failure === 'other_repository' ? 'ghcr.io/other/diana-worker' : 'ghcr.io/example/diana-worker') + '@sha256:' + 'd'.repeat(64) }));
    expect(verifyEvidence({ dir, requirePushed: false }).every(check => check.ok)).toBe(false);
  });
  it('accepts publishing evidence only when immutable digest and tested image are bound', () => {
    const { dir, outcome, summary } = evidence();
    summary.pushRequested = 'true'; outcome.pushRequested = 'true'; outcome.steps.loginRegistry = 'success'; outcome.steps.pushImage = 'success';
    writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary)); writeFileSync(join(dir, 'outcome.json'), JSON.stringify(outcome));
    writeFileSync(join(dir, 'pushed-image.txt'), summary.remoteImage);
    writeFileSync(join(dir, 'pushed-image.json'), JSON.stringify({ remoteImage: summary.remoteImage, imageId: summary.imageId, repositoryDigest: 'ghcr.io/example/diana-worker@sha256:' + 'd'.repeat(64) }));
    expect(verifyEvidence({ dir, requirePushed: true }).every(check => check.ok)).toBe(true);
  });
  it('rejects partial SHA substrings, malformed run IDs and inconsistent no-push outcomes', () => {
    const { dir, outcome, summary } = evidence();
    summary.sha = 'abc'; outcome.sha = 'abc'; summary.localImage = 'diana-worker:abc-more'; summary.remoteImage = 'ghcr.io/example/diana-worker:abc-more';
    summary.runId = 'run'; outcome.runId = 'run'; outcome.steps.pushImage = 'success';
    writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary)); writeFileSync(join(dir, 'outcome.json'), JSON.stringify(outcome));
    const checks = verifyEvidence({ dir, requirePushed: false });
    expect(checks.find(check => check.name === 'artifact metadata includes run ids')?.ok).toBe(false);
    expect(checks.find(check => check.name === 'artifact metadata includes image tags')?.ok).toBe(false);
    expect(checks.find(check => check.name === 'pushImage is skipped when push is not requested')?.ok).toBe(false);
  });
  it.each(['failure', 'skipped'])('rejects a %s protocol step despite copied proof text', status => {
    const { dir, outcome } = evidence();
    outcome.steps.credentialProof = status;
    writeFileSync(join(dir, 'outcome.json'), JSON.stringify(outcome));
    expect(verifyEvidence({ dir, requirePushed: false }).every(check => check.ok)).toBe(false);
  });
  it.each([
    { ...proof, credentialNames: ['WORKER_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY'] },
    { ...proof, compiledCycle: 'configured' }, { ...proof, privateContentLogged: true }, { ...proof, outputTokenLimit: 700 },
  ])('rejects incompatible protocol proof %j', changed => {
    const { dir } = evidence();
    writeFileSync(join(dir, 'credential-proof.log'), JSON.stringify(changed));
    expect(verifyEvidence({ dir, requirePushed: false }).find(check => check.name === 'compiled capability protocol proof is present')?.ok).toBe(false);
  });
});

describe('immutable restricted container command construction without Docker IO', () => {
  it('executes only the inspected identity despite a mutable requested tag or image entrypoint', () => {
    const id = 'sha256:' + 'a'.repeat(64), commands: string[][] = [];
    const execute = (args: string[]) => {
      commands.push(args);
      if (args[0] === 'image') return JSON.stringify([{ Id: id, Config: { User: 'node', Entrypoint: ['untrusted-wrapper'], Env: [] } }]);
      return args.includes('/opt/worker-proof.mjs') ? JSON.stringify(proof) : '';
    };
    expect(verifyWorkerContainer('mutable:tag', execute)).toMatchObject({ ok: true, imageId: id });
    expect(commands).toHaveLength(3);
    for (const command of commands.slice(1)) {
      expect(command).toContain(id); expect(command).not.toContain('mutable:tag');
      expect(command).toContain('--pull=never'); expect(command).toContain('--read-only');
      expect(command[command.indexOf('--network') + 1]).toBe('none');
      expect(command[command.indexOf('--entrypoint') + 1]).toBe('node');
      expect(command[command.indexOf('--workdir') + 1]).toBe('/app');
    }
  });
  it.each([{ User: '0:0', Env: [] }, { User: '00', Env: [] }, { User: 'node', Env: ['NODE_OPTIONS=--require=/tmp/inject.cjs'] }, { User: 'node', Env: ['NODE_PATH=/external'] }])('rejects unsafe image configuration %j before execution', config => {
    const commands: string[][] = [];
    expect(() => verifyWorkerContainer('local:tag', (args: string[]) => {
      commands.push(args); return JSON.stringify([{ Id: 'sha256:' + 'b'.repeat(64), Config: config }]);
    })).toThrow();
    expect(commands).toHaveLength(1);
  });
  it('cannot accept config-only output as the complete protocol proof', () => {
    expect(() => verifyWorkerContainer('local:tag', (args: string[]) => args[0] === 'image'
      ? JSON.stringify([{ Id: 'sha256:' + 'b'.repeat(64), Config: { User: 'node' } }])
      : JSON.stringify({ ok: true, compiledCycle: 'configured' }))).toThrow('bounded capability protocol');
  });
});

describe('deployment validator restricted-container gate', () => {
  it('rejects skipped, after-push and ignored-failure container proof in real workflow validation', () => {
    const root = fixtureRoot();
    const source = readFileSync('scripts/validate-worker-deployment.ts', 'utf8');
    // Explicit validator inputs only, no repository scan, private environment or live Docker calls.
    for (const match of source.matchAll(/read\("([^"\n]+)"\)/g)) {
      const target = join(root, match[1]); mkdirSync(dirname(target), { recursive: true }); copyFileSync(match[1], target);
    }
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const validator = join(root, 'validator.cjs');
    writeFileSync(validator, compiled.replace('require("yaml")', `require(${JSON.stringify(resolve('node_modules/yaml/dist/index.js'))})`));
    const workflowPath = join(root, '.github/workflows/worker-image.yml'), original = readFileSync(workflowPath, 'utf8');
    const evaluate = () => {
      const result = spawnSync(process.execPath, [validator], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 15000 });
      expect(result.error).toBeUndefined();
      const report = JSON.parse(result.stdout);
      return report.checks.find((check: { name: string }) => check.name === 'Worker image requires restricted container proof before publishing').ok;
    };
    expect(evaluate()).toBe(true);
    for (const changed of [
      original.replace('id: container_proof', 'id: container_proof\n        if: false'),
      original.replace('id: container_proof', 'id: container_proof\n        continue-on-error: true'),
      original.replace('id: container_proof', 'id: container_proof\n        continue-on-error: ${{ true }}'),
      original.replace(' | tee worker-image-evidence/container-proof.log', ' | tee worker-image-evidence/container-proof.log || true'),
      original.replace('id: container_proof', 'id: temporary').replace('id: push_image', 'id: container_proof').replace('id: temporary', 'id: push_image'),
    ]) {
      writeFileSync(workflowPath, changed); expect(evaluate()).toBe(false);
    }
  });
});

describe('compiled runtime smoke credential isolation', () => {
  it('runs its actual child with synthetic settings and no inherited operator credentials or injection options', () => {
    const root = fixtureRoot();
    const script = join(root, 'scripts', 'smoke-worker-runtime.mjs');
    const bundle = join(root, 'dist', 'worker', 'run-diana-worker.cjs');
    mkdirSync(dirname(script), { recursive: true }); mkdirSync(dirname(bundle), { recursive: true });
    copyFileSync('scripts/smoke-worker-runtime.mjs', script);
    const forbidden = ['SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'QA_USER_EMAIL', 'QA_USER_PASSWORD', 'PRIVATE_UNKNOWN_KEY', 'NODE_OPTIONS', 'NODE_PATH', 'HTTPS_PROXY'];
    writeFileSync(bundle, `const assert = require('node:assert/strict');
      assert.deepEqual(${JSON.stringify(forbidden)}.filter(name => process.env[name] !== undefined), []);
      assert.equal(process.env.WORKER_API_TOKEN, 'runtime-smoke-token');
      assert.equal(process.env.OPENJARVIS_MODEL, 'synthetic-runtime-model');
      assert.equal(process.env.DIANA_WORKER_BASE_URL, 'http://127.0.0.1:3000');
      assert.deepEqual(process.argv.slice(2), ['--check-config']);
      console.log(JSON.stringify({ status: 'configured', sidecarProvider: 'openjarvis', sidecarBaseUrl: process.env.OPENJARVIS_BASE_URL, sidecarModel: process.env.OPENJARVIS_MODEL }));`);
    const env = { ...process.env, ...Object.fromEntries(forbidden.map(name => [name, `sentinel-${name}`])),
      NODE_OPTIONS: '--no-warnings', WORKER_API_TOKEN: 'operator-secret', OPENJARVIS_MODEL: 'operator-model', DIANA_WORKER_BASE_URL: 'https://operator.invalid' };
    const result = spawnSync(process.execPath, [script], { cwd: root, env, windowsHide: true, encoding: 'utf8', timeout: 15_000 });
    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toMatchObject({ ok: true, workerStatus: 'configured', nodeModulesPresent: false });
    expect(readFileSync(script, 'utf8')).toContain('timeout: 10_000');
  });
});
