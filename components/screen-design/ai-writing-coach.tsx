"use client";

import { Check, Lightbulb, MoreHorizontal, Save, Sparkles, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  acceptWritingSuggestion,
  requestWritingCoauthor,
} from "@/app/(app)/assignments/[id]/ai-tools-actions";
import { saveHandInField } from "@/app/(app)/assignments/[id]/hm-actions";
import type { AiMode } from "@/lib/portal/teacher";
import type { WritingSuggestion } from "@/lib/writing/coauthor";

import { DianaMascotMark, DianaWordmark } from "./primitives";
import { ScreenDesignViewport } from "./screen-design-viewport";
import { StudentBottomNav } from "./student-bottom-nav";

type AiWritingCoachProps = {
  assignmentId: string;
  assignmentTitle: string;
  courseLabel: string;
  initialDraft: string;
  classAiMode: AiMode;
};

export function AiWritingCoach({
  assignmentId,
  assignmentTitle,
  courseLabel,
  initialDraft,
  classAiMode,
}: AiWritingCoachProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [suggestion, setSuggestion] = useState<WritingSuggestion | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const words = useMemo(
    () => draft.trim().split(/\s+/u).filter(Boolean).length,
    [draft],
  );
  const writingAvailable = classAiMode === "green";

  function saveDraft() {
    setMessage("Saving draft...");
    startTransition(async () => {
      const result = await saveHandInField({ assignmentId, key: "draft", value: draft });
      setMessage(result.ok ? "Draft saved" : result.error);
    });
  }

  function requestGuidance() {
    if (!writingAvailable) return;
    setMessage("Coach Diana is reading your draft...");
    startTransition(async () => {
      const response = await requestWritingCoauthor({
        assignmentId,
        aiMode: classAiMode,
        mode: "transition",
        draft,
        prompt: "Suggest one useful next move without replacing the student's voice.",
      });
      if (!response.ok) {
        setMessage(response.error);
        return;
      }
      setSuggestion(response.result.suggestions[0] ?? null);
      setMessage(response.result.suggestions.length > 0 ? "Guidance ready" : "Add another sentence and try again");
    });
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    const suggestionText = suggestion.text;
    startTransition(async () => {
      const response = await acceptWritingSuggestion({
        assignmentId,
        currentDraft: draft,
        suggestionText,
      });
      if (!response.ok) {
        setMessage(response.error);
        return;
      }
      const nextDraft = "draft" in response
        ? response.draft
        : [draft.trimEnd(), suggestionText.trim()].filter(Boolean).join("\n\n");
      setDraft(nextDraft);
      setSuggestion(null);
      setMessage("Suggestion added to your draft");
    });
  }

  return (
    <ScreenDesignViewport className="sd-writing-coach" aria-label="AI Writing Coach">
      <header className="sd-writing-coach-header">
        <DianaWordmark />
        <span aria-hidden="true" />
        <strong>Writing Coach</strong>
        <button type="button" onClick={saveDraft} disabled={isPending} aria-label="Save draft">
          <Save size={17} aria-hidden="true" />
        </button>
        <button type="button" aria-label="More writing tools">
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </header>

      <main className="sd-writing-coach-main">
        <section className="sd-writing-editor" aria-labelledby="writing-draft-title">
          <div className="sd-writing-editor-heading">
            <div>
              <span>{courseLabel}</span>
              <h1 id="writing-draft-title">{assignmentTitle}</h1>
            </div>
            <small>{words} words</small>
          </div>
          <textarea
            aria-label="Student draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Start with your own words..."
            spellCheck
          />
          {suggestion ? (
            <article className="sd-writing-inline-suggestion">
              <div><Sparkles size={14} aria-hidden="true" /> Diana suggestion</div>
              <p>{suggestion.text}</p>
              <small>{suggestion.rationale}</small>
              <div className="sd-writing-suggestion-actions">
                <button type="button" onClick={acceptSuggestion} disabled={isPending} aria-label="Accept suggestion">
                  <Check size={14} aria-hidden="true" /> Accept
                </button>
                <button type="button" onClick={() => setSuggestion(null)} disabled={isPending} aria-label="Reject suggestion">
                  <X size={14} aria-hidden="true" /> Keep my draft
                </button>
              </div>
            </article>
          ) : null}
        </section>

        <section className="sd-writing-feedback" aria-label="Tutor insights">
          <div className="sd-writing-feedback-title">
            <DianaMascotMark decorative />
            <div>
              <span>Coach Diana</span>
              <h2>Tutor insights</h2>
            </div>
          </div>
          <div className="sd-writing-insight-card">
            <Lightbulb size={17} aria-hidden="true" />
            <div>
              <strong>Your voice stays in control</strong>
              <p>Ask for one next move, then choose whether it belongs in your draft.</p>
            </div>
          </div>
          <div className="sd-writing-mini-grid">
            <article><span>Outline</span><strong>Claim → Evidence → Meaning</strong></article>
            <article><span>Sources</span><strong>Use your class notes</strong></article>
          </div>
        </section>
      </main>

      <button
        type="button"
        className="sd-writing-primary-action"
        onClick={requestGuidance}
        disabled={!writingAvailable || isPending}
        aria-label="Request writing guidance"
      >
        <Sparkles size={20} aria-hidden="true" />
      </button>
      <p className="sd-writing-status" role="status" aria-live="polite">
        {!writingAvailable ? "Writing Coach unavailable for this class" : message}
      </p>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
