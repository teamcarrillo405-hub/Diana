import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
/** Bounded descriptor read, rejects symlinks/replacements and concurrent changes. */
export async function readIntegratedCaptureFile(path: string, limit: number) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > limit) throw new Error('input_file_rejected');
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const initial = await handle.stat();
    if (!initial.isFile() || initial.ino !== before.ino || initial.dev !== before.dev || initial.size > limit) throw new Error('input_file_changed');
    const buffer = Buffer.alloc(limit + 1); let size = 0;
    while (size < buffer.length) { const read = await handle.read(buffer, size, buffer.length - size, null); if (!read.bytesRead) break; size += read.bytesRead; }
    const final = await handle.stat();
    if (size > limit || size !== initial.size || final.size !== initial.size || final.mtimeMs !== initial.mtimeMs || final.ctimeMs !== initial.ctimeMs) throw new Error('input_file_changed');
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size));
  } finally { await handle.close(); }
}
