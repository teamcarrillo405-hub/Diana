import { NextResponse } from 'next/server';
import { createLearningClient } from '@/lib/learning-engine/server';
import { captureIntegratedAssignmentBatch } from '@/lib/learning-engine/integrated-assignment-capture';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (process.env.DIANA_INTEGRATED_RETRIEVAL_CAPTURE_ENABLED !== 'true') return NextResponse.json({ error: 'Not available.' }, { status: 404, headers });
  const client = await createLearningClient();
  const session = await client.auth.getUser();
  const allowlist = (process.env.DIANA_INTEGRATED_RETRIEVAL_OPERATOR_IDS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  if (session.error || !session.data.user || !allowlist.includes(session.data.user.id)) return NextResponse.json({ error: 'Not available.' }, { status: 403, headers });
  try {
    // A bounded stream read avoids trusting Content-Length or allocating an unbounded body.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('body_required');
    const parts: Uint8Array[] = []; let bytes = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 128_000) throw new Error('body_limit'); parts.push(part.value); } }
    finally { await reader.cancel(); }
    const body = JSON.parse(Buffer.concat(parts).toString('utf8')) as unknown;
    if (!Array.isArray(body)) throw new Error('body_shape');
    const result = await captureIntegratedAssignmentBatch(client, body);
    return NextResponse.json(result, { headers });
  } catch { return NextResponse.json({ error: 'Capture request could not be completed.' }, { status: 400, headers }); }
}
