"use client";

import { useState, useTransition } from "react";
import { BookOpen, Brain, CreditCard, FileText, ShieldCheck, Sparkles } from "lucide-react";
import {
  generateStudyArtifact,
  saveArtifactFlashcards,
} from "@/app/(app)/study-artifacts/actions";
import {
  artifactLabel,
  type StudyArtifact,
  type StudyArtifactCard,
  type StudyArtifactSourceType,
  type StudyArtifactType,
} from "@/lib/study-helper/artifacts";
import type { StudyHelperMode } from "@/lib/study-helper/modes";
import { HelpOwnershipMeter } from "@/components/help-ownership-meter";
import { buildHelpOwnershipMeter } from "@/lib/student-state/model";

const ARTIFACT_OPTIONS = [
  {
    type: "study_guide",
    label: "Study guide",
    description: "Outline the source, key ideas, and recall prompts.",
    icon: FileText,
  },
  {
    type: "practice_test",
    label: "Practice test",
    description: "Create source-anchored questions with hints.",
    icon: Brain,
  },
  {
    type: "flashcard_set",
    label: "Flashcards",
    description: "Draft editable cards from the material.",
    icon: CreditCard,
  },
] satisfies Array<{
  type: StudyArtifactType;
  label: string;
  description: string;
  icon: typeof FileText;
}>;

export function StudyArtifactPanel({
  sourceType,
  sourceId,
  aiMode,
  studyMode,
}: {
  sourceType: StudyArtifactSourceType;
  sourceId: string;
  aiMode: "red" | "yellow" | "green";
  studyMode: StudyHelperMode;
}) {
  const [pending, startTransition] = useTransition();
  const [artifact, setArtifact] = useState<StudyArtifact | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [editableCards, setEditableCards] = useState<StudyArtifactCard[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<StudyArtifactType>("practice_test");
  const aiAvailable = aiMode === "green";
  const ownershipMeter = buildHelpOwnershipMeter({
    aiPolicy: aiMode,
    supportIntensity: studyMode === "retrieval_quiz" || studyMode === "flashcard_builder" ? "guided" : "scaffolded",
    studentSharePercent: 100,
  });

  function generate(type: StudyArtifactType) {
    setSelectedType(type);
    setStatus("Building from your class material...");
    startTransition(async () => {
      const res = await generateStudyArtifact({
        sourceType,
        sourceId,
        artifactType: type,
        studyMode,
      });
      if (res.ok) {
        setArtifact(res.artifact);
        setArtifactId(res.id);
        setEditableCards(res.artifact.cards);
        setStatus(`${artifactLabel(type)} saved.`);
      } else {
        setStatus(res.error);
      }
    });
  }

  function saveCards() {
    if (!artifactId) return;
    setStatus("Saving cards...");
    startTransition(async () => {
      const res = await saveArtifactFlashcards({ artifactId, cards: editableCards });
      setStatus(res.ok ? `${res.count} cards saved to Study.` : res.error);
    });
  }

  function updateCard(index: number, field: keyof Pick<StudyArtifactCard, "front" | "back">, value: string) {
    setEditableCards((cards) =>
      cards.map((card, i) => i === index ? { ...card, [field]: value } : card),
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-subject-ap/25 bg-surface-raised p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            <Sparkles size={13} />
            Remember bar
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-tight">Make this studiable</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Turn this real class material into recall, cards, or a study guide without turning it into final work.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">
          <ShieldCheck size={13} />
          {aiMode === "green" ? "AI policy: study artifacts on" : "AI policy: manual cards only"}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {ARTIFACT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = selectedType === option.type;
          return (
            <button
              key={option.type}
              type="button"
              disabled={pending || !aiAvailable}
              onClick={() => generate(option.type)}
              className={`touch-target flex min-w-0 items-start gap-2 rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-indigo-500/30 bg-indigo-500/10"
                  : "border-border bg-background hover:bg-surface-soft"
              } disabled:opacity-60`}
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-indigo-700 dark:text-indigo-300" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!aiAvailable && (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-400/10 dark:text-amber-100">
          This class is set to scaffolding-only or no-content AI. Highlight text and create cards manually from your own notes.
        </p>
      )}

      {status && <p className="text-sm text-muted">{status}</p>}

      <HelpOwnershipMeter meter={ownershipMeter} compact />

      {artifact && (
        <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">{artifact.title}</h3>
              <p className="mt-1 text-sm text-muted">{artifact.summary}</p>
            </div>
            {artifact.cards.length > 0 && (
              <button
                type="button"
                onClick={saveCards}
                disabled={pending}
                className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                <BookOpen size={15} />
                Save cards
              </button>
            )}
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-soft p-3">
              <p className="font-medium text-fg">Practice settings</p>
              <p className="mt-1 text-muted">
                {artifact.practiceSettings.questionCount} questions | {artifact.practiceSettings.difficulty}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-soft p-3">
              <p className="font-medium text-fg">Review state</p>
              <p className="mt-1 text-muted">
                {artifact.editState.cardsReviewed} reviewed | {artifact.editState.cardsEdited} edited
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-soft p-3">
              <p className="font-medium text-fg">Question types</p>
              <p className="mt-1 text-muted">{artifact.practiceSettings.questionTypes.join(", ")}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-surface-soft p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Study loop</p>
                <p className="mt-1 text-sm font-semibold">{artifact.reviewLoop.nextReviewAction}</p>
              </div>
              <span className="w-fit rounded-full border border-border bg-background px-2 py-1 text-xs text-muted">
                {artifact.reviewLoop.masterySignal.replace(/_/g, " ")}
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {artifact.reviewLoop.steps.slice(0, 6).map((step) => (
                <div key={`${step.stage}-${step.label}`} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{step.stage.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-sm font-medium">{step.label}</p>
                  <p className="mt-1 text-xs text-muted">{step.studentAction}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">{artifact.reviewLoop.nextSupportUse}</p>
          </div>

          {artifact.visualBreakdown && (
            <div className="space-y-2 rounded-2xl border border-border bg-surface-soft p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{artifact.visualBreakdown.title}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {artifact.visualBreakdown.blocks.slice(0, 4).map((block) => (
                  <div key={`${block.label}-${block.sourceAnchor}`} className="rounded-xl border border-border bg-background p-3">
                    <p className="text-sm font-semibold">{block.label}</p>
                    <p className="mt-1 text-xs text-muted">{block.prompt}</p>
                    <p className="mt-2 text-xs font-medium">{block.studentAction}</p>
                    <p className="mt-1 text-xs text-muted">Source: {block.sourceAnchor}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                {artifact.visualBreakdown.quizPrompt}
              </p>
              <p className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted">
                Show another way: {artifact.visualBreakdown.storyboard.layout}
              </p>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            {artifact.guide.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-border bg-surface-soft p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Guide</p>
                {artifact.guide.slice(0, 3).map((section) => (
                  <div key={section.heading}>
                    <p className="text-sm font-semibold">{section.heading}</p>
                    <ul className="mt-1 space-y-1 text-sm text-muted">
                      {section.bullets.slice(0, 3).map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {artifact.quiz.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-border bg-surface-soft p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Practice</p>
                {artifact.quiz.slice(0, 3).map((item) => (
                  <div key={item.question} className="space-y-1">
                    <p className="text-sm font-semibold">{item.question}</p>
                    <p className="text-xs text-muted">{item.hint}</p>
                    <p className="text-xs text-muted">{item.sourceAnchor}</p>
                  </div>
                ))}
              </div>
            )}

            {editableCards.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-border bg-surface-soft p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Editable cards</p>
                {editableCards.slice(0, 3).map((card, index) => (
                  <div key={`${card.sourceAnchor}-${index}`} className="space-y-2 rounded-xl border border-border bg-background p-2">
                    <label className="block text-xs font-medium text-muted">
                      Front
                      <input
                        value={card.front}
                        onChange={(event) => updateCard(index, "front", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm text-fg"
                      />
                    </label>
                    <label className="block text-xs font-medium text-muted">
                      Back
                      <textarea
                        value={card.back}
                        onChange={(event) => updateCard(index, "back", event.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm text-fg"
                      />
                    </label>
                    <p className="text-xs text-muted">Source: {card.sourceAnchor}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface-soft p-3 text-xs text-muted">
            <p className="font-medium text-fg">Source anchors</p>
            <p className="mt-1">
              {[...new Set([
                ...artifact.quiz.map((item) => item.sourceAnchor),
                ...editableCards.map((card) => card.sourceAnchor),
              ].filter(Boolean))]
                .slice(0, 6)
                .join(" | ") || "Diana will ask for source material before adding more help."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-soft p-3 text-xs text-muted">
            <p className="font-medium text-fg">Authorship receipt</p>
            <p className="mt-1">{artifact.authorshipReceipt}</p>
            <p className="mt-1">{artifact.trustNote}</p>
            <p className="mt-2 font-medium text-fg">{artifact.authorshipReceiptDetail.shareSummary}</p>
            <p className="mt-1">{artifact.authorshipReceiptDetail.teacherSafeSummary}</p>
            <p className="mt-1">
              Student actions: {artifact.authorshipReceiptDetail.studentActions.join(" | ")}
            </p>
            <p className="mt-1">
              Private readiness details excluded: {artifact.authorshipReceiptDetail.sensitiveDataExcluded ? "yes" : "check receipt"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
