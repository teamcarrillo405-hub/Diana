// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssignmentRealtimeTutor } from "./assignment-realtime-tutor";

class MockDataChannel {
  readyState: RTCDataChannelState = "open";
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = "closed"; });

  emit(payload: Record<string, unknown>) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(payload) }));
  }
}

class MockPeerConnection {
  static instances: MockPeerConnection[] = [];
  iceGatheringState = "complete";
  connectionState = "new";
  localDescription: RTCSessionDescriptionInit | null = { type: "offer", sdp: "offer-sdp" };
  ontrack: RTCPeerConnection["ontrack"] = null;
  onconnectionstatechange: RTCPeerConnection["onconnectionstatechange"] = null;
  close = vi.fn();
  addTrack = vi.fn();
  dataChannel = new MockDataChannel();
  createDataChannel = vi.fn(() => this.dataChannel as unknown as RTCDataChannel);
  createOffer = vi.fn(async () => ({ type: "offer" as RTCSdpType, sdp: "offer-sdp" }));
  setLocalDescription = vi.fn(async (description: RTCSessionDescriptionInit) => { this.localDescription = description; });
  setRemoteDescription = vi.fn(async () => undefined);
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor() {
    MockPeerConnection.instances.push(this);
  }

  setConnectionState(value: RTCPeerConnectionState) {
    this.connectionState = value;
    this.onconnectionstatechange?.call(this as unknown as RTCPeerConnection, new Event("connectionstatechange"));
  }
}

const assignmentId = "11111111-1111-4111-8111-111111111111";

describe("AssignmentRealtimeTutor", () => {
  const stopTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    MockPeerConnection.instances = [];
    vi.stubGlobal("RTCPeerConnection", MockPeerConnection);
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
    });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/diana/assignment-realtime") {
        return new Response(JSON.stringify({ ok: true, clientSecret: "client-secret", model: "gpt-realtime", realtimeUrl: "https://api.openai.test/realtime" }), { headers: { "Content-Type": "application/json" } });
      }
      if (String(input) === "/api/diana/assignment-realtime/reason") {
        return new Response(JSON.stringify({ ok: true, answer: "Subtract 5 from both sides, then tell me what remains." }), { headers: { "Content-Type": "application/json" } });
      }
      return new Response("answer-sdp", { status: 200, headers: { "Content-Type": "application/sdp" } });
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("connects, announces listening, and stops cleanly", async () => {
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} sessionKey="problem-1" fields={[{ label: "Problem", value: "2x = 10" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    expect(await screen.findByRole("button", { name: "Stop live voice" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Live voice is listening.");
    expect(fetch).toHaveBeenCalledWith("/api/diana/assignment-realtime", expect.objectContaining({ method: "POST" }));

    fireEvent.click(screen.getByRole("button", { name: "Stop live voice" }));
    expect(screen.getByRole("button", { name: "Live voice" })).toBeTruthy();
    expect(stopTrack).toHaveBeenCalled();
    expect(MockPeerConnection.instances[0]?.close).toHaveBeenCalled();
  });

  it("releases the microphone when the active problem changes", async () => {
    const { rerender } = render(<AssignmentRealtimeTutor assignmentId={assignmentId} sessionKey="problem-1" fields={[{ label: "Problem", value: "2x = 10" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    await screen.findByRole("button", { name: "Stop live voice" });

    rerender(<AssignmentRealtimeTutor assignmentId={assignmentId} sessionKey="problem-2" fields={[{ label: "Problem", value: "4x = 20" }]} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Live voice" })).toBeTruthy());
    expect(stopTrack).toHaveBeenCalled();
    expect(MockPeerConnection.instances[0]?.close).toHaveBeenCalled();
  });

  it("reconnects once when the live session is interrupted", async () => {
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} sessionKey="problem-1" fields={[{ label: "Problem", value: "2x = 10" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    await screen.findByRole("button", { name: "Stop live voice" });

    MockPeerConnection.instances[0]?.setConnectionState("disconnected");

    await waitFor(() => expect(MockPeerConnection.instances).toHaveLength(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop live voice" })).toBeTruthy());
    expect(screen.getByRole("status").textContent).toBe("Live voice is listening.");
    expect(MockPeerConnection.instances[0]?.close).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("offers retry when microphone permission is denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => { throw new DOMException("Denied", "NotAllowedError"); }) },
    });
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} fields={[{ label: "Problem", value: "2x = 10" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));

    expect(await screen.findByRole("button", { name: "Retry live voice" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Microphone permission/iu);
  });

  it("checks microphone permission before creating a Realtime session", async () => {
    const getUserMedia = vi.fn(async () => { throw new DOMException("Denied", "NotAllowedError"); });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} fields={[{ label: "Problem", value: "2x = 10" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));

    await screen.findByRole("button", { name: "Retry live voice" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the provider reason when a Realtime session cannot start", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      ok: false,
      code: "realtime_model_unavailable",
      error: "Voice Diana is not enabled for this OpenAI project yet.",
    }), { status: 503, headers: { "Content-Type": "application/json" } })));
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} fields={[{ label: "Problem", value: "2x = 10" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));

    await screen.findByRole("button", { name: "Retry live voice" });
    expect(screen.getByRole("status").textContent).toMatch(/not enabled/iu);
  });

  it("routes advanced questions through the grounded reasoning bridge once", async () => {
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} fields={[{ label: "Problem", value: "3x + 5 = 20" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    await screen.findByRole("button", { name: "Stop live voice" });

    const channel = MockPeerConnection.instances[0]?.dataChannel;
    channel?.emit({
      type: "response.function_call_arguments.done",
      call_id: "call-1",
      name: "answer_complex_homework",
      arguments: JSON.stringify({ question: "Why does subtracting five preserve equality?", reason: "conceptual explanation" }),
    });
    channel?.emit({
      type: "response.function_call_arguments.done",
      call_id: "call-1",
      name: "answer_complex_homework",
      arguments: JSON.stringify({ question: "Why does subtracting five preserve equality?" }),
    });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/diana/assignment-realtime/reason",
      expect.objectContaining({ method: "POST" }),
    ));
    await waitFor(() => expect(channel?.send).toHaveBeenCalledTimes(2));
    expect(channel?.send).toHaveBeenNthCalledWith(1, expect.stringContaining("function_call_output"));
    expect(channel?.send).toHaveBeenNthCalledWith(2, JSON.stringify({ type: "response.create" }));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) => url === "/api/diana/assignment-realtime/reason")).toHaveLength(1);
  });

  it("reflects thinking and speaking phases without disabling Stop", async () => {
    render(<AssignmentRealtimeTutor assignmentId={assignmentId} fields={[{ label: "Problem", value: "3x + 5 = 20" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    await screen.findByRole("button", { name: "Stop live voice" });
    const channel = MockPeerConnection.instances[0]?.dataChannel;

    channel?.emit({ type: "response.created" });
    await waitFor(() => expect(screen.getByText("Thinking")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Stop live voice" })).toBeTruthy();

    channel?.emit({ type: "response.output_audio.delta" });
    await waitFor(() => expect(screen.getByText("Speaking")).toBeTruthy());

    channel?.emit({ type: "response.done" });
    await waitFor(() => expect(screen.getByText("Listening")).toBeTruthy());
  });
});
