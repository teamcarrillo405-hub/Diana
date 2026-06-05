import Link from "next/link";
import { Bell, Clock, Moon, Sunrise } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("id, title, due_at, status")
    .neq("status", "submitted")
    .neq("status", "graded")
    .neq("status", "abandoned")
    .not("due_at", "is", null)
    .order("due_at", { ascending: true })
    .limit(8);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Reminders</p>
        <h1 className="text-2xl font-bold">Quiet nudges for real due dates</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Reminders stay calm: no streak pressure, no red states, and quiet hours are respected unless an open item needs attention.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <ReminderRule icon={Bell} title="Due soon" body="Dashboard surfaces open work when it is close enough to act on." />
        <ReminderRule icon={Moon} title="Quiet hours" body="Diana stays quiet from 8 PM to 7 AM for normal reminders." />
        <ReminderRule icon={Sunrise} title="Morning pickup" body="Open items return as a next move instead of a pressure message." />
      </section>

      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock size={17} className="text-brand" />
          <h2 className="text-base font-semibold">Upcoming reminder queue</h2>
        </div>
        <div className="mt-4 space-y-2">
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No dated open assignments are waiting here.</p>
          ) : (
            (data ?? []).map((assignment) => (
              <Link
                key={assignment.id}
                href={`/assignments/${assignment.id}`}
                className="block rounded-2xl border border-border bg-surface p-3 hover:bg-surface-soft"
              >
                <p className="text-sm font-semibold">{assignment.title}</p>
                <p className="mt-1 text-xs text-muted">{assignment.due_at ? formatDueAt(assignment.due_at) : "No due date set"}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ReminderRule({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Bell;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
      <Icon size={18} className="text-brand" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
