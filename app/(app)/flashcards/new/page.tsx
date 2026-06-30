import { CardForm } from "./card-form";
import { AppTopNav } from "../../app-top-nav";

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  return (
    <>
      <AppTopNav active="Work" />
      <div className="diana-page space-y-6">
        <header className="space-y-1">
          <p className="nexus-kicker">Remember bar</p>
          <h1 className="text-display">New card</h1>
          <p className="text-sm text-muted">
            Front is the prompt. Back is the answer.
          </p>
        </header>
        <CardForm sourceNoteId={note ?? null} />
      </div>
    </>
  );
}
