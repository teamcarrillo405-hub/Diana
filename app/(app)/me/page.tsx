import Link from "next/link";
import { Accessibility, Brain, Clock3, GraduationCap, Mic2, ShieldCheck } from "lucide-react";
import { loadProfile } from "@/lib/profile";
import { PageShell } from "../page-shell";

const pillBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-3)",
  borderRadius: "var(--radius-pill)",
  padding: "var(--space-9) var(--space-14)",
  fontFamily: "var(--font-body)",
  fontWeight: "var(--weight-700)",
  fontSize: "var(--text-13)",
  textDecoration: "none",
} as const;

export default async function MePage() {
  const profile = await loadProfile();
  const accommodations = (profile?.accommodations ?? []) as string[];
  const diagnoses = (profile?.diagnoses ?? []) as string[];
  const interests = (profile?.interests ?? []) as string[];

  const patterns = [
    diagnoses.includes("dysgraphia") || accommodations.includes("scribe")
      ? "I think better when I can talk first."
      : "I can use voice capture when writing feels blocked.",
    diagnoses.includes("dyslexia") || accommodations.includes("reader")
      ? "Audio, spacing, and visible sources make reading easier."
      : "I can turn on reading support whenever a text feels heavy.",
    accommodations.includes("extended_time")
      ? "Planning early helps my extra time actually help."
      : "Short starts help me learn what support I need.",
    "One next move is easier than seeing the whole pile at once.",
  ];

  return (
    <PageShell
      active="More"
      eyebrow="My Brain"
      title="Understand how school works for you."
      subtitle="This is the student-controlled learning profile: strengths, support settings, accommodations, and the scripts that make asking for help less awkward."
      accent="var(--gl-cyan)"
      icon={Brain}
      action={
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-9)" }}>
          <Link
            href="/settings"
            style={{ ...pillBase, background: "var(--gl-cyan)", color: "var(--gl-text-on-cyan)" }}
          >
            Adjust reading support
            <Accessibility size={17} />
          </Link>
          <Link
            href="/future-path"
            style={{
              ...pillBase,
              background: "transparent",
              color: "var(--gl-text-primary)",
              border: "1px solid var(--gl-cyan)",
            }}
          >
            Connect to Future Path
          </Link>
        </div>
      }
    >
      <section className="py-2">
        <div className="diana-zone p-5">
          <p className="text-sm font-black text-brand-strong dark:text-brand">What Diana should remember</p>
          <div className="mt-5 grid gap-3">
            {patterns.map((pattern) => (
              <div key={pattern} className="rounded-2xl border border-border bg-surface/70 p-4 text-sm leading-6">
                {pattern}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <MeCard icon={Mic2} title="Voice first" body="Brain dump, dictate, or talk through the stuck part before writing." />
        <MeCard icon={Clock3} title="Short starts" body="Use five-minute moves and focus timers when initiation is the hard part." />
        <MeCard icon={ShieldCheck} title="Self-advocacy" body="Turn support needs into teacher, family, or counselor-safe language." />
        <MeCard icon={GraduationCap} title="Future-ready" body="Strengths and proof points can support essays, scholarships, and college disability offices." />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="diana-zone p-5">
          <h2 className="text-xl font-black">Support plan</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <ProfileLine label="School year" value={profile?.school_year ? `${profile.school_year}th grade` : "Not set yet"} />
            <ProfileLine label="Accommodations" value={accommodations.length ? accommodations.map(formatId).join(", ") : "No accommodations listed yet"} />
            <ProfileLine label="Extra time" value={`${profile?.extra_time_pct ?? 0}%`} />
            <ProfileLine label="Reading font" value={profile?.reading_font ? formatId(profile.reading_font) : "Default"} />
          </dl>
        </div>

        <div className="diana-zone p-5">
          <h2 className="text-xl font-black">Interests for examples</h2>
          {interests.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-muted">
              Add interests during onboarding or settings so Diana can make examples feel more familiar.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span key={interest} className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold">
                  {formatId(interest)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function MeCard({ icon: Icon, title, body }: { icon: typeof Brain; title: string; body: string }) {
  return (
    <article className="diana-zone p-5">
      <Icon size={20} className="text-brand" />
      <h2 className="mt-6 text-lg font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </article>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-border bg-surface/70 p-4">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

function formatId(value: string) {
  return value.replace(/_/g, " ");
}
