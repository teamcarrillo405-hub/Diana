/** Offline only. Reads explicit bundle path, never searches corpora or dispatches models. */
import { openSync, fstatSync, readSync, closeSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { integratedCanonical, verifyIntegratedEvaluation } from '../../lib/learning-engine/integrated-grounding-evaluation'

export async function verifyIntegratedFile(args: string[]) {
  if (args.length !== 7 || args[0] !== 'verify' || args[2] !== '--manifest-sha256' || args[4] !== '--exclusion-sha256') {
    throw new Error('Usage: integrated-grounding-evaluation.ts verify <bundle.json> --manifest-sha256 <trusted hash> --exclusion-sha256 <trusted hash> <new-report.json>')
  }
  const input = resolve(args[1]), output = resolve(args[6])
  if (input === output) throw new Error('Input and output must differ')
  const descriptor = openSync(input, 'r')
  let bytes: Buffer
  try {
    const info = fstatSync(descriptor)
    if (!info.isFile() || info.size > 16 * 1024 * 1024) throw new Error('Input must be a regular JSON file no larger than 16 MiB')
    const buffer = Buffer.alloc(info.size + 1)
    let offset = 0
    while (offset < buffer.length) {
      const count = readSync(descriptor, buffer, offset, buffer.length - offset, null)
      if (!count) break
      offset += count
    }
    if (offset !== info.size) throw new Error('Input changed while reading')
    bytes = buffer.subarray(0, offset)
  } finally { closeSync(descriptor) }
  const report = await verifyIntegratedEvaluation(JSON.parse(bytes.toString('utf8')), { manifestSha256: args[3], exclusionSha256: args[5] })
  writeFileSync(output, integratedCanonical(report) + '\n', { flag: 'wx' })
  return report
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  verifyIntegratedFile(process.argv.slice(2)).then(report => {
    console.log(JSON.stringify({ status: report.status, denominator: report.denominator, passes: report.passes, thresholdMet: report.thresholdMet }))
    if (report.status !== 'complete' || !report.thresholdMet) process.exitCode = 1
  }).catch(error => { console.error(error instanceof Error ? error.message : 'Offline verification rejected'); process.exitCode = 1 })
}
