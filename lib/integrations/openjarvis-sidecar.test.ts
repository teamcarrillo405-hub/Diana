import { describe, expect, it } from "vitest";
import {
  DEFAULT_CODEX_OAUTH_SIDECAR,
  DEFAULT_OLLAMA_SIDECAR,
  createCodexOAuthExecArgs,
  createSidecarChatRequest,
  createStudentDianaVoiceSidecarRequest,
  localSidecarBoundaryIssues,
  parseSidecarText,
  sidecarHealthUrl,
  sidecarTransport,
} from "./openjarvis-sidecar";
import { createPaperclipGstackDashboardQaRequest } from "./command-center-handoff";

describe("OpenJarvis-compatible local sidecar", () => {
  it("creates a Diana-originated student runtime voice sidecar request", () => {
    const request = createStudentDianaVoiceSidecarRequest({
      id: "student-voice-001",
      goalId: "student-session-001",
    });

    expect(request.sourceSystem).toBe("diana");
    expect(request.targetSystem).toBe("openjarvis");
    expect(request.constraints.policyMode).toBe("student_runtime");
    expect(request.constraints.privateLocalOnly).toBe(true);
    expect(request.constraints.allowedDianaTools).toContain("transcribe_voice_note");
    expect(localSidecarBoundaryIssues(request)).toEqual([]);
  });

  it("rejects Paperclip gstack work as a student sidecar request", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-010",
      goalId: "goal-diana-command-center",
    });

    expect(localSidecarBoundaryIssues(request)).toContain("Local student sidecar requests must target OpenJarvis.");
  });

  it("builds Ollama health and chat requests", () => {
    expect(sidecarHealthUrl(DEFAULT_OLLAMA_SIDECAR)).toBe("http://127.0.0.1:11434/api/tags");

    const request = createSidecarChatRequest(DEFAULT_OLLAMA_SIDECAR, [
      { role: "system", content: "You are Diana." },
      { role: "user", content: "Can I talk to Diana locally?" },
    ]);

    expect(request.url).toBe("http://127.0.0.1:11434/api/generate");
    expect(JSON.parse(request.init.body)).toMatchObject({
      model: "llama3.2:3b",
      stream: false,
    });
  });

  it("builds OpenAI-compatible OpenJarvis chat requests", () => {
    const request = createSidecarChatRequest(
      {
        provider: "openjarvis",
        baseUrl: "http://127.0.0.1:8000/",
        model: "local-default",
      },
      [{ role: "user", content: "hello" }],
    );

    expect(request.url).toBe("http://127.0.0.1:8000/v1/chat/completions");
    expect(JSON.parse(request.init.body)).toMatchObject({
      model: "local-default",
      messages: [{ role: "user", content: "hello" }],
    });
  });

  it("models Codex OAuth as a CLI worker transport", () => {
    expect(sidecarTransport("codex")).toBe("codex_cli");
    expect(() => sidecarHealthUrl(DEFAULT_CODEX_OAUTH_SIDECAR)).toThrow(/CLI transport/);
    expect(createCodexOAuthExecArgs(DEFAULT_CODEX_OAUTH_SIDECAR, "Say ok.")).toEqual([
      "exec",
      "--ephemeral",
      "--sandbox",
      "read-only",
      "--model",
      "gpt-5.5",
      "Say ok.",
    ]);
  });

  it("parses Ollama and OpenAI-compatible text responses", () => {
    expect(parseSidecarText("ollama", { response: "local ok" })).toBe("local ok");
    expect(
      parseSidecarText("openjarvis", {
        choices: [{ message: { content: "openjarvis ok" } }],
      }),
    ).toBe("openjarvis ok");
  });
});
