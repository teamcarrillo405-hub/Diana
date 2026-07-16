import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaMascotMark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import { ReviewSession } from "./review-session";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, queueResult] = await Promise.all([
    loadProfile(),
    supabase
      .from("flashcards")
      .select("id, front, back, state, stability, difficulty, due_at, reps, lapses, last_review_at, source_anchor, student_required_action")
      .eq("owner_id", user.id)
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true }),
  ]);

  const fullQueue = queueResult.data ?? [];
  const startIdx = fullQueue.findIndex((card) => card.id === id);
  const ordered = startIdx >= 0
    ? [...fullQueue.slice(startIdx), ...fullQueue.slice(0, startIdx)]
    : fullQueue;

  if (ordered.length === 0) {
    return (
      <ScreenDesignViewport className="sd-flashcard-review sd-flashcard-review-complete">
        <DianaMascotMark decorative className="sd-flashcard-complete-mascot" />
        <p>Review session</p>
        <h1>Nothing due right now.</h1>
        <span>The FSRS scheduler will bring each card back at its next review time.</span>
        <Link href="/flashcards">Back to study</Link>
      </ScreenDesignViewport>
    );
  }

  return (
    <ReviewSession
      queue={ordered}
      ttsProvider={profile?.tts_provider ?? "browser"}
      ttsSpeed={Number(profile?.tts_speed ?? 1)}
      ttsPitch={Number(profile?.tts_pitch ?? 1)}
      ttsVoice={profile?.tts_voice ?? "nova"}
    />
  );
}
