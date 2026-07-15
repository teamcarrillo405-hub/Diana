import Link from "next/link";
import { Bell, CalendarClock, MessageSquareText, RefreshCw } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../page-shell";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const recent = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: dueWork }, { data: feedback }, { data: connections }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, status, classes(name)")
      .not("due_at", "is", null)
      .lte("due_at", nextWeek.toISOString())
      .not("status", "in", "(submitted,graded,abandoned)")
      .order("due_at", { ascending: true })
      .limit(20),
    supabase
      .from("teacher_progress_notes")
      .select("id, note_text, created_at, assignment_id, assignments(title)")
      .gte("created_at", recent)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("lms_connections")
      .select("id, provider, last_synced_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const count = (dueWork?.length ?? 0) + (feedback?.length ?? 0) + (connections?.length ?? 0);

  return (
    <PageShell active="More" eyebrow="Scouting report" title="Notifications" subtitle="Useful updates only. Diana keeps pressure language and public comparison out of this space." icon={Bell}>
      <div className="sd-section-head">
        <h2 className="sd-section-title">Your updates</h2>
        <span className="sd-chip">{count} current</span>
      </div>

      <div className="sd-grid sd-grid-2" style={{ marginTop: "1rem" }}>
        <NotificationSection title="Coming up" empty="Nothing due in the next seven days.">
          {(dueWork ?? []).map((item) => (
            <Link href={`/assignments/${item.id}`} className="sd-notification" key={item.id}>
              <CalendarClock size={18} aria-hidden="true" />
              <span><strong>{item.title}</strong><small>{formatDue(item.due_at)}</small></span>
            </Link>
          ))}
        </NotificationSection>

        <NotificationSection title="Teacher feedback" empty="No new teacher notes.">
          {(feedback ?? []).map((item) => (
            <Link href={item.assignment_id ? `/assignments/${item.assignment_id}` : "/assignments"} className="sd-notification" key={item.id}>
              <MessageSquareText size={18} aria-hidden="true" />
              <span><strong>{assignmentTitle(item.assignments)}</strong><small>{item.note_text}</small></span>
            </Link>
          ))}
        </NotificationSection>

        <NotificationSection title="Connections" empty="No connection updates.">
          {(connections ?? []).map((item) => (
            <Link href="/settings#connections" className="sd-notification" key={item.id}>
              <RefreshCw size={18} aria-hidden="true" />
              <span><strong>{item.provider.replaceAll("_", " ")}</strong><small>{item.last_synced_at ? `Last synced ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(item.last_synced_at))}` : "Ready for first sync"}</small></span>
            </Link>
          ))}
        </NotificationSection>
      </div>
    </PageShell>
  );
}

function NotificationSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="sd-panel sd-panel-pad sd-notification-section">
      <h2 className="sd-section-title">{title}</h2>
      <div className="sd-grid">{hasChildren ? children : <p className="sd-subtitle">{empty}</p>}</div>
    </section>
  );
}

function formatDue(value: string | null): string {
  if (!value) return "No due time";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function assignmentTitle(value: { title?: string | null } | Array<{ title?: string | null }> | null): string {
  if (!value) return "Teacher note";
  return (Array.isArray(value) ? value[0]?.title : value.title) || "Teacher note";
}
