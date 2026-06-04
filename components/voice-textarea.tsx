"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RefreshCw, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadVoiceBlob } from "@/components/voice-textarea-actions";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

/**
 * Textarea with a microphone button for dictation.
 *
 * provider='browser' (default): uses browser Web Speech API — Chromium/Safari only.
 * provider='openai': uses MediaRecorder + Whisper STT via transcribe-voice Edge Function.
 *   Supported check: navigator.mediaDevices.getUserMedia (available in all modern browsers).
 *
 * The mic button uses `danger` (amber) styling — calm invariant maintained, no red.
 */
export function VoiceTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    onTranscript?: (full: string) => void;
    provider?: "browser" | "openai";
    speechLang?: string;
    showDeviceStatus?: boolean;
  },
) {
  const { onTranscript, provider = "browser", speechLang = "en-US", showDeviceStatus = false, ...rest } = props;
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [permissionState, setPermissionState] = useState<"checking" | "ready" | "needs_permission" | "blocked" | "unsupported">("checking");
  const [status, setStatus] = useState("Checking microphone access.");
  const [inputLevel, setInputLevel] = useState(0);

  // Browser path
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);

  // OpenAI path
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const meterCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (provider === "openai") {
      // OpenAI mode: supported if getUserMedia is available
      const ok =
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia;
      setSupported(ok);
      setPermissionState(ok ? "needs_permission" : "unsupported");
      setStatus(ok ? "Choose a microphone, then start listening." : "Microphone capture is not available here.");
      return;
    }

    // Browser mode: supported if SpeechRecognition API is available
    const SR =
      (typeof window !== "undefined" &&
        ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition));
    if (!SR) {
      setSupported(false);
      setPermissionState("unsupported");
      setStatus("Browser dictation is not available here. Use typed fallback or recorded transcription.");
      return;
    }
    setSupported(true);
    setPermissionState("needs_permission");
    setStatus("Click the mic button to allow dictation.");
    const rec = new SR();
    rec.lang = speechLang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let chunk = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript + " ";
      }
      if (chunk && onTranscript) onTranscript(chunk.trim());
      if (chunk) setStatus("Captured speech into the note.");
    };
    rec.onend = () => {
      stopInputMeter();
      setRecording(false);
      setStatus("Dictation stopped.");
    };
    rec.onerror = () => {
      stopInputMeter();
      setRecording(false);
      setStatus("Dictation stopped before text came through. Check the selected system microphone.");
    };
    recogRef.current = rec;
    return () => {
      rec.stop();
      stopInputMeter();
    };
  }, [onTranscript, provider, speechLang]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    void refreshDevices(false);

    function handleDeviceChange() {
      void refreshDevices(false);
    }

    navigator.mediaDevices.addEventListener?.("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handleDeviceChange);
  }, []);

  async function refreshDevices(requestPermission: boolean) {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setPermissionState("unsupported");
      setStatus("This browser cannot list microphone options.");
      return;
    }

    let permissionStream: MediaStream | null = null;
    try {
      if (requestPermission) {
        permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionState("ready");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      setMicDevices(audioInputs);
      if (audioInputs.length === 0) {
        setStatus("No microphone input was found.");
        setPermissionState("blocked");
      } else if (audioInputs.some((device) => device.label)) {
        setStatus("Microphone options are ready.");
        setPermissionState("ready");
      } else {
        setStatus("Microphone labels are hidden until access is allowed.");
        setPermissionState("needs_permission");
      }
    } catch (error) {
      console.error("Microphone permission check failed:", error);
      setPermissionState("blocked");
      setStatus("Microphone access was not allowed. Check Windows input privacy and app permission.");
    } finally {
      permissionStream?.getTracks().forEach((track) => track.stop());
    }
  }

  async function toggleOpenAI() {
    if (recording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      // Start recording
      try {
        const audio: MediaTrackConstraints | boolean = selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio });
        const mediaRecorder = new MediaRecorder(stream);
        activeStreamRef.current = stream;
        startInputMeter(stream);
        const trackLabel = stream.getAudioTracks()[0]?.label || selectedMicLabel() || "selected microphone";
        setStatus(`Listening through ${trackLabel}. Speak, then press stop to transcribe.`);
        setPermissionState("ready");
        void refreshDevices(false);
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks to release mic
          stopInputMeter();
          stream.getTracks().forEach((t) => t.stop());
          activeStreamRef.current = null;

          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setTranscribing(true);
          setStatus("Transcribing the voice note.");
          try {
            // Upload to Storage
            const formData = new FormData();
            formData.append("audio", new File([blob], "voice.webm", { type: "audio/webm" }));
            const uploadResult = await uploadVoiceBlob(formData);

            if (!uploadResult.ok) {
              console.error("Voice upload error:", uploadResult.error);
              setStatus(uploadResult.error);
              setTranscribing(false);
              return;
            }

            // Call transcribe-voice Edge Function
            const supabase = createClient();
            const { data, error } = await supabase.functions.invoke("transcribe-voice", {
              body: { audioStorageKey: uploadResult.storageKey, bucket: "note-audio" },
            });

            if (error || !data?.text) {
              console.error("Transcription error:", error);
              setStatus("Diana could not transcribe that recording. The typed fallback still works.");
            } else if (onTranscript) {
              onTranscript(data.text as string);
              setStatus("Transcription added to the note.");
            }
          } catch (err) {
            console.error("Whisper transcription failed:", err);
            setStatus("Transcription could not finish. The recording was stopped safely.");
          } finally {
            setTranscribing(false);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setRecording(true);
      } catch (err) {
        console.error("getUserMedia failed:", err);
        setPermissionState("blocked");
        setStatus("Microphone access did not start. Check Windows input privacy or choose another mic.");
      }
    }
  }

  async function toggleBrowser() {
    if (!recogRef.current) return;
    if (recording) {
      recogRef.current.stop();
      stopInputMeter();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreamRef.current = stream;
        startInputMeter(stream);
        stream.getTracks().forEach((track) => track.stop());
        setPermissionState("ready");
        setStatus("Dictation is listening through the system default microphone.");
        void refreshDevices(false);
        recogRef.current.start();
      } catch (error) {
        console.error("Browser dictation permission failed:", error);
        setPermissionState("blocked");
        setStatus("Dictation could not access the microphone. Check Windows input privacy.");
        return;
      }
    }
    setRecording(!recording);
  }

  function toggle() {
    if (provider === "openai") {
      void toggleOpenAI();
    } else {
      void toggleBrowser();
    }
  }

  function startInputMeter(stream: MediaStream) {
    stopInputMeter();
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;
    let stopped = false;

    function tick() {
      if (stopped) return;
      analyser.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setInputLevel(Math.min(1, average / 90));
      frame = window.requestAnimationFrame(tick);
    }

    tick();
    meterCleanupRef.current = () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      source.disconnect();
      void audioContext.close();
      setInputLevel(0);
    };
  }

  function stopInputMeter() {
    meterCleanupRef.current?.();
    meterCleanupRef.current = null;
    activeStreamRef.current?.getTracks().forEach((track) => track.stop());
    activeStreamRef.current = null;
  }

  function selectedMicLabel() {
    return micDevices.find((device) => device.deviceId === selectedDeviceId)?.label;
  }

  const buttonLabel = transcribing
    ? "Transcribing\u2026"
    : recording
    ? "Stop dictation"
    : "Start dictation";

  return (
    <div className="space-y-3">
      {showDeviceStatus && (
        <div className="rounded-2xl border border-border bg-surface/70 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal size={15} className="text-brand" />
                <span>Microphone</span>
              </div>
              <p className="mt-1 text-xs text-muted">{status}</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshDevices(true)}
              className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-fg hover:bg-surface-soft"
            >
              <RefreshCw size={14} />
              Check mic
            </button>
          </div>

          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="voice-mic-device">
            Input
          </label>
          <select
            id="voice-mic-device"
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            disabled={recording || transcribing || micDevices.length === 0}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm"
          >
            <option value="">System default microphone</option>
            {micDevices.map((device, index) => (
              <option key={device.deviceId || `mic-${index}`} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/70" aria-label="Microphone input level">
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${Math.round(inputLevel * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {provider === "browser"
              ? "Browser dictation uses the system default microphone. Change the default input in Windows settings if needed."
              : "Recorded transcription uses the selected microphone when access is allowed."}
          </p>
          {permissionState === "blocked" && (
            <p className="mt-2 rounded-xl border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              Diana needs microphone permission from Windows or Electron before it can hear you.
            </p>
          )}
        </div>
      )}

      <div className="relative">
        <textarea {...rest} className={`${rest.className ?? ""} ${supported ? "pr-12" : ""}`} />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          disabled={transcribing}
          aria-label={buttonLabel}
          className={`touch-target absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-xl border ${
            recording || transcribing
              ? "border-danger bg-danger/10 text-danger"
              : "border-border bg-card text-muted hover:bg-border/30"
          }`}
        >
          {recording || transcribing ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      )}
      </div>
    </div>
  );
}
