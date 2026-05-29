import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type InboxRow = {
  id: string;
  raw: string;
  capture_mode: string;
  status: string;
  suggested_kind: string | null;
  suggested_due_at: string | null;
  suggestion_confidence: number | null;
  created_at: string;
};

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("inbox_items")
    .select(
      "id, raw, capture_mode, status, suggested_kind, suggested_due_at, suggestion_confidence, created_at"
    )
    .in("status", ["unclassified", "classified"])
    .order("created_at", { ascending: false });

  const rows = (items ?? []) as InboxRow[];

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted">Items waiting for your review</p>
        </div>
        <Link
          href="/quick-add"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          + Capture
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted">
            Nothing waiting. Capture something with{" "}
            <Link href="/quick-add" className="text-accent hover:underline">
              Quick add
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((item) => (
            <li key={item.id}>
              <Link
                href={`/inbox/${item.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-border/30"
              >
                <span className="mt-0.5 shrink-0 text-base">
                  {item.capture_mode === "photo"
                    ? "📷"
                    : item.capture_mode === "voice"
                    ? "🎙️"
                    : "📝"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.raw}</p>
                  <p className="text-xs text-muted">
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {item.suggested_kind && ` · ${item.suggested_kind}`}
                    {item.suggested_due_at &&
                      ` · due ${new Date(item.suggested_due_at).toLocaleDateString()}`}
                  </p>
                </div>
                <StatusBadge status={item.status} confidence={item.suggestion_confidence} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  confidence,
}: {
  status: string;
  confidence: number | null;
}) {
  if (status === "classified" && confidence !== null && confidence >= 0.7) {
    return (
      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
        Ready to confirm
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-border/60 px-2 py-0.5 text-xs text-muted">
      Needs your review
    </span>
  );
}
