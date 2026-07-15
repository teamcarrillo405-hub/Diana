import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Mic2,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { createClient } from "@/lib/supabase/server";
import { markInboxItemClassified } from "./[id]/actions";

type InboxRow = {
  id: string;
  raw: string;
  capture_mode: string;
  status: string;
  suggested_class_id: string | null;
  suggested_kind: string | null;
  suggested_due_at: string | null;
  suggestion_confidence: number | null;
  created_at: string;
};

type ClassRow = {
  id: string;
  name: string;
};

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: items }, { data: classes }] = await Promise.all([
    supabase
      .from("inbox_items")
      .select(
        "id, raw, capture_mode, status, suggested_class_id, suggested_kind, suggested_due_at, suggestion_confidence, created_at",
      )
      .eq("owner_id", user.id)
      .in("status", ["unclassified", "classified"])
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  const rows = (items ?? []) as InboxRow[];
  const classById = new Map(
    ((classes ?? []) as ClassRow[]).map((row) => [row.id, row.name]),
  );
  const selected = rows[0] ?? null;

  return (
    <ScreenDesignViewport className="sd-capture-work-screen sd-inbox-triage">
      <header className="sd-triage-header">
        <div>
          <DianaWordmark />
          <span className="sd-triage-new-count">
            <i aria-hidden="true" />
            {rows.length} new scout{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <h1>Scouted items</h1>
      </header>

      <main className="sd-triage-scroll">
        {selected ? (
          <>
            <article className="sd-triage-expanded" aria-label="Selected capture">
              <div className="sd-triage-title-row">
                <div>
                  <span className="sd-triage-kicker">
                    <CaptureIcon mode={selected.capture_mode} />
                    {captureLabel(selected.capture_mode)}
                  </span>
                  <h2>{cleanDemoPrefix(selected.raw)}</h2>
                </div>
                <time dateTime={selected.created_at}>{relativeCapturedAt(selected.created_at)}</time>
              </div>

              <div className="sd-triage-analysis-grid">
                <div>
                  <span>Class</span>
                  <strong>
                    <BookOpen aria-hidden="true" />
                    {classById.get(selected.suggested_class_id ?? "") ?? "Choose class"}
                  </strong>
                </div>
                <div>
                  <span>Due date</span>
                  <strong>
                    <CalendarDays aria-hidden="true" />
                    {selected.suggested_due_at
                      ? formatDueDate(selected.suggested_due_at)
                      : "Add date"}
                  </strong>
                </div>
                <div className="sd-triage-analysis-wide">
                  <span>AI analysis</span>
                  <strong>
                    <Sparkles aria-hidden="true" />
                    {selected.suggested_kind
                      ? `${kindLabel(selected.suggested_kind)} project identified`
                      : "Ready for your review"}
                  </strong>
                </div>
              </div>

              {selected.status === "unclassified" ? (
                <form action={markInboxItemClassified.bind(null, selected.id)}>
                  <button
                    type="submit"
                    className="sd-triage-confirm"
                    aria-label="Triage inbox item"
                  >
                    <CheckCircle2 aria-hidden="true" />
                    Confirm play
                  </button>
                </form>
              ) : (
                <Link
                  href={`/inbox/${selected.id}`}
                  className="sd-triage-confirm"
                  aria-label="Review capture details"
                >
                  <CheckCircle2 aria-hidden="true" />
                  Review details
                </Link>
              )}

              <Link className="sd-triage-edit-link" href={`/inbox/${selected.id}`}>
                Edit class, type, or due date
              </Link>
            </article>

            {rows.slice(1).map((item) => (
              <Link key={item.id} href={`/inbox/${item.id}`} className="sd-triage-collapsed">
                <span className="sd-triage-mode-icon">
                  <CaptureIcon mode={item.capture_mode} />
                </span>
                <span>
                  <strong>{cleanDemoPrefix(item.raw)}</strong>
                  <small>
                    {item.status === "classified" ? "Ready for review" : "Categorizing..."}
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </>
        ) : (
          <section className="sd-triage-empty">
            <Sparkles aria-hidden="true" />
            <h2>Your scout list is clear</h2>
            <p>Capture a teacher note, whiteboard, or voice memo when something new arrives.</p>
            <Link href="/quick-add">Capture something</Link>
          </section>
        )}
      </main>
    </ScreenDesignViewport>
  );
}

function CaptureIcon({ mode }: { mode: string }) {
  if (mode === "photo") return <Camera aria-hidden="true" />;
  if (mode === "voice") return <Mic2 aria-hidden="true" />;
  return <FileText aria-hidden="true" />;
}

function cleanDemoPrefix(raw: string) {
  return raw.replace(/^\[Grayson demo\]\s*/iu, "");
}

function captureLabel(mode: string) {
  if (mode === "photo") return "Whiteboard capture";
  if (mode === "voice") return "Voice capture";
  return "Text capture";
}

function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" })
    .format(new Date(value))
    .toUpperCase();
}

function relativeCapturedAt(value: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  return `${Math.max(1, Math.round(elapsedMinutes / 60))}h ago`;
}
