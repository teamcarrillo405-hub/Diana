"use client";

import { AudioLines, Loader2, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AssignmentReviewField } from "@/lib/assignment-review";
import type { AssignmentRealtimePhase } from "@/lib/assignment-workspace-contracts";

type Props = {
  assignmentId: string;
  fields: AssignmentReviewField[];
  sessionKey?: string;
  compact?: boolean;
};

type RealtimeStartResponse = {
  ok?: boolean;
  clientSecret?: string;
  model?: string;
  realtimeUrl?: string;
  error?: string;
  code?: string;
};

type RealtimeServerEvent = {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  error?: { message?: string };
};

type RealtimeReasonResponse = {
  ok?: boolean;
  answer?: string;
  error?: string;
};

function realtimeFailureMessage(error: unknown): string {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "Microphone permission was not allowed. Check browser and Windows microphone permissions, then retry.";
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "realtime_model_unavailable") {
    return "Voice Diana is not enabled for this OpenAI project yet. Type your message while this is connected.";
  }
  if (message === "realtime_rate_limited") {
    return "Voice Diana is busy right now. Wait a moment, then retry.";
  }
  if (message === "realtime_provider_unavailable") {
    return "Voice Diana is temporarily unavailable. Your typed chat is still ready.";
  }
  if (message === "realtime_offer_rejected") {
    return "Voice Diana could not finish the live connection. Retry once, or use dictation instead.";
  }
  if (message === "microphone_permission_pending") {
    return "Microphone permission is still waiting. Choose Allow in your browser, then retry.";
  }
  if (message.startsWith("Voice Diana") || message.startsWith("Sign in") || message.startsWith("Assignment not found")) {
    return message;
  }
  return "Live voice could not reach Diana right now. Retry once, or keep working in typed chat.";
}

function iceGatheringComplete(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const onStateChange = () => {
      if (connection.iceGatheringState === "complete") {
        connection.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };
    connection.addEventListener("icegatheringstatechange", onStateChange);
    window.setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", onStateChange);
      resolve();
    }, 1800);
  });
}

function phaseLabel(phase: AssignmentRealtimePhase): string {
  if (phase === "connecting") return "Connecting";
  if (phase === "listening") return "Listening";
  if (phase === "thinking") return "Thinking";
  if (phase === "speaking") return "Speaking";
  if (phase === "reconnecting") return "Reconnecting";
  if (phase === "retry") return "Retry live voice";
  return "Live voice";
}

export function AssignmentRealtimeTutor({ assignmentId, fields, sessionKey = assignmentId, compact = false }: Props) {
  const [phase, setPhase] = useState<AssignmentRealtimePhase>("stopped");
  const [status, setStatus] = useState("");
  const connectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intentionalStopRef = useRef(false);
  const reconnectCountRef = useRef(0);
  const handledToolCallsRef = useRef(new Set<string>());
  const fieldsRef = useRef(fields);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const releaseMedia = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    const connection = connectionRef.current;
    connectionRef.current = null;
    connection?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
  }, []);

  const completeComplexReasoning = useCallback(async (event: RealtimeServerEvent) => {
    const callId = event.call_id?.trim();
    if (!callId || event.name !== "answer_complex_homework" || handledToolCallsRef.current.has(callId)) return;
    handledToolCallsRef.current.add(callId);
    setPhase("thinking");
    setStatus("Diana is working through that question.");

    let question = "";
    let reason = "";
    try {
      const parsed = JSON.parse(event.arguments || "{}") as Record<string, unknown>;
      question = typeof parsed.question === "string" ? parsed.question.trim() : "";
      reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    } catch {
      question = "";
    }

    let output: string;
    try {
      if (!question) throw new Error("Diana did not receive the full question.");
      const response = await fetch("/api/diana/assignment-realtime/reason", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": callId,
        },
        body: JSON.stringify({ assignmentId, question, reason, fields: fieldsRef.current }),
      });
      const payload = await response.json().catch(() => ({} as RealtimeReasonResponse));
      if (!response.ok || !payload.ok || !payload.answer) {
        throw new Error(payload.error || "Diana could not complete the deeper explanation.");
      }
      output = JSON.stringify({ ok: true, answer: payload.answer });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Diana could not complete the deeper explanation.";
      output = JSON.stringify({ ok: false, error: message });
    }

    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      setPhase("retry");
      setStatus("Live voice lost its connection. Retry when you are ready.");
      return;
    }
    channel.send(JSON.stringify({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output },
    }));
    channel.send(JSON.stringify({ type: "response.create" }));
  }, [assignmentId]);

  const handleRealtimeEvent = useCallback((message: MessageEvent<string>) => {
    let event: RealtimeServerEvent;
    try {
      event = JSON.parse(message.data) as RealtimeServerEvent;
    } catch {
      return;
    }
    if (event.type === "response.function_call_arguments.done") {
      void completeComplexReasoning(event);
      return;
    }
    if (event.type === "input_audio_buffer.speech_started") {
      setPhase("listening");
      setStatus("Listening.");
      return;
    }
    if (event.type === "response.created") {
      setPhase("thinking");
      setStatus("Diana is thinking.");
      return;
    }
    if (event.type === "response.output_audio.delta" || event.type === "response.audio.delta") {
      setPhase("speaking");
      setStatus("Diana is speaking.");
      return;
    }
    if (event.type === "response.done") {
      setPhase("listening");
      setStatus("Live voice is listening.");
      return;
    }
    if (event.type === "error") {
      setPhase("retry");
      setStatus(event.error?.message || "Live voice was interrupted. Retry when you are ready.");
    }
  }, [completeComplexReasoning]);

  const stopVoice = useCallback((nextStatus = "Live voice stopped.") => {
    intentionalStopRef.current = true;
    reconnectCountRef.current = 0;
    releaseMedia();
    setPhase("stopped");
    setStatus(nextStatus);
  }, [releaseMedia]);

  const startVoice = useCallback(async (reconnecting = false) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setPhase("retry");
      setStatus("Live voice is not available in this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setPhase("retry");
      setStatus("Live voice needs a secure app connection. Refresh Diana, then try again.");
      return;
    }

    intentionalStopRef.current = false;
    handledToolCallsRef.current.clear();
    releaseMedia();
    setPhase(reconnecting ? "reconnecting" : "connecting");
    setStatus(reconnecting ? "Reconnecting live voice." : "Connecting live voice.");

    try {
      // Ask for the microphone before creating a billable Realtime session.
      const stream = await requestRealtimeMicrophone();
      streamRef.current = stream;

      const sessionResponse = await fetch("/api/diana/assignment-realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ assignmentId, fields: fieldsRef.current }),
      });
      const startResponse = await sessionResponse.json().catch(() => ({} as RealtimeStartResponse));

      if (!sessionResponse.ok || !startResponse.ok || !startResponse.clientSecret || !startResponse.model) {
        throw new Error(startResponse.code || startResponse.error || "realtime_provider_unavailable");
      }

      const connection = new RTCPeerConnection();
      connectionRef.current = connection;
      streamRef.current = stream;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      const dataChannel = connection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      dataChannel.onmessage = handleRealtimeEvent;
      connection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (audioRef.current && remoteStream) audioRef.current.srcObject = remoteStream;
      };
      connection.onconnectionstatechange = () => {
        if (intentionalStopRef.current) return;
        if (connection.connectionState === "connected") {
          reconnectCountRef.current = 0;
          setPhase("listening");
          setStatus("Live voice is listening.");
          return;
        }
        const shouldReconnect = connection.connectionState === "disconnected"
          || !["new", "connecting", "connected", "closed"].includes(connection.connectionState);
        if (!shouldReconnect) return;
        if (reconnectCountRef.current < 1) {
          reconnectCountRef.current += 1;
          void startVoice(true);
        } else {
          releaseMedia();
          setPhase("retry");
          setStatus("Live voice was interrupted. Retry when you are ready.");
        }
      };

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await iceGatheringComplete(connection);

      const realtimeUrl = startResponse.realtimeUrl || "https://api.openai.com/v1/realtime/calls";
      const answerResponse = await fetch(`${realtimeUrl}?model=${encodeURIComponent(startResponse.model)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${startResponse.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: connection.localDescription?.sdp || offer.sdp || "",
      });
      if (!answerResponse.ok) throw new Error("realtime_offer_rejected");
      await connection.setRemoteDescription({ type: "answer", sdp: await answerResponse.text() });
      setPhase("listening");
      setStatus("Live voice is listening.");
    } catch (error) {
      releaseMedia();
      setPhase("retry");
      setStatus(realtimeFailureMessage(error));
    }
  }, [assignmentId, handleRealtimeEvent, releaseMedia]);

  useEffect(() => {
    intentionalStopRef.current = true;
    reconnectCountRef.current = 0;
    releaseMedia();
    setPhase("stopped");
    setStatus("");
    return () => {
      intentionalStopRef.current = true;
      reconnectCountRef.current = 0;
      releaseMedia();
    };
  }, [sessionKey, releaseMedia]);

  const busy = phase === "connecting" || phase === "reconnecting";
  const active = phase === "listening" || phase === "thinking" || phase === "speaking";
  const label = phaseLabel(phase);

  return (
    <div className="sd-assignment-realtime-tutor" data-phase={phase} data-compact={compact || undefined}>
      <audio ref={audioRef} autoPlay />
      <button
        type="button"
        onClick={() => active ? stopVoice() : void startVoice(phase === "retry")}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? "Stop live voice" : label}
        title={active ? "Stop live voice" : label}
      >
        {busy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : active ? <Square size={18} aria-hidden="true" /> : phase === "retry" ? <RotateCcw size={20} aria-hidden="true" /> : <AudioLines size={21} aria-hidden="true" />}
        <span className={compact && phase === "stopped" ? "sr-only" : undefined}>{label}</span>
      </button>
      {status ? <small role="status" aria-live="polite">{status}</small> : null}
    </div>
  );
}

async function requestRealtimeMicrophone(): Promise<MediaStream> {
  let expired = false;
  let timeoutId: number | null = null;
  const request = navigator.mediaDevices.getUserMedia({ audio: true });
  request.then((stream) => {
    if (expired) stream.getTracks().forEach((track) => track.stop());
  }).catch(() => undefined);
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      expired = true;
      reject(new Error("microphone_permission_pending"));
    }, MICROPHONE_PERMISSION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  }
}

const MICROPHONE_PERMISSION_TIMEOUT_MS = 12_000;
