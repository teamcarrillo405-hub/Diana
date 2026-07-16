import {
  CalendarClock,
  FileText,
  RefreshCw,
  Settings2,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { notificationDueLabel } from "@/lib/screendesign/support-screens";
import { createClient } from "@/lib/supabase/server";

const NOTIFICATION_STYLES = `
  .diana-authenticated-field:has(.sd-notification-center) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-notification-center) { padding:0!important; }
  .app-command-frame:has(.sd-notification-center) .diana-mobile-command,
  .diana-app-shell:has(.sd-notification-center) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-notification-center) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-notification-center) .skip-link { transition:none; }
  .diana-app:has(.sd-notification-center) .skip-link:focus { transform:translateY(0)!important; }
  .sd-notification-center { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-notification-center * { box-sizing:border-box; }
  .sd-notification-header { position:relative; z-index:30; display:flex; flex:none; align-items:flex-start; justify-content:space-between; padding:52px 24px 16px; background:rgb(15 23 42 / .91); backdrop-filter:blur(12px); }
  .sd-notification-header .sd-source-wordmark { width:auto; height:16px; margin-bottom:4px; opacity:.92; }
  .sd-notification-header h1 { margin:0; color:#f8fafc; font-size:25px; font-style:italic; font-weight:950; letter-spacing:-.055em; line-height:.87; text-transform:uppercase; }
  .sd-notification-header h1 span { color:#74c0ff; }
  .sd-notification-settings { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .08); border-radius:999px; background:rgb(255 255 255 / .05); color:#f8fafc; text-decoration:none; }
  .sd-notification-scroll { min-height:0; flex:1; overflow-y:auto; padding:15px 24px 28px; scrollbar-width:none; }
  .sd-notification-scroll::-webkit-scrollbar { display:none; }
  .sd-notification-section { display:grid; gap:11px; margin-bottom:26px; }
  .sd-notification-section h2 { margin:0; color:#94a3b8; font-size:10px; font-style:italic; font-weight:950; letter-spacing:.19em; text-transform:uppercase; }
  .sd-notification-section[data-tone="pink"] h2 { color:#ff79da; }
  .sd-notification-section[data-tone="blue"] h2 { color:#74c0ff; }
  .sd-notification-priority { position:relative; display:block; overflow:hidden; border:1px solid rgb(255 255 255 / .11); border-radius:18px; background:rgb(255 255 255 / .055); padding:17px; color:inherit; text-decoration:none; backdrop-filter:blur(8px); }
  .sd-notification-priority::after { position:absolute; right:-16px; bottom:-22px; width:74px; height:74px; border:16px solid rgb(255 121 218 / .045); border-radius:18px; content:""; transform:rotate(14deg); }
  .sd-notification-priority-head { position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .sd-notification-priority h3 { margin:0; color:#f8fafc; font-size:13px; font-style:italic; font-weight:950; line-height:1.1; text-transform:uppercase; }
  .sd-notification-priority p { margin:5px 0 0; color:#cbd5e1; font-size:9px; font-weight:650; line-height:1.35; text-transform:uppercase; }
  .sd-notification-badge { flex:none; border-radius:6px; padding:5px 7px; background:#74c0ff; color:#0f172a; font-size:8px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-notification-badge[data-tone="pink"] { background:#ff79da; }
  .sd-notification-badge[data-tone="amber"] { background:#fbbf24; }
  .sd-notification-due { position:relative; z-index:1; display:flex; align-items:center; gap:7px; margin-top:13px; color:#ff79da; font-size:15px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-notification-list { display:grid; gap:10px; }
  .sd-notification-card { display:grid; grid-template-columns:43px minmax(0,1fr) auto; align-items:center; gap:12px; border:1px solid rgb(255 255 255 / .1); border-radius:14px; background:rgb(255 255 255 / .05); padding:12px; color:#f8fafc; text-decoration:none; backdrop-filter:blur(8px); }
  .sd-notification-icon { display:grid; width:43px; height:43px; place-items:center; border-radius:12px; background:rgb(116 192 255 / .11); color:#74c0ff; }
  .sd-notification-icon[data-tone="pink"] { background:rgb(255 121 218 / .11); color:#ff79da; }
  .sd-notification-card strong { display:block; overflow:hidden; font-size:10px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-notification-card small { display:-webkit-box; overflow:hidden; margin-top:4px; color:#94a3b8; font-size:8px; font-weight:650; line-height:1.35; text-transform:uppercase; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .sd-notification-time { align-self:start; color:#64748b!important; font-size:7px!important; font-weight:900!important; white-space:nowrap; }
  .sd-notification-empty { border:1px dashed rgb(116 192 255 / .24); border-radius:16px; background:rgb(116 192 255 / .04); padding:22px 18px; color:#94a3b8; font-size:11px; line-height:1.5; text-align:center; }
  .sd-notification-center > .sd-student-bottom-nav { position:relative; z-index:60; flex:none; }
  .sd-notification-center a:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  @media (prefers-reduced-motion:reduce) { .sd-notification-center * { scroll-behavior:auto!important; transition:none!important; } }
`;

type ClassRelation = { name?: string | null } | Array<{ name?: string | null }> | null;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recent = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: dueWork }, { data: feedback }, { data: connections }, { data: profile }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, due_at, status, classes(name)")
        .eq("owner_id", user.id)
        .not("due_at", "is", null)
        .not("status", "in", "(submitted,graded,abandoned)")
        .order("due_at", { ascending: true })
        .limit(12),
      supabase
        .from("teacher_progress_notes")
        .select("id, author_name, note_text, created_at, assignment_id, assignments(title)")
        .eq("owner_id", user.id)
        .gte("created_at", recent)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("lms_connections")
        .select("id, provider, last_synced_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("profiles")
        .select("timezone")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const timezone = profile?.timezone || "America/Los_Angeles";
  const firstDue = dueWork?.[0] ?? null;
  const dueState = notificationDueLabel(firstDue?.due_at ?? null);
  const count = (dueWork?.length ?? 0) + (feedback?.length ?? 0) + (connections?.length ?? 0);

  return (
    <ScreenDesignViewport className="sd-notification-center" aria-label="Notification center">
      <style>{NOTIFICATION_STYLES}</style>
      <header className="sd-notification-header">
        <div>
          <DianaWordmark />
          <h1>
            Scouting<br />
            <span>report</span>
          </h1>
        </div>
        <Link className="sd-notification-settings" href="/settings" aria-label="Notification settings">
          <Settings2 size={19} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-notification-scroll">
        {firstDue ? (
          <section className="sd-notification-section" data-tone="pink">
            <h2>Needs attention</h2>
            <Link
              href={`/assignments/${firstDue.id}`}
              className="sd-notification-priority"
              aria-label="Open notification"
            >
              <div className="sd-notification-priority-head">
                <div>
                  <h3>{firstDue.title}</h3>
                  <p>{className(firstDue.classes)} · {formatDue(firstDue.due_at, timezone)}</p>
                </div>
                <span className="sd-notification-badge" data-tone={dueState.tone}>{dueState.label}</span>
              </div>
              <div className="sd-notification-due">
                <CalendarClock size={19} aria-hidden="true" /> Open assignment
              </div>
            </Link>
          </section>
        ) : null}

        {(dueWork?.length ?? 0) > 1 ? (
          <section className="sd-notification-section">
            <h2>Coming up</h2>
            <div className="sd-notification-list">
              {dueWork!.slice(1).map((item) => (
                <Link href={`/assignments/${item.id}`} className="sd-notification-card" key={item.id}>
                  <span className="sd-notification-icon"><FileText size={19} aria-hidden="true" /></span>
                  <span><strong>{item.title}</strong><small>{className(item.classes)} · {formatDue(item.due_at, timezone)}</small></span>
                  <small className="sd-notification-time">Work</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="sd-notification-section" data-tone="blue">
          <h2>Playbook updates</h2>
          <div className="sd-notification-list">
            {(feedback ?? []).map((item) => (
              <Link
                href={item.assignment_id ? `/assignments/${item.assignment_id}` : "/assignments"}
                className="sd-notification-card"
                key={item.id}
                aria-label={!firstDue ? "Open notification" : undefined}
              >
                <span className="sd-notification-icon"><UserRoundCheck size={19} aria-hidden="true" /></span>
                <span><strong>{assignmentTitle(item.assignments)}</strong><small>{item.author_name}: {item.note_text}</small></span>
                <small className="sd-notification-time">{formatEventTime(item.created_at, timezone)}</small>
              </Link>
            ))}
            {(connections ?? []).map((item) => (
              <Link
                href="/settings?section=connections"
                className="sd-notification-card"
                key={item.id}
                aria-label={!firstDue && !feedback?.length ? "Open notification" : undefined}
              >
                <span className="sd-notification-icon" data-tone="pink"><RefreshCw size={19} aria-hidden="true" /></span>
                <span><strong>{labelize(item.provider)} connection</strong><small>{item.last_synced_at ? `Last synced ${formatEventTime(item.last_synced_at, timezone)}` : "Ready for the first supported sync."}</small></span>
                <small className="sd-notification-time">LMS</small>
              </Link>
            ))}
            {count === 0 ? (
              <div className="sd-notification-empty">No current updates. Diana will keep this space quiet until there is something useful to open.</div>
            ) : null}
          </div>
        </section>
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function className(value: ClassRelation): string {
  return (Array.isArray(value) ? value[0]?.name : value?.name) || "Class work";
}

function assignmentTitle(value: { title?: string | null } | Array<{ title?: string | null }> | null): string {
  return (Array.isArray(value) ? value[0]?.title : value?.title) || "Teacher note";
}

function formatDue(value: string | null, timeZone: string): string {
  if (!value) return "No due time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function formatEventTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(value));
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
