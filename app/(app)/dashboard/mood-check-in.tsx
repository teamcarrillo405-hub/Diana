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
    <section className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Daily setup</h2>
        <p className="mt-1 text-sm text-muted">
          Two taps so Diana can set the right support level.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">How is your body energy?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {BODY_CHOICES.map((choice) => {
            const Icon = choice.icon;
            const active = body === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                disabled={pending}
                onClick={() => setBody(choice.value)}
                aria-pressed={active}
                className={`touch-target rounded-xl border px-3 py-3 text-left disabled:opacity-50 ${
                  active
                    ? "border-brand/30 bg-brand/10 text-brand-strong dark:text-brand"
                    : "border-border bg-background hover:bg-surface-soft"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon size={15} />
                  {choice.label}
                </span>
                <span className="mt-1 block text-xs text-muted">{choice.detail}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">How is your focus?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FOCUS_CHOICES.map((choice) => {
            const active = focus === choice.value;
            return (
              <button
                key={choice.value}
                type="button"
                disabled={pending}
                onClick={() => setFocus(choice.value)}
                aria-pressed={active}
                className={`touch-target rounded-xl border px-3 py-3 text-left disabled:opacity-50 ${
                  active
                    ? "border-brand/30 bg-brand/10 text-brand-strong dark:text-brand"
                    : "border-border bg-background hover:bg-surface-soft"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Brain size={15} />
                  {choice.label}
                </span>
                <span className="mt-1 block text-xs text-muted">{choice.detail}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={pending || !readyToSave}
          onClick={() => save()}
          className="touch-target inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          Set today&apos;s support
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save({ skip: true })}
          className="touch-target rounded-xl border border-border px-3 py-2 text-sm text-muted hover:bg-surface-soft disabled:opacity-50"
        >
          Skip today
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save({ disable: true, skip: true })}
          className="touch-target rounded-xl border border-border px-3 py-2 text-sm text-muted hover:bg-surface-soft disabled:opacity-50"
        >
          Do not ask again
        </button>
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
    </section>
  );
}
