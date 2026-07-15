"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  MessageCircle,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { resolveRubric } from "@/lib/rubric/rubric";

const STORAGE_PREFIX = "diana:rubric-scout:";

export type RubricScoutRubric = {
  id: string;
  title: string;
  rawText: string | null;
};

export type RubricScoutSyllabus = {
  title: string;
  policies: readonly {
    kind: string;
    text: string;
  }[];
};

export type RubricScoutAssignment = {
  id: string;
  title: string;
};

const RUBRIC_SCOUT_STYLES = `
  .sd-rubric-scout {
    --sd-rubric-navy: #0f172a;
    --sd-rubric-pink: #ff79da;
    --sd-rubric-blue: #74c0ff;
    --sd-rubric-teal: #2dd4bf;
    display: flex;
    height: max(100dvh, 852px);
    max-height: max(100dvh, 852px);
    flex-direction: column;
    overflow: hidden;
    background: var(--sd-rubric-navy);
    color: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }

  .sd-rubric-scout h1,
  .sd-rubric-scout h2,
  .sd-rubric-scout h3,
  .sd-rubric-scout p {
    font-family: inherit;
  }

  .sd-rubric-header {
    position: relative;
    z-index: 20;
    flex: none;
    border-bottom: 1px solid rgb(255 255 255 / 0.05);
    background: rgb(15 23 42 / 0.84);
    padding: 54px 24px 22px;
    backdrop-filter: blur(12px);
  }

  .sd-rubric-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .sd-rubric-owner {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 12px;
  }

  .sd-rubric-back {
    display: grid;
    width: 34px;
    height: 34px;
    flex: none;
    place-items: center;
    border: 1px solid rgb(255 255 255 / 0.08);
    border-radius: 999px;
    background: rgb(255 255 255 / 0.06);
    color: #fff;
    text-decoration: none;
  }

  .sd-rubric-wordmark {
    width: auto;
    height: 20px;
    object-fit: contain;
  }

  .sd-rubric-scan {
    color: var(--sd-rubric-blue);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
  }

  .sd-rubric-title {
    margin: 0;
    color: #fff;
    font-size: 25px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    text-transform: uppercase;
  }

  .sd-rubric-context {
    overflow: hidden;
    margin: 6px 0 0;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.16em;
    line-height: 1.35;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .sd-rubric-scroll {
    position: relative;
    z-index: 10;
    display: grid;
    min-height: 0;
    flex: 1;
    align-content: start;
    gap: 30px;
    overflow-y: auto;
    padding: 24px 24px 130px;
    scrollbar-width: none;
  }

  .sd-rubric-scroll::-webkit-scrollbar {
    display: none;
  }

  .sd-rubric-section {
    display: grid;
    gap: 14px;
  }

  .sd-rubric-section-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--sd-rubric-teal);
    font-size: 12px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.12em;
    line-height: 1;
    text-transform: uppercase;
  }

  .sd-rubric-section[data-tone="pink"] .sd-rubric-section-heading {
    color: var(--sd-rubric-pink);
  }

  .sd-rubric-card-stack {
    display: grid;
    gap: 12px;
  }

  .sd-rubric-criterion {
    appearance: none;
    display: flex;
    width: 100%;
    align-items: flex-start;
    gap: 14px;
    border: 1px solid rgb(45 212 191 / 0.2);
    border-radius: 16px;
    background: linear-gradient(135deg, rgb(45 212 191 / 0.1), rgb(45 212 191 / 0.02));
    padding: 14px;
    color: #fff;
    text-align: left;
    clip-path: none !important;
    cursor: pointer;
    transition: transform 150ms ease, border-color 150ms ease;
  }

  .sd-rubric-criterion[data-checked="true"] {
    border-color: rgb(116 192 255 / 0.38);
    background: linear-gradient(135deg, rgb(116 192 255 / 0.12), rgb(116 192 255 / 0.03));
  }

  .sd-rubric-criterion:active,
  .sd-rubric-footer-action:active {
    transform: scale(0.98);
  }

  .sd-rubric-number,
  .sd-rubric-policy-icon {
    display: grid;
    width: 34px;
    height: 34px;
    flex: none;
    place-items: center;
    border-radius: 9px;
    background: rgb(45 212 191 / 0.18);
    color: var(--sd-rubric-teal);
    font-size: 12px;
    font-style: italic;
    font-weight: 900;
  }

  .sd-rubric-criterion[data-checked="true"] .sd-rubric-number {
    background: rgb(116 192 255 / 0.2);
    color: var(--sd-rubric-blue);
  }

  .sd-rubric-card-copy {
    min-width: 0;
    flex: 1;
  }

  .sd-rubric-card-copy strong {
    display: block;
    color: #fff;
    font-size: 12px;
    font-style: italic;
    font-weight: 900;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .sd-rubric-card-copy p {
    margin: 5px 0 0;
    color: #cbd5e1;
    font-size: 10px;
    line-height: 1.35;
  }

  .sd-rubric-points {
    flex: none;
    color: #94a3b8;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sd-rubric-help {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 6px;
    margin: -4px 0 2px 48px;
    color: var(--sd-rubric-blue);
    font-size: 10px;
    font-weight: 800;
    text-decoration: none;
  }

  .sd-rubric-policy {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    border: 1px solid rgb(255 121 218 / 0.2);
    border-radius: 16px;
    background: linear-gradient(135deg, rgb(255 121 218 / 0.1), rgb(255 121 218 / 0.02));
    padding: 14px;
  }

  .sd-rubric-policy-icon {
    background: rgb(255 121 218 / 0.18);
    color: var(--sd-rubric-pink);
  }

  .sd-rubric-empty,
  .sd-rubric-policy-note {
    margin: 0;
    border: 1px dashed rgb(255 255 255 / 0.14);
    border-radius: 14px;
    padding: 14px;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.45;
  }

  .sd-rubric-policy-status {
    margin: 0;
    color: var(--sd-rubric-blue);
    font-size: 10px;
    font-weight: 800;
    line-height: 1.4;
  }

  .sd-rubric-scan-panel {
    display: grid;
    gap: 18px;
    border: 1px solid rgb(116 192 255 / 0.28);
    border-radius: 18px;
    background: rgb(255 255 255 / 0.055);
    padding: 16px;
  }

  .sd-rubric-scan-panel h2 {
    margin: 0;
    color: var(--sd-rubric-blue);
    font-size: 13px;
    font-style: italic;
    font-weight: 900;
    text-transform: uppercase;
  }

  .sd-rubric-scan-block {
    display: grid;
    gap: 10px;
  }

  .sd-rubric-scan-block h3 {
    margin: 0;
    color: #fff;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .sd-rubric-footer {
    position: relative;
    z-index: 50;
    flex: none;
    border-top: 1px solid rgb(255 255 255 / 0.05);
    background: rgb(15 23 42 / 0.96);
    padding: 18px 24px 24px;
    backdrop-filter: blur(20px);
  }

  .sd-rubric-footer-action {
    display: flex;
    width: 100%;
    min-height: 54px;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border-radius: 13px;
    background: #fff;
    color: var(--sd-rubric-navy);
    font-size: 12px;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-decoration: none;
    text-transform: uppercase;
    transition: transform 150ms ease;
  }

  .diana-app-shell:has(.sd-rubric-scout) .agent-fab-anchor,
  .app-command-frame:has(.sd-rubric-scout) .diana-mobile-command {
    display: none !important;
  }

  .app-command-frame:has(.sd-rubric-scout) {
    padding: 0 !important;
  }

  .diana-app:has(.sd-rubric-scout) .skip-link {
    transition: none;
  }

  .diana-app:has(.sd-rubric-scout) .skip-link:focus {
    transform: translateY(0) !important;
  }

  .diana-app:has(.sd-rubric-scout) nextjs-portal {
    display: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .sd-rubric-criterion,
    .sd-rubric-footer-action {
      transition: none;
    }
  }
`;

export function RubricPanel({
  classId,
  className,
  teacher,
  aiMode,
  rubric,
  syllabus,
  assignments,
  scanOpen,
  rubricForm,
  syllabusForm,
}: {
  classId: string;
  className: string;
  teacher: string | null;
  aiMode: "green" | "yellow" | "red";
  rubric: RubricScoutRubric | null;
  syllabus: RubricScoutSyllabus | null;
  assignments: readonly RubricScoutAssignment[];
  scanOpen: boolean;
  rubricForm: ReactNode;
  syllabusForm: ReactNode;
}) {
  const resolved = useMemo(
    () => resolveRubric(rubric?.rawText ?? null, null),
    [rubric?.rawText],
  );
  const storageKey = `${STORAGE_PREFIX}${classId}:${rubric?.id ?? "none"}`;
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setChecked(saved ? (JSON.parse(saved) as string[]) : []);
    } catch {
      setChecked([]);
    }
  }, [storageKey]);

  function toggleCriterion(id: string) {
    setChecked((current) => {
      const next = current.includes(id)
        ? current.filter((criterionId) => criterionId !== id)
        : [...current, id];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // This private working check may safely remain session-only.
      }
      return next;
    });
  }

  const firstAssignment = assignments[0] ?? null;
  const primaryHref = firstAssignment ? `/assignments/${firstAssignment.id}` : "/classes";
  const courseContext = syllabus?.title ?? `${className}${teacher ? ` · ${teacher}` : ""}`;

  return (
    <ScreenDesignViewport className="sd-rubric-scout" aria-label="Rubric Scout">
      <style>{RUBRIC_SCOUT_STYLES}</style>
      <header className="sd-rubric-header">
        <div className="sd-rubric-header-row">
          <div className="sd-rubric-owner">
            <Link href="/classes" className="sd-rubric-back" aria-label="Back to classes">
              <ChevronLeft size={20} aria-hidden="true" />
            </Link>
            <DianaWordmark className="sd-rubric-wordmark" />
          </div>
          <Link
            href={`/classes/${classId}?rubric=scan`}
            className="sd-rubric-scan"
            aria-label="Edit rubric"
          >
            Scan new
          </Link>
        </div>
        <h1 className="sd-rubric-title">Course insights</h1>
        <p className="sd-rubric-context">Syllabus: {courseContext}</p>
      </header>

      <main className="sd-rubric-scroll">
        {scanOpen && (
          <section className="sd-rubric-scan-panel" aria-label="Course source editor">
            <h2>Update course sources</h2>
            <div className="sd-rubric-scan-block">
              <h3>Rubric</h3>
              {rubricForm}
            </div>
            <div className="sd-rubric-scan-block">
              <h3>Syllabus</h3>
              {syllabusForm}
            </div>
          </section>
        )}

        <section className="sd-rubric-section" aria-labelledby="rubric-winning-title">
          <h2 id="rubric-winning-title" className="sd-rubric-section-heading">
            <CheckCircle2 size={18} aria-hidden="true" />
            A-grade criteria
          </h2>
          {resolved && resolved.criteria.length > 0 ? (
            <div className="sd-rubric-card-stack">
              {resolved.criteria.map((criterion, index) => {
                const isChecked = checked.includes(criterion.id);
                const helpQuery = new URLSearchParams({
                  source: `Rubric criterion for ${className}: ${criterion.title}${criterion.detail ? `: ${criterion.detail}` : ""}`,
                  q: "Help me check my work against this criterion without writing it for me.",
                });
                return (
                  <div key={criterion.id}>
                    <button
                      type="button"
                      className="sd-rubric-criterion"
                      data-checked={isChecked}
                      aria-pressed={isChecked}
                      onClick={() => toggleCriterion(criterion.id)}
                    >
                      <span className="sd-rubric-number" aria-hidden="true">
                        {isChecked ? <Check size={17} /> : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="sd-rubric-card-copy">
                        <strong>{criterion.title}</strong>
                        {criterion.detail && <p>{criterion.detail}</p>}
                      </span>
                      {criterion.points != null && (
                        <span className="sd-rubric-points">{criterion.points} pts</span>
                      )}
                    </button>
                    {aiMode === "green" && !isChecked && (
                      <Link
                        href={`/study-buddy?${helpQuery.toString()}`}
                        className="sd-rubric-help"
                        aria-label={`Work on ${criterion.title} with Diana`}
                      >
                        <MessageCircle size={13} aria-hidden="true" />
                        Check this with Diana
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="sd-rubric-empty">
              No course criteria are saved yet. Use Scan new to add the teacher rubric.
            </p>
          )}
          {aiMode !== "green" && (
            <p className="sd-rubric-policy-status">
              AI help follows this class&apos;s {aiMode} policy. Your saved course criteria remain available.
            </p>
          )}
        </section>

        <section className="sd-rubric-section" data-tone="pink" aria-labelledby="rubric-checks-title">
          <h2 id="rubric-checks-title" className="sd-rubric-section-heading">
            <AlertTriangle size={18} aria-hidden="true" />
            Common checks
          </h2>
          {syllabus && syllabus.policies.length > 0 ? (
            <div className="sd-rubric-card-stack">
              {syllabus.policies.map((policy, index) => (
                <div key={`${policy.kind}-${index}`} className="sd-rubric-policy">
                  <span className="sd-rubric-policy-icon" aria-hidden="true">
                    <Circle size={15} />
                  </span>
                  <div className="sd-rubric-card-copy">
                    <strong>{policy.kind}</strong>
                    <p>{policy.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="sd-rubric-policy-note">
              No additional syllabus checks are saved for this class yet.
            </p>
          )}
        </section>
      </main>

      <footer className="sd-rubric-footer">
        <Link
          href={primaryHref}
          className="sd-rubric-footer-action"
          aria-label="Open rubric work"
        >
          <Plus size={18} aria-hidden="true" />
          Save to study guide
        </Link>
      </footer>
    </ScreenDesignViewport>
  );
}
