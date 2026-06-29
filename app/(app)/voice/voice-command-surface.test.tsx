// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VoiceCommandSurface } from "./voice-command-surface";

vi.mock("@/components/voice-textarea", () => ({
  VoiceTextarea: ({ value, onChange, placeholder }: {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Voice capture"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event)}
    />
  ),
}));

describe("VoiceCommandSurface sidecar candidate", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the candidate action hidden when the server flag is off", () => {
    render(<VoiceCommandSurface />);

    expect(screen.queryByRole("button", { name: "Ask Diana" })).not.toBeInTheDocument();
  });

  it("asks Diana through the Diana API route when enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        response: "Name the assignment and choose the first source line.",
        trace: {
          readOnly: true,
          policyMode: "student_runtime",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<VoiceCommandSurface sidecarEnabled />);
    fireEvent.change(screen.getByLabelText("Voice capture"), {
      target: { value: "I do not know where to start this paragraph." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask Diana" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/diana/voice-candidate",
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(screen.getByText("Name the assignment and choose the first source line.")).toBeInTheDocument();
    });
  });

  it("shows a queued state when Diana moves the request to the worker pool", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          ok: true,
          queued: true,
          trace: {
            traceId: "dw-queued",
            readOnly: true,
            policyMode: "student_runtime",
          },
        }),
      })
      .mockImplementationOnce(() => new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchMock);

    render(<VoiceCommandSurface sidecarEnabled />);
    fireEvent.change(screen.getByLabelText("Voice capture"), {
      target: { value: "I need a first step for this essay." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask Diana" }));

    await waitFor(() => {
      expect(screen.getByText("Diana is preparing that request.")).toBeInTheDocument();
    });
  });

  it("polls Diana for a completed queued candidate", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          ok: true,
          queued: true,
          trace: {
            traceId: "dw-done",
            readOnly: true,
            policyMode: "student_runtime",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          status: "succeeded",
          response: "Open the rubric and name the first target.",
          trace: {
            traceId: "dw-done",
            readOnly: true,
            policyMode: "student_runtime",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<VoiceCommandSurface sidecarEnabled />);
    fireEvent.change(screen.getByLabelText("Voice capture"), {
      target: { value: "I need a first step for this essay." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask Diana" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/diana/voice-candidate/status?traceId=dw-done");
      expect(screen.getByText("Open the rubric and name the first target.")).toBeInTheDocument();
    });
  });
});
