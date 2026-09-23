import { NotebookPen } from "lucide-react";
import { CardForm } from "./card-form";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";

export default async function NewCardPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  return (
    <div className="sd-support-screen">
      <header className="sd-support-header">
        <DianaWordmark />
        <p><NotebookPen size={14} aria-hidden="true" /> Remember bar</p>
        <h1>New card.</h1>
        <span>Front is the prompt. Back is the answer.</span>
      </header>
      <CardForm sourceNoteId={note ?? null} />
      <StudentBottomNav />
    </div>
  );
}
