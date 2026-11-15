/** Explicit metadata input only. No corpus discovery, network, model or source-file loading. */
import { openSync, fstatSync, readSync, closeSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inspectIntegratedFamilies } from '../../lib/learning-engine/integrated-family-provenance'

export async function inspectIntegratedFamilyFile(args: string[]) {
  if (args.length !== 5 || args[0] !== 'inspect' || args[2] !== '--submission-sha256') {
    throw new Error('Usage: integrated-family-provenance.ts inspect <metadata.json> --submission-sha256 <trusted canonical digest> <new-report.json>')
  }
  const input = resolve(args[1]), output = resolve(args[4])
  if (input === output) throw new Error('Input and output must differ')
  const fd = openSync(input, 'r')
  let bytes: Buffer
  try {
    const info = fstatSync(fd)
    if (!info.isFile() || info.size > 16 * 1024 * 1024) throw new Error('Input must be a regular JSON file no larger than 16 MiB')
    const buffer = Buffer.alloc(info.size + 1)
    let offset = 0
    while (offset < buffer.length) {
      const count = readSync(fd, buffer, offset, buffer.length - offset, null)
      if (!count) break
      offset += count
    }
    if (offset !== info.size) throw new Error('Input changed while reading')
    bytes = buffer.subarray(0, offset)
  } finally { closeSync(fd) }
  const report = await inspectIntegratedFamilies(JSON.parse(bytes.toString('utf8')), args[3])
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  return report
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  inspectIntegratedFamilyFile(process.argv.slice(2)).then(report => {
    console.log(JSON.stringify({ status: report.status, evaluationCases: report.caseRows.filter(c => c.role === 'candidate_evaluation').length,
      thresholdMet: false, productionEligible: false }))
    if (report.status !== 'submitted_metadata_consistent') process.exitCode = 1
  }).catch(error => { console.error(error instanceof Error ? error.message : 'Metadata rejected'); process.exitCode = 1 })
}
