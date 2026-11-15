/** Explicit offline input only; exclusive output directory. No provider or network path. */
import { closeSync, fstatSync, mkdirSync, openSync, readSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { integratedCanonical } from '../../lib/learning-engine/integrated-grounding-evaluation'
import { buildIntegratedReviewPacket } from '../../lib/learning-engine/integrated-review-packet'

export async function buildIntegratedReviewFiles(args: string[]) {
  if (args.length !== 8 || args[0] !== 'build' || args[2] !== '--manifest-sha256' || args[4] !== '--exclusion-sha256' || args[6] !== '--output') {
    throw new Error('Usage: integrated-review-packet.ts build <bundle.json> --manifest-sha256 <trusted hash> --exclusion-sha256 <trusted hash> --output <new-directory>')
  }
  const descriptor = openSync(resolve(args[1]), 'r')
  let text: string
  try {
    const info = fstatSync(descriptor)
    if (!info.isFile() || info.size > 16 * 1024 * 1024) throw new Error('Input must be a regular JSON file no larger than 16 MiB')
    const bytes = Buffer.alloc(info.size + 1)
    let offset = 0
    while (offset < bytes.length) {
      const count = readSync(descriptor, bytes, offset, bytes.length - offset, null)
      if (!count) break
      offset += count
    }
    if (offset !== info.size) throw new Error('Input changed while reading')
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, offset))
  } finally { closeSync(descriptor) }
  const result = await buildIntegratedReviewPacket(JSON.parse(text), { manifestSha256: args[3], exclusionSha256: args[5] }, randomBytes(32).toString('hex'))
  const output = resolve(args[7])
  mkdirSync(output) // Atomic exclusive claim. Never overwrite or resume a partially written packet.
  mkdirSync(resolve(output, 'reviewer'))
  mkdirSync(resolve(output, 'operator-only'))
  writeFileSync(resolve(output, 'reviewer', 'packet.json'), integratedCanonical(result.packet) + '\n', { flag: 'wx' })
  writeFileSync(resolve(output, 'operator-only', 'mapping.json'), integratedCanonical(result.mapping) + '\n', { flag: 'wx', mode: 0o600 })
  const receipt = { schema: 'integrated-review-packet-receipt-v1', packetSha256: result.packetSha256, mappingSha256: result.mappingSha256,
    denominator: result.packet.denominator, humanAuthorityVerified: false, productionEligible: false, thresholdMet: false }
  // Written last: absence means incomplete output. Hashes cover canonical values, not newline-terminated file bytes.
  writeFileSync(resolve(output, 'operator-only', 'completion.json'), integratedCanonical(receipt) + '\n', { flag: 'wx', mode: 0o600 })
  return receipt
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  buildIntegratedReviewFiles(process.argv.slice(2)).then(receipt => console.log(JSON.stringify(receipt)))
    .catch(error => { console.error(error instanceof Error ? error.message : 'Packet build rejected'); process.exitCode = 1 })
}
