import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Gauge, Sparkles } from "lucide-react";
import { HudCorners } from "@/components/ui/hud-corners";
import { TimeBar } from "./time-bar";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { TtsButton } from "@/components/tts-button";
import type { ScoredAssignment } from "@/lib/scoring/next-five-minutes";
import type { AssignmentStatus, TtsProvider } from "@/lib/supabase/types";
import type { SupportPlan } from "@/lib/support/policy";

type DashboardAssignment = ScoredAssignment & {
  created_at?: string | null;
  classes?: { name?: string | null; color?: string | null } | null;
};

type TtsConfig = {
  text: string;
  provider: TtsProvider;
  speed: number;
  pitch: number;
  voice: string;
};


const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-3)",
  borderRadius: 999,
  border: "1px solid var(--gl-border-neutral)",
  background: "var(--gl-bg-card)",
  padding: "var(--space-2) var(--space-6)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-12)",
  fontWeight: "var(--weight-600)",
  color: "var(--gl-text-muted)",
};

export function FocusHeroCard({
  assignment,
  createdAt,
  energy,
  roughMode,
  supportPlan,
  tts,
}: {
  assignment: DashboardAssignment;
  createdAt?: string | null;
  energy: "low" | "medium" | "high";
  roughMode: boolean;
  supportPlan?: SupportPlan | null;
  tts?: TtsConfig;
}) {
  const classColor = assignment.classes?.color ?? "var(--gl-cyan)";
  const className = assignment.classes?.name ?? "School";
  const adaptationCue = roughMode
    ? "Rough-mode pacing"
    : energy === "low"
      ? "Low-energy start"
      : energy === "high"
        ? "Deep focus window"
        : "Steady focus";

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid var(--gl-cyan-25)",
        background: "linear-gradient(135deg, var(--gl-bg-focus-card-from), var(--gl-bg-focus-card-to))",
        padding: "var(--space-13)",
      }}
    >
      <HudCorners />
      <style>{`
.fhc-row{display:flex;flex-direction:column;gap:var(--space-13);}
@media(min-width:1024px){.fhc-row{flex-direction:row;align-items:flex-start;justify-content:space-between;}}
.fhc-rail{width:100%;}
@media(min-width:1024px){.fhc-rail{width:16rem;}}
`}</style>
      <div className="fhc-row">
        <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-4)" }}>
            <span style={{ ...chipStyle, borderColor: "var(--gl-cyan-22)", color: "var(--gl-cyan)" }}>
              <Sparkles size={13} />
              Right now
            </span>
            <span style={chipStyle}>
              <span style={{ width: 8, height: 8, borderRadius: "var(--radius-circle)", background: classColor }} />
              {className}
            </span>
            <span style={chipStyle}>
              <Gauge size={13} />
              {adaptationCue}
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--weight-800)",
                fontStyle: "italic",
                fontSize: "var(--text-40)",
                lineHeight: "var(--leading-tight)",
                textTransform: "uppercase",
                color: "var(--gl-text-primary)",
              }}
            >
              {assignment.title}
            </h2>
            <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>
              {KIND_LABEL[assignment.kind]}
              {assignment.effective_minutes != null && ` | ~${assignment.effective_minutes} min for you`}
              {assignment.due_at && ` | ${formatDueAt(assignment.due_at)}`}
            </p>
          </div>

          {assignment.due_at && (
            <TimeBar
              dueAt={assignment.due_at}
              createdAt={createdAt ?? assignment.created_at ?? undefined}
              status={assignment.status as AssignmentStatus}
              assignmentId={assignment.id}
            />
          )}

          {assignment.reasons.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-11)",
                  fontWeight: "var(--weight-700)",
                  letterSpacing: "var(--tracking-20)",
                  textTransform: "uppercase",
                  color: "var(--gl-text-muted)",
                }}
              >
                Why this one
              </p>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", listStyle: "none", padding: 0, margin: 0 }}>
                {assignment.reasons.map((reason) => (
                  <li
                    key={reason}
                    style={{
                      borderRadius: 999,
                      border: "1px solid var(--gl-cyan-22)",
                      background: "var(--gl-cyan-08)",
                      padding: "var(--space-2) var(--space-8)",
                      fontSize: "var(--text-12)",
                      color: "var(--gl-cyan)",
                    }}
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {supportPlan && (
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-cyan-22)", background: "var(--gl-bg-card)", padding: "var(--space-10)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-4)" }}>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-11)",
                    fontWeight: "var(--weight-700)",
                    letterSpacing: "var(--tracking-20)",
                    textTransform: "uppercase",
                    color: "var(--gl-cyan)",
                  }}
                >
                  {supportPlan.headline}
                </p>
                {supportPlan.chips.map((chip) => (
                  <span key={chip} style={{ borderRadius: 999, background: "var(--gl-cyan-10)", padding: "2px var(--space-4)", fontSize: "var(--text-11)", color: "var(--gl-cyan)" }}>
                    {chip}
                  </span>
                ))}
              </div>
              <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>{supportPlan.rationale}</p>
              <p style={{ marginTop: "var(--space-6)", fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-text-secondary)" }}>
                Next logical step: <span style={{ fontWeight: "var(--weight-400)" }}>{supportPlan.nextStep}</span>
              </p>
              {supportPlan.bodyCue && (
                <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{supportPlan.bodyCue}</p>
              )}
              {supportPlan.patternNote && (
                <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{supportPlan.patternNote}</p>
              )}
            </div>
          )}
        </div>

        <div className="fhc-rail" style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <Link
            href={`/assignments/${assignment.id}`}
            style={{
              display: "inline-flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-4)",
              borderRadius: "var(--radius-hero)",
              background: "var(--gl-cyan)",
              padding: "var(--space-9) var(--space-10)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-800)",
              fontStyle: "italic",
              fontSize: "var(--text-18)",
              letterSpacing: "var(--tracking-05)",
              textTransform: "uppercase",
              color: "var(--gl-text-on-cyan)",
              textDecoration: "none",
              boxShadow: "var(--shadow-active-card)",
            }}
          >
            Start focus
            <ArrowRight size={17} />
          </Link>
          {supportPlan && (
            <Link
              href={`/assignments/${assignment.id}?focus=next-step`}
              style={{
                display: "inline-flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-hero)",
                border: "1px solid var(--gl-border-neutral)",
                background: "var(--gl-bg-card)",
                padding: "var(--space-9) var(--space-10)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-14)",
                fontWeight: "var(--weight-600)",
                color: "var(--gl-text-secondary)",
                textDecoration: "none",
              }}
            >
              Ask for next step
            </Link>
          )}
          {tts && (
            <TtsButton
              text={tts.text}
              provider={tts.provider}
              speed={tts.speed}
              pitch={tts.pitch}
              voice={tts.voice}
            />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", textAlign: "center" }}>
            <ProgressCue label="Started" icon={Clock3} />
            <ProgressCue label="Step done" icon={CheckCircle2} />
            <ProgressCue label="Submit ready" icon={CheckCircle2} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressCue({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Clock3;
}) {
  return (
    <div style={{ minWidth: 0, borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-4)" }}>
      <Icon size={14} style={{ margin: "0 auto var(--space-1)", color: "var(--gl-cyan)" }} />
      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--text-11)", color: "var(--gl-text-muted)" }}>{label}</span>
    </div>
  );
}
