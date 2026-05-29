"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
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
  },
) {
  const { onTranscript, provider = "browser", ...rest } = props;
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // Browser path
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);

  // OpenAI path
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (provider === "openai") {
      // OpenAI mode: supported if getUserMedia is available
      const ok =
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia;
      setSupported(ok);
      return;
    }

    // Browser mode: supported if SpeechRecognition API is available
    const SR =
      (typeof window !== "undefined" &&
        ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition));
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let chunk = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) chunk += event.results[i][0].transcript + " ";
      }
      if (chunk && onTranscript) onTranscript(chunk.trim());
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recogRef.current = rec;
    return () => rec.stop();
  }, [onTranscript, provider]);

  async function toggleOpenAI() {
    if (recording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks to release mic
          stream.getTracks().forEach((t) => t.stop());

          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          setTranscribing(true);
          try {
            // Upload to Storage
            const formData = new FormData();
            formData.append("audio", new File([blob], "voice.webm", { type: "audio/webm" }));
            const uploadResult = await uploadVoiceBlob(formData);

            if (!uploadResult.ok) {
              console.error("Voice upload error:", uploadResult.error);
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
            } else if (onTranscript) {
              onTranscript(data.text as string);
            }
          } catch (err) {
            console.error("Whisper transcription failed:", err);
          } finally {
            setTranscribing(false);
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setRecording(true);
      } catch (err) {
        console.error("getUserMedia failed:", err);
      }
    }
  }

  function toggleBrowser() {
    if (!recogRef.current) return;
    if (recording) recogRef.current.stop();
    else recogRef.current.start();
    setRecording(!recording);
  }

  function toggle() {
    if (provider === "openai") {
      void toggleOpenAI();
    } else {
      toggleBrowser();
    }
  }

  const buttonLabel = transcribing
    ? "Transcribing\u2026"
    : recording
    ? "Stop dictation"
    : "Start dictation";

  return (
    <div className="relative">
      <textarea {...rest} className={`${rest.className ?? ""} ${supported ? "pr-10" : ""}`} />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          disabled={transcribing}
          aria-label={buttonLabel}
          className={`absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md border ${
            recording || transcribing
              ? "border-danger bg-danger/10 text-danger"
              : "border-border bg-card text-muted hover:bg-border/30"
          }`}
        >
          {recording || transcribing ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      )}
    </div>
  );
}
