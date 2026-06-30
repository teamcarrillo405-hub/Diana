"use client";

import { useState, useTransition } from "react";
import { Battery, Brain, Leaf, Zap } from "lucide-react";
import { saveMoodCheckIn } from "./actions";
import type { BodyState, FocusState } from "@/lib/support/policy";

const BODY_CHOICES: Array<{ value: BodyState; label: string; detail: string; icon: typeof Leaf }> = [
  { value: "low", label: "Low", detail: "Keep it lighter", icon: Leaf },
  { value: "okay", label: "Okay", detail: "Normal start", icon: Battery },
  { value: "ready", label: "Ready", detail: "Bigger lift", icon: Zap },
];

const FOCUS_CHOICES: Array<{ value: FocusState; label: string; detail: string }> = [
  { value: "scattered", label: "Scattered", detail: "Contain choices" },
  { value: "steady", label: "Steady", detail: "Clear next step" },
  { value: "locked", label: "Locked in", detail: "Use the window" },
];

function choiceStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: "var(--radius-button)",
    border: active ? "1px solid var(--gl-purple-30)" : "1px solid var(--gl-border-neutral)",
    background: active ? "var(--gl-purple-14)" : "var(--gl-bg-energy-btn)",
    padding: "var(--space-6)",
    textAlign: "left",
    cursor: "pointer",
    color: active ? "var(--gl-purple-light)" : "var(--gl-text-secondary)",
  };
}

const legendStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-14)",
  fontWeight: "var(--weight-700)",
  color: "var(--gl-text-primary)",
};

export function MoodCheckIn({ visible }: { visible: boolean }) {
  const [shown, setShown] = useState(visible);
  const [body, setBody] = useState<BodyState | null>(null);
  const [focus, setFocus] = useState<FocusState | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!shown) return null;

  function save(input: { disable?: boolean; skip?: boolean } = {}) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveMoodCheckIn({
        mood: null,
        body: input.skip ? undefined : body ?? undefined,
        focus: input.skip ? undefined : focus ?? undefined,
        disable: input.disable,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setShown(false);
    });
  }

  const readyToSave = Boolean(body && focus);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-10)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--gl-purple-30)",
        background: "var(--gl-bg-card)",
        backdropFilter: "var(--blur-card)",
        WebkitBackdropFilter: "var(--blur-card)",
        padding: "var(--space-12)",
      }}
    >
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-13)", letterSpacing: "var(--tracking-14)", textTransform: "uppercase", color: "var(--gl-purple-light)" }}>
          Daily setup
        </h2>
        <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>
          Two taps so Diana can set the right support level.
        </p>
      </div>

      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <legend style={legendStyle}>How is your body energy?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-4)" }}>
          {BODY_CHOICES.map((choice) => {
            const Icon = choice.icon;
            const active = body === choice.value;
            return (
              <button key={choice.value} type="button" disabled={pending} onClick={() => setBody(choice.value)} aria-pressed={active} style={{ ...choiceStyle(active), opacity: pending ? 0.5 : 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", fontSize: "var(--text-14)", fontWeight: "var(--weight-600)" }}>
                  <Icon size={15} />
                  {choice.label}
                </span>
                <span style={{ marginTop: "var(--space-1)", display: "block", fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{choice.detail}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <legend style={legendStyle}>How is your focus?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-4)" }}>
          {FOCUS_CHOICES.map((choice) => {
            const active = focus === choice.value;
            return (
              <button key={choice.value} type="button" disabled={pending} onClick={() => setFocus(choice.value)} aria-pressed={active} style={{ ...choiceStyle(active), opacity: pending ? 0.5 : 1 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", fontSize: "var(--text-14)", fontWeight: "var(--weight-600)" }}>
                  <Brain size={15} />
                  {choice.label}
                </span>
                <span style={{ marginTop: "var(--space-1)", display: "block", fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{choice.detail}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <button
          type="button"
          disabled={pending || !readyToSave}
          onClick={() => save()}
          style={{
            borderRadius: "var(--radius-button)",
            border: "none",
            background: "var(--gl-purple)",
            padding: "var(--space-4) var(--space-10)",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-800)",
            fontSize: "var(--text-14)",
            letterSpacing: "var(--tracking-04)",
            textTransform: "uppercase",
            color: "#fff",
            cursor: pending || !readyToSave ? "default" : "pointer",
            opacity: pending || !readyToSave ? 0.5 : 1,
          }}
        >
          Set today&apos;s support
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save({ skip: true })}
          style={{ borderRadius: "var(--radius-button)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-btn-neutral)", padding: "var(--space-4) var(--space-8)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)", cursor: pending ? "default" : "pointer", opacity: pending ? 0.5 : 1 }}
        >
          Skip today
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save({ disable: true, skip: true })}
          style={{ borderRadius: "var(--radius-button)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-btn-neutral)", padding: "var(--space-4) var(--space-8)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)", cursor: pending ? "default" : "pointer", opacity: pending ? 0.5 : 1 }}
        >
          Do not ask again
        </button>
      </div>
      {message && <p style={{ fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>{message}</p>}
    </section>
  );
}
