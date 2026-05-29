import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { formatDueAt } from "@/lib/format";
import { STATUS_LABEL, STATUS_HINT, nextStatesFor } from "@/lib/state-machine/assignment";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { StatusButtons } from "./status-buttons";
import { Breadcrumb } from "./breadcrumb";
import { PivotForm } from "./pivot-form";
import { TtsButton } from "@/components/tts-button";
import { IntentionPrompt } from "./intention-prompt";
import { ReadingPanel } from "./reading-panel";
import { MathHelper } from "./math-helper";
import { WritingAid } from "./writing-aid";
import { CitationTool } from "./citation-tool";
import type { AssignmentStatus } from "@/lib/supabase/types";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ intent?: string; focus?: string }>;
}) {
  const { id } = await params;
  const { intent } = await searchParams;
  const supabase = await createClient();
  const profile = await loadProfile();

  const { data: a } = await supabase
    .from("assignments")
    .select("id, title, description, due_at, status, kind, reading_load, writing_load, estimated_minutes, difficulty, last_thought, classes(id, name, color, ai_mode), rubric_id")
    .eq("id", id)
    .single();
  if (!a) notFound();

  const status = a.status as AssignmentStatus;
  const nexts = nextStatesFor(status);
  const classAiMode: "red" | "yellow" | "green" =
    a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow"
      ? a.classes.ai_mode
      : "green";
  const ttsOn = profile?.tts_enabled;
  const readAloudText = [a.title, a.description].filter(Boolean).join(". ");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href={a.classes ? `/classes/${a.classes.id}` : "/assignments"}
          className="text-xs text-muted hover:underline"
        >
          ← {a.classes?.name ?? "Tasks"}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{a.title}</h1>
          {ttsOn && <TtsButton text={readAloudText} />}
        </div>
        <p className="text-sm text-muted">
          {KIND_LABEL[a.kind]}
          {a.due_at && ` · ${formatDueAt(a.due_at)}`}
        </p>
        {(a.reading_load >= 3 || a.writing_load >= 3) && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {a.reading_load >= 3 && (
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-700 dark:text-sky-300">
                Heavy reading
              </span>
            )}
            {a.writing_load >= 3 && (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-violet-700 dark:text-violet-300">
                Heavy writing
              </span>
            )}
          </div>
        )}
        {a.description && (
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-sm">
            {a.description}
          </p>
        )}
      </header>

      {(a.kind === "reading" || (a.reading_load != null && a.reading_load >= 3)) && a.description && (
        <ReadingPanel
          text={a.description}
          classAiMode={classAiMode}
        />
      )}

      {(a.kind === "problem_set" || a.kind === "test_prep") && (
        <MathHelper assignmentId={a.id} classAiMode={classAiMode} />
      )}

      {a.kind === "essay" && (
        <WritingAid assignmentId={a.id} classAiMode={classAiMode} />
      )}

      {/* Citation tool is always available — any assignment may need a source citation */}
      <CitationTool assignmentId={a.id} classAiMode={classAiMode} />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Where are you?
          </p>
          <p className="text-xs text-muted">{STATUS_HINT[status]}</p>
        </div>
        <p className="text-lg font-semibold">{STATUS_LABEL[status]}</p>
        <StatusButtons assignmentId={id} from={status} options={nexts} />
      </section>

      {(status === "drafting" || status === "checking") && (
        <Breadcrumb assignmentId={id} initial={a.last_thought ?? ""} />
      )}

      {status === "drafting" && (
        <div className="flex justify-end">
          <PivotForm assignmentId={id} />
        </div>
      )}

      {status === "exporting" && (
        <div className="rounded-xl border border-accent bg-accent/5 p-4">
          <p className="font-medium">Run through your submission checklist first.</p>
          <p className="mt-1 text-sm text-muted">
            Diana will hold you here until you tick the required boxes.
          </p>
          <Link
            href={`/assignments/${id}/submit`}
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Open the checklist
          </Link>
        </div>
      )}

      {intent === "new" && (
        <IntentionPrompt assignmentId={id} />
      )}
    </div>
  );
}
