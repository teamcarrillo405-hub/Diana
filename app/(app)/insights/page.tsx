import {
  Activity,
  AlertTriangle,
  BarChart3,
  Coins,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import {
  aiCostByFeature,
  featureUsageSummary,
  taskCompletionRate,
  webVitalStatus,
} from "@/lib/platform/analytics";
import { createClient } from "@/lib/supabase/server";
import { InsightsClient, type ExperimentRow, type FeatureFlagRow } from "./insights-client";
import { AppTopNav } from "../app-top-nav";

export default async function InsightsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const todayStart = `${todayIso}T00:00:00.000Z`;
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    aiInteractions,
    analyticsEvents,
    flags,
    experiments,
    errorEvents,
    performanceEvents,
    timeLogs,
    assignments,
  ] = await Promise.all([
    supabase
      .from("ai_interactions")
      .select("feature, tokens_used, created_at")
      .eq("owner_id", user.id)
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("analytics_events")
      .select("event_name, feature, duration_ms, created_at")
      .eq("owner_id", user.id)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("feature_flags")
      .select("id, flag_key, description, enabled, rollout_pct, audience")
      .eq("owner_id", user.id)
      .order("flag_key", { ascending: true }),
    supabase
      .from("experiments")
      .select("id, experiment_key, description, surface, enabled, allocation_pct")
      .eq("owner_id", user.id)
      .order("experiment_key", { ascending: true }),
    supabase
      .from("error_events")
      .select("id, route, message, severity, diagnosis_tags, created_at")
      .eq("owner_id", user.id)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("performance_events")
      .select("id, route, metric_name, value, budget_value, created_at")
      .eq("owner_id", user.id)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("assignment_time_log")
      .select("started_at, ended_at, elapsed_minutes")
      .eq("owner_id", user.id)
      .gte("started_at", sevenDaysAgo),
    supabase.from("assignments").select("status").eq("owner_id", user.id),
  ]);

  const costRows = aiCostByFeature(aiInteractions.data ?? [], todayIso);
  const totalTokens = costRows.reduce((sum, row) => sum + row.tokens, 0);
  const usageRows = featureUsageSummary(analyticsEvents.data ?? []).slice(0, 6);
  const completion = taskCompletionRate(assignments.data ?? []);
  const sessionMinutes = (timeLogs.data ?? []).reduce((sum, row) => {
    if (typeof row.elapsed_minutes === "number") return sum + row.elapsed_minutes;
    if (row.ended_at) {
      return sum + Math.max(0, Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000));
    }
    return sum;
  }, 0);
  const averageSessionMinutes =
    (timeLogs.data?.length ?? 0) === 0 ? 0 : Math.round(sessionMinutes / (timeLogs.data?.length ?? 1));
  const vitalRows = (performanceEvents.data ?? []).map((row) =>
    webVitalStatus(row.metric_name, Number(row.value), row.budget_value === null ? null : Number(row.budget_value)),
  );
  const vitalAlerts = vitalRows.filter((row) => row.status === "over_budget").length;
  const activeFlags = (flags.data ?? []).filter((flag) => flag.enabled).length;
  const activeExperiments = (experiments.data ?? []).filter((experiment) => experiment.enabled).length;

  return (
    <>
      <AppTopNav active="More" />
      <div className="diana-page space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Platform intelligence</p>
        <h1 className="text-display">Insights</h1>
        <p className="text-sm text-muted">
          Usage, AI token spend, rollout controls, and app health in one place.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Coins} label="AI tokens today" value={totalTokens.toLocaleString()} />
        <MetricCard icon={Activity} label="7-day session avg" value={`${averageSessionMinutes} min`} />
        <MetricCard icon={BarChart3} label="Task completion" value={`${completion.percent}%`} />
        <MetricCard icon={Gauge} label="Vital alerts" value={String(vitalAlerts)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="AI cost by feature" description="Today for this account.">
          {costRows.length === 0 ? (
            <p className="text-sm text-muted">No AI token use logged today.</p>
          ) : (
            <div className="space-y-3">
              {costRows.map((row) => (
                <BarRow
                  key={row.feature}
                  label={labelize(row.feature)}
                  value={`${row.tokens.toLocaleString()} tokens`}
                  percent={totalTokens === 0 ? 0 : Math.round((row.tokens / totalTokens) * 100)}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Feature usage" description="Page views and route sessions from the last 7 days.">
          {usageRows.length === 0 ? (
            <p className="text-sm text-muted">Usage events will appear after navigation.</p>
          ) : (
            <div className="space-y-3">
              {usageRows.map((row) => (
                <BarRow
                  key={row.feature}
                  label={labelize(row.feature)}
                  value={`${row.events} events - ${row.sessionMinutes} min`}
                  percent={Math.min(100, row.events * 10)}
                />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Task completion" description={`${completion.completed} of ${completion.total} assignments are done, submitted, or graded.`}>
          <div className="h-3 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-accent" style={{ width: `${completion.percent}%` }} />
          </div>
        </Panel>

        <Panel title="Rollout state" description={`${activeFlags} active flags and ${activeExperiments} active UI experiments.`}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="text-2xl font-semibold">{flags.data?.length ?? 0}</p>
              <p className="text-muted">Flags</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-2xl font-semibold">{experiments.data?.length ?? 0}</p>
              <p className="text-muted">Experiments</p>
            </div>
          </div>
        </Panel>

        <Panel title="Anonymized context" description="Monitor events store diagnosis categories, not raw profile values.">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck size={18} className="text-accent" />
            Tags are grouped as attention, reading, math, writing, sensory, wellbeing, or other.
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="App monitor" description="Most recent reports from authenticated sessions.">
          {(errorEvents.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No app monitor reports in the last 7 days.</p>
          ) : (
            <div className="space-y-3">
              {(errorEvents.data ?? []).map((row) => (
                <div key={row.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle size={15} />
                    {row.severity}
                  </div>
                  <p className="mt-1 break-words">{row.message}</p>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                    {(row.route ?? "unknown route")} - {(row.diagnosis_tags ?? []).join(", ") || "not_disclosed"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Web vitals" description="Recent route metrics with budget checks.">
          {vitalRows.length === 0 ? (
            <p className="text-sm text-muted">Web vital reports will appear after navigation.</p>
          ) : (
            <div className="space-y-2">
              {vitalRows.slice(0, 8).map((row, index) => (
                <div key={`${row.metricName}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{row.metricName}</span>
                  <span className={row.status === "ok" ? "text-muted" : "text-amber-700 dark:text-amber-300"}>
                    {row.value.toFixed(row.metricName === "CLS" ? 3 : 0)} / {row.budget}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <InsightsClient flags={(flags.data ?? []) as FeatureFlagRow[]} experiments={(experiments.data ?? []) as ExperimentRow[]} />
      </div>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <Icon size={15} />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function BarRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="diana-page space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium">{label}</span>
        <span className="shrink-0 text-xs text-muted">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${Math.max(4, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

function labelize(value: string): string {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
