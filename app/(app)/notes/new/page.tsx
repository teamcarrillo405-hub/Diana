import { NoteEditor } from "./note-editor";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const { assignment } = await searchParams;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">New note</h1>
        <p className="text-sm text-muted">
          Talk or type — Diana saves every 30 seconds.
        </p>
      </header>
      <NoteEditor assignmentId={assignment ?? null} />
    </div>
  );
}
