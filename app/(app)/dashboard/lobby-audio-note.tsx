"use client";

import { useRef, useState } from "react";

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
  const recognitionRef = useRef<SRInstance | null>(null);
  const shouldRecordRef = useRef(false);

  function startAudio() {
    const win = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!SR) {
      setRecording(true);
      setTranscript("Speech recognition not supported. Try Chrome or Edge.");
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

  function stopAudio() {
    shouldRecordRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
    // TODO: wire to saveQuickCapture({ raw: transcript }) from components/quick-capture-actions.ts
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
        .gl-record{transition:transform 140ms cubic-bezier(.23,1,.32,1),background .2s;}
        .gl-record:active{transform:scale(.97);}
      `}</style>
      <button
        className="gl-record"
        onClick={() => (recording ? cancelAudio() : startAudio())}
        title={recording ? "Stop recording" : "Start audio note"}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 7,
          border: "1.5px solid rgba(120,150,220,.32)",
          background: recording ? "rgba(255,55,55,.22)" : "rgba(120,150,220,.14)",
          animation: recording ? "gl-mic-pulse 1.5s ease-in-out infinite" : "none",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={recording ? "#ff4444" : "#cdd6f2"}
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
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: recording ? "#ff4444" : "#cdd6f2",
          }}
        >
          Note
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
                style={{
                  transform: "skewX(-8deg)",
                  padding: "12px 28px",
                  borderRadius: 8,
                  background: "linear-gradient(180deg,#36e07a,#16a34a)",
                  cursor: "pointer",
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
                  Save Note
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
