"use client";

import { useState, useTransition } from "react";
import { connectCanvas, connectIcs, connectClassroom, disconnectLms } from "./lms-actions";

type Connection = {
  id: string;
  provider: "canvas" | "ics" | "google_classroom";
  config: Record<string, unknown>;
  last_synced_at: string | null;
};

type SyncResult = { imported: number; skipped: number; source: string };
type Banner = { tone: "ok" | "warn"; message: string } | null;

const PROVIDER_LABEL = {
  canvas: "Canvas",
  ics: "Calendar URL",
  google_classroom: "Google Classroom",
} as const;

const SYNC_ENDPOINT = {
  canvas: "/api/lms/canvas-sync",
  ics: "/api/lms/ics-sync",
  google_classroom: "/api/lms/classroom-sync",
} as const;

function formatSyncedAt(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const d = new Date(iso);
  return `Last synced ${d.toLocaleString()}`;
}

export function LmsConnections({ initial }: { initial: Connection[] }) {
  const [banner, setBanner] = useState<Banner>(null);
  const [pending, startTransition] = useTransition();

  async function runSync(c: Connection) {
    setBanner(null);
    try {
      const res = await fetch(SYNC_ENDPOINT[c.provider], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: c.id }),
      });
      const body = (await res.json()) as SyncResult & { error?: string };
      if (!res.ok) {
        setBanner({ tone: "warn", message: body.error ?? "The sync didn't complete — try again in a moment" });
        return;
      }
      let message = `Imported ${body.imported} assignments from ${PROVIDER_LABEL[c.provider]}`;
      if (body.skipped > 0) {
        message += ` · ${body.skipped} couldn't be imported, check your connection`;
      }
      setBanner({ tone: "ok", message });
    } catch {
      setBanner({ tone: "warn", message: "The sync didn't complete — try again in a moment" });
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Connected calendars</h2>
      <p className="text-sm text-muted">
        Pull your due dates from Canvas, a calendar URL, or Google Classroom. Syncing happens when you press the button.
      </p>

      {banner && (
        <div
          className={
            banner.tone === "ok"
              ? "rounded-lg border border-border bg-card px-3 py-2 text-sm"
              : "rounded-lg border border-amber-400/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          }
        >
          {banner.message}
        </div>
      )}

      <ul className="space-y-2">
        {initial.length === 0 && (
          <li className="text-sm text-muted">No calendars connected yet.</li>
        )}
        {initial.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{PROVIDER_LABEL[c.provider]}</p>
              <p className="text-xs text-muted">{formatSyncedAt(c.last_synced_at)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => runSync(c)}
                disabled={pending}
                className="rounded-md border border-border px-3 py-1 text-sm hover:bg-card"
              >
                Sync now
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    const r = await disconnectLms(c.id);
                    setBanner(r.ok ? null : { tone: "warn", message: r.message });
                  })
                }
                disabled={pending}
                className="rounded-md border border-border px-3 py-1 text-sm text-muted hover:bg-card"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <details className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Connect Canvas</summary>
        <form
          action={async (fd) => {
            const r = await connectCanvas(fd);
            setBanner(r.ok ? null : { tone: "warn", message: r.message });
          }}
          className="mt-3 space-y-2"
        >
          <input name="base_url" placeholder="https://yourschool.instructure.com" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="token" type="password" placeholder="Personal access token" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted">Generate a token in Canvas: Account → Settings → New Access Token.</p>
          <button type="submit" className="rounded-md border border-border bg-card px-3 py-1 text-sm">Connect Canvas</button>
        </form>
      </details>

      <details className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Connect a calendar URL (.ics)</summary>
        <form
          action={async (fd) => {
            const r = await connectIcs(fd);
            setBanner(r.ok ? null : { tone: "warn", message: r.message });
          }}
          className="mt-3 space-y-2"
        >
          <input name="url" placeholder="https://...webcal or .ics URL" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-border bg-card px-3 py-1 text-sm">Connect calendar</button>
        </form>
      </details>

      <details className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Connect Google Classroom</summary>
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-muted">
            Sign in with Google (with Classroom permissions granted) before connecting. Once connected, press Sync now to pull coursework.
          </p>
          <form
            action={async () => {
              const r = await connectClassroom();
              setBanner(r.ok ? null : { tone: "warn", message: r.message });
            }}
          >
            <button type="submit" className="rounded-md border border-border bg-card px-3 py-1 text-sm">Connect Google Classroom</button>
          </form>
        </div>
      </details>
    </section>
  );
}
