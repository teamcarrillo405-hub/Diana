import Link from "next/link";
import { CalendarPlus, Cloud, Download, School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LmsConnections } from "@/app/(app)/settings/lms-connections";

type Connection = {
  id: string;
  provider: "canvas" | "ics" | "google_classroom" | "clever";
  config: Record<string, unknown>;
  last_synced_at: string | null;
};

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase
        .from("lms_connections")
        .select("id, provider, config, last_synced_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const connections = (data ?? []) as Connection[];

  return (
    <div className="diana-page space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Imports</p>
        <h1 className="text-display">Bring schoolwork into Diana</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Connect class calendars once, then let Diana turn due dates into next moves, reminders, and study loops.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <ImportSignal icon={School} title="Class systems" body="Canvas, Google Classroom, Clever marker, or calendar URL." />
        <ImportSignal icon={CalendarPlus} title="Due dates" body="Imported tasks land in assignments and dashboard focus." />
        <ImportSignal icon={Cloud} title="Source-aware" body="Keep source names visible so students know where work came from." />
      </section>

      <LmsConnections initial={connections} />

      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Download size={17} className="text-brand" />
          <h2 className="text-base font-semibold">Export Diana calendar</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Add Diana due dates to another calendar app when you want a read-only backup.
        </p>
        <Link
          href="/api/calendar.ics"
          className="touch-target mt-4 inline-flex rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold hover:bg-surface-soft"
        >
          Download calendar feed
        </Link>
      </section>
    </div>
  );
}

function ImportSignal({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof School;
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
