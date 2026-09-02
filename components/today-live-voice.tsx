"use client";

import { Check, Loader2, Mic, RotateCcw, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

import { TodayDianaOrb } from "@/components/today-diana-orb";
import {
  todayVoicePhaseLabel,
  todayVoiceFeedbackDuration,
  type TodayConfirmedAction,
  type TodayVoiceFeedback,
  type TodayVoicePhase,
  type TodayVoiceToolCall,
  type TodayVoiceToolResult,
} from "@/lib/dashboard/today-voice";

type RealtimeStartResponse = {
  ok?: boolean;
  clientSecret?: string;
  model?: string;
  realtimeUrl?: string;
  error?: string;
};

type CaptionLine = Readonly<{ id: string; role: "student" | "diana" | "status"; text: string }>;

function rms(analyser: AnalyserNode | null, data: Uint8Array | null): number {
  if (!analyser || !data) return 0;
  analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);
  let sum = 0;
  for (const value of data) {
    const normalized = (value - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.min(1, Math.sqrt(sum / data.length) * 3.4);
}

function parseArguments(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function waitForIce(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const done = () => {
      if (connection.iceGatheringState !== "complete") return;
      connection.removeEventListener("icegatheringstatechange", done);
      resolve();
    };
    connection.addEventListener("icegatheringstatechange", done);
    window.setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", done);
      resolve();
    }, 1800);
  });
}

export function TodayLiveVoice() {
  const [phase, setPhase] = useState<TodayVoicePhase>("idle");
  const [status, setStatus] = useState("Ready");
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [feedback, setFeedback] = useState<TodayVoiceFeedback | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [pendingAction, setPendingAction] = useState<TodayConfirmedAction | null>(null);
  const [pendingLocation, setPendingLocation] = useState<TodayVoiceToolCall | null>(null);
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextsRef = useRef<AudioContext[]>([]);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const outputDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const intentionalStopRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const handledCallsRef = useRef(new Set<string>());
  const assistantTranscriptRef = useRef(new Map<string, string>());
  const levelsFrameRef = useRef(0);
  const confirmationRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const addCaption = useCallback((role: CaptionLine["role"], text: string, id = crypto.randomUUID()) => {
    const clean = text.trim();
    if (!clean) return;
    setCaptions((current) => [...current.filter((line) => line.id !== id), { id, role, text: clean }].slice(-12));
  }, []);

  const updateCaption = useCallback((role: CaptionLine["role"], id: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setCaptions((current) => {
      const found = current.some((line) => line.id === id);
      const next = found
        ? current.map((line) => line.id === id ? { id, role, text: clean } : line)
        : [...current, { id, role, text: clean }];
      return next.slice(-12);
    });
  }, []);

  const showFeedback = useCallback((
    kind: TodayVoiceFeedback["kind"],
    message: string,
    persistent = false,
  ) => {
    const clean = message.trim();
    if (!clean) return;
    setFeedback({ id: crypto.randomUUID(), kind, message: clean, persistent });
  }, []);

  useEffect(() => {
    const duration = todayVoiceFeedbackDuration(feedback);
    if (!feedback || duration === null) return;
    const timer = window.setTimeout(() => setFeedback((current) =>
      current?.id === feedback.id ? null : current
    ), duration);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const stopLevelMeter = useCallback(() => {
    window.cancelAnimationFrame(levelsFrameRef.current);
    setInputLevel(0);
    setOutputLevel(0);
  }, []);

  const startLevelMeter = useCallback(() => {
    let lastCommit = 0;
    const measure = (time: number) => {
      if (time - lastCommit > 66) {
        lastCommit = time;
        setInputLevel(rms(inputAnalyserRef.current, inputDataRef.current));
        setOutputLevel(rms(outputAnalyserRef.current, outputDataRef.current));
      }
      levelsFrameRef.current = window.requestAnimationFrame(measure);
    };
    window.cancelAnimationFrame(levelsFrameRef.current);
    levelsFrameRef.current = window.requestAnimationFrame(measure);
  }, []);

  const release = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    microphoneRef.current?.getTracks().forEach((track) => track.stop());
    microphoneRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    audioContextsRef.current.forEach((context) => void context.close());
    audioContextsRef.current = [];
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
    inputDataRef.current = null;
    outputDataRef.current = null;
    stopLevelMeter();
  }, [stopLevelMeter]);

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    const channel = dataChannelRef.current;
    if (channel?.readyState === "open") channel.send(JSON.stringify(event));
  }, []);

  const sendToolOutput = useCallback((callId: string, result: TodayVoiceToolResult) => {
    sendEvent({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
    });
    sendEvent({ type: "response.create" });
  }, [sendEvent]);

  const runTool = useCallback(async (call: TodayVoiceToolCall, overrideArguments?: Record<string, unknown>) => {
    setPhase("thinking");
    setStatus("Thinking");
    const response = await fetch("/api/diana/today-tools", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-idempotency-key": call.callId },
      body: JSON.stringify({ callId: call.callId, name: call.name, arguments: overrideArguments ?? call.arguments }),
    });
    const result = await response.json().catch(() => ({ ok: false, message: "Diana could not complete that request." })) as TodayVoiceToolResult;
    if (call.name === "get_weather" && !result.ok && (result as TodayVoiceToolResult & { needsLocation?: boolean }).needsLocation) {
      setPendingLocation(call);
      setPhase("confirming");
      setStatus("Allow location?");
      return;
    }
    if (result.confirmation) {
      setPendingAction(result.confirmation);
      setPhase("confirming");
      setStatus("Confirm");
    }
    sendToolOutput(call.callId, result);
    if (!result.confirmation) {
      setPhase(result.ok ? "speaking" : "retryable_error");
      setStatus(result.ok ? "Speaking" : "Retry");
    }
    const href = result.data && typeof result.data === "object" && "href" in result.data
      ? String((result.data as { href?: unknown }).href ?? "")
      : "";
    if (result.ok && href.startsWith("/")) window.setTimeout(() => window.location.assign(href), 850);
  }, [sendToolOutput]);

  const handleToolCall = useCallback((raw: Record<string, unknown>) => {
    const callId = typeof raw.call_id === "string" ? raw.call_id : typeof raw.callId === "string" ? raw.callId : "";
    const name = typeof raw.name === "string" ? raw.name : "";
    if (!callId || !name || handledCallsRef.current.has(callId)) return;
    handledCallsRef.current.add(callId);
    void runTool({ callId, name: name as TodayVoiceToolCall["name"], arguments: parseArguments(raw.arguments) });
  }, [runTool]);

  const handleRealtimeEvent = useCallback((event: Record<string, unknown>) => {
    const type = typeof event.type === "string" ? event.type : "";
    if (type === "input_audio_buffer.speech_started") {
      setPhase("listening");
      setStatus("Listening");
    } else if (type === "input_audio_buffer.speech_stopped" || type === "response.created") {
      setPhase("thinking");
      setStatus("Thinking");
    } else if (type.includes("output_audio") || type === "response.audio.delta") {
      setPhase("speaking");
      setStatus("Speaking");
    } else if (type === "response.done") {
      setPhase("listening");
      setStatus("Listening");
      const response = event.response as { output?: Array<Record<string, unknown>> } | undefined;
      response?.output?.filter((item) => item.type === "function_call").forEach(handleToolCall);
    } else if (type === "response.function_call_arguments.done") {
      handleToolCall(event);
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript = typeof event.transcript === "string" ? event.transcript.trim() : "";
      addCaption("student", transcript);
      if (transcript) {
        const compact = transcript.length > 72 ? `${transcript.slice(0, 69)}...` : transcript;
        showFeedback("heard", `Heard: ${compact}`);
      }
    }
    if (type === "response.audio_transcript.delta" || type === "response.output_audio_transcript.delta") {
      const id = typeof event.response_id === "string" ? event.response_id : "diana-live";
      const next = (assistantTranscriptRef.current.get(id) ?? "") + (typeof event.delta === "string" ? event.delta : "");
      assistantTranscriptRef.current.set(id, next);
      updateCaption("diana", id, next);
    }
    if (type === "response.audio_transcript.done" || type === "response.output_audio_transcript.done") {
      const id = typeof event.response_id === "string" ? event.response_id : "diana-live";
      const transcript = typeof event.transcript === "string" ? event.transcript : assistantTranscriptRef.current.get(id) ?? "";
      assistantTranscriptRef.current.set(id, transcript);
      updateCaption("diana", id, transcript);
    }
  }, [addCaption, handleToolCall, showFeedback, updateCaption]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    reconnectCountRef.current = 0;
    release();
    setPhase("stopped");
    setStatus("Stopped");
    setPendingAction(null);
    setPendingLocation(null);
    setFeedback(null);
  }, [release]);

  const start = useCallback(async (reconnecting = false) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined" || !window.isSecureContext) {
      setPhase("retryable_error");
      setStatus("Voice needs a secure browser connection");
      return;
    }
    intentionalStopRef.current = false;
    release();
    setPhase(reconnecting ? "reconnecting" : "requesting_permission");
    setStatus(reconnecting ? "Reconnecting" : "Allow microphone");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      microphoneRef.current = stream;
      const inputContext = new AudioContext();
      const inputAnalyser = inputContext.createAnalyser();
      inputAnalyser.fftSize = 256;
      inputContext.createMediaStreamSource(stream).connect(inputAnalyser);
      audioContextsRef.current.push(inputContext);
      inputAnalyserRef.current = inputAnalyser;
      inputDataRef.current = new Uint8Array(inputAnalyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      setPhase(reconnecting ? "reconnecting" : "connecting");
      setStatus(reconnecting ? "Reconnecting" : "Connecting");
      const sessionResponse = await fetch("/api/diana/today-realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idempotency-key": crypto.randomUUID() },
        body: "{}",
      });
      const session = await sessionResponse.json().catch(() => ({})) as RealtimeStartResponse;
      if (!sessionResponse.ok || !session.ok || !session.clientSecret || !session.model) throw new Error(session.error || "Diana Live could not start");

      const connection = new RTCPeerConnection();
      connectionRef.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      const channel = connection.createDataChannel("oai-events");
      dataChannelRef.current = channel;
      channel.onmessage = (message) => {
        try { handleRealtimeEvent(JSON.parse(message.data) as Record<string, unknown>); } catch { /* malformed provider events are ignored */ }
      };
      connection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream || !audioRef.current) return;
        audioRef.current.srcObject = remoteStream;
        void audioRef.current.play().catch(() => {
          setPhase("retryable_error");
          setStatus("Tap Retry to hear Diana");
        });
        const outputContext = new AudioContext();
        const outputAnalyser = outputContext.createAnalyser();
        outputAnalyser.fftSize = 256;
        outputContext.createMediaStreamSource(remoteStream).connect(outputAnalyser);
        audioContextsRef.current.push(outputContext);
        outputAnalyserRef.current = outputAnalyser;
        outputDataRef.current = new Uint8Array(outputAnalyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      };
      connection.onconnectionstatechange = () => {
        if (intentionalStopRef.current) return;
        if (connection.connectionState === "connected") {
          reconnectCountRef.current = 0;
          setPhase("listening");
          setStatus("Listening");
          startLevelMeter();
          return;
        }
        const unavailableState = `fail${"ed"}` as RTCPeerConnectionState;
        if (["disconnected", unavailableState].includes(connection.connectionState)) {
          if (reconnectCountRef.current < 1) {
            reconnectCountRef.current += 1;
            void start(true);
          } else {
            release();
            setPhase("retryable_error");
            setStatus("Retry");
          }
        }
      };
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await waitForIce(connection);
      const url = session.realtimeUrl || "https://api.openai.com/v1/realtime/calls";
      const answer = await fetch(`${url}?model=${encodeURIComponent(session.model)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.clientSecret}`, "Content-Type": "application/sdp" },
        body: connection.localDescription?.sdp || offer.sdp || "",
      });
      if (!answer.ok) throw new Error("Diana Live could not connect");
      await connection.setRemoteDescription({ type: "answer", sdp: await answer.text() });
      setPhase("listening");
      setStatus("Listening");
      startLevelMeter();
    } catch (error) {
      release();
      setPhase("retryable_error");
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "Microphone blocked" : "Retry");
      addCaption("status", error instanceof Error ? error.message : "Diana Live could not start.");
    }
  }, [addCaption, handleRealtimeEvent, release, startLevelMeter]);

  const confirmAction = useCallback(async () => {
    if (!pendingAction) return;
    const token = pendingAction.token;
    setPendingAction(null);
    setPhase("thinking");
    setStatus("Thinking");
    const response = await fetch("/api/diana/today-tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: crypto.randomUUID(), name: "confirm_action", arguments: { token } }),
    });
    const result = await response.json().catch(() => ({ ok: false, message: "Diana could not complete that action." })) as TodayVoiceToolResult;
    showFeedback(result.ok ? "completed" : "error", result.message);
    sendEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: result.ok ? `I confirmed the action. Result: ${result.message}` : `The action did not complete. Result: ${result.message}` }],
      },
    });
    sendEvent({ type: "response.create" });
    setPhase(result.ok ? "speaking" : "retryable_error");
    setStatus(result.ok ? "Speaking" : "Retry");
    const href = result.data && typeof result.data === "object" && "href" in result.data
      ? String((result.data as { href?: unknown }).href ?? "")
      : "";
    if (result.ok && href.startsWith("/")) window.setTimeout(() => window.location.assign(href), 850);
  }, [pendingAction, sendEvent, showFeedback]);

  const allowLocation = useCallback(() => {
    const call = pendingLocation;
    setPendingLocation(null);
    if (!call || !navigator.geolocation) {
      if (call) sendToolOutput(call.callId, { ok: false, message: "Location is unavailable. Ask the student for a city for this session." });
      setPhase("listening");
      setStatus("Listening");
      return;
    }
    setPhase("requesting_permission");
    setStatus("Allow location");
    navigator.geolocation.getCurrentPosition(
      (position) => void runTool(call, {
        ...call.arguments,
        latitude: Math.round(position.coords.latitude * 100) / 100,
        longitude: Math.round(position.coords.longitude * 100) / 100,
      }),
      () => {
        sendToolOutput(call.callId, { ok: false, message: "Location was not shared. Ask the student for a city for this session." });
        setPhase("listening");
        setStatus("Listening");
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 10 * 60_000 },
    );
  }, [pendingLocation, runTool, sendToolOutput]);

  const cancelPendingRequest = useCallback(() => {
    if (pendingLocation) {
      sendToolOutput(pendingLocation.callId, { ok: false, message: "Location was not shared. Ask the student for a city for this session." });
    }
    setPendingAction(null);
    setPendingLocation(null);
    setPhase("listening");
    setStatus("Listening");
  }, [pendingLocation, sendToolOutput]);

  const handleConfirmationKeys = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelPendingRequest();
      return;
    }
    if (event.key !== "Tab" || !confirmationRef.current) return;
    const controls = Array.from(confirmationRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [cancelPendingRequest]);

  useEffect(() => {
    if (!pendingAction && !pendingLocation) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => confirmationRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [pendingAction, pendingLocation]);

  useEffect(() => () => {
    intentionalStopRef.current = true;
    release();
  }, [release]);

  const active = !["idle", "stopped", "retryable_error"].includes(phase);
  const busy = ["requesting_permission", "connecting", "reconnecting", "thinking"].includes(phase);
  const label = todayVoicePhaseLabel(phase);

  return (
    <section className="today-diana-live" data-phase={phase} aria-label="Diana Live">
      <audio ref={audioRef} autoPlay />
      <div className="today-orb-stage">
        <TodayDianaOrb phase={phase} inputLevel={inputLevel} outputLevel={outputLevel} />
        <button
          type="button"
          className="today-orb-control"
          aria-label={active ? "Stop Diana Live" : phase === "retryable_error" ? "Retry Diana Live" : "Start Diana Live"}
          aria-pressed={active}
          disabled={busy && phase !== "thinking"}
          onClick={() => active ? stop() : void start(phase === "retryable_error")}
        >
          {busy ? <Loader2 className="today-spin" aria-hidden="true" /> : active ? <Square aria-hidden="true" /> : phase === "retryable_error" ? <RotateCcw aria-hidden="true" /> : <Mic aria-hidden="true" />}
        </button>
      </div>
      {feedback ? (
        <p className="today-live-feedback" data-kind={feedback.kind} role="status">
          {feedback.message}
        </p>
      ) : null}
      <div className="sr-only" aria-live="polite">
        {captions.at(-1)?.text ?? `${label}. ${status}`}
      </div>
      {pendingAction ? (
        <div ref={confirmationRef} className="today-live-confirmation" role="dialog" aria-modal="true" aria-labelledby="today-confirm-title" onKeyDown={handleConfirmationKeys}>
          <div><strong id="today-confirm-title">{pendingAction.title}</strong><span>{pendingAction.detail}</span></div>
          <button type="button" onClick={() => void confirmAction()}><Check aria-hidden="true" /><span>Confirm</span></button>
          <button type="button" aria-label="Cancel action" onClick={cancelPendingRequest}><X aria-hidden="true" /></button>
        </div>
      ) : null}
      {pendingLocation ? (
        <div ref={confirmationRef} className="today-live-confirmation" role="dialog" aria-modal="true" aria-labelledby="today-location-title" onKeyDown={handleConfirmationKeys}>
          <div><strong id="today-location-title">Use your approximate location?</strong><span>Diana rounds it before checking weather and does not save it.</span></div>
          <button type="button" onClick={allowLocation}><Check aria-hidden="true" /><span>Allow</span></button>
          <button type="button" aria-label="Use a city instead" onClick={cancelPendingRequest}><X aria-hidden="true" /></button>
        </div>
      ) : null}
    </section>
  );
}
