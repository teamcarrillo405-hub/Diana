import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), retention: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/wellness/retention", () => ({ maintainWellnessHistory: mocks.retention }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveLobbyCheckIn } from "./actions";

const energyOnly = { energy: "low" as const, sleepHours: null, movementType: null, movementMinutes: null, sleepDate: "2026-11-16" };
describe("saveLobbyCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "student-1" } } });
    mocks.rpc.mockResolvedValue({ data: "9007199254740993", error: null });
    mocks.retention.mockResolvedValue(undefined);
    mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc });
  });
  it("persists only energy with a precise signal ID", async () => {
    await expect(saveLobbyCheckIn(energyOnly)).resolves.toEqual({ ok: true, signalId: "9007199254740993" });
    expect(mocks.rpc).toHaveBeenCalledWith("record_dashboard_energy_check_in", { p_energy: "low", p_sleep_date: "2026-11-16", p_sleep_hours: null, p_movement_type: null, p_movement_minutes: null });
    expect(mocks.retention).toHaveBeenCalledOnce();
  });
  it("does not persist a partial movement entry or an invalid energy value", async () => {
    await expect(saveLobbyCheckIn({ ...energyOnly, movementType: "walk" })).resolves.toMatchObject({ ok: false });
    await expect(saveLobbyCheckIn({ ...energyOnly, energy: "invented" } as never)).resolves.toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("does not report success for an unsigned-in user or missing signal", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(saveLobbyCheckIn(energyOnly)).resolves.toMatchObject({ ok: false });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(saveLobbyCheckIn(energyOnly)).resolves.toMatchObject({ ok: false });
  });
  it("keeps a successful check-in saved even if retention maintenance throws", async () => {
    mocks.retention.mockRejectedValueOnce(new Error("unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(saveLobbyCheckIn(energyOnly)).resolves.toMatchObject({ ok: true });
    error.mockRestore();
  });
});
