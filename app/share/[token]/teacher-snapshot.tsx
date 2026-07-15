import type { TeacherSnapshot } from "@/lib/sharing/types";

export function TeacherSnapshotView({ snapshot }: { snapshot: TeacherSnapshot }) {
  const expiresDate = new Date(snapshot.expiresAt);
  const expiresLabel = expiresDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main id="main-content" className="app-field min-h-dvh">
      <div className="diana-page max-w-xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <p className="diana-kicker text-xs uppercase tracking-wider text-muted">Accommodation snapshot</p>
        <h1 className="text-xl font-semibold">How this student is set up to work</h1>
      </header>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Per-class AI policy
        </h2>
        {snapshot.classes.length === 0 ? (
          <p className="text-sm text-muted">No classes on file yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {snapshot.classes.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{c.name}</span>
                <span className="text-xs text-muted">{aiModeLabel(c.aiMode)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Reading and pacing
        </h2>
        <Row label="Preferred reading font" value={fontLabel(snapshot.readingFont)} />
        {snapshot.extendedReadingTime && (
          <Row
            label="Reading time"
            value="May benefit from extended reading time"
          />
        )}
        {snapshot.extraTimePct > 0 && (
          <Row
            label="Calibrated time estimate"
            value={`Plan for about +${snapshot.extraTimePct}% more time on work`}
          />
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        <p>
          This snapshot lists accommodations and preferences the student has chosen
          in the app. It does not include diagnoses, grades, or content the student
          has written.
        </p>
      </section>

      <footer className="text-xs text-muted">
        This link works until {expiresLabel}.
      </footer>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function aiModeLabel(m: "red" | "yellow" | "green"): string {
  // Calm labels — no traffic-light color words, no diagnosis framing
  if (m === "red") return "No AI help in this class";
  if (m === "yellow") return "Limited AI help (citations only)";
  return "AI help is allowed";
}

function fontLabel(font: string): string {
  const labels: Record<string, string> = {
    system: "System default",
    lexend: "Lexend",
    atkinson: "Atkinson Hyperlegible",
    opendyslexic: "OpenDyslexic",
  };
  return labels[font] ?? font;
}
