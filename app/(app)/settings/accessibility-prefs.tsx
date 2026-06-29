"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePrefs } from "./actions";
import type { ProfilePrefs } from "@/lib/profile";
import type {
  FontSize,
  LineSpacing,
  ReadingSpacing,
  TtsProvider,
  VisualPacing,
} from "@/lib/supabase/types";

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

const VISUAL_PACING: { value: VisualPacing; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "word", label: "Word" },
  { value: "line", label: "Line" },
];

const READING_SPACING: { value: ReadingSpacing; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
  { value: "wider", label: "Wider" },
];

const TTS_PROVIDERS: { value: TtsProvider; label: string }[] = [
  { value: "browser", label: "Browser" },
  { value: "openai", label: "OpenAI" },
  { value: "elevenlabs", label: "ElevenLabs" },
];

const TTS_SPEEDS = [0.75, 1, 1.15, 1.25] as const;
const TTS_PITCHES = [0.85, 1, 1.15] as const;

const OPENAI_VOICES = [
  { value: "alloy", label: "Alloy" },
  { value: "echo", label: "Echo" },
  { value: "fable", label: "Fable" },
  { value: "nova", label: "Nova" },
  { value: "shimmer", label: "Shimmer" },
] as const;

const ELEVENLABS_VOICES = [
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Bella" },
  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel" },
  { value: "JBFqnCBsd6RMkjVDRZzb", label: "Calm" },
] as const;

type ReadingFont = "system" | "lexend" | "atkinson" | "opendyslexic";

function defaultVoiceForProvider(provider: TtsProvider): string {
  if (provider === "openai") return "nova";
  if (provider === "elevenlabs") return ELEVENLABS_VOICES[0].value;
  return "default";
}

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
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(initial.tts_provider);
  const [ttsSpeed, setTtsSpeed] = useState(Number(initial.tts_speed ?? 1));
  const [ttsPitch, setTtsPitch] = useState(Number(initial.tts_pitch ?? 1));
  const [ttsVoice, setTtsVoice] = useState(initial.tts_voice ?? defaultVoiceForProvider(initial.tts_provider));
  const [bionicReading, setBionicReading] = useState(initial.bionic_reading);
  const [visualPacing, setVisualPacing] = useState<VisualPacing>(initial.visual_pacing);
  const [lineFocus, setLineFocus] = useState(initial.line_focus);
  const [readingLetterSpacing, setReadingLetterSpacing] = useState<ReadingSpacing>(initial.reading_letter_spacing);
  const [readingWordSpacing, setReadingWordSpacing] = useState<ReadingSpacing>(initial.reading_word_spacing);
  const [readingFont, setReadingFont] = useState<ReadingFont>(
    (initial as { reading_font?: ReadingFont }).reading_font ?? "system",
  );

  function commit(next: Partial<{
    font_size: FontSize;
    line_spacing: LineSpacing;
    dyslexia_font: boolean;
    reduced_motion: boolean;
    high_contrast: boolean;
    tts_enabled: boolean;
    tts_provider: TtsProvider;
    tts_speed: number;
    tts_pitch: number;
    tts_voice: string;
    bionic_reading: boolean;
    visual_pacing: VisualPacing;
    line_focus: boolean;
    reading_letter_spacing: ReadingSpacing;
    reading_word_spacing: ReadingSpacing;
    reading_font: ReadingFont;
  }>) {
    startTransition(async () => {
      await savePrefs(next);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1200);
    });
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Accessibility</h2>
        {pending && <span className="text-xs text-muted">Saving...</span>}
        {saved && !pending && <span className="text-xs text-ok">Saved.</span>}
      </div>

      <Group label="Reading assist">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            label="Bionic reading"
            hint="Bold starts on long-form reading text."
            on={bionicReading}
            onChange={(v) => {
              setBionicReading(v);
              commit({ bionic_reading: v });
            }}
          />
          <Toggle
            label="Line focus"
            hint="Dim nearby lines while reading."
            on={lineFocus}
            onChange={(v) => {
              setLineFocus(v);
              commit({ line_focus: v });
            }}
          />
        </div>
      </Group>

      <Group label="Visual pacing">
        <div className="flex flex-wrap gap-2">
          {VISUAL_PACING.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={visualPacing === o.value}
              onClick={() => {
                setVisualPacing(o.value);
                commit({ visual_pacing: o.value });
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Text size">
        <div className="flex flex-wrap gap-2">
          {FONT_SIZES.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={fontSize === o.value}
              onClick={() => {
                setFontSize(o.value);
                commit({ font_size: o.value });
              }}
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
              onClick={() => {
                setLineSpacing(o.value);
                commit({ line_spacing: o.value });
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Letter spacing">
        <div className="flex flex-wrap gap-2">
          {READING_SPACING.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={readingLetterSpacing === o.value}
              onClick={() => {
                setReadingLetterSpacing(o.value);
                commit({ reading_letter_spacing: o.value });
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Word spacing">
        <div className="flex flex-wrap gap-2">
          {READING_SPACING.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={readingWordSpacing === o.value}
              onClick={() => {
                setReadingWordSpacing(o.value);
                commit({ reading_word_spacing: o.value });
              }}
            />
          ))}
        </div>
      </Group>

      <Toggle
        label="Dyslexia-friendly font"
        hint="Swap the full interface to a humanist typeface."
        on={dyslexiaFont}
        onChange={(v) => {
          setDyslexiaFont(v);
          commit({ dyslexia_font: v });
        }}
      />

      <Group label="Reading font">
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
        hint="Show TTS controls on task descriptions and notes."
        on={ttsEnabled}
        onChange={(v) => {
          setTtsEnabled(v);
          commit({ tts_enabled: v });
        }}
      />

      <Group label="Read-aloud provider">
        <div className="flex flex-wrap gap-2">
          {TTS_PROVIDERS.map((o) => (
            <Pill
              key={o.value}
              label={o.label}
              active={ttsProvider === o.value}
              onClick={() => {
                const voice = defaultVoiceForProvider(o.value);
                setTtsProvider(o.value);
                setTtsVoice(voice);
                commit({ tts_provider: o.value, tts_voice: voice });
              }}
            />
          ))}
        </div>
      </Group>

      {ttsProvider === "openai" && (
        <Group label="OpenAI voice">
          <div className="flex flex-wrap gap-2">
            {OPENAI_VOICES.map((o) => (
              <Pill
                key={o.value}
                label={o.label}
                active={ttsVoice === o.value}
                onClick={() => {
                  setTtsVoice(o.value);
                  commit({ tts_voice: o.value });
                }}
              />
            ))}
          </div>
        </Group>
      )}

      {ttsProvider === "elevenlabs" && (
        <Group label="ElevenLabs voice">
          <div className="flex flex-wrap gap-2">
            {ELEVENLABS_VOICES.map((o) => (
              <Pill
                key={o.value}
                label={o.label}
                active={ttsVoice === o.value}
                onClick={() => {
                  setTtsVoice(o.value);
                  commit({ tts_voice: o.value });
                }}
              />
            ))}
          </div>
          <input
            value={ttsVoice}
            onChange={(event) => setTtsVoice(event.target.value)}
            onBlur={() => commit({ tts_voice: ttsVoice })}
            aria-label="ElevenLabs voice ID"
            className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
        </Group>
      )}

      <Group label="Read-aloud speed">
        <div className="flex flex-wrap gap-2">
          {TTS_SPEEDS.map((speed) => (
            <Pill
              key={speed}
              label={`${speed}x`}
              active={ttsSpeed === speed}
              onClick={() => {
                setTtsSpeed(speed);
                commit({ tts_speed: speed });
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Read-aloud pitch">
        <div className="flex flex-wrap gap-2">
          {TTS_PITCHES.map((pitch) => (
            <Pill
              key={pitch}
              label={`${pitch}x`}
              active={ttsPitch === pitch}
              onClick={() => {
                setTtsPitch(pitch);
                commit({ tts_pitch: pitch });
              }}
            />
          ))}
        </div>
      </Group>

      <Toggle
        label="Reduce motion"
        hint="Disable animations and transitions."
        on={reducedMotion}
        onChange={(v) => {
          setReducedMotion(v);
          commit({ reduced_motion: v });
        }}
      />
      <Toggle
        label="High contrast"
        hint="Use stronger borders and foreground contrast."
        on={highContrast}
        onChange={(v) => {
          setHighContrast(v);
          commit({ high_contrast: v });
        }}
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
      aria-pressed={active}
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
      role="switch"
      aria-checked={on}
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
