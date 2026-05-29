import { CardForm } from "./card-form";

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">New card</h1>
        <p className="text-sm text-muted">
          Front is the prompt. Back is the answer.
        </p>
      </header>
      <CardForm sourceNoteId={note ?? null} />
    </div>
  );
}
