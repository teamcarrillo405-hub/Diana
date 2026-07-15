"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectCanvas, connectIcs, connectClever, connectGitLab, disconnectLms } from "./lms-actions";

type Connection = {
  id: string;
  provider: "canvas" | "ics" | "google_classroom" | "clever" | "gitlab";
  config: Record<string, unknown>;
  last_synced_at: string | null;
};

type SyncResult = { imported: number; skipped: number; source: string };
type Banner = { tone: "ok" | "warn"; message: string } | null;

const PROVIDER_LABEL = {
  canvas: "Canvas",
  ics: "Calendar URL",
  google_classroom: "Google Classroom",
  clever: "Clever",
  gitlab: "GitLab",
} as const;

const SYNC_ENDPOINT = {
  canvas: "/api/lms/canvas-sync",
  ics: "/api/lms/ics-sync",
  google_classroom: "/api/lms/classroom-sync",
  clever: null,
  gitlab: "/api/lms/gitlab-sync",
} as const;

function formatSyncedAt(iso: string | null): string {
  if (!iso) return "Not synced yet";
  const d = new Date(iso);
  return `Last synced ${d.toLocaleString()}`;
}

export function LmsConnections({ initial }: { initial: Connection[] }) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const hasStale = initial.some((connection) => {
      if (connection.provider === "clever") return false;
      if (!connection.last_synced_at) return true;
      return Date.now() - new Date(connection.last_synced_at).getTime() > 6 * 60 * 60 * 1000;
    });
    if (!hasStale) return;
    void fetch("/api/lms/sync-all", { method: "POST" })
      .then((res) => res.json())
      .then((body: { imported?: number }) => {
        if (typeof body.imported === "number" && body.imported > 0) {
          setBanner({ tone: "ok", message: `Imported ${body.imported} assignments in the background` });
          router.refresh();
        }
      })
      .catch(() => undefined);
  }, [initial, router]);

  async function runSync(c: Connection) {
    setBanner(null);
    const endpoint = SYNC_ENDPOINT[c.provider];
    if (!endpoint) {
      setBanner({ tone: "warn", message: "This connection is provisioned by your school" });
      return;
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: c.id }),
      });
      const body = (await res.json()) as SyncResult & { error?: string };
      if (!res.ok) {
        setBanner({ tone: "warn", message: body.error ?? "The sync didn't complete: try again in a moment" });
        return;
      }
      let message = `Imported ${body.imported} assignments from ${PROVIDER_LABEL[c.provider]}`;
      if (body.skipped > 0) {
        message += ` · ${body.skipped} couldn't be imported, check your connection`;
      }
      setBanner({ tone: "ok", message });
    } catch {
      setBanner({ tone: "warn", message: "The sync didn't complete: try again in a moment" });
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Connected calendars</h2>
      <p className="text-sm text-muted">
        Pull due dates from Canvas, a calendar URL, Google Classroom, or GitLab issues. Diana also checks connected sources in the background when Settings opens.
      </p>
      <Link href="/api/calendar.ics" className="inline-flex w-fit rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-border/30">
        Export Diana due dates
      </Link>

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
              {c.provider !== "clever" && (
                <button
                  type="button"
                  onClick={() => runSync(c)}
                  disabled={pending}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-card"
                >
                  Sync now
                </button>
              )}
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
        <form action="/api/lms/canvas-oauth/start" method="get" className="mt-3 space-y-2">
          <input name="base_url" placeholder="https://yourschool.instructure.com" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-border bg-card px-3 py-1 text-sm">Connect with Canvas</button>
        </form>
        <form
          action={async (fd) => {
            const r = await connectCanvas(fd);
            setBanner(r.ok ? null : { tone: "warn", message: r.message });
          }}
          className="mt-4 space-y-2 border-t border-border pt-3"
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
            Connect with Google to grant Classroom access. This keeps a secure refresh token so Diana can sync your coursework automatically in the background, not just while you&apos;re signed in.
          </p>
          <a href="/api/lms/google-oauth/start" className="inline-block rounded-md border border-border bg-card px-3 py-1 text-sm">
            Connect Google Classroom
          </a>
        </div>
      </details>

      <details className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Clever school-managed setup</summary>
        <form
          action={async (fd) => {
            const r = await connectClever(fd);
            setBanner(r.ok ? null : { tone: "warn", message: r.message });
          }}
          className="mt-3 space-y-2"
        >
          <input name="district" placeholder="District or school name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="note" placeholder="IT contact or setup note" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-border bg-card px-3 py-1 text-sm">Save Clever marker</button>
        </form>
      </details>

      <details className="rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Connect GitLab for coding class</summary>
        <form
          action={async (fd) => {
            const r = await connectGitLab(fd);
            setBanner(r.ok ? { tone: "ok", message: r.message } : { tone: "warn", message: r.message });
          }}
          className="mt-3 space-y-2"
        >
          <input name="project" placeholder="group/project-path" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="token" type="password" placeholder="GitLab personal access token" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="labels" placeholder="Optional label filter, like assignment" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="base_url" placeholder="https://gitlab.com" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted">
            Read-only import: Diana pulls open issues with due dates into assignments. Use a token with API read access for the class project.
          </p>
          <button type="submit" className="rounded-md border border-border bg-card px-3 py-1 text-sm">Connect GitLab</button>
        </form>
      </details>
    </section>
  );
}
