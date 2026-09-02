"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasOwnerStoragePrefix, ownerStorageKey, validateFileUpload } from "@/lib/security/upload-validation";
import { triggerClassification } from "../inbox/[id]/actions";
import { createAssignment } from "../assignments/new/actions";
import {
  addAssignmentSourceFile,
  addAssignmentSourceText,
} from "../assignments/[id]/workspace/source-actions";

const AssignmentIntake = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().max(160).optional(),
  instructions: z.string().trim().max(50000).optional(),
});

function sourceTitleFromFileName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/u, "").replace(/[_-]+/gu, " ").trim();
  return (base || "New assignment").slice(0, 160);
}

async function createAssignmentForIntake(input: z.infer<typeof AssignmentIntake>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: course } = await supabase
    .from("classes")
    .select("id")
    .eq("id", input.classId)
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  if (!course) return { error: "Choose one of your current classes." };

  const title = input.title || "New assignment";
  return createAssignment({
    title,
    classId: input.classId,
    kind: "other",
    dueAt: null,
    estimate: null,
    difficulty: 3,
    readingLoad: 1,
    writingLoad: 1,
    description: null,
    templateId: null,
  });
}

export async function createAssignmentFromUpload(formData: FormData) {
  const candidate = formData.get("file");
  const rawTitle = typeof formData.get("title") === "string" ? String(formData.get("title")) : "";
  const classId = typeof formData.get("classId") === "string" ? String(formData.get("classId")) : "";
  if (!candidate || typeof candidate === "string") {
    return { ok: false as const, error: "Choose an assignment file first." };
  }
  const file = candidate;

  const validation = await validateFileUpload("assignmentSource", file);
  if (!validation.ok) return { ok: false as const, error: validation.error };

  const parsed = AssignmentIntake.safeParse({
    classId,
    title: rawTitle || sourceTitleFromFileName(file.name),
  });
  if (!parsed.success) return { ok: false as const, error: "Choose one of your classes and add a shorter title." };

  const created = await createAssignmentForIntake(parsed.data);
  if (!("id" in created) || !created.id) return { ok: false as const, error: created.error ?? "Diana could not create this assignment yet." };
  const assignmentId = created.id;

  const sourceForm = new FormData();
  sourceForm.set("assignmentId", assignmentId);
  sourceForm.set("file", file);
  const source = await addAssignmentSourceFile(sourceForm);
  if (source.ok) return { ok: true as const, assignmentId, warning: null };

  // The source action preserves a stored file even when its first extraction
  // pass needs attention. The assignment remains usable and can retry there.
  if ("source" in source && source.source) {
    return {
      ok: true as const,
      assignmentId,
      warning: source.error ?? "The file is saved. Diana can retry reading it from the assignment.",
    };
  }

  return {
    ok: false as const,
    assignmentId,
    error: `${source.error ?? "Diana could not attach that file."} Your assignment is ready, but the file was not attached.`,
  };
}

export async function createAssignmentFromInstructions(input: {
  classId: string;
  title: string;
  instructions: string;
}) {
  const parsed = AssignmentIntake.safeParse(input);
  const instructions = parsed.success ? parsed.data.instructions : null;
  if (!parsed.success || !instructions) {
    return { ok: false as const, error: "Add a class, title, and a little of the assignment instructions." };
  }

  const created = await createAssignmentForIntake(parsed.data);
  if (!("id" in created) || !created.id) return { ok: false as const, error: created.error ?? "Diana could not create this assignment yet." };
  const assignmentId = created.id;

  const source = await addAssignmentSourceText({
    assignmentId,
    title: "Assignment instructions",
    text: instructions,
  });
  if (source.ok) return { ok: true as const, assignmentId, warning: null };
  return {
    ok: false as const,
    assignmentId,
    error: `${source.error} Your assignment is ready, but the instructions were not attached.`,
  };
}

const Input = z.object({
  raw: z.string().trim().min(1).max(5000),
  captureMode: z.enum(["voice", "photo", "text"]),
  photoStorageKey: z.string().max(500).optional(),
  classId: z.string().uuid().optional(),
}).superRefine((value, context) => {
  if (value.captureMode === "photo" && !value.photoStorageKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["photoStorageKey"],
      message: "Choose a photo first.",
    });
  }
  if (value.captureMode !== "photo" && value.photoStorageKey) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["photoStorageKey"],
      message: "Photo storage belongs only to photo captures.",
    });
  }
});

function voiceNoteTitle(raw: string) {
  const firstThought = raw
    .replace(/\s+/gu, " ")
    .split(/[.!?]/u, 1)[0]
    ?.trim()
    .slice(0, 120);
  return firstThought ? `Voice note: ${firstThought}` : "Voice note";
}

export async function saveInboxItem(
  input: z.infer<typeof Input>
): Promise<{ ok: true; id: string; noteId: string | null } | { ok: false; error: string }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (
    parsed.data.photoStorageKey &&
    !hasOwnerStoragePrefix(user.id, parsed.data.photoStorageKey)
  ) {
    return { ok: false, error: "Choose a photo from this account." };
  }

  let selectedClass: { id: string; name: string } | null = null;
  if (parsed.data.classId) {
    const { data } = await supabase
      .from("classes")
      .select("id, name")
      .eq("id", parsed.data.classId)
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .maybeSingle();
    if (!data) return { ok: false, error: "Choose one of your current classes." };
    selectedClass = data;
  }

  let sourceNoteId: string | null = null;
  if (parsed.data.captureMode === "voice" && selectedClass) {
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        owner_id: user.id,
        class_id: selectedClass.id,
        title: voiceNoteTitle(parsed.data.raw),
        body_text: parsed.data.raw,
        source: "voice",
      })
      .select("id")
      .single();
    if (noteError || !note) {
      return { ok: false, error: noteError?.message ?? "Diana could not save this class note yet." };
    }
    sourceNoteId = note.id;
  }

  const { data, error } = await supabase
    .from("inbox_items")
    .insert({
      owner_id: user.id,
      raw: parsed.data.raw,
      capture_mode: parsed.data.captureMode,
      photo_storage_key: parsed.data.photoStorageKey ?? null,
      status: parsed.data.classId ? "classified" : "unclassified",
      suggested_class_id: parsed.data.classId ?? null,
      suggestion_confidence: parsed.data.classId ? 1 : null,
      source_note_id: sourceNoteId,
    })
    .select("id")
    .single();

  if (error) {
    if (sourceNoteId) {
      await supabase.from("notes").delete().eq("id", sourceNoteId).eq("owner_id", user.id);
    }
    return { ok: false, error: error.message };
  }

  // A student-selected class is already the authoritative context. Only
  // general captures need Diana to offer a class suggestion.
  if (!parsed.data.classId) {
    void triggerClassification(data.id);
  }

  // Refresh the surfaces that show capture counts so a new item appears without
  // a manual navigation (dashboard "captured today" and Work capture review).
  revalidatePath("/dashboard");
  revalidatePath("/assignments");
  if (selectedClass) {
    revalidatePath(`/classes/${selectedClass.id}`);
    revalidatePath(`/notes?classId=${selectedClass.id}`);
  }

  return { ok: true, id: data.id, noteId: sourceNoteId };
}

export async function uploadInboxPhoto(
  formData: FormData
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("photo") as File | null;
  if (!file) return { ok: false, error: "No photo provided." };
  const validation = await validateFileUpload("quickAddPhoto", file);
  if (!validation.ok) return { ok: false, error: validation.error };
  const storageKey = ownerStorageKey(user.id, "quick-add", `${crypto.randomUUID()}.${validation.value.extension}`);

  const { error } = await supabase.storage
    .from("inbox-photos")
    .upload(storageKey, file, { contentType: validation.value.mimeType });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}
