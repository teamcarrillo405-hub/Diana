// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TodayLiveVoice } from "./today-live-voice";

vi.mock("@/components/today-diana-orb", () => ({
  TodayDianaOrb: ({ phase }: { phase: string }) => <div data-testid="today-orb" data-phase={phase} />,
}));

describe("TodayLiveVoice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("RTCPeerConnection", class MockPeerConnection {});
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("asks for microphone permission before creating a Realtime session", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => { throw new DOMException("Denied", "NotAllowedError"); }) },
    });

    render(<TodayLiveVoice />);
    fireEvent.click(screen.getByRole("button", { name: "Start Diana Live" }));

    expect(await screen.findByRole("button", { name: "Retry Diana Live" })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("today-orb").getAttribute("data-phase")).toBe("retryable_error");
  });

  it("keeps the idle status visually minimal", () => {
    const { container } = render(<TodayLiveVoice />);

    expect(screen.getByRole("region", { name: "Diana Live" })).toBeTruthy();
    expect(container.querySelector(".today-live-status")).toBeNull();
    expect(screen.queryByText("Ready")).toBeNull();
    expect(screen.queryByText("Captions will appear when the conversation begins.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Captions" })).toBeNull();
  });
});
