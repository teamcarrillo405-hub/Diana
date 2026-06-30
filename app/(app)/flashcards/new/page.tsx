import { NotebookPen } from "lucide-react";
import { CardForm } from "./card-form";
import { PageShell } from "../../page-shell";

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  return (
    <PageShell
      active="Work"
      eyebrow="Remember bar"
      title="New card."
      subtitle="Front is the prompt. Back is the answer."
      accent="var(--gl-cyan)"
      icon={NotebookPen}
    >
      <CardForm sourceNoteId={note ?? null} />
    </PageShell>
  );
}
