import { Trophy, ShieldCheck, TimerReset } from "lucide-react";
import { COMPETITIVE_CAPABILITY_BARS } from "@/lib/competitive/capability-matrix";
import { COMPETITIVE_BENCHMARK_SCENARIOS } from "@/lib/benchmark/competitive";
import { TEEN_TEST_TASKS } from "@/lib/teen-testing/protocol";

export default function ProofPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
          Competitive proof
        </p>
        <h1 className="text-2xl font-bold">10/10 evidence board</h1>
        <p className="max-w-3xl text-sm text-muted">
          Diana can claim proof-ready only when product bars, benchmark scenarios, and teen testing all pass without final-work confusion.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <ProofMetric icon={Trophy} label="Product bars" value={`${COMPETITIVE_CAPABILITY_BARS.length} tracked`} />
        <ProofMetric icon={TimerReset} label="Benchmark tasks" value={`${COMPETITIVE_BENCHMARK_SCENARIOS.length} fixed`} />
        <ProofMetric icon={ShieldCheck} label="Teen test gate" value={`${TEEN_TEST_TASKS.length} tasks`} />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-base font-semibold">Capability bars</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {COMPETITIVE_CAPABILITY_BARS.map((bar) => (
            <article key={bar.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold">{bar.label}</h3>
                <span className="w-fit rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                  {bar.competitorOwner.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{bar.dianaTarget}</p>
              <p className="mt-2 text-xs text-muted">Pass: {bar.passCriteria.join(" | ")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-base font-semibold">Benchmark scenarios</h2>
        <div className="grid gap-2">
          {COMPETITIVE_BENCHMARK_SCENARIOS.map((scenario) => (
            <article key={scenario.id} className="rounded-xl border border-border bg-background p-3">
              <p className="text-sm font-semibold">{scenario.prompt}</p>
              <p className="mt-1 text-xs text-muted">{scenario.targetCompetitorPattern}</p>
              <p className="mt-1 text-xs text-muted">Evidence: {scenario.requiredEvidence.join(" | ")}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProofMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        <Icon size={13} />
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
