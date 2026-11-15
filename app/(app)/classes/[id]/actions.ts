"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseRubricText } from "@/lib/rubric/rubric";
import { parseSyllabusText } from "@/lib/syllabus/parse";
import { hasOwnerStoragePrefix, ownerStorageKey, validateFileUpload } from "@/lib/security/upload-validation";
import { removeAndConfirmStorageObjectAbsent } from "@/lib/storage/object-absence";

const AddRubric = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1).max(120),
  rawText: z.string().min(1).max(20_000),
});

export async function addRubric(input: z.infer<typeof AddRubric>) {
  const parsed = AddRubric.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Structured criteria stored alongside the raw text so downstream surfaces
  // (self-check, checklists) never re-parse. Falls back to manual when the
  // text yields no criteria.
  const criteria = parseRubricText(parsed.data.rawText);
  const { error } = await supabase.from("rubrics").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    title: parsed.data.title,
    source_kind: "paste",
    raw_text: parsed.data.rawText,
    parsed: criteria.length > 0 ? { criteria } : null,
    parse_status: criteria.length > 0 ? "parsed" : "manual",
  });
  if (error) return { error: error.message };

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true };
}

const AddSyllabus = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1).max(160),
  rawText: z.string().min(1).max(50_000),
});

export async function addSyllabus(input: z.infer<typeof AddSyllabus>) {
  const parsed = AddSyllabus.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Heuristically extract key dates + policies so the class hub can surface them
  // without re-parsing on every render.
  const parsedSyllabus = parseSyllabusText(parsed.data.rawText);
  const { error } = await supabase.from("class_syllabi").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    title: parsed.data.title,
    raw_text: parsed.data.rawText,
    parsed: parsedSyllabus,
  });
  if (error) return { error: error.message };

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true };
}

const CourseMaterialKind = z.enum(["rubric", "syllabus"]);

function displayTitle(fileName: string, maximum: number) {
  const withoutExtension = fileName.replace(/\.[^.]+$/u, "").trim();
  return (withoutExtension || "Course material").slice(0, maximum);
}

type CourseMaterialExtraction = { text?: unknown; status?: unknown; error?: unknown };

function mediaReadLimit(extension: string) {
  if (extension === "pdf") return 8 * 1024 * 1024;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return 10 * 1024 * 1024;
  return 20 * 1024 * 1024;
}

function parseExtraction(data: CourseMaterialExtraction | null) {
  const text = typeof data?.text === "string" ? data.text.trim().slice(0, 50_000) : "";
  return { text, read: data?.status === "imported" && text.length > 0 };
}

/** Keeps the original document and extracts PDF/photo content into the same
 * rubric or syllabus record that Diana uses for course help. */
export async function uploadCourseMaterial(formData: FormData) {
  const classId = typeof formData.get("classId") === "string" ? String(formData.get("classId")) : "";
  const kind = CourseMaterialKind.safeParse(formData.get("kind"));
  const candidateFile = formData.get("file");
  const file = candidateFile instanceof File ? candidateFile : null;
  if (!z.string().uuid().safeParse(classId).success || !kind.success || !file) {
    return { ok: false as const, error: "Choose a rubric or syllabus file first." };
  }

  const validation = await validateFileUpload("assignmentSource", file);
  if (!validation.ok) return { ok: false as const, error: validation.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: classRecord } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!classRecord) return { ok: false as const, error: "Class not found." };

  const { extension, mimeType } = validation.value;
  if (file.size > mediaReadLimit(extension)) {
    const limit = extension === "pdf" ? "8 MB" : ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? "10 MB" : "20 MB";
    return { ok: false as const, error: `Choose a ${extension === "pdf" ? "PDF" : "file"} smaller than ${limit} so Diana can read it.` };
  }
  const storageKey = ownerStorageKey(
    user.id,
    "classes",
    classId,
    kind.data,
    `${crypto.randomUUID()}.${extension}`,
  );
  const { error: uploadError } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: mimeType });
  if (uploadError) return { ok: false as const, error: uploadError.message };

  const rawText = extension === "txt" ? (await file.text()).slice(0, 50_000) : null;
  const title = displayTitle(file.name, kind.data === "rubric" ? 120 : 160);
  const base = {
    owner_id: user.id,
    class_id: classId,
    title,
    raw_text: rawText,
    source_kind: "upload",
    storage_bucket: "note-docs",
    storage_key: storageKey,
    mime_type: mimeType,
    original_filename: file.name.slice(0, 255),
  };

  const write = kind.data === "rubric"
    ? supabase.from("rubrics").insert({
        ...base,
        parsed: rawText ? { criteria: parseRubricText(rawText) } : null,
        parse_status: rawText ? "parsed" : "pending",
      }).select("id").single()
    : supabase.from("class_syllabi").insert({
        ...base,
        parsed: rawText ? parseSyllabusText(rawText) : null,
      }).select("id").single();
  const { data: savedMaterial, error: writeError } = await write;
  if (writeError || !savedMaterial) {
    await supabase.storage.from("note-docs").remove([storageKey]);
    return { ok: false as const, error: writeError?.message ?? "The course material could not be saved." };
  }

  let readByDiana = Boolean(rawText);
  if (!rawText) {
    const { data, error } = await supabase.functions.invoke("extract-course-material", {
      body: {
        classId,
        kind: kind.data,
        materialId: savedMaterial.id,
        storageKey,
      },
    });
    const extracted = parseExtraction((data ?? null) as CourseMaterialExtraction | null);
    if (error || !extracted.read) {
      const message = typeof data?.error === "string" ? data.error : "Diana could not read that file yet.";
      if (kind.data === "rubric") {
        await supabase.from("rubrics").update({ parse_status: "failed", parse_error: message }).eq("id", savedMaterial.id).eq("owner_id", user.id);
      }
      revalidatePath(`/classes/${classId}`);
      return { ok: false as const, error: `${message} The file is still attached to this class.` };
    }

    readByDiana = true;
    if (kind.data === "rubric") {
      const criteria = parseRubricText(extracted.text);
      await supabase.from("rubrics").update({
        raw_text: extracted.text,
        parsed: criteria.length > 0 ? { criteria } : null,
        parse_status: criteria.length > 0 ? "parsed" : "manual",
        parse_error: null,
      }).eq("id", savedMaterial.id).eq("owner_id", user.id);
    } else {
      await supabase.from("class_syllabi").update({
        raw_text: extracted.text,
        parsed: parseSyllabusText(extracted.text),
      }).eq("id", savedMaterial.id).eq("owner_id", user.id);
    }
  }

  revalidatePath(`/classes/${classId}`);
  return { ok: true as const, fileName: file.name, readByDiana };
}

const RemoveCourseMaterial = z.object({
  classId: z.string().uuid(),
  materialId: z.string().uuid(),
  kind: CourseMaterialKind,
});

export async function removeCourseMaterial(input: z.infer<typeof RemoveCourseMaterial>) {
  const parsed = RemoveCourseMaterial.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Course material not found." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const table = parsed.data.kind === "rubric" ? "rubrics" : "class_syllabi";
  const { data: material } = await supabase
    .from(table)
    .select("id, storage_key")
    .eq("id", parsed.data.materialId)
    .eq("class_id", parsed.data.classId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!material) return { ok: true as const };

  if (material.storage_key) {
    if (!hasOwnerStoragePrefix(user.id, material.storage_key)) {
      return { ok: false as const, error: "Diana could not verify that file path." };
    }
    const removed = await removeAndConfirmStorageObjectAbsent(
      supabase.storage.from("note-docs"),
      material.storage_key,
    );
    if (!removed.absenceConfirmed) {
      return { ok: false as const, error: "The attached file could not be removed yet. Try again." };
    }
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", material.id)
    .eq("class_id", parsed.data.classId)
    .eq("owner_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true as const };
}
