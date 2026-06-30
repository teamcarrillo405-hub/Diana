"use client";

import { useRef, useState } from "react";
import { saveInboxItem } from "../quick-add/actions";

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
    await saveInboxItem({ raw: text, captureMode: "voice" });
    setSaving(false);
    setRecording(false);
    setTranscript("");
  }

  function cancelAudio() {
    shouldRecordRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    setTranscript("");
  }

  const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";

  return (
    <>
      <style>{`
        /* Keyframe kept local so the recording pulse works wherever LobbyAudioNote
           renders (dashboard AND /assignments), not just inside the lobby hero. */
        @keyframes gl-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,55,55,.55)}65%{box-shadow:0 0 0 16px rgba(255,55,55,0)}}
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
            background: "rgba(4,6,15,.88)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg,rgba(18,24,50,.98),rgba(10,14,32,.98))",
              border: "1px solid rgba(120,150,220,.22)",
              borderRadius: 22,
              padding: "36px 40px",
              width: "min(500px, calc(100vw - 48px))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
              boxShadow: "0 32px 80px rgba(0,0,0,.6)",
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: "rgba(255,55,55,.14)",
                border: "2px solid rgba(255,55,55,.55)",
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
                stroke="#ff4444"
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
                color: "#fff",
              }}
            >
              Listening…
            </div>

            <div
              style={{
                minHeight: 90,
                width: "100%",
                borderRadius: 12,
                background: "rgba(120,150,220,.08)",
                border: "1px solid rgba(120,150,220,.16)",
                padding: "16px 20px",
                fontSize: 15,
                fontWeight: 500,
                color: "#cdd6f2",
                lineHeight: 1.6,
                textAlign: "center",
              }}
            >
              {transcript || "Start speaking…"}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={stopAudio}
                disabled={saving}
                style={{
                  transform: "skewX(-8deg)",
                  padding: "12px 28px",
                  borderRadius: 8,
                  background: "linear-gradient(180deg,#36e07a,#16a34a)",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  boxShadow: "0 8px 24px rgba(34,180,90,.35)",
                  border: "none",
                }}
              >
                <div
                  style={{
                    transform: "skewX(8deg)",
                    fontFamily: SF,
                    fontWeight: 800,
                    fontSize: 18,
                    letterSpacing: ".05em",
                    textTransform: "uppercase",
                    color: "#06210f",
                  }}
                >
                  {saving ? "Saving…" : "Save Note"}
                </div>
              </button>
              <button
                onClick={cancelAudio}
                style={{
                  padding: "12px 22px",
                  borderRadius: 8,
                  background: "rgba(120,150,220,.14)",
                  border: "1px solid rgba(120,150,220,.22)",
                  cursor: "pointer",
                  fontFamily: SF,
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: "#aab8e0",
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
