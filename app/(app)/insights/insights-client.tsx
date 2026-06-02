"use client";

import { FormEvent, useState, useTransition } from "react";
import { FlaskConical, Flag, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { upsertExperiment, upsertFeatureFlag } from "./actions";

export type FeatureFlagRow = {
  id: string;
  flag_key: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: number;
  audience: string;
};

export type ExperimentRow = {
  id: string;
  experiment_key: string;
  description: string | null;
  surface: string;
  enabled: boolean;
  allocation_pct: number;
};

type Props = {
  flags: FeatureFlagRow[];
  experiments: ExperimentRow[];
};

export function InsightsClient({ flags, experiments }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [flagForm, setFlagForm] = useState({
    flagKey: "",
    description: "",
    enabled: true,
    rolloutPct: 0,
    audience: "self" as "self" | "beta" | "all",
  });
  const [experimentForm, setExperimentForm] = useState({
    experimentKey: "",
    description: "",
    surface: "dashboard ui",
    enabled: false,
    allocationPct: 0,
  });

  function submitFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertFeatureFlag({
        flagKey: flagForm.flagKey,
        description: flagForm.description || null,
        enabled: flagForm.enabled,
        rolloutPct: flagForm.rolloutPct,
        audience: flagForm.audience,
      });
      setMessage(result.ok ? "Feature flag saved." : result.error);
      if (result.ok) setFlagForm((current) => ({ ...current, flagKey: "", description: "" }));
    });
  }

  function submitExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertExperiment({
        experimentKey: experimentForm.experimentKey,
        description: experimentForm.description || null,
        surface: experimentForm.surface,
        enabled: experimentForm.enabled,
        allocationPct: experimentForm.allocationPct,
      });
      setMessage(result.ok ? "Experiment saved." : result.error);
      if (result.ok) {
        setExperimentForm((current) => ({ ...current, experimentKey: "", description: "" }));
      }
    });
  }

  function toggleFlag(flag: FeatureFlagRow) {
    startTransition(async () => {
      const result = await upsertFeatureFlag({
        flagKey: flag.flag_key,
        description: flag.description,
        enabled: !flag.enabled,
        rolloutPct: flag.rollout_pct,
        audience: flag.audience as "self" | "beta" | "all",
      });
      setMessage(result.ok ? "Feature flag updated." : result.error);
    });
  }

  function toggleExperiment(experiment: ExperimentRow) {
    startTransition(async () => {
      const result = await upsertExperiment({
        experimentKey: experiment.experiment_key,
        description: experiment.description,
        surface: experiment.surface,
        enabled: !experiment.enabled,
        allocationPct: experiment.allocation_pct,
      });
      setMessage(result.ok ? "Experiment updated." : result.error);
    });
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Rollout controls</h2>
        <p className="text-sm text-muted">
          Toggle new UI surfaces without a deploy. Experiments are limited to interface changes.
        </p>
      </header>

      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitFlag} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-accent" />
            <h3 className="text-sm font-semibold">Feature flag</h3>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Key</span>
            <input
              value={flagForm.flagKey}
              onChange={(event) => setFlagForm({ ...flagForm, flagKey: event.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
              placeholder="offline_notes"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Description</span>
            <input
              value={flagForm.description}
              onChange={(event) => setFlagForm({ ...flagForm, description: event.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
              placeholder="Enable the next notes surface"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted">Audience</span>
              <select
                value={flagForm.audience}
                onChange={(event) =>
                  setFlagForm({ ...flagForm, audience: event.target.value as "self" | "beta" | "all" })
                }
                className="w-full rounded-md border border-border bg-bg px-3 py-2"
              >
                <option value="self">Self</option>
                <option value="beta">Beta</option>
                <option value="all">All</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted">Rollout {flagForm.rolloutPct}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={flagForm.rolloutPct}
                onChange={(event) => setFlagForm({ ...flagForm, rolloutPct: Number(event.target.value) })}
                className="w-full"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={flagForm.enabled}
              onChange={(event) => setFlagForm({ ...flagForm, enabled: event.target.checked })}
            />
            Enabled
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save size={16} />
            Save flag
          </button>
        </form>

        <form onSubmit={submitExperiment} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-accent" />
            <h3 className="text-sm font-semibold">UI experiment</h3>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Key</span>
            <input
              value={experimentForm.experimentKey}
              onChange={(event) => setExperimentForm({ ...experimentForm, experimentKey: event.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
              placeholder="compact_dashboard"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Surface</span>
            <input
              value={experimentForm.surface}
              onChange={(event) => setExperimentForm({ ...experimentForm, surface: event.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
              placeholder="dashboard ui"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Description</span>
            <input
              value={experimentForm.description}
              onChange={(event) => setExperimentForm({ ...experimentForm, description: event.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2"
              placeholder="Compare compact and spacious cards"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Allocation {experimentForm.allocationPct}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={experimentForm.allocationPct}
              onChange={(event) =>
                setExperimentForm({ ...experimentForm, allocationPct: Number(event.target.value) })
              }
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={experimentForm.enabled}
              onChange={(event) => setExperimentForm({ ...experimentForm, enabled: event.target.checked })}
            />
            Enabled
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save size={16} />
            Save experiment
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ControlList title="Flags">
          {flags.length === 0 ? (
            <p className="text-sm text-muted">No feature flags yet.</p>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className="flex items-start justify-between gap-3 border-t border-border py-3 first:border-t-0 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{flag.flag_key}</p>
                  <p className="text-xs text-muted">
                    {flag.audience} - {flag.rollout_pct}% rollout
                  </p>
                  {flag.description ? <p className="mt-1 text-xs text-muted">{flag.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlag(flag)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                  aria-label={flag.enabled ? "Disable flag" : "Enable flag"}
                >
                  {flag.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {flag.enabled ? "On" : "Off"}
                </button>
              </div>
            ))
          )}
        </ControlList>

        <ControlList title="Experiments">
          {experiments.length === 0 ? (
            <p className="text-sm text-muted">No UI experiments yet.</p>
          ) : (
            experiments.map((experiment) => (
              <div key={experiment.id} className="flex items-start justify-between gap-3 border-t border-border py-3 first:border-t-0 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{experiment.experiment_key}</p>
                  <p className="text-xs text-muted">
                    {experiment.surface} - {experiment.allocation_pct}% allocation
                  </p>
                  {experiment.description ? <p className="mt-1 text-xs text-muted">{experiment.description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleExperiment(experiment)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                  aria-label={experiment.enabled ? "Disable experiment" : "Enable experiment"}
                >
                  {experiment.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {experiment.enabled ? "On" : "Off"}
                </button>
              </div>
            ))
          )}
        </ControlList>
      </div>
    </section>
  );
}

function ControlList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
