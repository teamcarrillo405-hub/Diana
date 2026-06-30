"use client";

import { useEffect, useState, useTransition } from "react";
import { saveWeeklyReflection, skipWeeklyReflection } from "./actions";
import { shouldShowWeeklyReflection } from "@/lib/emotional/session";

type Mood = "good" | "meh" | "rough";

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--radius-card)",
  border: "1px solid var(--gl-purple-30)",
  background: "var(--gl-bg-card)",
  backdropFilter: "var(--blur-card)",
  WebkitBackdropFilter: "var(--blur-card)",
  padding: "var(--space-12)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-8)",
};

export function WeeklyReflection({
  lastReflectedAt,
  mood,
}: {
  lastReflectedAt: string | null;
  mood: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [body, setBody] = useState("");
  const [reflection, setReflection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisible(shouldShowWeeklyReflection({ lastReflectedAt, now: new Date() }));
  }, [lastReflectedAt]);

  if (!visible) return null;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveWeeklyReflection({
        body,
        mood: mood === "good" || mood === "meh" || mood === "rough" ? (mood as Mood) : null,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setReflection(result.reflection);
    });
  }

  function skip() {
    startTransition(async () => {
      const result = await skipWeeklyReflection();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setVisible(false);
    });
  }

  return (
    <section style={cardStyle}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-13)", letterSpacing: "var(--tracking-14)", textTransform: "uppercase", color: "var(--gl-purple-light)" }}>
          Weekly reflection
        </h2>
        <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>What clicked this week? What still feels foggy?</p>
      </div>
      {reflection ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <p style={{ borderRadius: "var(--radius-button)", border: "1px solid var(--gl-cyan-22)", background: "var(--gl-cyan-08)", padding: "var(--space-6) var(--space-8)", fontSize: "var(--text-14)", color: "var(--gl-text-secondary)" }}>
            {reflection}
          </p>
          <button
            type="button"
            onClick={() => setVisible(false)}
            style={{ alignSelf: "flex-start", borderRadius: "var(--radius-button)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-btn-neutral)", padding: "var(--space-4) var(--space-8)", fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="A few words is enough."
            style={{
              width: "100%",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--gl-purple-30)",
              background: "var(--gl-bg-input)",
              padding: "var(--space-6) var(--space-8)",
              fontSize: "var(--text-14)",
              fontFamily: "var(--font-body)",
              color: "var(--gl-text-primary)",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <button
              type="button"
              onClick={save}
              disabled={pending || body.trim().length < 2}
              style={{
                borderRadius: "var(--radius-button)",
                border: "none",
                background: "var(--gl-purple)",
                padding: "var(--space-4) var(--space-8)",
                fontFamily: "var(--font-display)",
                fontWeight: "var(--weight-800)",
                fontSize: "var(--text-14)",
                letterSpacing: "var(--tracking-04)",
                textTransform: "uppercase",
                color: "#fff",
                cursor: pending || body.trim().length < 2 ? "default" : "pointer",
                opacity: pending || body.trim().length < 2 ? 0.5 : 1,
              }}
            >
              Save reflection
            </button>
            <button
              type="button"
              onClick={skip}
              disabled={pending}
              style={{
                borderRadius: "var(--radius-button)",
                border: "1px solid var(--gl-border-neutral)",
                background: "var(--gl-bg-btn-neutral)",
                padding: "var(--space-4) var(--space-8)",
                fontSize: "var(--text-14)",
                color: "var(--gl-text-muted)",
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.5 : 1,
              }}
            >
              Skip this week
            </button>
          </div>
          {message && <p style={{ fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>{message}</p>}
        </>
      )}
    </section>
  );
}
