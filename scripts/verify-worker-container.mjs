// Real image check; all protocol traffic stays on the container's own loopback.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
function run(args, timeout = 45000) {
  const child = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 1024 * 1024 });
  if (child.status !== 0) throw new Error('Container verification command failed: ' + (child.stderr || child.error?.message || child.stdout));
  return child.stdout;
}
export function verifyWorkerContainer(image, execute = run) {
if (!image || !/^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,249}$/.test(image)) throw new Error('One explicit image reference is required');
const metadata = JSON.parse(execute(['image', 'inspect', image]))[0];
if (!metadata?.Id?.match(/^sha256:[a-f0-9]{64}$/) || typeof metadata.Config?.User !== 'string' || !metadata.Config.User || /^(root|0+)(:|$)/.test(metadata.Config.User)) throw new Error('Image must have an immutable identity and non-root runtime user');
if ((metadata.Config.Env ?? []).some(value => /^(NODE_OPTIONS|NODE_PATH)=.+/.test(value))) throw new Error('Image must not inject Node loaders or external module paths');
// Execute the inspected object, never a tag that can change between inspection and run.
// --pull=never also prevents a missing local image from causing implicit registry IO.
const security = ['--rm', '--pull=never', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--entrypoint', 'node', '--workdir', '/app'];
execute(['run', ...security, metadata.Id, '-e', "const fs=require('node:fs');if(process.getuid()===0||fs.existsSync('/app/node_modules')||fs.existsSync('/node_modules'))process.exit(1)"]);
const proof = execute(['run', ...security, '--mount', `type=bind,source=${resolve('scripts/verify-worker-credential-boundary.mjs')},target=/opt/worker-proof.mjs,readonly`, metadata.Id, '/opt/worker-proof.mjs']);
const lines = proof.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
if (!lines.some(item => item.ok === true && item.compiledCycle === 'completed' && item.network === 'loopback_synthetic_only' && item.privateContentLogged === false && item.outputTokenLimit === 500 && JSON.stringify(item.credentialNames) === '["WORKER_API_TOKEN"]')) throw new Error('Container did not complete the bounded capability protocol');
return { ok: true, imageId: metadata.Id, runtimeUser: metadata.Config.User, runtimeNodeModules: false,
  network: 'none_with_container_loopback', readOnlyRoot: true, compiledCycle: 'completed', outputTokenLimit: 500, privateContentLogged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) throw new Error('One explicit image reference is required');
  console.log(JSON.stringify(verifyWorkerContainer(process.argv[2])));
}
