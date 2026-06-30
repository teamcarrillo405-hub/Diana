import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Clock3, FileText, Mic2, Plus, ScanLine, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopNav } from "../app-top-nav";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

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
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Work" />
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Hero */}
        <header style={{ display: "grid", gap: "var(--space-8)" }}>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-cyan)", margin: 0 }}>
            Capture inbox
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-10)", flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: "var(--space-8)" }}>
              <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "20ch" }}>
                Turn loose stuff into schoolwork.
              </h1>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
                Photos, voice, and quick notes wait here until you confirm what they are. Diana can suggest; you decide.
              </p>
            </div>
            <Link
              href="/quick-add"
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-cyan)", color: "#04080f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none", flexShrink: 0 }}
            >
              Capture
              <Plus size={17} />
            </Link>
          </div>
        </header>

        {rows.length === 0 ? (
          <div style={{ display: "grid", gap: "var(--space-17)" }}>
            {/* Empty state */}
            <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", padding: "var(--space-20)", display: "grid", gap: "var(--space-8)", textAlign: "center" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>Inbox clear</p>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>Nothing is waiting.</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>When a teacher says something fast, capture it here and sort it later.</p>
              <div>
                <Link
                  href="/quick-add"
                  style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", color: "var(--gl-text-secondary)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
                >
                  Capture something new
                </Link>
              </div>
            </div>

            {/* Preview */}
            <section className="inbox-triage-section">
              <div className="inbox-section-head">
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <Sparkles size={13} />
                  Capture preview
                </p>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
                  When something lands here, Diana shows the likely class, work type, and next review move.
                </p>
              </div>
              <div className="nexus-list inbox-triage-list">
                <ul className="inbox-triage-grid">
                  <PreviewCaptureCard mode="voice" title="Teacher said the cell diagram needs labels, function notes, and one mitochondria sentence." capturedAt="Voice capture" className="Biology" kind="Lab" due="Due Fri" status="Ready" />
                  <PreviewCaptureCard mode="photo" title="Board photo: quote response needs page number, claim, evidence, and reasoning." capturedAt="Photo capture" className="English 9" kind="Essay" due="Due tomorrow" status="Ready" />
                  <PreviewCaptureCard mode="text" title="Slope-intercept quiz review: odd problems only, bring one question to class." capturedAt="Quick note" className="Algebra I" kind="Test prep" due="Add due date" status="Review" />
                </ul>
              </div>
            </section>
          </div>
        ) : (
          <section className="inbox-triage-section">
            <div className="inbox-section-head">
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <ScanLine size={13} />
                Needs review
              </p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
                {rows.length} capture{rows.length === 1 ? "" : "s"} waiting for you to confirm.
              </p>
            </div>
            <div className="nexus-list inbox-triage-list">
              <ul className="inbox-triage-grid">
                {rows.map((item) => (
                  <li key={item.id}>
                    <Link href={`/inbox/${item.id}`} className="inbox-triage-card">
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
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function PreviewCaptureCard({
  mode, title, capturedAt, className, kind, due, status,
}: {
  mode: string; title: string; capturedAt: string; className: string; kind: string; due: string; status: string;
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
          <span><Sparkles size={13} />Diana read</span>
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
  return new Date(value).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatDueDate(value: string) {
  return `Due ${new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function CaptureIcon({ mode }: { mode: string }) {
  if (mode === "photo") return <Camera size={18} />;
  if (mode === "voice") return <Mic2 size={18} />;
  return <FileText size={18} />;
}

function StatusBadge({ status, confidence }: { status: string; confidence: number | null }) {
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
