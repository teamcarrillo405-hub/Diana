import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { studentLearnerSummary } from "@/lib/learning-loop/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import {
  pauseLearningLoopAction,
  resetLearningLoopAction,
  resumeLearningLoopAction,
} from "./learning-loop-actions";

/**
 * "How Diana is adapting to you" - the transparency half of the learning
 * loop. Every learned lean shows here in plain language, next to the other
 * things Diana tunes from real activity. Students see exactly what the
 * system thinks is working; there is no hidden model.
 */
export async function AdaptationPanel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profileControls } = await supabase
    .from("profiles")
    .select("learning_loop_paused, learning_loop_reset_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = await getLearnerProfile({ supabase, ownerId: user.id });
  const learned = studentLearnerSummary(profile);
  const paused = Boolean(profileControls?.learning_loop_paused);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={15} className="text-brand" /> How Diana is adapting to you
      </h2>
      {paused ? (
        <p className="text-sm text-muted">
          Personalization is paused. Diana will use default support until you resume it.
        </p>
      ) : learned.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {learned.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Tap &quot;Helped&quot; or &quot;Not really&quot; under any helper and Diana learns which kinds
          of help work for you - then reaches for those first.
        </p>
      )}
      <ul className="space-y-1 border-t border-border pt-3 text-xs text-muted">
        <li>Flashcard timing tunes itself to your memory with every review.</li>
        <li>Time estimates calibrate to how long work actually takes you.</li>
        <li>Concept mastery updates from your quizzes, reviews, and self-checks.</li>
        <li>All of it stays private to you and is included in your data export.</li>
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <form action={paused ? resumeLearningLoopAction : pauseLearningLoopAction}>
          <button className="rounded-md border border-border px-3 py-2 text-xs font-medium" type="submit">
            {paused ? "Resume personalization" : "Pause personalization"}
          </button>
        </form>
        <form action={resetLearningLoopAction}>
          <button className="rounded-md border border-border px-3 py-2 text-xs font-medium" type="submit">
            Reset what Diana learned
          </button>
        </form>
      </div>
      {profileControls?.learning_loop_reset_at ? (
        <p className="text-xs text-muted">
          Last reset: {new Date(profileControls.learning_loop_reset_at).toLocaleDateString()}
        </p>
      ) : null}
    </section>
  );
}
