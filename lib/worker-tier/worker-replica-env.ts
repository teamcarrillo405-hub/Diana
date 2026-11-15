/** Replica children inherit OS execution settings, never operator credentials. */
export function workerReplicaEnvironment(parent: NodeJS.ProcessEnv, settings: {
  token: string; sidecarBaseUrl: string; model: string; imageSha?: string;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
  const osNames = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'os', 'processor_architecture', 'number_of_processors']);
  for (const [name, value] of Object.entries(parent)) if (osNames.has(name.toLowerCase()) && value !== undefined) env[name] = value;
  return { ...env, WORKER_API_TOKEN: settings.token, OPENJARVIS_BASE_URL: settings.sidecarBaseUrl, OPENJARVIS_MODEL: settings.model,
    ...(settings.imageSha ? { DIANA_WORKER_IMAGE_SHA: settings.imageSha } : {}) };
}
