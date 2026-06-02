import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const url = new URL(request.url);
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/notes/new")}`, url.origin), 303);
  }

  const formData = await request.formData();
  const title = cleanText(formData.get("title")) || "Shared note";
  const text = cleanText(formData.get("text"));
  const sharedUrl = cleanText(formData.get("url"));
  const file = firstFile(formData.getAll("files"));
  const bodyText = [text, sharedUrl].filter(Boolean).join("\n\n");

  let storageKey: string | null = null;
  if (file) {
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    storageKey = `${user.id}/share-${Date.now()}.${ext}`;
    await supabase.storage.from("note-docs").upload(storageKey, file, { contentType: file.type || "application/octet-stream" });
  }

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      owner_id: user.id,
      title,
      body_text: bodyText || (file ? `Shared file: ${file.name}` : ""),
      source: file ? "doc_upload" : "manual",
      doc_storage_key: storageKey,
    })
    .select("id")
    .single();

  if (error || !note) {
    return NextResponse.redirect(new URL("/notes/new", url.origin), 303);
  }

  return NextResponse.redirect(new URL(`/notes/${note.id}`, url.origin), 303);
}

function cleanText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().slice(0, 3000) : "";
}

function firstFile(values: FormDataEntryValue[]): File | null {
  return values.find((value): value is File => value instanceof File && value.size > 0) ?? null;
}
