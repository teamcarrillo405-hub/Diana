import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NoteDetail } from "./note-detail";
import type { OutlineNode } from "@/lib/notes/types";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: n } = await supabase
    .from("notes")
    .select("id, title, body_text, transcript_text, outline_json, assignment_id, updated_at")
    .eq("id", id)
    .single();
  if (!n) notFound();

  const outline = (n.outline_json as OutlineNode[] | null) ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/notes" className="text-xs text-muted hover:underline">
          &larr; Notes
        </Link>
        <h1 className="text-2xl font-bold">{n.title}</h1>
      </header>

      <NoteDetail
        id={n.id}
        bodyText={n.body_text}
        transcriptText={n.transcript_text}
        outline={outline}
      />
    </div>
  );
}
