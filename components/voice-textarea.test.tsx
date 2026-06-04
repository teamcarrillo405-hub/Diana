// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { VoiceTextarea } from "./voice-textarea";

vi.mock("@/components/voice-textarea-actions", () => ({
  uploadVoiceBlob: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

const fakeTrack = {
  stop: vi.fn(),
};

const fakeStream = {
  getTracks: () => [fakeTrack],
  getAudioTracks: () => [{ ...fakeTrack, label: "USB classroom mic" }],
} as unknown as MediaStream;

const devices = [
  {
    deviceId: "default",
    groupId: "group-1",
    kind: "audioinput",
    label: "Default microphone",
    toJSON: () => ({}),
  },
  {
    deviceId: "usb-mic",
    groupId: "group-2",
    kind: "audioinput",
    label: "USB classroom mic",
    toJSON: () => ({}),
  },
] as MediaDeviceInfo[];

describe("VoiceTextarea microphone controls", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue(devices),
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows microphone options when device status is enabled", async () => {
    render(<VoiceTextarea provider="openai" showDeviceStatus aria-label="Voice note" />);

    expect(screen.getByText("Microphone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check mic/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "USB classroom mic" })).toBeInTheDocument();
    });
  });

  it("requests microphone permission when the student checks the mic", async () => {
    render(<VoiceTextarea provider="openai" showDeviceStatus aria-label="Voice note" />);

    fireEvent.click(screen.getByRole("button", { name: /check mic/i }));

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(screen.getByText(/Testing USB classroom mic/)).toBeInTheDocument();
      expect(fakeTrack.stop).not.toHaveBeenCalled();
    });
  });

  it("tests the selected microphone without stopping it immediately", async () => {
    render(<VoiceTextarea provider="openai" showDeviceStatus aria-label="Voice note" />);

    const input = await screen.findByRole("combobox", { name: /input/i });
    fireEvent.change(input, { target: { value: "usb-mic" } });
    fireEvent.click(screen.getByRole("button", { name: /check mic/i }));

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { exact: "usb-mic" } },
      });
      expect(screen.getByText(/Testing USB classroom mic/)).toBeInTheDocument();
      expect(fakeTrack.stop).not.toHaveBeenCalled();
    });
  });
});
