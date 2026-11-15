/** Explicit offline inputs only. No directory discovery, network or model execution. */
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { readIntegratedCaptureFile } from './integrated-capture-files';
import { assembleIntegratedDiagnosticReview } from '../../lib/learning-engine/integrated-diagnostic-review';
import { integratedProviderBytesSha256 as sha256 } from '../../lib/learning-engine/integrated-provider-response';
const file = z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const descriptor = z.object({ schema: z.literal('integrated-diagnostic-review-files-v1'), capture: file, preparedPlan: file, executionPlan: file, run: file,
  envelopes: z.array(file).max(100), providerRows: file.optional(), priorRuns: z.array(z.object({ label: z.string().min(1).max(100), artifactSha256: file.shape.sha256 }).strict()).max(10) }).strict();
export async function integratedDiagnosticReviewCli(args: string[]) {
  if (args.length !== 6 || args[0] !== 'assemble' || args[2] !== '--input-sha256' || args[4] !== '--output') throw new Error('Usage: assemble <explicit-files.json> --input-sha256 <trusted file digest> --output <new-directory>');
  const descriptorText = await readIntegratedCaptureFile(args[1], 128 * 1024);
  if (sha256(descriptorText) !== args[3]) throw new Error('descriptor_digest');
  const spec = descriptor.parse(JSON.parse(descriptorText));
  let totalBytes = 0;
  const load = async (item: z.infer<typeof file>) => {
    const text = await readIntegratedCaptureFile(item.path, 32 * 1024 * 1024);
    totalBytes += Buffer.byteLength(text, 'utf8'); if (totalBytes > 64 * 1024 * 1024) throw new Error('aggregate_input_limit');
    if (sha256(text) !== item.sha256) throw new Error('artifact_file_digest');
    return { text, sha256: item.sha256 };
  };
  const input = { schema: 'integrated-diagnostic-review-input-v1', capture: await load(spec.capture), preparedPlan: await load(spec.preparedPlan),
    executionPlan: await load(spec.executionPlan), run: await load(spec.run), envelopes: [] as Array<{ text: string; sha256: string }>,
    providerRows: spec.providerRows ? await load(spec.providerRows) : undefined, priorRuns: spec.priorRuns };
  for (const item of spec.envelopes) input.envelopes.push(await load(item));
  const result = assembleIntegratedDiagnosticReview(input, randomBytes(32).toString('hex'));
  const output = resolve(args[5]); await mkdir(output, { recursive: false, mode: 0o700 });
  await mkdir(join(output, 'reviewer'), { mode: 0o700 }); await mkdir(join(output, 'operator-only'), { mode: 0o700 });
  const packetText = JSON.stringify(result.packet, null, 2) + '\n', mappingText = JSON.stringify(result.mapping, null, 2) + '\n';
  await writeFile(join(output, 'reviewer/packet.json'), packetText, { flag: 'wx', mode: 0o600 });
  await writeFile(join(output, 'operator-only/mapping.json'), mappingText, { flag: 'wx', mode: 0o600 });
  const receipt = { schema: 'integrated-diagnostic-review-completion-v1', inputDescriptorSha256: args[3], packetFileSha256: sha256(packetText), mappingFileSha256: sha256(mappingText),
    denominator: result.packet.denominator, releasedResponses: result.packet.releasedResponses, unscheduled: result.packet.unscheduled,
    rawProviderReceiptsVerified: result.packet.rawProviderReceiptsVerified, priorRunsMerged: false, semanticAcceptance: false, productionEligible: false, thresholdMet: false };
  await writeFile(join(output, 'completion.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return receipt;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  integratedDiagnosticReviewCli(process.argv.slice(2)).then(receipt => console.log(JSON.stringify(receipt))).catch(() => { console.error('diagnostic_review_assembly_rejected'); process.exitCode = 1; });
}
