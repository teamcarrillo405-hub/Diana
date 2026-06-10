import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { adaptationSummary, computeEffectiveness } from "@/lib/adaptation/effectiveness";

/**
 * "How Diana is adapting to you" — the transparency half of the learning
 * loop. Every learned lean shows here in plain language, next to the other
 * things Diana tunes from real activity. Students see exactly what the
 * system thinks is working; there is no hidden model.
 */
export async function AdaptationPanel() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("ai_help_feedback")
    .select("feature, helpful, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const learned = adaptationSummary(
    computeEffectiveness(
      (rows ?? []).map((row) => ({
        feature: row.feature as string,
        helpful: Boolean(row.helpful),
        createdAt: String(row.created_at),
      })),
    ),
  );

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={15} className="text-brand" /> How Diana is adapting to you
      </h2>
      {learned.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {learned.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Tap &quot;Helped&quot; or &quot;Not really&quot; under any helper and Diana learns which kinds
          of help work for you — then reaches for those first.
        </p>
      )}
      <ul className="space-y-1 border-t border-border pt-3 text-xs text-muted">
        <li>Flashcard timing tunes itself to your memory with every review.</li>
        <li>Time estimates calibrate to how long work actually takes you.</li>
        <li>Concept mastery updates from your quizzes, reviews, and self-checks.</li>
        <li>All of it stays private to you and is included in your data export.</li>
      </ul>
    </section>
  );
}
