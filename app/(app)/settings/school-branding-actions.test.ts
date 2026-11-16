import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sharp = createRequire(import.meta.url)("sharp");
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), profileSelect: vi.fn(), profileEq: vi.fn(), profileMaybeSingle: vi.fn(), getUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
import { saveSchoolBranding } from "./school-branding-actions";

describe("school branding persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({ data: { user_id: "student-one" }, error: null });
    mocks.select.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.eq.mockReturnValue({ select: mocks.select });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.profileMaybeSingle.mockResolvedValue({ data: { school_logo_url: null }, error: null });
    mocks.profileEq.mockReturnValue({ maybeSingle: mocks.profileMaybeSingle });
    mocks.profileSelect.mockReturnValue({ eq: mocks.profileEq });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "student-one" } } });
    mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser }, from: vi.fn().mockReturnValue({ update: mocks.update, select: mocks.profileSelect }) });
  });

  it("saves validated colors and a resized canonical logo only to the signed-in profile", async () => {
    const png = await sharp({ create: { width: 800, height: 400, channels: 4, background: "#672080" } }).png().toBuffer();
    const result = await saveSchoolBranding({ primaryColor: "#aa00ff", secondaryColor: "#00Cc99", logoDataUrl: `data:image/png;base64,${png.toString("base64")}` });
    expect(result).toEqual({ ok: true });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "student-one");
    const update = mocks.update.mock.calls[0][0];
    expect(update).toMatchObject({ school_primary_color: "#AA00FF", school_secondary_color: "#00CC99" });
    expect(update.school_logo_url).toMatch(/^data:image\/webp;base64,/u);
    const stored = Buffer.from(update.school_logo_url.split(",")[1], "base64");
    expect(await sharp(stored).metadata()).toMatchObject({ format: "webp", width: 384, height: 192 });
  });

  it("allows clearing colors and logo", async () => {
    await expect(saveSchoolBranding({ primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toEqual({ ok: true });
    expect(mocks.update).toHaveBeenCalledWith({ school_primary_color: null, school_secondary_color: null, school_logo_url: null });
  });

  it("saves and clears the optional school name without overwriting it for older clients", async () => {
    await expect(saveSchoolBranding({ schoolName: "  Tigard  High School  ", primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toEqual({ ok: true });
    expect(mocks.update.mock.calls[0][0].school_name).toBe("Tigard High School");
    await expect(saveSchoolBranding({ schoolName: null, primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toEqual({ ok: true });
    expect(mocks.update.mock.calls[1][0].school_name).toBeNull();
    await expect(saveSchoolBranding({ primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toEqual({ ok: true });
    expect(mocks.update.mock.calls[2][0]).not.toHaveProperty("school_name");
  });

  it("rejects invalid school names", async () => {
    await expect(saveSchoolBranding({ schoolName: "a".repeat(81), primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toMatchObject({ ok: false });
    await expect(saveSchoolBranding({ schoolName: "Bad\u0000name", primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toMatchObject({ ok: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps the same stored logo bytes when only colors change", async () => {
    const webp = await sharp({ create: { width: 300, height: 200, channels: 4, background: "#137966" } }).webp({ quality: 55 }).toBuffer();
    const savedLogo = `data:image/webp;base64,${webp.toString("base64")}`;
    mocks.profileMaybeSingle.mockResolvedValueOnce({ data: { school_logo_url: savedLogo }, error: null });
    await expect(saveSchoolBranding({ primaryColor: "#223344", secondaryColor: null, logoDataUrl: savedLogo })).resolves.toEqual({ ok: true });
    expect(mocks.profileEq).toHaveBeenCalledWith("user_id", "student-one");
    expect(mocks.update.mock.calls[0][0].school_logo_url).toBe(savedLogo);
  });

  it("revalidates a changed WebP logo and rejects invalid existing data", async () => {
    mocks.profileMaybeSingle.mockResolvedValueOnce({ data: { school_logo_url: "data:image/webp;base64,YWJj" }, error: null });
    await expect(saveSchoolBranding({ primaryColor: null, secondaryColor: null, logoDataUrl: "data:image/webp;base64,YWJj" })).resolves.toMatchObject({ ok: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects CSS injection and malformed images", async () => {
    await expect(saveSchoolBranding({ primaryColor: "red; color: red", secondaryColor: null, logoDataUrl: null })).resolves.toMatchObject({ ok: false });
    await expect(saveSchoolBranding({ primaryColor: "#FFFFFF", secondaryColor: null, logoDataUrl: "data:image/svg+xml;base64,PHN2Zz4=" })).resolves.toMatchObject({ ok: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not write an unsigned-in profile or report success on a database error", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(saveSchoolBranding({ primaryColor: null, secondaryColor: null, logoDataUrl: null })).resolves.toMatchObject({ ok: false });
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "database error" } });
    await expect(saveSchoolBranding({ primaryColor: "#220044", secondaryColor: null, logoDataUrl: null })).resolves.toMatchObject({ ok: false });
  });

  it("does not report success when no profile row was updated", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(saveSchoolBranding({ primaryColor: "#220044", secondaryColor: null, logoDataUrl: null })).resolves.toMatchObject({ ok: false });
  });
});
