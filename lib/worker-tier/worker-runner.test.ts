import { describe, expect, it, vi } from "vitest";
import { runOneDianaWorkerCycle, type DianaWorkerConfig } from "./worker-runner";

const config: DianaWorkerConfig = {
  baseUrl: "http://diana.test",
  token: "worker-secret",
  workerId: "worker-a",
  imageSha: "image-sha-a",
  queueName: "student-ai-candidate",
  leaseSeconds: 45,
};

describe("Diana worker runner", () => {
  it("returns idle when the queue has no job", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      job: null,
    }), { status: 200 }));

    await expect(runOneDianaWorkerCycle({ config, fetchImpl })).resolves.toEqual({ status: "idle" });
    expect(fetchImpl).toHaveBeenCalledWith(new URL("/api/workers/claim", config.baseUrl), expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer worker-secret" }),
    }));
  });

  it("executes and completes a claimed Diana voice candidate job", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        job: {
          traceId: "dw-1",
          tenantId: "personal:student-1",
          feature: "diana.voice_candidate",
          payload: {
            input: {
              transcript: "I need a first step.",
              source: "typed",
              assignmentId: null,
            },
          },
          constraints: {
            budget: {
              timeoutMs: 30_000,
            },
          },
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const executeVoiceCandidate = vi.fn().mockResolvedValue({
      response: "Open the rubric and name the first target.",
      trace: {
        provider: "openjarvis",
        model: "llama3.2:3b",
      },
    });

    const result = await runOneDianaWorkerCycle({
      config,
      fetchImpl,
      executeVoiceCandidate,
    });

    expect(result).toMatchObject({
      status: "completed",
      traceId: "dw-1",
      tenantId: "personal:student-1",
      responseChars: 42,
    });
    expect(executeVoiceCandidate).toHaveBeenCalledWith({
      input: {
        transcript: "I need a first step.",
        source: "typed",
        assignmentId: null,
      },
      signal: expect.any(AbortSignal),
    });
    const completeBody = JSON.parse(fetchImpl.mock.calls[1][1].body as string);
    expect(completeBody).toMatchObject({
      traceId: "dw-1",
      tenantId: "personal:student-1",
      status: "succeeded",
      result: {
        response: "Open the rubric and name the first target.",
        responseChars: 42,
        provider: "openjarvis",
        model: "llama3.2:3b",
        workerId: "worker-a",
        imageSha: "image-sha-a",
        durationMs: expect.any(Number),
      },
    });
  });

  it("reports an error completion for invalid claimed payloads", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        job: {
          traceId: "dw-2",
          tenantId: "personal:student-1",
          feature: "diana.voice_candidate",
          payload: { input: { transcript: "" } },
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const executeVoiceCandidate = vi.fn();

    const result = await runOneDianaWorkerCycle({
      config,
      fetchImpl,
      executeVoiceCandidate,
    });

    expect(result).toMatchObject({
      status: "error",
      traceId: "dw-2",
      tenantId: "personal:student-1",
      errorSummary: "Worker job payload did not contain a valid Diana voice candidate input.",
    });
    expect(executeVoiceCandidate).not.toHaveBeenCalled();
    const completeBody = JSON.parse(fetchImpl.mock.calls[1][1].body as string);
    expect(completeBody).toMatchObject({
      traceId: "dw-2",
      tenantId: "personal:student-1",
      status: "error",
      errorSummary: "Worker job payload did not contain a valid Diana voice candidate input.",
    });
  });

  it("honors claimed job timeout constraints", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        job: {
          traceId: "dw-3",
          tenantId: "personal:student-1",
          feature: "diana.voice_candidate",
          payload: {
            input: {
              transcript: "Please help me start.",
              source: "typed",
              assignmentId: null,
            },
          },
          constraints: {
            budget: {
              timeoutMs: 1,
            },
          },
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const executeVoiceCandidate = vi.fn(({ signal }: { signal?: AbortSignal }) => {
      expect(signal).toBeInstanceOf(AbortSignal);
      return new Promise<never>(() => undefined);
    });

    const result = await runOneDianaWorkerCycle({
      config,
      fetchImpl,
      executeVoiceCandidate,
    });

    expect(result).toMatchObject({
      status: "error",
      traceId: "dw-3",
      tenantId: "personal:student-1",
      errorSummary: "Worker execution timed out.",
    });
    const completeBody = JSON.parse(fetchImpl.mock.calls[1][1].body as string);
    expect(completeBody).toMatchObject({
      traceId: "dw-3",
      tenantId: "personal:student-1",
      status: "error",
      errorSummary: "Worker execution timed out.",
    });
  });
});
