import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Clock3, FileText, Mic2, Plus, ScanLine, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  NexusArcadeScene,
  NexusEmptyState,
  NexusKicker,
  NexusList,
  NexusPageHeader,
  NexusPageShell,
} from "@/components/nexus/nexus-ui";

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
  color: string | null;
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
    .select("id, raw, capture_mode, status, suggested_class_id, suggested_kind, suggested_due_at, suggestion_confidence, created_at")
    .in("status", ["unclassified", "classified"])
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name, color")
      .is("archived_at", null),
  ]);

  const rows = (items ?? []) as InboxRow[];
  const classById = new Map(((classes ?? []) as ClassRow[]).map((row) => [row.id, row]));

  return (
    <NexusPageShell className="space-y-8">
      <NexusPageHeader
        eyebrow="Capture inbox"
        title={<>Turn loose stuff into schoolwork.</>}
        description="Photos, voice, and quick notes wait here until Grayson confirms what they are. Diana can suggest; the student decides."
        actions={
          <Link href="/quick-add" className="nexus-button nexus-button-primary">
            Capture
            <Plus size={17} />
          </Link>
        }
        visual={<NexusArcadeScene />}
      />

      {rows.length === 0 ? (
        <div className="inbox-empty-stack">
          <NexusEmptyState
            eyebrow="Inbox clear"
            title="Nothing is waiting."
            action={
              <Link href="/quick-add" className="nexus-button nexus-button-secondary">
                Capture something new
              </Link>
            }
          >
            <p>When a teacher says something fast, capture it here and sort it later.</p>
          </NexusEmptyState>

          <section className="inbox-triage-section">
            <div className="inbox-section-head">
              <NexusKicker tone="gold">
                <Sparkles size={14} />
                Capture preview
              </NexusKicker>
              <p>When something lands here, Diana shows the likely class, work type, and next review move.</p>
            </div>
            <NexusList className="inbox-triage-list">
              <ul className="inbox-triage-grid">
                <PreviewCaptureCard
                  mode="voice"
                  title="Teacher said the cell diagram needs labels, function notes, and one mitochondria sentence."
                  capturedAt="Voice capture"
                  className="Biology"
                  kind="Lab"
                  due="Due Fri"
                  status="Ready"
                />
                <PreviewCaptureCard
                  mode="photo"
                  title="Board photo: quote response needs page number, claim, evidence, and reasoning."
                  capturedAt="Photo capture"
                  className="English 9"
                  kind="Essay"
                  due="Due tomorrow"
                  status="Ready"
                />
                <PreviewCaptureCard
                  mode="text"
                  title="Slope-intercept quiz review: odd problems only, bring one question to class."
                  capturedAt="Quick note"
                  className="Algebra I"
                  kind="Test prep"
                  due="Add due date"
                  status="Review"
                />
              </ul>
            </NexusList>
          </section>
        </div>
      ) : (
        <section className="inbox-triage-section">
          <div className="inbox-section-head">
            <NexusKicker>
              <ScanLine size={14} />
              Needs review
            </NexusKicker>
            <p>{rows.length} capture{rows.length === 1 ? "" : "s"} waiting for Grayson to confirm.</p>
          </div>
          <NexusList className="inbox-triage-list">
            <ul className="inbox-triage-grid">
              {rows.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/inbox/${item.id}`}
                    className="inbox-triage-card"
                  >
                    <span className="inbox-capture-icon">
                      <CaptureIcon mode={item.capture_mode} />
                    </span>
                    <span className="inbox-triage-copy">
                      <span className="inbox-card-kicker">{captureLabel(item.capture_mode)}</span>
                      <strong>{cleanDemoPrefix(item.raw)}</strong>
                      <span className="inbox-card-time">
                        <Clock3 size={13} />
                        {formatCaptureDate(item.created_at)}
                      </span>
                    </span>
                    <span className="inbox-suggestion-panel">
                      <span>
                        <Sparkles size={13} />
                        Diana read
                      </span>
                      <b>{classById.get(item.suggested_class_id ?? "")?.name ?? "Pick class"}</b>
                      <em>{item.suggested_kind ? kindLabel(item.suggested_kind) : "Choose type"}</em>
                      <em>{item.suggested_due_at ? formatDueDate(item.suggested_due_at) : "Add due date"}</em>
                    </span>
                    <span className="inbox-card-footer">
                      <StatusBadge status={item.status} confidence={item.suggestion_confidence} />
                      <span className="inbox-open-cue">
                        Review
                        <ArrowRight size={13} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </NexusList>
        </section>
      )}
    </NexusPageShell>
  );
}

function PreviewCaptureCard({
  mode,
  title,
  capturedAt,
  className,
  kind,
  due,
  status,
}: {
  mode: string;
  title: string;
  capturedAt: string;
  className: string;
  kind: string;
  due: string;
  status: string;
}) {
  return (
    <li>
      <div className="inbox-triage-card inbox-preview-card">
        <span className="inbox-capture-icon">
          <CaptureIcon mode={mode} />
        </span>
        <span className="inbox-triage-copy">
          <span className="inbox-card-kicker">{capturedAt}</span>
          <strong>{title}</strong>
          <span className="inbox-card-time">
            <Clock3 size={13} />
            Preview
          </span>
        </span>
        <span className="inbox-suggestion-panel">
          <span>
            <Sparkles size={13} />
            Diana read
          </span>
          <b>{className}</b>
          <em>{kind}</em>
          <em>{due}</em>
        </span>
        <span className="inbox-card-footer">
          <span className={status === "Ready" ? "inbox-status-badge is-ready" : "inbox-status-badge"}>
            {status === "Ready" ? <CheckCircle2 size={13} /> : <ScanLine size={13} />}
            {status}
          </span>
          <Link href="/quick-add" className="inbox-open-cue">
            Capture
            <ArrowRight size={13} />
          </Link>
        </span>
      </div>
    </li>
  );
}

function cleanDemoPrefix(raw: string) {
  return raw.replace(/^\[Grayson demo\]\s*/i, "");
}

function captureLabel(mode: string) {
  if (mode === "photo") return "Photo capture";
  if (mode === "voice") return "Voice capture";
  return "Quick note";
}

function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

function formatCaptureDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDueDate(value: string) {
  return `Due ${new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function CaptureIcon({ mode }: { mode: string }) {
  if (mode === "photo") return <Camera size={18} />;
  if (mode === "voice") return <Mic2 size={18} />;
  return <FileText size={18} />;
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
      <span className="inbox-status-badge is-ready">
        <CheckCircle2 size={13} />
        Ready
      </span>
    );
  }
  return (
    <span className="inbox-status-badge">
      <ScanLine size={13} />
      Needs review
    </span>
  );
}
