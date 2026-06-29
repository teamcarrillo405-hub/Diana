import { ShieldCheck } from "lucide-react";
import type { HelpOwnershipMeter as HelpOwnershipMeterValue } from "@/lib/student-state/model";

export function HelpOwnershipMeter({
  meter,
  compact = false,
}: {
  meter: HelpOwnershipMeterValue;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 font-medium text-muted">
          <ShieldCheck size={12} />
          Help ownership
        </p>
        <p className="font-semibold">{meter.studentSharePercent}% student</p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label="Student ownership meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={meter.studentSharePercent}
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${meter.studentSharePercent}%` }} />
      </div>
      <div className={`mt-2 grid gap-2 ${compact ? "" : "sm:grid-cols-3"}`}>
        <div>
          <p className="text-muted">AI role</p>
          <p className="font-medium">{aiContributionLabel(meter.aiContribution)}</p>
        </div>
        <div className={compact ? "" : "sm:col-span-2"}>
          <p className="text-muted">Student action</p>
          <p className="font-medium">{meter.studentActionRequired}</p>
        </div>
      </div>
      {!compact && <p className="mt-2 text-muted">{meter.finalWorkProtection}</p>}
    </div>
  );
}

function aiContributionLabel(value: HelpOwnershipMeterValue["aiContribution"]): string {
  return ({
    none: "No content help",
    organize: "Organize",
    hint: "Hint",
    practice: "Practice",
    draft_suggestion: "Suggestion",
  } satisfies Record<HelpOwnershipMeterValue["aiContribution"], string>)[value];
}
