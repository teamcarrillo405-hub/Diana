import { NextResponse } from 'next/server';
import { hasValidWorkerBearer } from '@/lib/worker-tier/worker-api-auth';
import { createAiServiceClient } from '@/lib/supabase/ai-service';
import { authorizeWorkerExecution, WorkerExecutionError } from '@/lib/worker-tier/worker-execution-server';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!hasValidWorkerBearer(request)) return NextResponse.json({ ok: false }, { status: 401, headers });
  try {
    const client = createAiServiceClient();
    if (!client) throw new WorkerExecutionError(503);
    const permit = await authorizeWorkerExecution(client, await request.json());
    return NextResponse.json({ ok: true, permit }, { headers });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error instanceof WorkerExecutionError ? error.status : 503, headers });
  }
}
export const runtime = 'nodejs';
