import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getAiHistory } from "./actions";
import { CsvExportButton } from "./csv-export-button";
import { PageShell } from "../../page-shell";

export default async function AiHistoryPage() {
  const rows = await getAiHistory(100);

  return (
    <PageShell
      active="More"
      eyebrow="AI history"
      title="Your AI history"
      subtitle="This is a log of every time Diana used AI to help you. You can show it to a teacher or parent any time."
      accent="var(--gl-purple-light)"
      icon={Sparkles}
    >
      <div className="space-y-6">
      <Link href="/settings" className="text-xs text-muted hover:underline">
        ← Settings
      </Link>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted">
          No AI history yet. Once you use a feature like the writing aid or math step
          organizer, it will show up here.
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <CsvExportButton />
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-border/20 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 text-left">When</th>
                  <th className="px-4 py-2 text-left">Feature</th>
                  <th className="px-4 py-2 text-left">Assignment</th>
                  <th className="px-4 py-2 text-left">Model</th>
                  <th className="px-4 py-2 text-right">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-muted">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{featureLabel(r.feature)}</td>
                    <td className="px-4 py-2">
                      {r.assignment_id ? (
                        <Link
                          href={`/assignments/${r.assignment_id}`}
                          className="text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent"
                        >
                          {r.assignment_title ?? "Assignment"}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted">{r.model}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.tokens_used.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>
    </PageShell>
  );
}

function featureLabel(f: string): string {
  return ({
    math_step: "Math step organizer",
    writing_aid: "Writing aid",
    citation_gen: "Citation generator",
    reading_scaffold: "Reading scaffold",
    reading_level: "Reading level",
    vocab_hover: "Vocabulary definition",
    transcribe_note: "Note transcript",
  } as Record<string, string>)[f] ?? f;
}
