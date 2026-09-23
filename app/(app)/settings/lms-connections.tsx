"use client";

import {
  Atom,
  BookOpen,
  Calculator,
  ChevronLeft,
  Cloud,
  Code2,
  Landmark,
  Plus,
  RefreshCw,
  School,
} from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import type { LmsConnectionView, SyncBanner } from "./source-models";
import { summarizeSyncAll } from "./source-models";
import {
  connectCanvas,
  connectClever,
  connectGitLab,
  connectIcs,
  disconnectLms,
} from "./lms-actions";

export interface LmsCourseView {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
}

const PROVIDER_LABEL: Readonly<Record<LmsConnectionView["provider"], string>> = {
  canvas: "Canvas",
  ics: "Calendar URL",
  google_classroom: "Google Classroom",
  clever: "Clever",
  gitlab: "GitLab",
};

const SYNC_ENDPOINT: Readonly<Record<LmsConnectionView["provider"], string | null>> = {
  canvas: "/api/lms/canvas-sync",
  ics: "/api/lms/ics-sync",
  google_classroom: "/api/lms/classroom-sync",
  clever: null,
  gitlab: "/api/lms/gitlab-sync",
};

const LMS_STYLES = `
  .diana-authenticated-field:has(.sd-lms-center) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-lms-center) { padding:0!important; }
  .app-command-frame:has(.sd-lms-center) .diana-mobile-command,
  .diana-app-shell:has(.sd-lms-center) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-lms-center) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-lms-center) .skip-link { transition:none; }
  .diana-app:has(.sd-lms-center) .skip-link:focus { transform:translateY(0)!important; }
  .sd-lms-center { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#f8fafc; font-family:ui-sans-serif,system-ui,sans-serif; }
  .sd-lms-header { display:flex; flex:none; align-items:center; gap:14px; border-bottom:1px solid rgb(255 255 255/.05); background:rgb(15 23 42/.92); padding:54px 24px 16px; backdrop-filter:blur(12px); }
  .sd-lms-back { display:grid; width:40px; height:40px; flex:none; place-items:center; border:1px solid rgb(255 255 255/.1); border-radius:999px; background:rgb(255 255 255/.05); color:#f8fafc; }
  .sd-lms-header h1 { margin:0; font-size:20px; font-style:italic; font-weight:950; letter-spacing:-.045em; line-height:1; text-transform:uppercase; }
  .sd-lms-scroll { min-height:0; flex:1; overflow-y:auto; padding:24px 24px 110px; scrollbar-width:none; }
  .sd-lms-section + .sd-lms-section { margin-top:28px; }
  .sd-lms-section-head { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; }
  .sd-lms-section h2 { margin:0; color:#64748b; font-size:10px; font-weight:950; letter-spacing:.2em; text-transform:uppercase; }
  .sd-lms-count { color:#74c0ff; font-size:9px; font-weight:950; text-transform:uppercase; }
  .sd-lms-empty { border:1px dashed rgb(116 192 255/.3); border-radius:16px; background:rgb(116 192 255/.05); padding:16px; }
  .sd-lms-empty p { margin:0 0 12px; color:#94a3b8; font-size:11px; line-height:1.5; }
  .sd-lms-connect-primary { display:inline-flex; min-height:36px; align-items:center; gap:7px; border-radius:10px; background:linear-gradient(135deg,#74c0ff,#ff79da); padding:9px 13px; color:#0f172a; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.06em; text-decoration:none; text-transform:uppercase; }
  .sd-lms-list { display:grid; gap:12px; margin:0; padding:0; list-style:none; }
  .sd-lms-card { display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid rgb(255 255 255/.1); border-radius:16px; background:rgb(255 255 255/.05); padding:14px; }
  .sd-lms-provider { display:flex; min-width:0; align-items:center; gap:13px; }
  .sd-lms-provider-icon { display:grid; width:48px; height:48px; flex:none; place-items:center; border-radius:12px; background:rgb(116 192 255/.12); color:#74c0ff; }
  .sd-lms-provider h3 { overflow:hidden; margin:0; color:#f8fafc; font-size:12px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-lms-provider p { margin:4px 0 0; color:#94a3b8; font-size:9px; line-height:1.35; }
  .sd-lms-provider p[data-attention=true] { color:#fbbf24; }
  .sd-lms-actions { display:flex; flex:none; align-items:center; gap:6px; }
  .sd-lms-actions button { min-height:32px; border:1px solid rgb(255 255 255/.1); border-radius:999px; background:rgb(255 255 255/.05); padding:6px 9px; color:#cbd5e1; font:inherit; font-size:8px; font-weight:900; text-transform:uppercase; }
  .sd-lms-courses { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .sd-lms-course { min-height:112px; border:1px solid rgb(255 255 255/.1); border-radius:16px; background:rgb(255 255 255/.05); padding:14px; }
  .sd-lms-course svg { margin-bottom:12px; color:var(--course-color,#74c0ff); }
  .sd-lms-course h3 { overflow:hidden; margin:0; color:#f8fafc; font-size:11px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-lms-course p { margin:6px 0 0; color:#64748b; font-size:8px; font-weight:800; text-transform:uppercase; }
  .sd-lms-course-empty { grid-column:1/-1; border:1px dashed rgb(255 255 255/.1); border-radius:16px; padding:18px; color:#94a3b8; font-size:10px; line-height:1.45; text-align:center; }
  .sd-lms-connect { scroll-margin-top:12px; }
  .sd-lms-connect details { border:1px solid rgb(255 255 255/.1); border-radius:12px; background:rgb(255 255 255/.04); padding:12px; }
  .sd-lms-connect details + details { margin-top:8px; }
  .sd-lms-connect summary { cursor:pointer; color:#f8fafc; font-size:10px; font-weight:900; text-transform:uppercase; }
  .sd-lms-form { display:grid; gap:8px; margin-top:12px; }
  .sd-lms-form input { width:100%; min-width:0; border:1px solid rgb(255 255 255/.1); border-radius:9px; background:#0b1325; padding:9px 10px; color:#f8fafc; font:inherit; font-size:10px; }
  .sd-lms-form button,.sd-lms-form a { width:fit-content; border:1px solid rgb(116 192 255/.3); border-radius:9px; background:rgb(116 192 255/.1); padding:8px 11px; color:#74c0ff; font:inherit; font-size:9px; font-weight:900; text-decoration:none; text-transform:uppercase; }
  .sd-lms-banner { margin:0 0 14px; border:1px solid rgb(116 192 255/.25); border-radius:12px; background:rgb(116 192 255/.08); padding:10px 12px; color:#bfdbfe; font-size:10px; line-height:1.4; }
  .sd-lms-banner[data-tone=warn] { border-color:rgb(251 191 36/.35); background:rgb(251 191 36/.08); color:#fde68a; }
  .sd-lms-quick { position:absolute; right:24px; bottom:96px; z-index:4; display:grid; width:58px; height:58px; place-items:center; border:0; border-radius:16px; background:linear-gradient(135deg,#74c0ff,#ff79da); color:#0f172a; box-shadow:0 12px 28px rgb(45 212 191/.2); }
  .sd-lms-footer { flex:none; border-top:1px solid rgb(255 255 255/.05); background:#0f172a; padding:18px 24px 24px; }
  .sd-lms-footer button { width:100%; min-height:54px; border:0; border-radius:12px; background:#f8fafc; color:#0f172a; font:inherit; font-size:13px; font-style:italic; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-lms-footer button:disabled { cursor:not-allowed; opacity:.45; }
  .sd-lms-center a:focus-visible,.sd-lms-center button:focus-visible,.sd-lms-center input:focus-visible,.sd-lms-center summary:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
`;

export function LmsConnections({
  initial,
  courses,
  connectOpen = false,
}: {
  initial: readonly LmsConnectionView[];
  courses: readonly LmsCourseView[];
  connectOpen?: boolean;
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<SyncBanner | null>(null);
  const [pending, startTransition] = useTransition();

  async function runSync(connection: LmsConnectionView) {
    const endpoint = SYNC_ENDPOINT[connection.provider];
    if (!endpoint) {
      setBanner({ tone: "warn", message: "This connection is managed by your school." });
      return;
    }
    setBanner(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id }),
      });
      const body = (await response.json()) as {
        error?: string;
        imported?: number;
        skipped?: number;
      };
      if (!response.ok || body.error) {
        setBanner({
          tone: "warn",
          message: body.error ?? "This connection needs attention. Check access and try again.",
        });
        return;
      }
      setBanner({
        tone: "ok",
        message: `Sync complete. Imported ${body.imported ?? 0} assignments from ${PROVIDER_LABEL[connection.provider]}.`,
      });
      router.refresh();
    } catch {
      setBanner({
        tone: "warn",
        message: "The sync could not finish. Check the connection and try again.",
      });
    }
  }

  async function syncAll() {
    setBanner(null);
    try {
      const response = await fetch("/api/lms/sync-all", { method: "POST" });
      const body = (await response.json()) as Parameters<typeof summarizeSyncAll>[0] & {
        error?: string;
      };
      if (!response.ok || body.error) {
        setBanner({ tone: "warn", message: body.error ?? "Connections need attention before syncing." });
        return;
      }
      setBanner(summarizeSyncAll(body));
      router.refresh();
    } catch {
      setBanner({ tone: "warn", message: "The sync could not finish. Try again in a moment." });
    }
  }

  function runAction(action: (formData: FormData) => Promise<{ ok: boolean; message: string }>) {
    return (formData: FormData) => {
      startTransition(async () => {
        const result = await action(formData);
        setBanner({ tone: result.ok ? "ok" : "warn", message: result.message });
        if (result.ok) router.refresh();
      });
    };
  }

  return (
    <ScreenDesignViewport className="sd-lms-center" aria-label="Learning platform connections">
      <style>{LMS_STYLES}</style>
      <header className="sd-lms-header">
        <Link href="/settings" className="sd-lms-back" aria-label="Back to profile settings">
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
        <h1>LMS Sync Center</h1>
      </header>

      <main className="sd-lms-scroll">
        {banner ? <p className="sd-lms-banner" data-tone={banner.tone}>{banner.message}</p> : null}
        <section className="sd-lms-section" aria-labelledby="connected-lms-heading">
          <div className="sd-lms-section-head">
            <h2 id="connected-lms-heading">Connected LMS</h2>
          </div>
          {initial.length === 0 ? (
            <div className="sd-lms-empty">
              <p>No learning platforms are connected yet. Connect one to import real classes and due dates.</p>
              <Link className="sd-lms-connect-primary" href="/settings?section=connect#connect-platform">
                <Cloud size={14} aria-hidden="true" /> Connect learning platform
              </Link>
            </div>
          ) : (
            <ul className="sd-lms-list">
              {initial.map((connection) => (
                <li key={connection.id} className="sd-lms-card">
                  <div className="sd-lms-provider">
                    <span className="sd-lms-provider-icon"><ProviderIcon provider={connection.provider} /></span>
                    <div>
                      <h3>{PROVIDER_LABEL[connection.provider]}</h3>
                      <p data-attention={connection.state === "attention" || undefined}>
                        {connectionStatus(connection)}
                      </p>
                    </div>
                  </div>
                  <div className="sd-lms-actions">
                    {!connection.schoolManaged ? (
                      <button type="button" disabled={pending} onClick={() => void runSync(connection)}>Sync</button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => startTransition(async () => {
                        const result = await disconnectLms(connection.id);
                        setBanner(result.ok ? { tone: "ok", message: "Connection removed." } : { tone: "warn", message: result.message });
                        if (result.ok) router.refresh();
                      })}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sd-lms-section" aria-labelledby="my-courses-heading">
          <div className="sd-lms-section-head">
            <h2 id="my-courses-heading">My Courses</h2>
            <span className="sd-lms-count">{courses.length} active</span>
          </div>
          <div className="sd-lms-courses">
            {courses.length === 0 ? (
              <div className="sd-lms-course-empty">Connected courses will appear here after the first confirmed sync.</div>
            ) : courses.slice(0, 4).map((course, index) => (
              <article className="sd-lms-course" key={course.id} style={{ "--course-color": course.color ?? (index % 2 ? "#ff79da" : "#74c0ff") } as CSSProperties}>
                <CourseIcon index={index} />
                <h3>{course.name}</h3>
                <p>Saved in Diana</p>
              </article>
            ))}
          </div>
        </section>

        <section id="connect-platform" className="sd-lms-section sd-lms-connect" aria-labelledby="connect-heading">
          <div className="sd-lms-section-head"><h2 id="connect-heading">Connect a platform</h2></div>
          <details open={connectOpen}>
            <summary>Canvas</summary>
            <form action="/api/lms/canvas-oauth/start" method="get" className="sd-lms-form">
              <input name="base_url" type="url" required aria-label="Canvas school URL" placeholder="https://school.instructure.com" />
              <button type="submit">Connect with Canvas</button>
            </form>
            <form action={runAction(connectCanvas)} className="sd-lms-form">
              <input name="base_url" type="url" required aria-label="Canvas URL for access token" placeholder="Canvas URL" />
              <input name="token" type="password" required aria-label="Canvas access token" placeholder="Personal access token" />
              <button type="submit" disabled={pending}>Connect with token</button>
            </form>
          </details>
          <details open={connectOpen}>
            <summary>Google Classroom</summary>
            <div className="sd-lms-form"><a href="/api/lms/google-oauth/start">Connect Google Classroom</a></div>
          </details>
          <details>
            <summary>Calendar URL</summary>
            <form action={runAction(connectIcs)} className="sd-lms-form">
              <input name="url" type="url" required aria-label="Calendar URL" placeholder="https://school.edu/calendar.ics" />
              <button type="submit" disabled={pending}>Connect calendar</button>
            </form>
          </details>
          <details>
            <summary>Clever school-managed setup</summary>
            <form action={runAction(connectClever)} className="sd-lms-form">
              <input name="district" required aria-label="District or school" placeholder="District or school" />
              <input name="note" aria-label="Clever setup note" placeholder="IT contact or setup note" />
              <button type="submit" disabled={pending}>Save school setup</button>
            </form>
          </details>
          <details>
            <summary>GitLab for coding class</summary>
            <form action={runAction(connectGitLab)} className="sd-lms-form">
              <input name="project" required aria-label="GitLab project" placeholder="group/project" />
              <input name="token" type="password" required aria-label="GitLab access token" placeholder="Read-only access token" />
              <input name="labels" aria-label="GitLab label filter" placeholder="Optional label filter" />
              <input name="base_url" type="url" aria-label="GitLab base URL" placeholder="https://gitlab.com" />
              <button type="submit" disabled={pending}>Connect GitLab</button>
            </form>
          </details>
        </section>
      </main>

      <Link href="/quick-add" className="sd-lms-quick" aria-label="Quick add">
        <Plus size={28} aria-hidden="true" />
      </Link>
      <footer className="sd-lms-footer">
        <button type="button" disabled={pending || initial.length === 0} onClick={() => void syncAll()}>
          <RefreshCw size={15} aria-hidden="true" /> Re-sync all accounts
        </button>
      </footer>
    </ScreenDesignViewport>
  );
}

function ProviderIcon({ provider }: { provider: LmsConnectionView["provider"] }) {
  if (provider === "gitlab") return <Code2 size={23} aria-hidden="true" />;
  if (provider === "clever") return <School size={23} aria-hidden="true" />;
  if (provider === "ics") return <BookOpen size={23} aria-hidden="true" />;
  return <Cloud size={23} aria-hidden="true" />;
}

function CourseIcon({ index }: { index: number }) {
  const icons = [Atom, Calculator, BookOpen, Landmark] as const;
  const Icon = icons[index % icons.length] ?? BookOpen;
  return <Icon size={22} aria-hidden="true" />;
}

function connectionStatus(connection: LmsConnectionView): string {
  if (connection.state === "attention") return connection.message ?? "Connection needs attention";
  if (connection.state === "school-managed") return "Managed by your school";
  if (connection.state === "pending") return "Saved. First sync pending";
  return connection.lastSyncedAt ? `Last synced ${formatSyncedAt(connection.lastSyncedAt)}` : "Sync pending";
}

function formatSyncedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(value));
}
