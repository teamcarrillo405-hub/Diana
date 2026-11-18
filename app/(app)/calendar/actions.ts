"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { EVENT_CATEGORIES, REMINDERS, validatePersonalEvent, type PersonalEvent } from "@/lib/calendar/personal-events";
import { calendarTimeZone } from "@/lib/calendar/time-zone";

const inputSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]), title: z.string().trim().min(1).max(100), day: z.string().max(10), time: z.string().max(5), endTime: z.string().max(5), allDay: z.boolean(), category: z.enum(EVENT_CATEGORIES), location: z.string().trim().max(120), notes: z.string().trim().max(1000), repeat: z.enum(["none", "weekly"]), repeatUntil: z.string().max(10), reminder: z.string().refine(value => REMINDERS.some(reminder => reminder.value === value)), photo: z.string().max(4_200_000),
  endDay: z.preprocess(value => value === "" ? undefined : value, z.string().max(10).optional()),
  assignmentId: z.preprocess(value => value === "" ? undefined : value, z.string().uuid().optional()),
});

export async function saveCalendarEvent(input: PersonalEvent) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: "Check your event details and try again." };
  const validation = validatePersonalEvent(parsed.data);
  if (validation) return { error: validation };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save your event." };
  const id = parsed.data.id || randomUUID();
  const { data: previous, error: previousError } = await supabase.from("personal_calendar_events").select("photo_key, time_zone").eq("owner_id", user.id).eq("id", id).is("deleted_at", null).maybeSingle();
  if (previousError || (parsed.data.id && !previous)) return { error: "This event could not be opened. Refresh the calendar and try again." };
  let timeZone = previous?.time_zone;
  if (!timeZone) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("timezone").eq("user_id", user.id).maybeSingle();
    if (profileError) return { error: "Your calendar time zone could not load. Try again." };
    timeZone = profile?.timezone ?? "UTC";
  }
  timeZone = calendarTimeZone(timeZone);
  const zonedValidation = validatePersonalEvent(parsed.data, timeZone);
  if (zonedValidation) return { error: zonedValidation };
  if (parsed.data.assignmentId) {
    const { data: assignment, error: assignmentError } = await supabase.from("assignments").select("id").eq("id", parsed.data.assignmentId).eq("owner_id", user.id).neq("status", "abandoned").maybeSingle();
    if (assignmentError || !assignment) return { error: "This assignment is not available for your study block. Choose another assignment or leave it unlinked." };
  }
  let photoKey = parsed.data.photo ? previous?.photo_key ?? null : null;
  let newKey: string | null = null;
  if (parsed.data.photo.startsWith("data:")) {
    const image = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(parsed.data.photo);
    if (!image) return { error: "Choose a JPG, PNG, or WebP photo." };
    const bytes = Buffer.from(image[2], "base64");
    if (bytes.length > 3 * 1024 * 1024) return { error: "Choose a photo under 3 MB." };
    newKey = `${user.id}/calendar/${id}/${randomUUID()}.${image[1]}`;
    const { error } = await supabase.storage.from("note-docs").upload(newKey, bytes, { contentType: `image/${image[1]}`, upsert: false });
    if (error) return { error: "The photo could not be saved. Try again." };
    photoKey = newKey;
  }
  const { photo: _photo, id: _id, ...event } = parsed.data;
  const values = { event, time_zone: timeZone, photo_key: photoKey, updated_at: new Date().toISOString() };
  const result = parsed.data.id
    ? await supabase.from("personal_calendar_events").update(values).eq("id", id).eq("owner_id", user.id).is("deleted_at", null).select("id").single()
    : await supabase.from("personal_calendar_events").insert({ ...values, id, owner_id: user.id }).select("id").single();
  if (result.error) {
    if (newKey) await supabase.storage.from("note-docs").remove([newKey]);
    return { error: "The event could not be saved. Try again." };
  }
  if (previous?.photo_key && photoKey !== previous.photo_key) await supabase.storage.from("note-docs").remove([previous.photo_key]);
  const signed = photoKey ? await supabase.storage.from("note-docs").createSignedUrl(photoKey, 3600) : null;
  revalidatePath("/calendar");
  return { event: { ...parsed.data, id, photo: signed?.data?.signedUrl ?? "", timeZone } };
}

export async function setCalendarEventDeleted(id: string, deleted: boolean) {
  if (!z.string().uuid().safeParse(id).success) return { error: "This event could not be opened." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to update your calendar." };
  const { error } = await supabase.from("personal_calendar_events").update({ deleted_at: deleted ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("owner_id", user.id).select("id").single();
  if (error) return { error: "The event could not be updated. Try again." };
  revalidatePath("/calendar");
  return { ok: true };
}
