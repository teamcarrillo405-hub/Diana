import { POST as runBufferedStudyBuddy } from "../route";

import { parseTutorResponseEvidence } from "@/lib/ai/tutor-response-evidence";
import { parseVisibleTutorProviderState } from "@/lib/assignment-help/provider-state";
import type {
  StudyBuddyRouteResponse,
  StudyBuddyStreamEvent,
} from "@/lib/assignment-workspace-contracts";
import type { StudyHelperResult } from "@/lib/integrations/diana-study-helper-sidecar";

const encoder = new TextEncoder();

function encodeEvent(event: StudyBuddyStreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

function responseText(response: StudyHelperResult): string {
  return [
    response.main,
    Array.isArray(response.steps) && response.steps.length > 0 ? `Next move: ${response.steps[0]}` : "",
  ].filter(Boolean).join("\n\n");
}

function textChunks(value: string): string[] {
  const words = value.split(/(\s+)/u).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    current += word;
    if (current.length >= 28) {
      chunks.push(current);
      current = "";
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeEvent({ type: "thinking" }));
      try {
        const bufferedRequest = new Request(request.url.replace(/\/stream(?:\?.*)?$/u, ""), {
          method: "POST",
          headers,
          body: rawBody,
        });
        const bufferedResponse = await runBufferedStudyBuddy(bufferedRequest);
        const payload = await bufferedResponse.json() as StudyBuddyRouteResponse;
        const evidence = parseTutorResponseEvidence("evidence" in payload ? payload.evidence : null);
        const providerState = parseVisibleTutorProviderState(
          "providerState" in payload ? payload.providerState : null,
        );
        const completeEnvelope = payload.ok && payload.response && evidence && providerState
          ? { response: payload.response, evidence, providerState }
          : null;

        if (!bufferedResponse.ok || !completeEnvelope) {
          const error = providerState?.visible
            ? providerState.message ?? "Diana was interrupted before the reply finished."
            : !payload.ok
              ? payload.error
              : "Diana could not verify the tutor response envelope. Please try again.";
          if (
            bufferedResponse.status === 429 ||
            bufferedResponse.status >= 500 ||
            (bufferedResponse.ok && payload.ok)
          ) {
            const retryAfter = Number(bufferedResponse.headers.get("Retry-After") ?? 0);
            controller.enqueue(encodeEvent({
              type: "retryable_error",
              error,
              retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
              evidence: evidence ?? undefined,
              providerState: providerState ?? undefined,
            }));
          } else {
            controller.enqueue(encodeEvent({
              type: "interrupted",
              error,
              evidence: evidence ?? undefined,
              providerState: providerState ?? undefined,
            }));
          }
          return;
        }

        if (!completeEnvelope.providerState.visible) {
          for (const delta of textChunks(responseText(completeEnvelope.response))) {
            controller.enqueue(encodeEvent({ type: "streaming", delta }));
          }
        }
        controller.enqueue(encodeEvent({ type: "complete", ...completeEnvelope }));
      } catch {
        controller.enqueue(encodeEvent({
          type: "retryable_error",
          error: "Diana was interrupted before the reply finished. Your message is still here.",
        }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
