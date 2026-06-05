import { Activity, Brain, CheckCircle2, Route, ShieldCheck } from "lucide-react";
import { readinessLabel, type StudentStateModel } from "@/lib/student-state/model";
import { HelpOwnershipMeter } from "@/components/help-ownership-meter";

export function StudentStateCard({
  model,
  title = "Student state",
}: {
  model: StudentStateModel;
  title?: string;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{title}</p>
          <h2 className="mt-1 text-base font-semibold">{model.supportPlan.headline}</h2>
          <p className="mt-1 text-sm text-muted">{model.supportPlan.rationale}</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted">
          <ShieldCheck size={13} />
          {policyLabel(model.aiPolicy)}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <StateMetric icon={Activity} label="Readiness" value={readinessLabel(model.readiness)} />
        <StateMetric
          icon={Route}
          label={`Rule path (${model.supportPlan.ruleConfidence})`}
          value={model.supportPlan.decisionTrace.slice(0, 3).join(" / ") || model.rulePath.slice(0, 3).join(" / ")}
        />
        <StateMetric
          icon={Brain}
          label="Recall"
          value={
            model.recall.attempts7d > 0
              ? `${model.recall.secure7d} secure, ${model.recall.needsReview7d} review`
              : "No recall yet"
          }
        />
      </div>

      <div className="rounded-2xl border border-border bg-background/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <CheckCircle2 size={13} />
          Next academic move
        </p>
        <p className="mt-1 text-sm font-medium">{model.supportPlan.nextStep}</p>
      </div>

      {model.sourceAnchors.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {model.sourceAnchors.slice(0, 4).map((anchor) => (
            <div key={`${anchor.sourceType}-${anchor.label}`} className="rounded-xl border border-border bg-background/70 p-3">
              <p className="text-xs font-semibold">{anchor.label}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted">{anchor.detail}</p>
            </div>
          ))}
        </div>
      )}

      <HelpOwnershipMeter meter={model.ownershipMeter} compact />
    </section>
  );
}

function StateMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-muted">
        <Icon size={13} />
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function policyLabel(policy: StudentStateModel["aiPolicy"]): string {
  if (policy === "red") return "No content AI";
  if (policy === "yellow") return "Scaffolding only";
  return "Full study support";
}
