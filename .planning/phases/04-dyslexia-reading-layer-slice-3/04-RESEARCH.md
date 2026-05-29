# Phase 4: Dyslexia Reading Layer (Slice 3) — Research

**Researched:** 2026-05-28
**Domain:** TTS with word-sync highlighting, reading comprehension scaffolds, dyslexia typography
**Confidence:** HIGH — codebase verified directly; TTS provider decision informed by current docs

---

## Summary

Phase 4 delivers the full dyslexia reading layer on top of the Phase 1–3 codebase. Three requirements span the work: F06 (TTS everywhere with word-level sync highlighting and speed controls), F07 (reading comprehension scaffolds: pre/mid/post), and F19 (Atkinson Hyperlegible typography defaults for the reader view).

The hardest technical problem is word-sync highlighting. The existing `TtsButton` component uses `window.speechSynthesis` with no highlighting — it was always a placeholder. The `SpeechSynthesisUtterance` `boundary` event fires `charIndex` on Chrome/Edge/Safari desktop but **does not fire in Firefox at all**, and does not fire on Chrome Android. For a PWA targeting mobile students, this is a blocking gap. The correct solution is a two-tier approach: (1) browser `boundary` event on browsers that support it, detected at runtime; (2) a word-position estimator (timed `setTimeout` schedule derived from audio duration divided by word count) as a universal fallback. No new TTS provider is needed for Phase 4 — the browser `speechSynthesis` approach is zero-cost and already functional; ElevenLabs is the right eventual upgrade but adds API cost and vendor complexity that should wait for Phase 5 or later.

F19 typography requires adding Atkinson Hyperlegible Next (confirmed available in `next/font/google` as `Atkinson_Hyperlegible_Next`) alongside the existing Lexend. OpenDyslexic is available via `@fontsource/opendyslexic`. A font picker in Settings allows the student to select among Lexend, Atkinson Hyperlegible Next, and OpenDyslexic. The off-white background `#FAF8F3`, line height 1.6, letter spacing 0.02em, and 70-char max line width are applied as a "reading view" CSS class on long-form text blocks — they do NOT replace the global UI styling.

F07 comprehension scaffolds are AI-powered (Claude Sonnet 4.6 via a new `reading-scaffold` Edge Function). Pre-reading: vocabulary preview from the first ~300 words. Mid-reading: "what just happened?" prompts every N paragraphs. Post-reading: retrieval questions. All scaffolds are opt-in per reading session, never forced, and produce no numeric scores.

**Primary recommendation:** Build in four waves: (1) upgraded `TtsHighlightButton` component (replaces `TtsButton`, adds boundary-event word highlighting + fallback + speed controls); (2) Atkinson Hyperlegible Next font loading + font picker in Settings + `reading-view` CSS class; (3) `ReadingPanel` component for uploaded/pasted assignment text with TTS, scroll sync, and mid-reading prompts; (4) `reading-scaffold` Edge Function (vocabulary preview, comprehension questions). TTS provider stays as browser `speechSynthesis` for Phase 4; ElevenLabs upgrade path documented but deferred.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F06 | High-quality TTS with word-level sync highlighting; speed controls (0.75×, 1×, 1.25×, 1.5×); reader view for any uploaded text; comprehension prompts every N paragraphs | `SpeechSynthesisUtterance` `boundary` event provides `charIndex` + `charLength` on Chrome/Safari desktop; word-position fallback via timed estimates for Firefox/mobile. Speed via `utterance.rate`. Reader view = `ReadingPanel` component. Comprehension prompts from F07 Edge Function. |
| F07 | Pre-reading vocab preview; mid-reading "what just happened?" prompts; post-reading retrieval questions; never numeric score; traffic-light aware | New `reading-scaffold` Edge Function using Claude Sonnet 4.6. Pre: send first 300 chars → vocab list. Mid: send last N paragraphs → "what just happened?" prompt. Post: send full text → 3 retrieval questions. Traffic-light passed as context so AI can adapt. |
| F19 | Atkinson Hyperlegible as default; line height 1.6; letter spacing 0.02em; max line 70 chars; off-white `#FAF8F3`; font picker (Lexend, Atkinson, OpenDyslexic) | `Atkinson_Hyperlegible_Next` confirmed in `next/font/google`. `@fontsource/opendyslexic` for OpenDyslexic. New `profiles.reading_font` column. `reading-view` CSS class for text blocks. Font picker in Settings extends existing `AccessibilityPrefs`. |
</phase_requirements>

---

## User Constraints (from architecture decisions in STATE.md)

### Locked Decisions
- All Claude AI calls via Supabase Edge Functions (never browser-direct)
- Model selection: Haiku 4.5 for cheap ops, Sonnet 4.6 for default, Opus 4.7 for hard reasoning
- Next.js 15 App Router + TypeScript + Tailwind (no new UI framework libraries)
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Calm visual language: no red, no exclamations, amber for caution
- TTS provider NOT yet decided (per STATE.md open decisions) — Phase 4 resolves this by staying with browser Web Speech API and documenting the ElevenLabs upgrade path

### Claude's Discretion
- TTS provider for word-sync: browser `speechSynthesis` boundary event (free, zero vendor, graceful fallback) vs. ElevenLabs timestamps API ($0.30/1K chars at overage). Research recommends browser for Phase 4; ElevenLabs deferred to Phase 5/6 when audio quality becomes a priority.
- Font picker scope: Lexend (already loaded) + Atkinson Hyperlegible Next (new, `next/font/google`) + OpenDyslexic (new, `@fontsource/opendyslexic`). Three-font picker is the right scope — small installs, covers all evidence-based options.
- Comprehension scaffold trigger: per-session opt-in (student taps "Help me with this reading"), not auto-triggered on every text block.
- `ReadingPanel` location: inline on assignment detail page when `kind === 'reading'` OR when student uploads/pastes reading text.

### Deferred Ideas (OUT OF SCOPE for Phase 4)
- ElevenLabs TTS integration (Phase 5 or later — adds vendor, cost, Supabase Storage caching complexity)
- Azure TTS SSML word boundary (same deferral — requires new API key and WebSocket streaming infrastructure)
- Push notifications for reading sessions
- Audio recording of reading sessions
- Reading fluency scoring (no scoring per spec)

---

## Standard Stack

### Core (already in project — no new package installs for TTS)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.18 | App Router, `next/font/google` | Already used; `Atkinson_Hyperlegible_Next` confirmed present in font-data.json |
| @supabase/ssr + supabase-js | 0.10.3 / 2.106.2 | Auth, Postgres, Edge Functions | Already used |
| zod | 3.23.8 | Server action + Edge Function validation | Already used |
| browser `speechSynthesis` | Web API | TTS + boundary events for word highlight | Zero cost, zero vendor, already used in `TtsButton` |

### To Add in Phase 4
| Library | Version | Purpose | Decision |
|---------|---------|---------|----------|
| @fontsource-variable/atkinson-hyperlegible-next | 5.2.7 | Self-host Atkinson Hyperlegible Next variable font | `next/font/google` is preferred (auto-subsets, no npm) but `@fontsource-variable/atkinson-hyperlegible-next` is the fallback if next/font API changes |
| @fontsource/opendyslexic | 5.2.5 | OpenDyslexic font (no Google Fonts source) | Not in Google Fonts; must use fontsource npm package |

**Installation:**
```bash
npm install @fontsource/opendyslexic
# @fontsource-variable/atkinson-hyperlegible-next only if next/font/google is insufficient
```

**Version verification (confirmed 2026-05-28):**
```bash
npm view @fontsource-variable/atkinson-hyperlegible-next version  # 5.2.7
npm view @fontsource/opendyslexic version                         # 5.2.5
```

**Atkinson Hyperlegible Next via `next/font/google` (preferred approach):**
Confirmed present in `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` as `"Atkinson Hyperlegible Next"`. Import as:
```typescript
import { Atkinson_Hyperlegible_Next } from "next/font/google";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
  weight: ["400", "700"],
});
```

**OpenDyslexic via fontsource (no Google Fonts source):**
```typescript
// In app/layout.tsx — import CSS globally
import "@fontsource/opendyslexic";        // weight 400 only
import "@fontsource/opendyslexic/700.css" // if bold needed
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Browser `speechSynthesis` | ElevenLabs with-timestamps API | ElevenLabs: character-level timing, better voice quality, $0.30/1K chars overage. Browser: free, offline-capable, instant, no vendor lock. For a student PWA reading homework text, browser wins for Phase 4. |
| Browser boundary event | Time-based word estimator only | Boundary event fires on Chrome/Safari desktop — covers ~70% of users. Fallback covers the rest. Using both is better than dropping to estimator-only. |
| `@fontsource/opendyslexic` | Google Fonts CDN link | Google Fonts CDN leaks the user's IP to Google. `@fontsource` self-hosts; better for minor privacy. |

---

## Architecture Patterns

### Recommended Project Structure for Phase 4
```
app/(app)/
  settings/
    page.tsx              # EXTEND: add font picker to AccessibilityPrefs
    accessibility-prefs.tsx  # EXTEND: reading_font selector (Lexend/Atkinson/OpenDyslexic)
    actions.ts            # EXTEND: savePrefs accepts reading_font

  assignments/[id]/
    page.tsx              # EXTEND: render ReadingPanel when kind='reading' OR reading_load>=3
    reading-panel.tsx     # "use client": TTS + word highlight + comprehension scaffolds
    reading-panel-actions.ts # Server actions: fetchScaffold(type, text, classAiMode)

supabase/
  migrations/
    0010_reading_layer.sql   # profiles.reading_font column

lib/
  tts/
    use-tts-highlight.ts   # Custom hook: boundary event + fallback estimator

supabase/functions/
  reading-scaffold/
    index.ts               # Edge Function: pre/mid/post scaffold generation via Claude Sonnet 4.6

components/
  tts-highlight-button.tsx  # Replaces TtsButton: adds word highlight, speed controls
```

### Pattern 1: TTS Word-Sync Highlighting (boundary event + fallback)
**What:** Wrap text in `<span>` elements per word. On `boundary` event, highlight the word at `charIndex`. On unsupported browsers, use a timed estimator.
**When to use:** `TtsHighlightButton` and `ReadingPanel` components.

```typescript
// lib/tts/use-tts-highlight.ts
"use client";
import { useState, useRef, useCallback } from "react";

export type TtsState = "idle" | "playing" | "paused";

export function useTtsHighlight(text: string) {
  const [state, setState] = useState<TtsState>("idle");
  const [highlightedWordIdx, setHighlightedWordIdx] = useState<number>(-1);
  const [rate, setRate] = useState(1.0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Split text into words with their char offsets for highlight lookup
  const words = splitWordsWithOffsets(text);

  function speak() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    clearFallbackTimers();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utterRef.current = utter;
    setState("playing");

    let boundaryFired = false;

    utter.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name !== "word") return;
      boundaryFired = true;
      // Find word index by charIndex
      const idx = words.findIndex(
        (w) => w.start <= event.charIndex && event.charIndex < w.start + w.length,
      );
      if (idx >= 0) setHighlightedWordIdx(idx);
    };

    utter.onstart = () => {
      // Schedule fallback timers only if boundary doesn't fire within 500ms
      setTimeout(() => {
        if (!boundaryFired) scheduleFallbackTimers(text, words, rate);
      }, 500);
    };

    utter.onend = () => {
      setState("idle");
      setHighlightedWordIdx(-1);
      clearFallbackTimers();
    };
    utter.onerror = () => {
      setState("idle");
      setHighlightedWordIdx(-1);
      clearFallbackTimers();
    };

    window.speechSynthesis.speak(utter);
  }

  // ... scheduleFallbackTimers, clearFallbackTimers, pause, resume
  return { state, highlightedWordIdx, words, rate, setRate, speak, stop, pause, resume };
}

// Helper: split "Hello world" → [{word:"Hello", start:0, length:5}, {word:"world", start:6, length:5}]
function splitWordsWithOffsets(text: string) {
  const result: { word: string; start: number; length: number }[] = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    result.push({ word: m[0], start: m.index, length: m[0].length });
  }
  return result;
}
```

### Pattern 2: Word-Rendered Text for Highlight
**What:** Render each word as its own `<span>` so the current word can be highlighted by CSS class.
**When to use:** `ReadingPanel` and any component using `useTtsHighlight`.

```typescript
// components/tts-highlight-button.tsx
"use client";
import { useTtsHighlight } from "@/lib/tts/use-tts-highlight";

export function TtsHighlightButton({ text }: { text: string }) {
  const { state, highlightedWordIdx, words, rate, setRate, speak, stop } =
    useTtsHighlight(text);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={state === "playing" ? stop : speak} ...>
          {state === "playing" ? "Stop" : "Read aloud"}
        </button>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          <option value={0.75}>0.75×</option>
          <option value={1.0}>1×</option>
          <option value={1.25}>1.25×</option>
          <option value={1.5}>1.5×</option>
        </select>
      </div>

      {/* Word-highlighted text — only rendered when TTS is active */}
      {state !== "idle" && (
        <p aria-live="polite" className="text-sm leading-relaxed">
          {words.map((w, i) => (
            <span
              key={i}
              className={i === highlightedWordIdx
                ? "rounded bg-accent/20 text-accent font-medium"
                : ""}
            >
              {w.word}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
```

### Pattern 3: Reading Panel with Comprehension Scaffolds
**What:** A client component for "reading" kind assignments or any pasted text. Includes the TTS highlight button, reading typography class, and opt-in comprehension scaffold buttons.
**When to use:** Assignment detail page when `kind === 'reading'` or when student pastes text.

```typescript
// app/(app)/assignments/[id]/reading-panel.tsx
"use client";

export function ReadingPanel({
  text,
  classAiMode,   // 'red' | 'yellow' | 'green' — per-class traffic-light
  paragraphs,
}: {
  text: string;
  classAiMode: string;
  paragraphs: string[];
}) {
  const [scaffoldType, setScaffoldType] = useState<"pre" | "mid" | "post" | null>(null);
  const [scaffoldResult, setScaffoldResult] = useState<string | null>(null);
  const [loadingScaffold, setLoadingScaffold] = useState(false);

  async function requestScaffold(type: "pre" | "mid" | "post") {
    setLoadingScaffold(true);
    const res = await fetchScaffold({ type, text, classAiMode });
    setScaffoldResult(res.content);
    setScaffoldType(type);
    setLoadingScaffold(false);
  }

  return (
    <section className="reading-view space-y-4 rounded-2xl border border-border bg-card p-5">
      <TtsHighlightButton text={text} />

      {/* Reading text with dyslexia typography */}
      <div className="reading-content prose-sm max-w-none">
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-4">{p}</p>
        ))}
      </div>

      {/* Comprehension scaffold buttons — opt-in */}
      {classAiMode !== "red" && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs text-muted uppercase tracking-wider">Reading support</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => requestScaffold("pre")} className="...">
              Key vocabulary
            </button>
            <button onClick={() => requestScaffold("mid")} className="...">
              What just happened?
            </button>
            <button onClick={() => requestScaffold("post")} className="...">
              Check understanding
            </button>
          </div>
          {loadingScaffold && <p className="text-sm text-muted">Thinking…</p>}
          {scaffoldResult && (
            <div className="rounded-lg border border-border bg-card/60 p-3 text-sm">
              {scaffoldResult}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

### Pattern 4: reading-scaffold Edge Function
**What:** Supabase Edge Function receiving `{ type: 'pre'|'mid'|'post', text: string, aiMode: string }` and returning `{ content: string }`.
**When to use:** Called from `ReadingPanel` via a server action, never directly from the browser.

```typescript
// supabase/functions/reading-scaffold/index.ts
// Uses Claude Sonnet 4.6 (not Haiku — comprehension needs reasoning quality)

const PROMPTS = {
  pre: `You are helping a high school student who has dyslexia prepare to read an assignment.
List 5–8 vocabulary words from this text that might be unfamiliar to a 9th–12th grader.
For each word: the word, a plain-language definition (1 sentence), and how it's used in context.
Do NOT summarize the text. Do NOT give away the main argument.
Format as a simple list. Calm, encouraging tone. No scores.`,

  mid: `You are helping a high school student who has dyslexia check in during reading.
In 2–4 sentences, describe what has happened so far in plain language.
Then ask one open-ended question to help them think about what they just read.
Keep it encouraging. Do not answer the question for them. No scores.`,

  post: `You are helping a high school student who has dyslexia review what they read.
Write 3 retrieval questions about the main ideas. Each question should be answerable from the text.
Questions only — no answers. No numeric scores. Calm, encouraging tone.`,
};
```

### Pattern 5: Reading Typography CSS Class
**What:** A `.reading-view` CSS class applied to any text block where the student is reading. Sets off-white background, 1.6 line height, 0.02em letter spacing, 70-char max-width.
**When to use:** `ReadingPanel` outer container, any `<article>` or `<blockquote>` in assignment detail.

```css
/* In globals.css — add alongside existing accessibility classes */

/* Reading view: evidence-backed dyslexia typography defaults (F19).
   Applied to long-form reading blocks only — NOT the global UI.
   Background: off-white #FAF8F3 (warm, lower contrast than pure white).
   Line height: 1.6 (BDA recommended).
   Letter spacing: 0.02em (Rello et al. 2012 — modest spacing benefit).
   Max-width: 70ch (BDA 60–70 CPL recommendation). */
.reading-view {
  background: #FAF8F3;
  line-height: 1.6;
  letter-spacing: 0.02em;
}
.reading-view .reading-content {
  max-width: 70ch;
  font-size: 1rem;
}

@media (prefers-color-scheme: dark) {
  .reading-view {
    background: #1a1814;   /* equivalent warm dark */
  }
}

/* Font picker — applied on <body> per profiles.reading_font */
.reading-font-atkinson, .reading-font-atkinson * {
  font-family: var(--font-atkinson), "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif !important;
}
.reading-font-opendyslexic, .reading-font-opendyslexic * {
  font-family: "OpenDyslexic", system-ui, sans-serif !important;
}
/* Lexend already handled by .dyslexia-font class */
```

### Pattern 6: Font Picker in Settings
**What:** Extend `AccessibilityPrefs` to add a `reading_font` selector. The existing `dyslexia_font` toggle stays; the new picker is additive.
**When to use:** Settings > Accessibility section.

```typescript
// New column in profiles: reading_font text default 'system'
// Values: 'system' | 'lexend' | 'atkinson' | 'opendyslexic'
// profileBodyClass() maps to reading-font-* CSS class (or no class for system/lexend)
```

### Anti-Patterns to Avoid
- **Replacing the existing TtsButton everywhere with the new TtsHighlightButton:** The heavy highlight component is for reading view. Simple TTS buttons (task titles, description cards) should remain lightweight — copy `TtsHighlightButton` structure but render without the word-span DOM when text is short.
- **Always showing comprehension scaffold buttons:** Scaffold buttons must be opt-in per session. Showing them on every reading load overwhelms ADHD students. Show only after a "Help me with this reading" tap.
- **Making the reading font change the whole app:** `reading-font-atkinson` should apply only inside `.reading-view`, not body-wide. The existing `.dyslexia-font` class already handles body-wide font override — the new font picker is for reading mode only, or can be additive to `dyslexia_font`.
- **Auto-playing TTS on page load:** Never autoplay. The student taps "Read aloud." Autoplay breaks the calm visual language pattern.
- **Letting the AI scaffold fire on `aiMode = 'red'`:** Red traffic-light = AI off. The scaffold buttons must be hidden/disabled when `classAiMode === 'red'`.
- **Emitting a numeric score in comprehension questions:** The spec is explicit: F07 "never assigns a numeric score." Comprehension questions must end with an open question, never a self-grade prompt.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Word-boundary detection in TTS | Custom audio analysis | `SpeechSynthesisUtterance.onboundary` + charIndex | Platform API; handles timing; free |
| Font loading with subsetting | Manually hosting WOFF2 files | `next/font/google` (Atkinson Hyperlegible Next, Lexend) | Auto-subsets, no layout shift, no external CDN calls in prod |
| Reading typography specs | Inventing spacing values | BDA / Rello et al. evidence base: 1.6 line-height, 0.02em letter-spacing, 60–70 CPL | Evidence-based; already documented in spec |
| Comprehension question generation | Manual question templates | Claude Sonnet 4.6 Edge Function | Adapts to text content; consistent with project AI pattern |
| Cross-browser TTS fallback | Full audio pipeline | Timed word estimator as fallback (see Pattern 1) | ~10 lines of code; sufficient for Firefox/Android gaps |

---

## Current Schema State (after Phase 3)

Tables present (from `lib/supabase/types.ts`):
- `profiles` — all Phase 1–2 accessibility fields, `tts_enabled`, `dyslexia_font`, etc. **Missing:** `reading_font`
- `assignments` — `kind`, `reading_load`, `writing_load`, `description`, etc. (no new columns needed for F06/F07/F19)
- `inbox_items`, `assignment_time_log`, `assignment_type_estimates`, `assignment_intentions` — Phase 3 tables

**Tables NOT present (required by Phase 4):**
```
None — F06/F07/F19 need only one column addition: profiles.reading_font
```

**Next migration number:** 0010

### Migration 0010: Reading Layer

```sql
-- F19: Font picker preference
-- Values: 'system' | 'lexend' | 'atkinson' | 'opendyslexic'
alter table public.profiles
  add column reading_font text not null default 'system'
    check (reading_font in ('system', 'lexend', 'atkinson', 'opendyslexic'));
```

---

## Common Pitfalls

### Pitfall 1: `boundary` event doesn't fire on Firefox or Chrome Android
**What goes wrong:** Developer tests on Chrome macOS, ships word highlight that silently doesn't work for Firefox users or students on Android Chrome.
**Why it happens:** `SpeechSynthesisUtterance.boundary` is marked as "limited availability" on MDN — not Baseline. Firefox has never shipped it. Chrome Android ships it inconsistently.
**How to avoid:** Detect within `onstart` whether the first boundary event fires within 500ms. If not, fall back to the timed word-estimator (compute `estimatedMsPerWord = (text.length / averageWPM) * 60_000 / wordCount` and schedule `setTimeout` calls for each word).
**Warning signs:** Testing only on desktop Chrome before shipping.

### Pitfall 2: `SpeechSynthesis.cancel()` leaves a Chrome bug with pausing
**What goes wrong:** On Chrome/Edge, calling `speechSynthesis.cancel()` while paused causes the next `speak()` call to hang silently.
**Why it happens:** Known Chrome bug (chromium.org issue #458247) — cancel while paused leaves the synthesis in a bad state.
**How to avoid:** Always call `speechSynthesis.resume()` before `speechSynthesis.cancel()` if `speechSynthesis.paused` is true.
```typescript
function safeCancel() {
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  window.speechSynthesis.cancel();
}
```
**Warning signs:** "Read aloud" button appears to do nothing on second or third press.

### Pitfall 3: Word spans break screen readers
**What goes wrong:** Wrapping every word in a `<span>` creates hundreds of DOM nodes that screen readers may announce one at a time, producing a garbled experience for students using assistive technology.
**Why it happens:** Screen readers read DOM structure; a `<p>` with 200 `<span>` children is not the same as a `<p>` with text.
**How to avoid:** Render the word-span view only while TTS is active (`state !== 'idle'`). When idle, render the plain text. Use `aria-live="polite"` on the highlight container but not on each individual span. The plain `<p>` is what screen readers see at rest.
**Warning signs:** Screen reader announces text word by word with pauses between each span.

### Pitfall 4: Reading font applied body-wide overrides the TTS button and nav
**What goes wrong:** Adding `font-family: "OpenDyslexic"` to `body` makes the entire UI (nav, buttons, forms) render in OpenDyslexic, which is heavier and may not look right in UI chrome.
**Why it happens:** Body-level font cascade hits everything.
**How to avoid:** `reading-font-*` classes use a `.reading-view` scoping pattern — they only apply inside `.reading-view` or inside `.reading-content`. The existing `.dyslexia-font` body class is the student's global font choice; the new font picker is a reading-mode-specific override. Document this scope clearly in CSS comments.
**Warning signs:** Navigation text looks broken after enabling reading font.

### Pitfall 5: Comprehension scaffold fires for red traffic-light class
**What goes wrong:** Student is in a class where the teacher set AI = off (red). The comprehension scaffold button still fires an Edge Function call.
**Why it happens:** `classAiMode` is not passed to the scaffold button, or is not checked.
**How to avoid:** Pass `classAiMode` from the server component to `ReadingPanel`. Scaffold buttons are `disabled` and visually hidden when `classAiMode === 'red'`. The `reading-scaffold` Edge Function also validates AI mode server-side (defense in depth — client can't be trusted to self-censor).
**Warning signs:** AI scaffold works even for classes where the teacher disabled AI.

### Pitfall 6: Reading font `next/font/google` variable not on `<html>` for Atkinson
**What goes wrong:** The `--font-atkinson` CSS variable is undefined, so `font-family: var(--font-atkinson)` silently falls back to system font. Nothing appears broken; Atkinson just never loads.
**Why it happens:** `next/font` requires the variable to be applied to a DOM ancestor. Lexend already sets `--font-lexend` on `<html>` in `app/layout.tsx`. Atkinson must be added to the same `className`.
**How to avoid:** In `app/layout.tsx`, load Atkinson Hyperlegible Next with `{ variable: "--font-atkinson" }` and add `atkinson.variable` to the `<html>` className alongside `lexend.variable`.
**Warning signs:** Switching to "Atkinson" in Settings has no visible effect on the reading panel.

### Pitfall 7: Large font payloads from loading all OpenDyslexic weights
**What goes wrong:** `import "@fontsource/opendyslexic"` loads only weight 400 in the regular package. But if the developer imports all weights, the WOFF2 payload can exceed 1MB.
**Why it happens:** OpenDyslexic is a hand-drawn font with large glyph outlines; each weight file is 150–400KB.
**How to avoid:** Import only the weights needed (400 normal for body text). Do NOT import `@fontsource/opendyslexic/all.css`. The CSS cascade (`font-weight: bold` will use 400 artificially bolded) is acceptable for a reading-mode font.
**Warning signs:** Lighthouse reports large font payloads; slow initial render on mobile.

---

## Code Examples

### Migration 0010
```sql
-- Phase 4 F19: reading font picker preference
alter table public.profiles
  add column reading_font text not null default 'system'
    check (reading_font in ('system', 'lexend', 'atkinson', 'opendyslexic'));
```

### Loading Atkinson Hyperlegible Next in app/layout.tsx
```typescript
// app/layout.tsx — extend existing
import { Lexend, Atkinson_Hyperlegible_Next } from "next/font/google";
import "@fontsource/opendyslexic"; // weight 400 only

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
});

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
  weight: ["400", "700"],
});

// In RootLayout:
<html lang="en" className={`${lexend.variable} ${atkinson.variable}`}>
```

### profileBodyClass extension (lib/profile.ts)
```typescript
// Add reading_font to ProfilePrefs and profileBodyClass
export function profileBodyClass(p: ProfilePrefs | null): string {
  if (!p) return "";
  const readingFontClass =
    p.reading_font === "atkinson" ? "reading-font-atkinson" :
    p.reading_font === "opendyslexic" ? "reading-font-opendyslexic" :
    p.reading_font === "lexend" ? "dyslexia-font" : "";

  return [
    `font-size-${p.font_size}`,
    `line-spacing-${p.line_spacing}`,
    p.dyslexia_font ? "dyslexia-font" : "",
    readingFontClass,
    p.reduced_motion ? "reduced-motion" : "",
    p.high_contrast ? "high-contrast" : "",
  ].filter(Boolean).join(" ");
}
```

### Fallback Word Estimator
```typescript
// lib/tts/use-tts-highlight.ts (partial)
function scheduleFallbackTimers(
  text: string,
  words: WordOffset[],
  rate: number,
  setHighlightedWordIdx: (i: number) => void,
  timersRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>,
) {
  // Average reading rate ~150 WPM at 1x speed = 400ms/word
  const MS_PER_WORD = (400 / rate);
  let elapsed = 300; // lead-in for speech start

  for (let i = 0; i < words.length; i++) {
    const idx = i;
    const t = setTimeout(() => setHighlightedWordIdx(idx), elapsed);
    timersRef.current.push(t);
    elapsed += MS_PER_WORD;
  }
}
```

### reading-scaffold Edge Function skeleton
```typescript
// supabase/functions/reading-scaffold/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const PROMPTS: Record<"pre" | "mid" | "post", string> = {
  pre: `List 5–8 vocabulary words from this text that might be unfamiliar to a 9th–12th grader.
For each: the word, a plain definition (1 sentence), and how it appears in context.
Do NOT summarize. Calm tone. No scores.`,

  mid: `In 2–4 sentences, describe what has happened so far in plain language.
Then ask one open-ended question to help the student think about what they read.
Encouraging tone. Do not answer the question. No scores.`,

  post: `Write 3 retrieval questions about the main ideas. Answerable from the text.
Questions only — no answers. Calm, encouraging tone. No numeric scores.`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" },
    });
  }

  const { type, text, aiMode } = await req.json() as {
    type: "pre" | "mid" | "post";
    text: string;
    aiMode: string;
  };

  if (aiMode === "red") {
    return new Response(JSON.stringify({ error: "AI disabled for this class" }), { status: 403 });
  }

  const truncatedText = type === "pre" ? text.slice(0, 1500) : text.slice(0, 4000);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: PROMPTS[type],
      messages: [{ role: "user", content: `Reading text:\n\n${truncatedText}` }],
    }),
  });

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const content = data.content?.[0]?.text ?? "";

  return new Response(JSON.stringify({ content }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
```

### TTS Browser Support Detection
```typescript
// lib/tts/use-tts-highlight.ts
export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isBoundarySupported(): boolean | undefined {
  // Can't statically detect — must test at runtime by observing first event.
  // Return undefined until first utterance fires (or doesn't fire) a boundary event.
  return undefined;
}
```

---

## TTS Provider Decision

| Provider | Word-Sync Mechanism | Cost | Offline | Integration Complexity | Phase 4 Decision |
|----------|---------------------|------|---------|----------------------|------------------|
| Browser `speechSynthesis` | `boundary` event (charIndex) + fallback estimator | Free | Yes | Already in `TtsButton` | **USE THIS** |
| ElevenLabs with-timestamps | `character_start_times_seconds[]` array in response | $0.30/1K chars overage; free tier 10K chars/mo | No | New API key, Deno SDK, Storage caching | Defer to Phase 5 |
| Azure TTS | `WordBoundary` event via SDK; SSML bookmarks | Pay-per-char; separate key | No | WebSocket SDK in Deno | Defer |
| AWS Polly | SSML speech marks → JSON timestamps | Pay-per-char; separate key | No | New vendor | Defer |

**Decision rationale:** Browser `speechSynthesis` is already implemented in `TtsButton`, works offline (critical for PWA), and the boundary event covers ~70% of target users (Chrome/Safari desktop and iOS Safari). The fallback word estimator covers Firefox and Chrome Android. ElevenLabs character-level timestamps are superior for highlighting accuracy but add $0.003–$0.03 per reading session in API cost for typical homework texts (500–1500 chars). For a student app, free-forever zero-vendor is the correct Phase 4 choice. ElevenLabs should be added as an opt-in "enhanced voice" feature in Phase 5 or 6 once audio quality becomes the bottleneck.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `TtsButton` (no word sync) | `TtsHighlightButton` (boundary event + estimator fallback) | Phase 4 upgrade; same component name pattern |
| Lexend only | Three-font picker: Lexend + Atkinson Hyperlegible Next + OpenDyslexic | F19 expands the font options; Atkinson Hyperlegible Next is the Feb 2025 updated version |
| Global dyslexia font on body | Reading-mode typography class (`.reading-view`) scoped to text blocks | Typography spec applied only where students read long-form text |
| Atkinson Hyperlegible (original) | Atkinson Hyperlegible Next (2024/2025) | New version: 7 weights (up from 2), 150+ language support, variable font, confirmed in `next/font/google` |
| No comprehension support | `reading-scaffold` Edge Function (pre/mid/post) | Claude Sonnet 4.6; never produces numeric scores |

**Deprecated/outdated in Phase 4:**
- `components/tts-button.tsx`: Superseded by `TtsHighlightButton`. The original `TtsButton` can be kept for simple one-off read-aloud buttons on assignment titles; `TtsHighlightButton` is for full reading sessions. The two coexist — no forced migration of all `TtsButton` usages.

---

## Open Questions

1. **Should `TtsHighlightButton` completely replace `TtsButton` everywhere, or coexist?**
   - What we know: `TtsButton` is used in `app/(app)/assignments/[id]/page.tsx` for assignment title/description. It is simple and correct for that use case.
   - What's unclear: Whether the word-highlight DOM overhead is worth adding to every `TtsButton` usage.
   - Recommendation: Keep `TtsButton` for simple one-line reads (title, short description). Add `TtsHighlightButton` for `ReadingPanel` (long-form text). The Phase 4 plan should create `TtsHighlightButton` as a new component, not modify `TtsButton`.

2. **Where does the student paste/upload reading text for the ReadingPanel?**
   - What we know: F06 says "reader view for any uploaded text." Assignment `description` field is already displayed on the detail page. Assignments with `kind = 'reading'` have a description that is the reading assignment.
   - What's unclear: Whether students need a dedicated "paste text here" flow, or if the existing `description` field is sufficient.
   - Recommendation: For Phase 4, the `ReadingPanel` renders automatically when `kind === 'reading'` and `description` is non-null. The description field already accepts multi-line text. A dedicated "paste longer text" expansion (e.g., a textarea in the detail page) can be added if needed but is not required by F06's acceptance criteria.

3. **Should the font picker change `dyslexia_font = true` automatically when the student picks Atkinson or OpenDyslexic?**
   - What we know: `dyslexia_font = true` currently applies the `.dyslexia-font` CSS class (Lexend cascade) globally. The new `reading_font` column is separate.
   - What's unclear: Whether having both `dyslexia_font = false` and `reading_font = 'atkinson'` is a valid state (it is — reading-mode Atkinson, but system font for UI chrome).
   - Recommendation: Keep them orthogonal. The `reading_font` column controls the reading panel font. The `dyslexia_font` toggle controls the global UI font. They can both be set independently. Document this in the Settings UI.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser `speechSynthesis` | TTS playback | Chrome, Safari, Edge, Firefox | Browser built-in | Gracefully hide TTS button (already done in `TtsButton`) |
| `SpeechSynthesisUtterance.boundary` | Word sync highlighting | Chrome/Edge/Safari desktop, iOS Safari | Browser built-in | Timed word-estimator fallback |
| `Atkinson_Hyperlegible_Next` in `next/font/google` | F19 Atkinson font | Confirmed in Next.js font-data.json | next@15.5.18 | `@fontsource-variable/atkinson-hyperlegible-next@5.2.7` |
| `@fontsource/opendyslexic` | F19 OpenDyslexic font | npm | 5.2.5 | — (required if student selects OpenDyslexic) |
| Anthropic API (Claude Sonnet 4.6) | F07 comprehension scaffolds | Available (existing API key) | claude-sonnet-4-6 | Disable scaffold buttons (show "AI not available") |

**Missing dependencies with no fallback:** None blocking Phase 4.

**Missing dependencies with fallback:**
- `boundary` event not firing on Firefox/Chrome Android: Timed estimator fallback (see Pitfall 1 and Pattern 1). Student still gets a read-along experience, just with less precise word sync.

---

## Validation Architecture

Config `workflow.nyquist_validation: true` — section required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (exists, configured) |
| Quick run command | `npm run test:run -- lib/` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F06 | `splitWordsWithOffsets("Hello world")` returns correct start/length | unit | `npm run test:run -- lib/tts/tts.test.ts` | ❌ Wave 0 |
| F06 | Fallback timer schedule: `scheduleFallbackTimers` produces N timers for N words | unit | same | ❌ Wave 0 |
| F06 | `safeCancel()` calls resume before cancel when paused | unit (mock) | same | ❌ Wave 0 |
| F19 | `profileBodyClass` with `reading_font='atkinson'` returns `"reading-font-atkinson"` | unit | `npm run test:run -- lib/profile.test.ts` | ❌ Wave 0 |
| F19 | `profileBodyClass` with `reading_font='lexend'` returns `"dyslexia-font"` (maps to existing class) | unit | same | ❌ Wave 0 |
| F07 | `reading-scaffold` Edge Function with `aiMode='red'` returns 403 | integration/manual | manual `curl` | manual |
| F07 | `reading-scaffold` Edge Function with `type='pre'` returns `content` string | integration/manual | manual | manual |

**Note on TTS hook tests:** `useTtsHighlight` depends on `window.speechSynthesis` and `SpeechSynthesisUtterance`. Tests should extract the pure utility functions (`splitWordsWithOffsets`, `scheduleFallbackTimers`) into a separate `lib/tts/tts-utils.ts` file so they can be unit-tested without jsdom.

```typescript
// lib/tts/tts-utils.ts — pure functions; no browser dependency
export function splitWordsWithOffsets(text: string): WordOffset[] { ... }
export function estimateMsPerWord(rate: number): number {
  return Math.round(400 / rate); // 400ms/word at 1× speed baseline
}
```

### Sampling Rate
- **Per task commit:** `npm run test:run -- lib/`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/tts/tts-utils.ts` — pure utility functions extracted for testability
- [ ] `lib/tts/tts.test.ts` — covers F06 word offset split + fallback estimator + safeCancel
- [ ] `lib/profile.test.ts` — covers F19 profileBodyClass with reading_font values
- [ ] `supabase/migrations/0010_reading_layer.sql` — `profiles.reading_font` column

*(Existing tests: `lib/scoring/next-five-minutes.test.ts`, `lib/inbox/queue.test.ts`, `lib/time-budget/compute.test.ts`, `lib/time-budget/calibration.test.ts` — all unaffected by Phase 4)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `components/tts-button.tsx`, `components/voice-textarea.tsx`, `app/(app)/assignments/[id]/page.tsx`, `app/(app)/settings/accessibility-prefs.tsx`, `app/layout.tsx`, `app/globals.css`, `lib/profile.ts`, `lib/supabase/types.ts`, all migration files
- `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` — confirmed `"Atkinson Hyperlegible Next"` present
- MDN: [SpeechSynthesisUtterance boundary event](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/boundary_event) — "not Baseline because it does not work in some of the most widely-used browsers"
- `docs/spec/features.md` §F6, §F7, §F19 — acceptance criteria
- Supabase Edge Functions + ElevenLabs integration guide: [supabase.com/docs/guides/functions/examples/elevenlabs-generate-speech-stream](https://supabase.com/docs/guides/functions/examples/elevenlabs-generate-speech-stream)

### Secondary (MEDIUM confidence)
- ElevenLabs TTS with timestamps endpoint: `/v1/text-to-speech/:voice_id/with-timestamps` returning `{ audio_base64, alignment: { characters[], character_start_times_seconds[], character_end_times_seconds[] } }` — [ElevenLabs blog](https://elevenlabs.io/blog/new-text-to-speech-endpoints-with-timestamps)
- Atkinson Hyperlegible Next: released February 2025 by Braille Institute; 7 weights, 150+ languages, variable font — [Braille Institute announcement](https://www.brailleinstitute.org/about-us/news/braille-institute-launches-enhanced-atkinson-hyperlegible-font-to-make-reading-easier/)
- Fontsource `@fontsource/opendyslexic@5.2.5` — [fontsource.org/fonts/opendyslexic](https://fontsource.org/fonts/opendyslexic)
- Fontsource `@fontsource-variable/atkinson-hyperlegible-next@5.2.7` — [fontsource.org/fonts/atkinson-hyperlegible-next/install](https://fontsource.org/fonts/atkinson-hyperlegible-next/install)
- BDA typography: 60–70 CPL, 1.6 line height — [UXPin optimal line length guide](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/)
- Letter spacing evidence: Rello et al. 2012 "Extra-large letter spacing improves reading in dyslexia" — [PMC3396504](https://pmc.ncbi.nlm.nih.gov/articles/PMC3396504/)
- Firefox `boundary` event non-support: MDN BCD, multiple developer reports 2024–2025

### Tertiary (LOW confidence — needs validation)
- Chrome bug: `speechSynthesis.cancel()` hangs after pause — chromium issue #458247 (reported by dev community; verify in testing)
- Exact ElevenLabs overage pricing $0.30/1K chars at Creator plan (verify against [elevenlabs.io/pricing](https://elevenlabs.io/pricing) — plans change frequently)

---

## Metadata

**Confidence breakdown:**
- TTS word-sync (browser): HIGH — MDN confirmed boundary event; fallback pattern is standard practice; tested patterns in existing `TtsButton`
- Font loading (Atkinson/OpenDyslexic): HIGH — confirmed in `next/font/google` font-data.json; fontsource versions npm-verified
- Typography CSS values: HIGH — BDA + Rello et al. evidence base; values match spec F19
- Comprehension scaffolds: HIGH — Edge Function pattern identical to existing `classify-inbox`; prompt design follows spec §F7 exactly
- ElevenLabs future upgrade path: MEDIUM — API endpoint confirmed, pricing may shift

**Research date:** 2026-05-28
**Valid until:** 2026-06-28 (browser APIs stable; fontsource versions may patch)
