"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePrefs } from "./actions";
import type { ProfilePrefs } from "@/lib/profile";
import type { FontSize, LineSpacing } from "@/lib/supabase/types";

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra large" },
];

const LINE_SPACINGS: { value: LineSpacing; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "loose", label: "Loose" },
];

export function AccessibilityPrefs({ initial }: { initial: ProfilePrefs }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [fontSize, setFontSize] = useState<FontSize>(initial.font_size);
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>(initial.line_spacing);
  const [dyslexiaFont, setDyslexiaFont] = useState(initial.dyslexia_font);
  const [reducedMotion, setReducedMotion] = useState(initial.reduced_motion);
  const [highContrast, setHighContrast] = useState(initial.high_contrast);
  const [ttsEnabled, setTtsEnabled] = useState(initial.tts_enabled);
  const [readingFont, setReadingFont] = useState<"system" | "lexend" | "atkinson" | "opendyslexic">(
    (initial as any).reading_font ?? "system"
  );

  function commit(next: Partial<{
    font_size: FontSize;
    line_spacing: LineSpacing;
    dyslexia_font: boolean;
    reduced_motion: boolean;
    high_contrast: boolean;
    tts_enabled: boolean;
    reading_font: "system" | "lexend" | "atkinson" | "opendyslexic"; // F19
  }>) {
    startTransition(async () => {
      await savePrefs(next);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1200);
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Accessibility</h2>
        {pending && <span className="text-xs text-muted">Saving…</span>}
        {saved && !pending && <span className="text-xs text-ok">Saved.</span>}
      </div>

      <Group label="Text size">
        <div className="flex flex-wrap gap-2">
          {FONT_SIZES.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={fontSize === o.value}
              onClick={() => { setFontSize(o.value); commit({ font_size: o.value }); }}
            />
          ))}
        </div>
      </Group>

      <Group label="Line spacing">
        <div className="flex flex-wrap gap-2">
          {LINE_SPACINGS.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={lineSpacing === o.value}
              onClick={() => { setLineSpacing(o.value); commit({ line_spacing: o.value }); }}
            />
          ))}
        </div>
      </Group>

      <Toggle
        label="Dyslexia-friendly font"
        hint="Swap to a humanist sans (Lexend / Atkinson) with wider word spacing."
        on={dyslexiaFont}
        onChange={(v) => { setDyslexiaFont(v); commit({ dyslexia_font: v }); }}
      />

      <Group label="Reading font">
        <p className="mb-2 text-xs text-muted">
          Applies to reading assignments and long-form text blocks.
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "system", label: "System" },
              { value: "lexend", label: "Lexend" },
              { value: "atkinson", label: "Atkinson" },
              { value: "opendyslexic", label: "OpenDyslexic" },
            ] as const
          ).map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={readingFont === o.value}
              onClick={() => {
                setReadingFont(o.value);
                commit({ reading_font: o.value });
              }}
            />
          ))}
        </div>
      </Group>

      <Toggle
        label="Read-aloud buttons"
        hint="Adds a 🔊 button to task titles and descriptions. Uses your browser's voice — nothing is sent to a server."
        on={ttsEnabled}
        onChange={(v) => { setTtsEnabled(v); commit({ tts_enabled: v }); }}
      />
      <Toggle
        label="Reduce motion"
        hint="Disables animations and transitions."
        on={reducedMotion}
        onChange={(v) => { setReducedMotion(v); commit({ reduced_motion: v }); }}
      />
      <Toggle
        label="High contrast"
        hint="Stronger borders, darker text. Helpful in bright rooms or with low vision."
        on={highContrast}
        onChange={(v) => { setHighContrast(v); commit({ high_contrast: v }); }}
      />
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-card hover:bg-border/30"
      }`}
    >
      {label}
    </button>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-start justify-between gap-3 rounded-md border border-border bg-transparent px-3 py-3 text-left hover:bg-border/30"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          on ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`size-4 rounded-full bg-white transition ${
            on ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
