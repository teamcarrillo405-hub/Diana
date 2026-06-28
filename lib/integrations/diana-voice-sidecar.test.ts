import { describe, expect, it, vi } from "vitest";
import {
  buildDianaVoiceSidecarMessages,
  createDianaVoiceCandidate,
  createDianaVoiceCandidateAuditPayload,
  isDianaVoiceSidecarEnabled,
  normalizeDianaVoiceCandidateResponse,
  normalizeDianaVoiceCandidateInput,
  resolveDianaVoiceSidecarConfig,
} from "./diana-voice-sidecar";

describe("Diana voice sidecar candidate", () => {
  it("is off unless the server flag is explicitly enabled", () => {
    expect(isDianaVoiceSidecarEnabled(testEnv({}))).toBe(false);
    expect(isDianaVoiceSidecarEnabled(testEnv({ DIANA_OPENJARVIS_SIDECAR_ENABLED: "true" }))).toBe(true);
    expect(isDianaVoiceSidecarEnabled(testEnv({ DIANA_OPENJARVIS_SIDECAR_ENABLED: "1" }))).toBe(true);
    expect(isDianaVoiceSidecarEnabled(testEnv({ DIANA_VOICE_SIDECAR_ENABLED: "1" }))).toBe(true);
  });

  it("resolves the OpenJarvis sidecar URL and model from worker environment", () => {
    expect(resolveDianaVoiceSidecarConfig(testEnv({
      OPENJARVIS_BASE_URL: "http://openjarvis.service:8000",
      OPENJARVIS_MODEL: "llama3.2:8b",
    }))).toMatchObject({
      provider: "openjarvis",
      baseUrl: "http://openjarvis.service:8000",
      model: "llama3.2:8b",
    });
  });

  it("normalizes only short voice or typed input", () => {
    expect(normalizeDianaVoiceCandidateInput({ transcript: "  Start my essay  ", source: "voice" })).toEqual({
      transcript: "Start my essay",
      source: "voice",
      assignmentId: null,
    });
    expect(normalizeDianaVoiceCandidateInput({ transcript: "x" })).toBeNull();
    expect(normalizeDianaVoiceCandidateInput({ transcript: "x".repeat(2001) })).toBeNull();
  });

  it("builds messages that keep the local worker as a candidate source", () => {
    const messages = buildDianaVoiceSidecarMessages({
      transcript: "I need help starting a paragraph about theme.",
      source: "typed",
    });

    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("candidate next move");
    expect(messages[0]?.content).toContain("Do not write final homework");
    expect(messages[1]?.content).toContain("Student text or transcript");
  });

  it("returns a read-only student-runtime trace from the sidecar", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Name the claim, then choose one source line to support it." } }],
      }),
    });

    const result = await createDianaVoiceCandidate({
      input: {
        transcript: "I have evidence but need a first move.",
        source: "typed",
      },
      config: {
        provider: "openjarvis",
        baseUrl: "http://127.0.0.1:8000",
        model: "llama3.2:3b",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/chat/completions",
      expect.objectContaining({ method: "POST", signal: controller.signal }),
    );
    expect(result.response).toContain("Name the claim");
    expect(result.trace).toMatchObject({
      worker: "openjarvis",
      policyMode: "student_runtime",
      readOnly: true,
    });
    expect(result.trace.allowedDianaTools).toContain("transcribe_voice_note");
    expect(result.trace.allowedDianaTools).not.toContain("start_focus_session");
  });

  it("keeps candidate responses to one question and under the display cap", () => {
    const response = normalizeDianaVoiceCandidateResponse(
      "  What claim are you trying to make? What evidence are you using?  ",
    );
    expect(response).toBe("What claim are you trying to make?");

    const longResponse = normalizeDianaVoiceCandidateResponse(Array.from({ length: 90 }, (_, index) => `word${index}`).join(" "));
    expect(longResponse.split(" ")).toHaveLength(80);
    expect(longResponse.endsWith("...")).toBe(true);
  });

  it("creates a compact authorship payload", () => {
    const payload = createDianaVoiceCandidateAuditPayload(
      { transcript: "Need a next step.", source: "typed" },
      {
        response: "Open the rubric and name the target.",
        trace: {
          worker: "openjarvis",
          provider: "openjarvis",
          model: "llama3.2:3b",
          policyMode: "student_runtime",
          readOnly: true,
          allowedDianaTools: ["read_due_today"],
        },
      },
    );

    expect(payload).toMatchObject({
      source: "typed",
      transcriptChars: 17,
      responseChars: 36,
    });
  });
});

function testEnv(value: Record<string, string>): NodeJS.ProcessEnv {
  return value as unknown as NodeJS.ProcessEnv;
}
