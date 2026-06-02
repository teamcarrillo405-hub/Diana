"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { STATUS_LABEL } from "@/lib/state-machine/assignment";
import { queueOfflineAssignmentStatus, registerOfflineSync } from "@/lib/offline/store";
import { transitionAssignment } from "./actions";

export function StatusButtons({
  assignmentId,
  from,
  options,
}: {
  assignmentId: string;
  from: AssignmentStatus;
  options: AssignmentStatus[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flashedTo, setFlashedTo] = useState<AssignmentStatus | null>(null);

  if (options.length === 0) return null;

  function go(to: AssignmentStatus) {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof transitionAssignment>>;
      try {
        result = await transitionAssignment({ id: assignmentId, from, to });
      } catch {
        if (!navigator.onLine) {
          await queueOfflineAssignmentStatus({
            tempId: `${assignmentId}-${to}-${Date.now()}`,
            assignmentId,
            from,
            to,
            queuedAt: new Date().toISOString(),
          });
          await registerOfflineSync();
          if (isPrimary(from, to)) {
            setFlashedTo(to);
            setTimeout(() => setFlashedTo(null), 1200);
          }
          router.refresh();
        }
        return;
      }
      if ("error" in result && result.error && !navigator.onLine) {
        await queueOfflineAssignmentStatus({
          tempId: `${assignmentId}-${to}-${Date.now()}`,
          assignmentId,
          from,
          to,
          queuedAt: new Date().toISOString(),
        });
        await registerOfflineSync();
        router.refresh();
        return;
      }
      if (isPrimary(from, to) && !("error" in result && result.error)) {
        setFlashedTo(to);
        setTimeout(() => setFlashedTo(null), 1200);
      }
      if ("error" in result && result.error) return;
      if (result.redirect) {
        router.push(result.redirect);
        return;
      }
      // GAP-07: after todo→drafting, focus the breadcrumb so the student
      // captures "where will you start?" before context switching.
      if (from === "todo" && to === "drafting") {
        router.push(`/assignments/${assignmentId}?focus=breadcrumb`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      {flashedTo !== null && (
        <div className="absolute -top-8 left-0 flex items-center gap-1.5 pointer-events-none">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="rgb(22 163 74)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" className="check-draw" />
          </svg>
          <span className="text-sm font-medium text-ok check-draw" style={{ animationDelay: "100ms" }}>
            Done!
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((to) => (
          <button
            key={to}
            type="button"
            disabled={pending}
            onClick={() => go(to)}
            className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${
              isPrimary(from, to)
                ? `bg-accent text-white hover:opacity-90 ${flashedTo === to ? "btn-complete-flash" : ""}`
                : "border border-border bg-card hover:bg-border/30"
            }`}
          >
            {labelFor(from, to)}
          </button>
        ))}
      </div>
    </div>
  );
}

function isPrimary(from: AssignmentStatus, to: AssignmentStatus): boolean {
  if (from === "todo" && to === "drafting") return true;
  if (from === "drafting" && to === "checking") return true;
  if (from === "checking" && to === "exporting") return true;
  if (from === "exporting" && to === "submitted") return true;
  return false;
}

function labelFor(from: AssignmentStatus, to: AssignmentStatus): string {
  if (from === "todo" && to === "drafting") return "Start working";
  if (from === "drafting" && to === "checking") return "I have a draft";
  if (from === "checking" && to === "exporting") return "Ready to submit";
  if (from === "exporting" && to === "submitted") return "Mark submitted";
  if (to === "abandoned") return "Set aside";
  if (to === "todo") return "Pick it back up";
  return STATUS_LABEL[to];
}
