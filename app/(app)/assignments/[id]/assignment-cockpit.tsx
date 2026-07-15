"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { toggleStepDone } from "./ai-tools-actions";
import { toggleChecklistItem, transitionAssignment } from "./actions";

export type AssignmentCockpitDrill = {
  id: string;
  kind: "checklist" | "step";
  label: string;
  detail: string | null;
  checked: boolean;
  stepIndex?: number;
};

type AssignmentCockpitProps = {
  assignmentId: string;
  title: string;
  courseLabel: string;
  dueLine: string;
  estimate: string | null;
  briefText: string;
  status: AssignmentStatus;
  classAiMode: "red" | "yellow" | "green";
  drills: readonly AssignmentCockpitDrill[];
};

const WORKSPACE_QUERY = "?workspace=1&start=1";

export function AssignmentCockpit({
  assignmentId,
  title,
  courseLabel,
  dueLine,
  estimate,
  briefText,
  status: initialStatus,
  classAiMode,
  drills: initialDrills,
}: AssignmentCockpitProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AssignmentStatus>(initialStatus);
  const [drills, setDrills] = useState([...initialDrills]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const completedCount = drills.filter((drill) => drill.checked).length;
  const cockpitLabel = courseLabel.toUpperCase();

  function move(
    from: AssignmentStatus,
    to: AssignmentStatus,
    destination?: string,
  ) {
    setMessage(null);
    startTransition(async () => {
      const result = await transitionAssignment({ id: assignmentId, from, to });
      if ("error" in result && result.error) {
        setMessage(result.error);
        return;
      }
      setStatus(to);
      const next = "redirect" in result && result.redirect
        ? result.redirect
        : destination;
      if (next) {
        router.push(next);
      } else {
        router.refresh();
      }
    });
  }

  function startOrContinue() {
    if (status === "todo") {
      move(
        "todo",
        "drafting",
        `/assignments/${assignmentId}${WORKSPACE_QUERY}`,
      );
      return;
    }
    if (status === "abandoned") {
      move("abandoned", "todo", `/assignments/${assignmentId}`);
      return;
    }
    if (status === "checking") {
      move("checking", "exporting", `/assignments/${assignmentId}/submit`);
      return;
    }
    if (status === "exporting") {
      router.push(`/assignments/${assignmentId}/submit`);
      return;
    }
    if (status === "submitted" || status === "graded") {
      router.push("/assignments");
      return;
    }
    router.push(`/assignments/${assignmentId}${WORKSPACE_QUERY}`);
  }

  function toggleDrill(drill: AssignmentCockpitDrill) {
    const checked = !drill.checked;
    setMessage(null);
    setDrills((current) =>
      current.map((item) => (item.id === drill.id ? { ...item, checked } : item)),
    );
    startTransition(async () => {
      const result = drill.kind === "step"
        ? await toggleStepDone({
            assignmentId,
            stepIndex: drill.stepIndex ?? 0,
            done: checked,
          })
        : await toggleChecklistItem({ itemId: drill.id, checked });
      if ("error" in result && result.error) {
        setDrills((current) =>
          current.map((item) =>
            item.id === drill.id ? { ...item, checked: !checked } : item,
          ),
        );
        setMessage(result.error);
      }
    });
  }

  const primaryLabel = status === "todo"
    ? "Start assignment"
    : status === "drafting"
      ? "Continue assignment"
      : status === "checking"
        ? "Open submission review"
        : status === "exporting"
          ? "Review before submitting"
          : status === "abandoned"
            ? "Resume assignment"
            : "View submitted work";

  return (
    <ScreenDesignViewport className="sd-assignment-cockpit">
      <header className="sd-assignment-cockpit-header">
        <Link
          href="/assignments"
          className="sd-assignment-circle-control"
          aria-label="Back to assignments"
        >
          <ChevronLeft size={21} aria-hidden="true" />
        </Link>
        <div className="sd-assignment-cockpit-brand">
          <DianaWordmark />
          <h1>COCKPIT: {cockpitLabel}</h1>
        </div>
        <Link
          href={`/assignments/${assignmentId}${WORKSPACE_QUERY}`}
          className="sd-assignment-circle-control"
          aria-label="Open full assignment workspace"
        >
          <MoreVertical size={21} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-assignment-cockpit-scroll">
        <section className="sd-assignment-timer-section" aria-label="Assignment focus">
          <button
            type="button"
            className="sd-assignment-timer"
            aria-label={primaryLabel}
            onClick={startOrContinue}
            disabled={pending}
          >
            <span className="sd-assignment-timer-track" aria-hidden="true" />
            <span className="sd-assignment-timer-copy">
              <strong>{pending ? "READY" : "25:00"}</strong>
              <small>{status === "drafting" ? "IN THE ZONE" : "READY WHEN YOU ARE"}</small>
            </span>
          </button>
          <p className="sd-assignment-title" title={title}>{title}</p>
          <p className="sd-assignment-meta">
            {dueLine}{estimate ? ` Â· ${estimate}` : ""}
          </p>
        </section>

        <section className="sd-assignment-drills" aria-labelledby="training-drills-title">
          <div className="sd-assignment-drills-head">
            <h2 id="training-drills-title">Training drills</h2>
            <span>{completedCount} / {drills.length} done</span>
          </div>

          <div className="sd-assignment-drill-list">
            {drills.length > 0 ? drills.map((drill) => (
              <button
                key={drill.id}
                type="button"
                role="checkbox"
                aria-checked={drill.checked}
                aria-label={drill.label}
                className="sd-assignment-drill"
                data-checked={drill.checked || undefined}
                onClick={() => toggleDrill(drill)}
                disabled={pending}
              >
                <span className="sd-assignment-drill-check" aria-hidden="true">
                  {drill.checked ? <Check size={16} strokeWidth={3} /> : null}
                </span>
                <span className="sd-assignment-drill-copy">
                  <strong>{drill.label}</strong>
                  <small>{drill.detail ?? "Saved to this assignment"}</small>
                </span>
                {!drill.checked ? <ChevronRight size={18} aria-hidden="true" /> : null}
              </button>
            )) : (
              <Link
                href={`/assignments/${assignmentId}${WORKSPACE_QUERY}`}
                className="sd-assignment-drill sd-assignment-drill-empty"
              >
                <span className="sd-assignment-drill-check" aria-hidden="true">
                  <FileText size={15} />
                </span>
                <span className="sd-assignment-drill-copy">
                  <strong>Review assignment directions</strong>
                  <small>{briefText}</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            )}
          </div>

          <div className="sd-assignment-state-actions">
            {status === "drafting" ? (
              <>
                <button
                  type="button"
                  onClick={() => move("drafting", "checking")}
                  disabled={pending}
                >
                  <Check size={15} aria-hidden="true" /> Mark ready for review
                </button>
                <button
                  type="button"
                  onClick={() => move("drafting", "todo")}
                  disabled={pending}
                >
                  <Pause size={15} aria-hidden="true" /> Pause assignment
                </button>
              </>
            ) : null}
            {status === "checking" ? (
              <button
                type="button"
                onClick={() => move("checking", "drafting")}
                disabled={pending}
              >
                <RotateCcw size={15} aria-hidden="true" /> Return to drafting
              </button>
            ) : null}
            {status === "todo" ? (
              <Link href={`/assignments/${assignmentId}${WORKSPACE_QUERY}`}>
                <Play size={15} aria-hidden="true" /> Open workspace
              </Link>
            ) : null}
          </div>
        </section>
      </main>

      <div className="sd-assignment-coach-help">
        {classAiMode === "green" ? (
          <>
            <Link
              href={`/break-down?assignmentId=${encodeURIComponent(assignmentId)}`}
              className="sd-assignment-coach-bubble"
            >
              Want a smaller move? I can break this assignment down.
            </Link>
            <Link
              href={`/break-down?assignmentId=${encodeURIComponent(assignmentId)}`}
              className="sd-assignment-coach-button"
              aria-label="Break this assignment down"
            >
              <MessageCircle size={29} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <div className="sd-assignment-coach-bubble" role="note">
            AI planning is not enabled for this class. Your workspace still works.
          </div>
        )}
      </div>

      {message ? <p className="sd-assignment-status" role="status">{message}</p> : null}
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
