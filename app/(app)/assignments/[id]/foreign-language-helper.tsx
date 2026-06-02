"use client";

import { useState } from "react";
import { BookOpen, Globe2, Languages, Mic, PenLine, Save, Table2 } from "lucide-react";
import { AiTooltip } from "@/components/ai-tooltip";
import { TtsButton } from "@/components/tts-button";
import { VoiceTextarea } from "@/components/voice-textarea";
import { createFlashcard } from "@/app/(app)/flashcards/actions";
import type {
  LanguageScaffoldMode,
  LanguageScaffoldResult,
  VocabularyCard,
} from "@/lib/language/scaffold";
import { requestLanguageScaffold } from "./ai-tools-actions";

const MODES: Array<{ mode: LanguageScaffoldMode; label: string; icon: typeof Languages }> = [
  { mode: "vocabulary", label: "Vocab", icon: Languages },
  { mode: "conjugation", label: "Conjugate", icon: Table2 },
  { mode: "reading", label: "Read", icon: BookOpen },
  { mode: "speaking", label: "Speak", icon: Mic },
  { mode: "writing", label: "Write", icon: PenLine },
  { mode: "culture", label: "Culture", icon: Globe2 },
];

const LANGUAGES = ["Spanish", "French", "German", "Mandarin", "Italian", "Latin"];

export function ForeignLanguageHelper({
  assignmentId,
  classAiMode,
  initialPrompt,
}: {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  initialPrompt: string;
}) {
  const [open, setOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [sourceText, setSourceText] = useState(initialPrompt);
  const [spokenText, setSpokenText] = useState("");
  const [activeMode, setActiveMode] = useState<LanguageScaffoldMode>("vocabulary");
  const [result, setResult] = useState<LanguageScaffoldResult | null>(null);
  const [visibleConjugationRows, setVisibleConjugationRows] = useState(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (classAiMode === "red" || classAiMode === "yellow") return null;

  async function runMode(mode: LanguageScaffoldMode) {
    setActiveMode(mode);
    setLoading(true);
    setStatus(null);
    const res = await requestLanguageScaffold({
      assignmentId,
      aiMode: classAiMode,
      mode,
      targetLanguage,
      sourceText,
      spokenText,
    });
    if (res.ok) {
      setResult(res.result);
      setVisibleConjugationRows(1);
    } else {
      setStatus(res.error);
    }
    setLoading(false);
  }

  async function saveVocab(card: VocabularyCard) {
    setStatus(null);
    const res = await createFlashcard({
      front: [
        `${targetLanguage}: ${card.term}`,
        card.pronunciation ? `Pronunciation: ${card.pronunciation}` : "",
      ].filter(Boolean).join("\n"),
      back: [
        card.meaning,
        card.cognateHint ? `Cognate hint: ${card.cognateHint}` : "",
        card.interestSentence ? `Sentence: ${card.interestSentence}` : "",
      ].filter(Boolean).join("\n"),
      sourceNoteId: null,
    });
    setStatus(res.ok ? "Saved to Study." : res.error);
  }

  function appendTranscript(chunk: string) {
    setSpokenText((current) => [current, chunk].filter(Boolean).join(" ").trim());
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <Languages size={13} />
          Open language scaffold
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Language scaffold</p>
              {result && <AiTooltip feature="language_scaffold" />}
            </div>
            <select
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              {LANGUAGES.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </div>

          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste vocabulary, a reading passage, a verb, or a writing prompt."
            rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <VoiceTextarea
            value={spokenText}
            onChange={(event) => setSpokenText(event.target.value)}
            onTranscript={appendTranscript}
            provider="browser"
            speechLang={speechLangFor(targetLanguage)}
            placeholder="Speaking transcript"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => runMode(mode)}
                aria-pressed={activeMode === mode}
                disabled={loading || (!sourceText.trim() && !spokenText.trim())}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                  activeMode === mode
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:bg-border/30"
                } disabled:opacity-50`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {result && (
            <LanguageResult
              result={result}
              visibleConjugationRows={visibleConjugationRows}
              onMoreConjugation={() => setVisibleConjugationRows((value) => value + 1)}
              onSaveVocab={saveVocab}
            />
          )}

          {loading && <p className="text-sm text-muted">Thinking...</p>}
          {status && <p className="text-sm text-muted">{status}</p>}
        </>
      )}
    </section>
  );
}

function LanguageResult({
  result,
  visibleConjugationRows,
  onMoreConjugation,
  onSaveVocab,
}: {
  result: LanguageScaffoldResult;
  visibleConjugationRows: number;
  onMoreConjugation: () => void;
  onSaveVocab: (card: VocabularyCard) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
      <p className="text-sm font-medium">{result.title}</p>

      {result.vocabularyCards.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.vocabularyCards.map((card) => (
            <div key={`${card.term}-${card.meaning}`} className="space-y-2 rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{card.term}</p>
                <TtsButton text={card.term} label="Audio" />
              </div>
              <p className="text-sm text-muted">{card.meaning}</p>
              {card.pronunciation && <p className="text-xs text-muted">{card.pronunciation}</p>}
              {card.cognateHint && <p className="text-xs text-muted">{card.cognateHint}</p>}
              <p className="rounded-md border border-border bg-card px-2 py-1.5 text-xs">{card.interestSentence}</p>
              <button
                type="button"
                onClick={() => onSaveVocab(card)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30"
              >
                <Save size={13} />
                Save card
              </button>
            </div>
          ))}
        </div>
      )}

      {result.conjugationRows.length > 0 && (
        <div className="space-y-2">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {result.conjugationRows.slice(0, visibleConjugationRows).map((row) => (
                  <tr key={`${row.pronoun}-${row.prompt}`}>
                    <td className="border border-border px-3 py-2 font-medium">{row.pronoun}</td>
                    <td className="border border-border px-3 py-2 text-muted">{row.prompt}</td>
                    <td className="border border-border px-3 py-2 text-muted">{row.studentHint ?? row.example ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleConjugationRows < result.conjugationRows.length && (
            <button
              type="button"
              onClick={onMoreConjugation}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30"
            >
              Next cell
            </button>
          )}
        </div>
      )}

      {result.readingQuestions.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.readingQuestions.map((question) => (
            <div key={`${question.questionEnglish}-${question.answerFrameTarget}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-sm">{question.questionEnglish}</p>
              <p className="mt-2 text-xs text-muted">{question.answerFrameTarget}</p>
            </div>
          ))}
        </div>
      )}

      {result.speakingPrompts.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.speakingPrompts.map((prompt) => (
            <div key={`${prompt.label}-${prompt.feedbackPrompt}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{prompt.label}</p>
              <p className="mt-1 text-sm">{prompt.feedbackPrompt}</p>
              {prompt.practiceLine && <p className="mt-2 text-xs text-muted">{prompt.practiceLine}</p>}
            </div>
          ))}
        </div>
      )}

      {result.writingSuggestions.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.writingSuggestions.map((suggestion) => (
            <div key={`${suggestion.label}-${suggestion.prompt}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{suggestion.label}</p>
              <p className="mt-1 text-sm">{suggestion.prompt}</p>
              {suggestion.exampleFrame && <p className="mt-2 text-xs text-muted">{suggestion.exampleFrame}</p>}
            </div>
          ))}
        </div>
      )}

      {result.cultureCards.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.cultureCards.map((card) => (
            <div key={`${card.title}-${card.context}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-sm font-medium">{card.title}</p>
              <p className="mt-1 text-sm text-muted">{card.context}</p>
              <p className="mt-2 text-xs text-muted">{card.comparePrompt}</p>
            </div>
          ))}
        </div>
      )}

      <p className="rounded-md border border-border bg-background px-3 py-2 text-sm">{result.checkPrompt}</p>
    </div>
  );
}

function speechLangFor(language: string): string {
  const normalized = language.toLowerCase();
  if (normalized.includes("french")) return "fr-FR";
  if (normalized.includes("german")) return "de-DE";
  if (normalized.includes("mandarin") || normalized.includes("chinese")) return "zh-CN";
  if (normalized.includes("italian")) return "it-IT";
  if (normalized.includes("latin")) return "la";
  return "es-ES";
}
