"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

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
 * Textarea with a microphone button that uses the browser Speech Recognition
 * API to append spoken text. No server, no API key. Chromium / Safari only —
 * silently hides the mic on Firefox.
 *
 * Use anywhere a student might want to dictate (description, notes, rubric).
 */
export function VoiceTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    onTranscript?: (full: string) => void;
  },
) {
  const { onTranscript, ...rest } = props;
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
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
  }, [onTranscript]);

  function toggle() {
    if (!recogRef.current) return;
    if (recording) recogRef.current.stop();
    else recogRef.current.start();
    setRecording(!recording);
  }

  return (
    <div className="relative">
      <textarea {...rest} className={`${rest.className ?? ""} ${supported ? "pr-10" : ""}`} />
      {supported && (
        <button
          type="button"
          onClick={toggle}
          aria-label={recording ? "Stop dictation" : "Start dictation"}
          className={`absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md border ${
            recording
              ? "border-danger bg-danger/10 text-danger"
              : "border-border bg-card text-muted hover:bg-border/30"
          }`}
        >
          {recording ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      )}
    </div>
  );
}
