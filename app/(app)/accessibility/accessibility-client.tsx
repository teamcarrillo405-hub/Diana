"use client";

import { useState, useTransition } from "react";
import { Eye, Save, Type } from "lucide-react";
import { AccessibleReadingText } from "@/components/accessible-reading-text";
import { savePrefs } from "@/app/(app)/settings/actions";

type Prefs = {
  bionic_reading: boolean;
  visual_pacing: "off" | "word" | "line";
  line_focus: boolean;
  dyslexia_font: boolean;
  high_contrast: boolean;
  reduced_motion: boolean;
  font_size: "small" | "normal" | "large" | "xlarge";
  line_spacing: "compact" | "normal" | "loose";
};

const PREVIEW_TEXT =
  "Photosynthesis is the process plants use to turn light, water, and carbon dioxide into glucose. The first useful move is to name what goes in, what comes out, and where the energy comes from.";

export function AccessibilityClient({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(next: Partial<Prefs>) {
    setPrefs((current) => ({ ...current, ...next }));
    setStatus(null);
  }

  function save() {
    startTransition(async () => {
      const result = await savePrefs(prefs);
      setStatus(result.error ? result.error : "Reading profile saved.");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Type size={18} className="text-brand" />
          <h2 className="text-base font-semibold">Controls</h2>
        </div>
        <div className="mt-4 space-y-4">
          <Toggle label="Bionic word starts" checked={prefs.bionic_reading} onChange={(value) => patch({ bionic_reading: value })} />
          <Toggle label="Line focus" checked={prefs.line_focus} onChange={(value) => patch({ line_focus: value })} />
          <Toggle label="Dyslexia-friendly font" checked={prefs.dyslexia_font} onChange={(value) => patch({ dyslexia_font: value })} />
          <Toggle label="Higher contrast" checked={prefs.high_contrast} onChange={(value) => patch({ high_contrast: value })} />
          <Toggle label="Reduced motion" checked={prefs.reduced_motion} onChange={(value) => patch({ reduced_motion: value })} />

          <label className="block text-sm font-medium">
            Visual pacing
            <select
              value={prefs.visual_pacing}
              onChange={(event) => patch({ visual_pacing: event.target.value as Prefs["visual_pacing"] })}
              className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2"
            >
              <option value="off">Off</option>
              <option value="line">Line</option>
              <option value="word">Word</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Text size
              <select
                value={prefs.font_size}
                onChange={(event) => patch({ font_size: event.target.value as Prefs["font_size"] })}
                className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2"
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra large</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Line spacing
              <select
                value={prefs.line_spacing}
                onChange={(event) => patch({ line_spacing: event.target.value as Prefs["line_spacing"] })}
                className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-2"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="loose">Loose</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save size={16} />
            {pending ? "Saving" : "Save profile"}
          </button>
          {status && <p className="text-sm text-muted">{status}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Eye size={18} className="text-brand" />
          <h2 className="text-base font-semibold">Preview</h2>
        </div>
        <AccessibleReadingText
          text={PREVIEW_TEXT}
          prefs={{
            bionic_reading: prefs.bionic_reading,
            visual_pacing: prefs.visual_pacing,
            line_focus: prefs.line_focus,
          }}
          className={`mt-4 rounded-2xl border border-border bg-surface p-4 ${fontSizeClass(prefs.font_size)} ${lineSpacingClass(prefs.line_spacing)}`}
        />
        <p className="mt-4 text-sm text-muted">
          These settings support reading comfort. They do not label or diagnose the student.
        </p>
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 text-sm font-medium">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function fontSizeClass(value: Prefs["font_size"]) {
  if (value === "small") return "text-sm";
  if (value === "large") return "text-lg";
  if (value === "xlarge") return "text-xl";
  return "text-base";
}

function lineSpacingClass(value: Prefs["line_spacing"]) {
  if (value === "compact") return "leading-normal";
  if (value === "loose") return "leading-8";
  return "leading-7";
}
