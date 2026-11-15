import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { workerReplicaEnvironment } from './worker-replica-env';

describe('replica process credential isolation', () => {
  it('excludes parent server, QA and injection credentials in the actual child environment', () => {
    const forbidden = ['SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'QA_USER_EMAIL', 'QA_USER_PASSWORD', 'NODE_OPTIONS', 'NODE_PATH', 'HTTP_PROXY', 'PRIVATE_UNKNOWN_KEY'];
    const parent = { ...process.env, ...Object.fromEntries(forbidden.map(name => [name, `sentinel-${name}`])) };
    const env = workerReplicaEnvironment(parent, { token: 'synthetic-worker-token', sidecarBaseUrl: 'http://127.0.0.1:1', model: 'synthetic-model' });
    const child = spawnSync(process.execPath, ['-e', `process.stdout.write(JSON.stringify({ leaked: ${JSON.stringify(forbidden)}.filter(name=>process.env[name]!==undefined), token: process.env.WORKER_API_TOKEN, model: process.env.OPENJARVIS_MODEL }))`], { env, encoding: 'utf8', windowsHide: true });
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout)).toEqual({ leaked: [], token: 'synthetic-worker-token', model: 'synthetic-model' });
  });
});
