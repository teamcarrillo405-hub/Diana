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
    (initial as { reading_font?: ReadingFont }).reading_font ?? (initial.dyslexia_font ? "opendyslexic" : "system"),
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
    <section className="sd-accessibility-preferences space-y-5 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Accessibility</h2>
        {pending && <span className="text-xs text-muted">Saving...</span>}
        {saved && !pending && <span className="text-xs text-ok">Saved.</span>}
      </div>

      <div className="sd-accessibility-layout">
        <Group label="Reading display" className="sd-accessibility-group--display">
          <div className="sd-accessibility-choice-grid sd-accessibility-choice-grid--display">
            <label className="sd-accessibility-select-control">
              <span>Text size</span>
              <select
                aria-label="Text size"
                value={fontSize}
                onChange={(event) => {
                  const next = event.target.value as FontSize;
                  setFontSize(next);
                  commit({ font_size: next });
                }}
              >
                {FONT_SIZES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="sd-accessibility-select-control">
              <span>Line spacing</span>
              <select
                aria-label="Line spacing"
                value={lineSpacing}
                onChange={(event) => {
                  const next = event.target.value as LineSpacing;
                  setLineSpacing(next);
                  commit({ line_spacing: next });
                }}
              >
                {LINE_SPACINGS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="sd-accessibility-select-control">
              <span>Reading font</span>
              <select
                aria-label="Reading font"
                value={readingFont}
                onChange={(event) => {
                  const next = event.target.value as ReadingFont;
                  setReadingFont(next);
                  commit({ reading_font: next, dyslexia_font: next === "opendyslexic" });
                }}
              >
                <option value="system">System</option>
                <option value="lexend">Lexend</option>
                <option value="atkinson">Atkinson</option>
                <option value="opendyslexic">OpenDyslexic</option>
              </select>
            </label>
          </div>
        </Group>

        <Group label="Reading support">
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Bionic reading" hint="Bold starts on long-form reading text." on={bionicReading} onChange={(v) => { setBionicReading(v); commit({ bionic_reading: v }); }} />
            <Toggle label="Line focus" hint="Dim nearby lines while reading." on={lineFocus} onChange={(v) => { setLineFocus(v); commit({ line_focus: v }); }} />
            <ChoiceField label="Visual pacing">
              {VISUAL_PACING.map((o) => (
                <Pill key={o.value} label={o.label} active={visualPacing === o.value} onClick={() => { setVisualPacing(o.value); commit({ visual_pacing: o.value }); }} />
              ))}
            </ChoiceField>
          </div>
          <details className="sd-accessibility-disclosure">
            <summary>Fine tune text spacing</summary>
            <div className="sd-accessibility-choice-grid">
              <ChoiceField label="Letter spacing">
                {READING_SPACING.map((o) => (
                  <Pill key={o.value} label={o.label} active={readingLetterSpacing === o.value} onClick={() => { setReadingLetterSpacing(o.value); commit({ reading_letter_spacing: o.value }); }} />
                ))}
              </ChoiceField>
              <ChoiceField label="Word spacing">
                {READING_SPACING.map((o) => (
                  <Pill key={o.value} label={o.label} active={readingWordSpacing === o.value} onClick={() => { setReadingWordSpacing(o.value); commit({ reading_word_spacing: o.value }); }} />
                ))}
              </ChoiceField>
            </div>
          </details>
        </Group>

        <Group label="Read aloud" className="sd-accessibility-group--speech">
          <Toggle label="Read-aloud buttons" hint="Show listening controls on work and notes." on={ttsEnabled} onChange={(v) => { setTtsEnabled(v); commit({ tts_enabled: v }); }} />
          <details className="sd-accessibility-disclosure" open={ttsEnabled}>
            <summary>Voice settings</summary>
            <div className="sd-accessibility-choice-grid sd-accessibility-choice-grid--voice">
              <label className="sd-accessibility-select-control">
                <span>Provider</span>
                <select
                  aria-label="Read aloud provider"
                  value={ttsProvider}
                  onChange={(event) => {
                    const next = event.target.value as TtsProvider;
                    const voice = defaultVoiceForProvider(next);
                    setTtsProvider(next);
                    setTtsVoice(voice);
                    commit({ tts_provider: next, tts_voice: voice });
                  }}
                >
                  {TTS_PROVIDERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {ttsProvider === "openai" && <label className="sd-accessibility-select-control">
                <span>Voice</span>
                <select aria-label="OpenAI voice" value={ttsVoice} onChange={(event) => { setTtsVoice(event.target.value); commit({ tts_voice: event.target.value }); }}>
                  {OPENAI_VOICES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>}
              {ttsProvider === "elevenlabs" && <label className="sd-accessibility-select-control">
                <span>Voice</span>
                <select aria-label="ElevenLabs voice" value={ttsVoice} onChange={(event) => { setTtsVoice(event.target.value); commit({ tts_voice: event.target.value }); }}>
                  {ELEVENLABS_VOICES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>}
              <label className="sd-accessibility-select-control">
                <span>Speed</span>
                <select aria-label="Read aloud speed" value={ttsSpeed} onChange={(event) => { const next = Number(event.target.value); setTtsSpeed(next); commit({ tts_speed: next }); }}>
                  {TTS_SPEEDS.map((option) => <option key={option} value={option}>{option}x</option>)}
                </select>
              </label>
              <label className="sd-accessibility-select-control">
                <span>Pitch</span>
                <select aria-label="Read aloud pitch" value={ttsPitch} onChange={(event) => { const next = Number(event.target.value); setTtsPitch(next); commit({ tts_pitch: next }); }}>
                  {TTS_PITCHES.map((option) => <option key={option} value={option}>{option}x</option>)}
                </select>
              </label>
              {ttsProvider === "elevenlabs" && <label className="sd-accessibility-select-control sd-accessibility-voice-id">
                <span>ElevenLabs voice ID</span>
                <input value={ttsVoice} onChange={(event) => setTtsVoice(event.target.value)} onBlur={() => commit({ tts_voice: ttsVoice })} aria-label="ElevenLabs voice ID" />
              </label>}
            </div>
          </details>
        </Group>

        <Group label="Motion & contrast" className="sd-accessibility-group--comfort">
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Reduce motion" hint="Keep transitions and animations still." on={reducedMotion} onChange={(v) => { setReducedMotion(v); commit({ reduced_motion: v }); }} />
            <Toggle label="High contrast" hint="Use stronger borders and text contrast." on={highContrast} onChange={(v) => { setHighContrast(v); commit({ high_contrast: v }); }} />
          </div>
        </Group>
      </div>
    </section>
  );
}

function Group({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`sd-accessibility-group space-y-2 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  );
}

function ChoiceField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sd-accessibility-choice-field">
      <p>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`sd-accessibility-pill rounded-md border px-3 py-1.5 text-sm transition ${
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
      className="sd-accessibility-toggle flex w-full items-start justify-between gap-3 rounded-md border border-border bg-transparent px-3 py-3 text-left hover:bg-border/30"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`mt-0.5 inline-flex h-5 w-10 shrink-0 items-center rounded-[4px] p-[2px] transition ${
          on ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`size-4 rounded-[2px] bg-white transition ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
