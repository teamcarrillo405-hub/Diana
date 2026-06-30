import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, FileText, NotebookPen, Plus, Search, Sparkles, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { snippetForQuery } from "@/lib/notes/related";
import { NoteSynthesisPanel } from "./note-synthesis-panel";
import { AppTopNav } from "../app-top-nav";
import { sessionAdaptationForMood, shouldShowMoodCheckIn } from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";
import type { DianaOrbState } from "@/components/signal/clarity-orb";
import { MoodCheckIn } from "../dashboard/mood-check-in";
import { SessionAdaptationCard } from "../dashboard/session-adaptation-card";
import { SleepRecoveryCard } from "../dashboard/sleep-recovery-card";
import { EnergyPicker } from "../dashboard/energy-picker";
import { WeeklyReflection } from "../dashboard/weekly-reflection";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; energy?: "low" | "medium" | "high"; brain?: DianaOrbState }>;
}) {
  const { q, tag, energy: energyParam, brain: brainParam } = await searchParams;
  const search = q?.trim() ?? "";
  const tagFilter = tag?.trim() ?? "";
  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let query = supabase
    .from("notes")
    .select("id, title, body_text, transcript_text, updated_at, assignment_id, class_id, source, tags, ai_suggested_tags, classes(id, name)")
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.textSearch("search_vector", search, { type: "websearch", config: "english" });
  }
  if (tagFilter) {
    query = query.contains("tags", [tagFilter]);
  }

  const [
    { data: notes },
    { data: latestReadinessSignal },
    { data: overwhelmedToday },
    { data: latestSleep },
  ] = await Promise.all([
    query,
    supabase.from("task_signals").select("value, occurred_at").eq("kind", "mood_checkin").gte("occurred_at", todayStart.toISOString()).order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("task_signals").select("id").eq("kind", "overwhelmed").gte("occurred_at", todayStart.toISOString()),
    supabase.from("sleep_logs").select("sleep_date, sleep_quality, sleep_hours").order("sleep_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const roughActive = profile?.rough_mode_until
    ? new Date(profile.rough_mode_until).getTime() > now.getTime()
    : false;
  const adaptation = sessionAdaptationForMood(roughActive ? "rough" : profile?.session_mood);
  const sleepAdjustment = sleepRecoveryAdjustment(
    latestSleep
      ? {
          sleep_date: latestSleep.sleep_date,
          sleep_quality: latestSleep.sleep_quality as SleepQuality,
          sleep_hours: latestSleep.sleep_hours === null ? null : Number(latestSleep.sleep_hours),
        }
      : null,
    now,
  );
  const readiness = readinessFromSignalValue(latestReadinessSignal?.value);
  const energy =
    energyParam ??
    energyFromBody(readiness?.body) ??
    sleepAdjustment.energyOverride ??
    adaptation.energyOverride ??
    "medium";
  const brainState: DianaOrbState =
    brainParam ??
    (roughActive || (overwhelmedToday?.length ?? 0) > 0
      ? "overwhelmed"
      : energy === "low"
        ? "low"
        : energy === "high"
          ? "on-it"
          : "okay");
  const noteRows = notes ?? [];
  const totalTags = new Set(noteRows.flatMap((n) => [...(n.tags ?? []), ...(n.ai_suggested_tags ?? [])])).size;
  const classLinked = noteRows.filter((n) => n.class_id).length;
  const latest = noteRows[0] ?? null;

  const metrics = [
    { label: "Notes", value: noteRows.length, detail: "captured", color: "var(--gl-cyan)" },
    { label: "Class-linked", value: classLinked, detail: "attached", color: "var(--gl-gold)" },
    { label: "Tags", value: totalTags, detail: "study handles", color: "var(--gl-pink)" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Think" />
      <style>{`
        .nm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-9); }
        @media (max-width: 640px) { .nm-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-15)" }}>

        {/* Header */}
        <header>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: "0 0 var(--space-6)" }}>
            Think studio
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-8)", maxWidth: "18ch" }}>
            Capture thoughts before they disappear.
          </h1>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: "0 0 var(--space-12)" }}>
            Class notes, voice, and useful fragments become study tools when you're ready.
          </p>
          <Link
            href="/notes/new"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-purple)", color: "#fff", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
          >
            <Plus size={14} />
            New note
          </Link>
        </header>

        <NoteSynthesisPanel />

        {/* Metric tiles */}
        <div className="nm-grid">
          {metrics.map(({ label, value, detail, color }) => (
            <div key={label} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: "0 0 var(--space-4)" }}>{label}</p>
              <p style={{ fontFamily: SF, fontSize: "var(--text-42)", fontWeight: "var(--weight-800)", lineHeight: 1, color, margin: "0 0 var(--space-2)" }}>{value}</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>{detail}</p>
            </div>
          ))}
        </div>

        {/* Check-in block — mood, adaptation, sleep, energy, weekly reflection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-9)" }}>
          <MoodCheckIn
            visible={shouldShowMoodCheckIn({
              disabled: profile?.mood_checkin_disabled,
              lastCheckInAt: profile?.last_mood_checkin_at,
              now,
            })}
          />
          <SessionAdaptationCard adaptation={adaptation} />
          <SleepRecoveryCard message={sleepAdjustment.message} />
          <EnergyPicker currentBrain={brainState} />
          <WeeklyReflection
            lastReflectedAt={profile?.last_weekly_reflection_at ?? null}
            mood={profile?.session_mood ?? null}
          />
        </div>

        {/* Latest capture */}
        {latest && (
          <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-purple-30)", background: "var(--gl-purple-12)", padding: "var(--space-14)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: "0 0 var(--space-6)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <NotebookPen size={13} aria-hidden="true" />
              Latest capture
            </p>
            <p style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-5)" }}>{latest.title}</p>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", margin: "0 0 var(--space-10)" }}>
              {(latest.transcript_text || latest.body_text || "").slice(0, 160) || "Ready to become outline, cards, or class proof."}
            </p>
            <Link
              href={`/notes/${latest.id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", color: "var(--gl-purple-light)", textDecoration: "none" }}
            >
              Open note <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Search */}
        <form action="/notes" style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
          <label style={{ minWidth: 0, flex: 1 }}>
            <span className="sr-only">Search notes</span>
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search notes"
              style={{ width: "100%", padding: "var(--space-8) var(--space-12)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", color: "var(--gl-text-primary)", fontFamily: BODY, fontSize: "var(--text-14)", outline: "none", boxSizing: "border-box" }}
            />
          </label>
          {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
          <button
            type="submit"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-8) var(--space-14)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", color: "var(--gl-text-secondary)", fontFamily: BODY, fontWeight: "var(--weight-600)", fontSize: "var(--text-13)", cursor: "pointer" }}
          >
            <Search size={13} />
            Search
          </button>
          {(search || tagFilter) && (
            <Link
              href="/notes"
              style={{ display: "inline-flex", alignItems: "center", padding: "var(--space-8) var(--space-14)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "transparent", color: "var(--gl-text-muted)", fontFamily: BODY, fontSize: "var(--text-13)", textDecoration: "none" }}
            >
              Clear
            </Link>
          )}
        </form>

        {/* List or empty */}
        {noteRows.length === 0 ? (
          <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-19)", textAlign: "center" }}>
            <p style={{ fontFamily: SF, fontSize: "var(--text-28)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-5)" }}>
              {search || tagFilter ? "No match." : "Start the first capture."}
            </p>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-muted)", margin: "0 0 var(--space-12)" }}>
              {search || tagFilter
                ? "Try a broader search or clear the filter."
                : "Capture a class — voice or text. Diana saves every 30 seconds."}
            </p>
            <Link
              href="/notes/new"
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-8) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-purple)", color: "#fff", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
            >
              <Plus size={13} /> Start a note
            </Link>
          </div>
        ) : (
          <section style={{ display: "grid", gap: "var(--space-9)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-12)", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: "0 0 var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <FileText size={13} aria-hidden="true" /> Captures
                </p>
                <h2 style={{ fontFamily: SF, fontSize: "var(--text-34)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
                  Notes ready for study.
                </h2>
              </div>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-muted)", maxWidth: "36ch", textAlign: "right" }}>
                Open a note to turn highlighted text into cards, outlines, sources, or class proof.
              </p>
            </div>
            <ul style={{ display: "grid", gap: "var(--space-4)", listStyle: "none", padding: 0, margin: 0 }}>
              {noteRows.map((n) => {
                const cls = (n as { classes?: { name: string } | null }).classes;
                const allTags = [...(n.tags ?? []), ...(n.ai_suggested_tags ?? [])];
                return (
                  <li key={n.id}>
                    <Link
                      href={`/notes/${n.id}`}
                      style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-8)", padding: "var(--space-12) var(--space-14)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", textDecoration: "none" }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: "var(--space-2)" }}>
                          <FileText size={13} style={{ color: "var(--gl-purple-light)", flexShrink: 0 }} />
                          <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-15)", color: "var(--gl-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.title}
                          </p>
                        </div>
                        <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: "0 0 var(--space-5)" }}>
                          {format(new Date(n.updated_at), "EEE MMM d, h:mm a")}
                          {cls?.name ? ` / ${cls.name}` : null}
                        </p>
                        <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-secondary)", margin: "0 0 var(--space-6)", overflow: "hidden", maxHeight: "2.8em" }}>
                          {search
                            ? snippetForQuery(n.transcript_text || n.body_text || n.title, search)
                            : n.transcript_text || n.body_text || "Empty note"}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
                          {cls?.name && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", padding: "2px var(--space-6)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", fontSize: "var(--text-11)", color: "var(--gl-text-muted)" }}>
                              <NotebookPen size={11} /> {cls.name}
                            </span>
                          )}
                          {allTags.slice(0, 5).map((noteTag) => (
                            <span key={noteTag} style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", padding: "2px var(--space-6)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-purple-30)", background: "var(--gl-purple-14)", fontSize: "var(--text-11)", color: "var(--gl-purple-light)" }}>
                              <Tags size={11} /> {noteTag}
                            </span>
                          ))}
                          {allTags.length === 0 && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", padding: "2px var(--space-6)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", fontSize: "var(--text-11)", color: "var(--gl-text-muted)" }}>
                              <Sparkles size={11} /> ready
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-12)", color: "var(--gl-purple-light)", whiteSpace: "nowrap", flexShrink: 0 }} aria-hidden="true">
                        Open <ArrowRight size={12} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
