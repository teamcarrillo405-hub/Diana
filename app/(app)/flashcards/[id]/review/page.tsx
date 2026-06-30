import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { Brain } from "lucide-react";
import { ReviewSession } from "./review-session";
import { PageShell } from "../../../page-shell";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await loadProfile();
  const nowIso = new Date().toISOString();

  // Load all currently-due cards (ordered by due_at). The session walks this list.
  const { data: queue } = await supabase
    .from("flashcards")
    .select("id, front, back, state, stability, difficulty, due_at, reps, lapses, last_review_at, source_anchor, student_required_action")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true });

  const fullQueue = queue ?? [];
  const startIdx = fullQueue.findIndex((c) => c.id === id);

  // If the card isn't due (or doesn't exist), fall back to first due card or 404.
  if (startIdx === -1 && fullQueue.length === 0) {
    return (
      <PageShell
        active="Work"
        eyebrow="Flashcards"
        title="Review."
        subtitle="Nothing due right now."
        accent="var(--gl-cyan)"
        icon={Brain}
      >
        <div className="space-y-6">
          <div className="nexus-panel rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm">Nothing due right now. Come back tomorrow.</p>
            <Link
              href="/flashcards"
              className="mt-3 inline-block text-sm text-accent hover:underline"
            >
              ← Back to Study
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // Reorder so the requested id is first (if it's in the queue), else start at 0.
  const ordered = startIdx >= 0
    ? [...fullQueue.slice(startIdx), ...fullQueue.slice(0, startIdx)]
    : fullQueue;

  if (ordered.length === 0) notFound();

  return (
    <PageShell
      active="Work"
      eyebrow="Flashcards"
      title="Review."
      subtitle="Quiz yourself on what's due today."
      accent="var(--gl-cyan)"
      icon={Brain}
    >
      <div className="space-y-4">
        <Link href="/flashcards" className="nexus-kicker text-xs text-muted hover:underline">
          ← Study
        </Link>
        <ReviewSession
          queue={ordered}
          ttsProvider={profile?.tts_provider ?? "browser"}
          ttsSpeed={Number(profile?.tts_speed ?? 1)}
          ttsPitch={Number(profile?.tts_pitch ?? 1)}
          ttsVoice={profile?.tts_voice ?? "nova"}
        />
      </div>
    </PageShell>
  );
}
