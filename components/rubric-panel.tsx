"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, MessageCircle, Target } from "lucide-react";
import { resolveRubric, rubricSelfCheck } from "@/lib/rubric/rubric";

const STORAGE_PREFIX = "diana:rubric-check:";

/**
 * Student-facing rubric self-check. Turns the governing rubric (assignment
 * override, else class default) into one checkable move per criterion and
 * always points at the highest-value criterion still open. Check state is
 * browser-local — this is the student's private working memory, not a grade.
 */
export function RubricPanel({
  assignmentId,
  classRubricText,
  assignmentRubricText,
}: {
  assignmentId: string;
  classRubricText: string | null;
  assignmentRubricText: string | null;
}) {
  const rubric = useMemo(
    () => resolveRubric(classRubricText, assignmentRubricText),
    [classRubricText, assignmentRubricText],
  );
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${assignmentId}`);
      if (raw) setChecked(JSON.parse(raw) as string[]);
    } catch {
      // private working memory only — losing it is harmless
    }
  }, [assignmentId]);

  if (!rubric) return null;

  const check = rubricSelfCheck(rubric, checked);

  function toggle(id: string) {
    setChecked((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${assignmentId}`, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">What done looks like</h2>
        <span className="text-xs text-muted">
          {rubric.source === "assignment" ? "This assignment's rubric" : "Class rubric"}
          {rubric.totalPoints != null ? ` · ${rubric.totalPoints} pts total` : ""}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${check.coveragePct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted">{check.coveragePct}%</span>
      </div>

      {check.next && (
        <div className="space-y-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2">
          <p className="flex items-start gap-2 text-sm">
            <Target size={15} className="mt-0.5 shrink-0 text-brand" />
            <span>
              <span className="font-medium">Worth a look next:</span> {check.next.title}
              {check.next.points != null && <span className="text-muted"> ({check.next.points} pts)</span>}
            </span>
          </p>
          <Link
            href={`/study-buddy?${new URLSearchParams({
              source: `Rubric criterion: ${check.next.title}${check.next.detail ? ` — ${check.next.detail}` : ""}`,
              q: "Help me check my work against this criterion without writing it for me.",
            }).toString()}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-strong underline underline-offset-2 decoration-brand/50 hover:decoration-brand dark:text-brand"
          >
            <MessageCircle size={13} /> Work on this with the study buddy
          </Link>
        </div>
      )}

      <ul className="space-y-1.5">
        {rubric.criteria.map((criterion) => {
          const isDone = checked.includes(criterion.id);
          return (
            <li key={criterion.id}>
              <button
                type="button"
                onClick={() => toggle(criterion.id)}
                aria-pressed={isDone}
                className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isDone
                    ? "border-ok/30 bg-ok/5 text-muted"
                    : "border-border bg-surface hover:bg-surface-soft"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-ok" />
                ) : (
                  <Circle size={17} className="mt-0.5 shrink-0 text-muted" />
                )}
                <span className="min-w-0">
                  <span className={isDone ? "line-through decoration-ok/40" : ""}>{criterion.title}</span>
                  {criterion.points != null && (
                    <span className="ml-1.5 text-xs text-muted">{criterion.points} pts</span>
                  )}
                  {criterion.detail && (
                    <span className="mt-0.5 block text-xs text-muted">{criterion.detail}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted">
        Your private self-check — teachers never see it. Checking a line means you looked at your
        work against it.
      </p>
    </section>
  );
}
