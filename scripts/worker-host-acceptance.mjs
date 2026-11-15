// Local Docker lifecycle proof, no registry, provider or production requests.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const image = 'sha256:cad8278e6c62fadedaad6bef0e4d6a57be925870dea63c2b37504020713db7be';
const docker = process.env.DIANA_DOCKER_EXE ?? 'C:/Users/glcar/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const output = resolve(process.argv[2] ?? '');
assert(process.argv.length === 3 && output.startsWith(resolve('artifacts/learning-engine/release') + '\\'), 'Exclusive release output directory required');
await mkdir(output); // Existing evidence must never be overwritten.
const name = `diana-host-proof-${Date.now()}`;
function run(args) {
  const result = spawnSync(docker, args, { encoding: 'utf8', windowsHide: true, timeout: 45000 });
  if (result.status !== 0) throw new Error(`Docker ${args[0]} failed: ${result.stderr || result.error?.message}`);
  return result.stdout;
}
let created = false;
try {
  assert.equal(JSON.parse(run(['image', 'inspect', image]))[0].Id, image);
  run(['run', '-d', '--name', name, '--pull=never', '--restart', 'unless-stopped', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--mount', `type=bind,source=${resolve('scripts/worker-host-lifecycle-fixture.mjs')},target=/opt/host-proof.mjs,readonly`,
    '--mount', `type=bind,source=${output},target=/evidence`, '--env', `PROOF_IMAGE_ID=${image}`, '--entrypoint', 'node', image, '/opt/host-proof.mjs']);
  created = true;
  let state;
  for (let tries = 0; tries < 100; tries++) {
    await delay(500);
    try { state = JSON.parse(await readFile(resolve(output, 'state.json'), 'utf8')); } catch { continue; }
    if (state.failure) throw new Error(state.failure);
    if (state.accepted) break;
  }
  assert.equal(state?.accepted, true, 'Lifecycle fixture did not complete');
  const info = JSON.parse(run(['inspect', name]))[0];
  assert.equal(info.Image, image); assert(info.RestartCount >= 1); assert.equal(info.State.Running, true);
  const receipt = { ok: true, at: new Date().toISOString(), image, container: name, restartCount: info.RestartCount, automaticCrashRestart: true,
    readOnlyRoot: info.HostConfig.ReadonlyRootfs, network: info.HostConfig.NetworkMode, restartPolicy: info.HostConfig.RestartPolicy.Name,
    completedJobs: state.completed, cancelledBeforeAuthorization: state.denied, syntheticProviderCalls: state.providerCalls,
    realModelCalls: 0, browserRequired: false, healthPassed: state.healthPassed, unauthenticatedRejected: state.unauthenticatedRejected,
    liveDatabaseLeaseRecoveryTested: false, inFlightCancellationTested: false, gpuInferenceTested: false, productionEligible: false };
  run(['stop', '--time', '10', name]);
  receipt.stopped = JSON.parse(run(['inspect', name]))[0].State.Running === false;
  await writeFile(resolve(output, 'acceptance.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(receipt));
} catch (error) {
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ at: new Date().toISOString(), error: error.message }), { flag: 'wx' });
  throw error;
} finally { if (created) run(['stop', '--time', '10', name]); }
