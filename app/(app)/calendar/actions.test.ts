import { beforeEach, describe, expect, it, vi } from "vitest";
import { newPersonalEvent } from "@/lib/calendar/personal-events";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { saveCalendarEvent, setCalendarEventDeleted } from "./actions";

const ownerId = "bf3ce388-6678-471d-bbc3-d644c8ddce26";
const assignmentId = "a8f56bbe-fbd3-46e0-acab-882a83503628";
const eventId = "3eaf41f6-d864-4e82-a95f-e10c81c5d097";

function query() {
  const chain = {
    select: vi.fn(), eq: vi.fn(), is: vi.fn(), neq: vi.fn(), insert: vi.fn(), update: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: eventId }, error: null }),
  };
  for (const key of ["select", "eq", "is", "neq", "insert", "update"] as const) chain[key].mockReturnValue(chain);
  return chain;
}

describe("personal calendar persistence and assignment ownership", () => {
  let events: ReturnType<typeof query>;
  let profiles: ReturnType<typeof query>;
  let assignments: ReturnType<typeof query>;
  let getUser: ReturnType<typeof vi.fn>;
  let storage: { upload: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; createSignedUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    events = query(); profiles = query(); assignments = query();
    profiles.maybeSingle.mockResolvedValue({ data: { timezone: "America/Los_Angeles" }, error: null });
    assignments.maybeSingle.mockResolvedValue({ data: { id: assignmentId }, error: null });
    getUser = vi.fn().mockResolvedValue({ data: { user: { id: ownerId } } });
    storage = { upload: vi.fn().mockResolvedValue({ error: null }), remove: vi.fn().mockResolvedValue({ error: null }), createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.example/event.webp" }, error: null }) };
    mocks.createClient.mockResolvedValue({ auth: { getUser }, from: vi.fn((table: string) => ({ personal_calendar_events: events, profiles, assignments })[table]), storage: { from: vi.fn().mockReturnValue(storage) } });
  });

  it("saves legacy JSON without new optional fields and ignores arbitrary overposted fields", async () => {
    const event = { ...newPersonalEvent("2026-11-17"), title: "  Practice  ", owner_id: "someone-else", diagnoses: ["private"], timeZone: "UTC" };
    const result = await saveCalendarEvent(event);
    expect(result.error).toBeUndefined();
    expect(events.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: ownerId, time_zone: "America/Los_Angeles" }));
    const stored = events.insert.mock.calls[0][0].event;
    expect(stored).toMatchObject({ title: "Practice", day: event.day, time: "16:00", endTime: "17:00" });
    for (const key of ["owner_id", "diagnoses", "timeZone", "photo", "id"]) expect(stored).not.toHaveProperty(key);
    expect(assignments.select).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/calendar");
  });

  it("links an owned assignment to a Study event and preserves its overnight date", async () => {
    const result = await saveCalendarEvent({ ...newPersonalEvent("2026-11-17"), title: "Chemistry study", category: "Study", assignmentId, time: "23:30", endTime: "00:30", endDay: "2026-11-18" });
    expect(result.error).toBeUndefined();
    expect(assignments.eq).toHaveBeenCalledWith("id", assignmentId);
    expect(assignments.eq).toHaveBeenCalledWith("owner_id", ownerId);
    expect(assignments.neq).toHaveBeenCalledWith("status", "abandoned");
    expect(events.insert.mock.calls[0][0].event).toMatchObject({ assignmentId, endDay: "2026-11-18" });
  });

  it.each([null, { error: { message: "database unavailable" } }])("does not persist a foreign, missing or unreadable assignment", async result => {
    assignments.maybeSingle.mockResolvedValue(result ? { data: null, ...result } : { data: null, error: null });
    const response = await saveCalendarEvent({ ...newPersonalEvent("2026-11-17"), title: "Study", category: "Study", assignmentId });
    expect(response.error).toContain("not available");
    expect(events.insert).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects malformed links and links on non-Study events before accessing storage", async () => {
    const event = { ...newPersonalEvent("2026-11-17"), title: "Practice" };
    expect((await saveCalendarEvent({ ...event, category: "Study", assignmentId: "not-a-uuid" })).error).toBeDefined();
    expect((await saveCalendarEvent({ ...event, assignmentId })).error).toContain("study block");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a DST gap using the trusted profile timezone despite a posted UTC timezone", async () => {
    const result = await saveCalendarEvent({ ...newPersonalEvent("2027-03-14"), title: "Study", time: "02:30", endTime: "03:30", timeZone: "UTC" });
    expect(result.error).toContain("02:30 on 2027-03-14 does not exist");
    expect(events.insert).not.toHaveBeenCalled();
  });

  it("keeps an edited event in its original timezone after the profile timezone changes", async () => {
    events.maybeSingle.mockResolvedValue({ data: { photo_key: null, time_zone: "America/Los_Angeles" }, error: null });
    profiles.maybeSingle.mockResolvedValue({ data: { timezone: "UTC" }, error: null });
    const result = await saveCalendarEvent({ ...newPersonalEvent("2026-11-01"), id: eventId, title: "Study", time: "01:30", endTime: "02:30" });
    expect(result.error).toBeUndefined();
    expect(events.update.mock.calls[0][0]).toMatchObject({ time_zone: "America/Los_Angeles" });
    expect(events.eq).toHaveBeenCalledWith("owner_id", ownerId);
    expect(profiles.select).not.toHaveBeenCalled();
  });

  it("does not silently fall back to UTC when the profile cannot load", async () => {
    profiles.maybeSingle.mockResolvedValue({ data: null, error: { message: "temporarily unavailable" } });
    const result = await saveCalendarEvent({ ...newPersonalEvent("2026-11-17"), title: "Practice" });
    expect(result.error).toContain("time zone could not load");
    expect(events.insert).not.toHaveBeenCalled();
  });

  it("does not edit an event unavailable to the current student", async () => {
    const result = await saveCalendarEvent({ ...newPersonalEvent("2026-11-17"), title: "Practice", id: eventId });
    expect(result.error).toContain("could not be opened");
    expect(events.update).not.toHaveBeenCalled();
  });

  it("does not write or report success when signed out or the write is rejected", async () => {
    const event = { ...newPersonalEvent("2026-11-17"), title: "Practice" };
    getUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await saveCalendarEvent(event)).error).toContain("Sign in");
    expect(events.insert).not.toHaveBeenCalled();
    events.single.mockResolvedValueOnce({ data: null, error: { message: "write rejected" } });
    expect((await saveCalendarEvent(event)).error).toContain("could not be saved");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("scopes deletion and restoration to the signed-in owner and surfaces update errors", async () => {
    await expect(setCalendarEventDeleted(eventId, true)).resolves.toEqual({ ok: true });
    expect(events.eq).toHaveBeenCalledWith("id", eventId);
    expect(events.eq).toHaveBeenCalledWith("owner_id", ownerId);
    expect(events.update.mock.calls[0][0].deleted_at).toEqual(expect.any(String));
    await expect(setCalendarEventDeleted(eventId, false)).resolves.toEqual({ ok: true });
    expect(events.update.mock.calls[1][0].deleted_at).toBeNull();
    events.single.mockResolvedValueOnce({ data: null, error: { message: "write rejected" } });
    expect((await setCalendarEventDeleted(eventId, true)).error).toContain("could not be updated");
  });
});
