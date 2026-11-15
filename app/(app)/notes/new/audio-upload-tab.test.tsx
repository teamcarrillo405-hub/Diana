// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AudioUploadTab } from "./audio-upload-tab";
import { triggerAudioTranscription, uploadNoteAudio } from "../actions";

vi.mock("../actions", () => ({
  triggerAudioTranscription: vi.fn(),
  uploadNoteAudio: vi.fn(),
}));

const getUserMedia = vi.fn();
const stream = {
  getTracks: () => [{ stop: vi.fn() }],
} as unknown as MediaStream;

class FakeMediaRecorder {
  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: MediaStream) {}

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio".repeat(400)], { type: "audio/webm" }) } as BlobEvent);
    this.onstop?.();
  }
}

describe("AudioUploadTab recording", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:note-audio"), revokeObjectURL: vi.fn() });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: getUserMedia.mockResolvedValue(stream) },
    });
    vi.mocked(uploadNoteAudio).mockResolvedValue({ ok: true, storageKey: "student/notes/note-1/audio/clip.webm" });
    vi.mocked(triggerAudioTranscription).mockResolvedValue({ ok: true, text: "Algebra notes", bodyTooShort: false });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("keeps recording until Stop, then saves audio before an explicit transcription", async () => {
    const onTranscriptReady = vi.fn();
    render(<AudioUploadTab mode="record" ensureNoteId={vi.fn().mockResolvedValue("note-1")} onTranscriptReady={onTranscriptReady} onClassSuggested={vi.fn()} classCandidates={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    await expect(screen.findByRole("button", { name: "Stop recording" })).resolves.toBeVisible();
    expect(screen.getByText("Recording audio")).toBeVisible();
    expect(screen.getByLabelText("Speak normally. The bars will move with your voice.")).toBeVisible();

    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeVisible();
    expect(uploadNoteAudio).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    await waitFor(() => expect(uploadNoteAudio).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Transcribe audio" })).toBeVisible();
    expect(triggerAudioTranscription).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Transcribe audio" }));
    await waitFor(() => expect(triggerAudioTranscription).toHaveBeenCalledTimes(1));
    expect(onTranscriptReady).toHaveBeenCalledWith("Algebra notes");
  });
});
