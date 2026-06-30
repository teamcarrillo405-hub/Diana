"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { parseRubricText } from "@/lib/rubric/rubric";
import { parseSyllabusText } from "@/lib/syllabus/parse";

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
  // class_syllabi isn't in the generated DB types until the migration is applied;
  // go through the untyped client for this insert.
  const db = supabase as unknown as SupabaseClient;
  const { error } = await db.from("class_syllabi").insert({
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
