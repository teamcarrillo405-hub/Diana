"use client";

import { useState } from "react";
import { FileText, Gauge, MessageSquare, Pencil, Quote, Wand2 } from "lucide-react";
import { requestWritingAid, requestWritingCoauthor } from "./ai-tools-actions";
import { AiTooltip } from "@/components/ai-tooltip";
import { SubjectToolShell } from "@/components/subject-tool-shell";
import { authorshipPercent, type WritingCoauthorMode, type WritingCoauthorResult } from "@/lib/writing/coauthor";
import type { StudyHelperShellContext } from "@/lib/study-helper/modes";

interface WritingAidProps {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  studyContext?: StudyHelperShellContext;
}

const MODES: Array<{ mode: WritingCoauthorMode; label: string; icon: typeof FileText }> = [
  { mode: "essay_scaffold", label: "Scaffold", icon: FileText },
  { mode: "cowrite", label: "Continuation", icon: Wand2 },
  { mode: "transition", label: "Transition", icon: MessageSquare },
  { mode: "evidence", label: "Evidence", icon: Quote },
  { mode: "argument", label: "Argument", icon: Pencil },
  { mode: "readability", label: "Readability", icon: Gauge },
  { mode: "tone", label: "Tone", icon: MessageSquare },
];

export function WritingAid({ assignmentId, classAiMode, studyContext }: WritingAidProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [prompt, setPrompt] = useState("");
  const [ruleResult, setRuleResult] = useState<string | null>(null);
  const [coauthorResult, setCoauthorResult] = useState<WritingCoauthorResult | null>(null);
  const [activeMode, setActiveMode] = useState<WritingCoauthorMode>("essay_scaffold");
  const [acceptedAiChars, setAcceptedAiChars] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (classAiMode === "red" || classAiMode === "yellow") return null;

  const studentShare = authorshipPercent(draft.length, acceptedAiChars);

  async function explainRule() {
    if (!draft.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    const res = await requestWritingAid({
      assignmentId,
      aiMode: classAiMode,
      prompt: draft,
    });
    if ("error" in res) setErrorMsg(res.error);
    else setRuleResult(res.content);
    setLoading(false);
  }

  async function runMode(mode: WritingCoauthorMode) {
    setActiveMode(mode);
    setLoading(true);
    setErrorMsg(null);
    const res = await requestWritingCoauthor({
      assignmentId,
      aiMode: classAiMode,
      mode,
      draft,
      prompt,
    });
    if (res.ok) {
      setCoauthorResult(res.result);
    } else {
      setErrorMsg(res.error);
    }
    setLoading(false);
  }

  function acceptGhostText(text: string) {
    const spacer = draft.endsWith(" ") || draft.length === 0 ? "" : " ";
    setDraft((current) => `${current}${spacer}${text}`);
    setAcceptedAiChars((count) => count + text.length);
  }

  return (
    <SubjectToolShell
      theme="writing"
      eyebrow="Writing studio"
      title={open ? "Draft studio" : "Open draft studio"}
      subtitle={open ? "Suggestions, chips, and authorship stay visible." : "Plan, revise, and keep the writing yours."}
      icon={Pencil}
      studyContext={studyContext}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-subject-writing/25 bg-surface-raised px-4 py-2 text-sm font-medium text-violet-700 hover:bg-subject-writing/10 dark:text-violet-300"
        >
          <Pencil size={13} />
          Open writing studio
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Writing studio
              </p>
              {(ruleResult || coauthorResult) && <AiTooltip feature={coauthorResult ? "writing_cowrite" : "writing_aid"} />}
            </div>
            <p className="text-xs text-muted">Student-authored: {studentShare}%</p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-border" aria-label="Student-authored text percentage">
            <div className="h-full bg-subject-writing" style={{ width: `${studentShare}%` }} />
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste the essay prompt or your goal for this draft."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={2}
          />

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Start with your own words. Diana can scaffold, question, or suggest a short ghost-text continuation."
            className="min-h-44 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={8}
          />

          <div className="flex flex-wrap gap-2">
            {MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => runMode(mode)}
                aria-pressed={activeMode === mode}
                disabled={loading || (mode !== "essay_scaffold" && !draft.trim())}
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
            <button
              type="button"
              onClick={explainRule}
              disabled={loading || !draft.trim()}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30 disabled:opacity-50"
            >
              Explain one rule
            </button>
          </div>

          {errorMsg && (
            <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              {errorMsg}
            </p>
          )}
          {loading && <p className="text-sm text-muted">Thinking...</p>}

          {coauthorResult && (
            <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{coauthorResult.title}</p>
                <p className="text-xs text-muted">{coauthorResult.authorshipNote}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {coauthorResult.suggestions.map((suggestion) => (
                  <div key={`${suggestion.label}-${suggestion.text}`} className="space-y-2 rounded-md border border-border bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">{suggestion.label}</p>
                    <p className="whitespace-pre-wrap text-sm">{suggestion.text}</p>
                    <p className="text-xs text-muted">{suggestion.rationale}</p>
                    <p className="text-xs text-muted">{suggestion.action}</p>
                    {coauthorResult.mode === "cowrite" && (
                      <button
                        type="button"
                        onClick={() => acceptGhostText(suggestion.text)}
                        className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white"
                      >
                        Add continuation
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ruleResult && (
            <div className="rounded-xl border border-border bg-card/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {ruleResult}
            </div>
          )}
        </>
      )}
    </SubjectToolShell>
  );
}
