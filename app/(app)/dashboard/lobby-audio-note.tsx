"use client";

import { useRef, useState } from "react";
import { saveInboxItem } from "../quick-add/actions";
import { SlantedActionButton } from "@/components/ui/slanted-action-button";

type SRInstance = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SRConstructor = new () => SRInstance;

export function LobbyAudioNote() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recognitionRef = useRef<SRInstance | null>(null);
  const shouldRecordRef = useRef(false);

  const NOT_SUPPORTED = "Speech recognition not supported. Try Chrome or Edge.";

  function startAudio() {
    const win = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SR) {
      setRecording(true);
      setTranscript(NOT_SUPPORTED);
      return;
    }

    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    shouldRecordRef.current = true;

    r.onresult = (e) => {
      const t = Array.from(e.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setTranscript(t);
    };

    r.onend = () => {
      if (shouldRecordRef.current) r.start();
    };

    r.start();
    recognitionRef.current = r;
    setRecording(true);
    setTranscript("");
    setSaveError(null);
  }

  async function stopAudio() {
    shouldRecordRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const text = transcript.trim();
    // Nothing usable captured — just close.
    if (!text || text === NOT_SUPPORTED) {
      setRecording(false);
      setTranscript("");
      return;
    }

    // Save the voice transcript to the capture inbox; saveInboxItem also kicks
    // off AI classification so it lands with a suggested class/kind/due.
    setSaving(true);
    const result = await saveInboxItem({ raw: text, captureMode: "voice" });
    setSaving(false);
    if (!result.ok) {
      // Don't close — surface the failure so the transcript isn't silently lost.
      setSaveError(result.error || "Could not save your note. Try again.");
      return;
    }
    setSaveError(null);
    setRecording(false);
    setTranscript("");
  }

  function cancelAudio() {
    shouldRecordRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setTranscript("");
    setSaveError(null);
  }

  const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";

  return (
    <>
      <style>{`
        /* Keyframe kept local so the recording pulse works wherever LobbyAudioNote
           renders (dashboard AND /assignments), not just inside the lobby hero. */
        @keyframes gl-mic-pulse{0%,100%{box-shadow:0 0 0 0 var(--gl-red-55)}65%{box-shadow:0 0 0 16px transparent}}
        .gl-record{transition:transform 140ms cubic-bezier(.23,1,.32,1),background .2s;}
        .gl-record:active{transform:scale(.97);}
      `}</style>
      <button
        className="gl-record"
        onClick={() => (recording ? cancelAudio() : startAudio())}
        title={recording ? "Stop recording" : "Start audio note"}
        style={{
          padding: "var(--space-7) var(--space-14)",
          borderRadius: "var(--radius-button)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          border: `1.5px solid ${recording ? "var(--gl-red-mic-border-active)" : "var(--gl-red-mic-idle)"}`,
          background: recording ? "var(--gl-red-mic-active)" : "var(--gl-red-mic-idle)",
          animation: recording ? "gl-mic-pulse 1s ease-in-out infinite" : "none",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gl-text-primary)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="2" width="6" height="11" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <span
          style={{
            fontFamily: SF,
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--gl-text-primary)",
          }}
        >
          RECORD
        </span>
      </button>

      {recording && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--gl-bg-settings-scrim)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              background: "var(--gl-bg-settings)",
              border: "1px solid var(--gl-border-neutral)",
              borderRadius: "var(--radius-panel)",
              padding: "var(--space-16) var(--space-17)",
              width: "min(500px, calc(100vw - 48px))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-12)",
              boxShadow: "var(--shadow-modal-audio)",
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "var(--radius-circle)",
                background: "var(--gl-red-14)",
                border: "2px solid var(--gl-red-55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "gl-mic-pulse 1.5s ease-in-out infinite",
              }}
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gl-red-icon)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>

            <div
              style={{
                fontFamily: SF,
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--gl-text-primary)",
              }}
            >
              Listening…
            </div>

            <div
              style={{
                minHeight: 90,
                width: "100%",
                borderRadius: "var(--radius-hero)",
                background: "var(--gl-bg-btn-neutral)",
                border: "1px solid var(--gl-border-neutral)",
                padding: "var(--space-9) var(--space-11)",
                fontSize: "var(--text-15)",
                fontWeight: "var(--weight-500)",
                color: "var(--gl-text-secondary)",
                lineHeight: "var(--leading-relaxed)",
                textAlign: "center",
              }}
            >
              {transcript || "Start speaking…"}
            </div>

            {saveError && (
              <div role="alert" style={{ width: "100%", fontFamily: SF, fontSize: "var(--text-14)", letterSpacing: "var(--tracking-03)", color: "var(--gl-gold)", textAlign: "center" }}>
                {saveError}
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--space-6)" }}>
              <SlantedActionButton
                onClick={stopAudio}
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? "Saving…" : "Save Note"}
              </SlantedActionButton>
              <button
                onClick={cancelAudio}
                style={{
                  padding: "var(--space-8) var(--space-12)",
                  borderRadius: "var(--radius-option)",
                  background: "var(--gl-bg-btn-neutral)",
                  border: "1px solid var(--gl-border-neutral)",
                  cursor: "pointer",
                  fontFamily: SF,
                  fontWeight: "var(--weight-800)",
                  fontSize: "var(--text-18)",
                  letterSpacing: "var(--tracking-04)",
                  textTransform: "uppercase",
                  color: "var(--gl-text-muted)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
