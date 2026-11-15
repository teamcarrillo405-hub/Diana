import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  upload: vi.fn(),
  info: vi.fn(),
  download: vi.fn(),
  storageFrom: vi.fn(),
  tableFrom: vi.fn(),
  portfolioMaybeSingle: vi.fn(),
  insertItem: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import { addPortfolioItem, uploadPortfolioFile } from "./actions";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PORTFOLIO_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const originalSigningSecret = process.env.PORTFOLIO_UPLOAD_SIGNING_SECRET;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const mutableEnv = process.env as Record<string, string | undefined>;

function form(file: File): FormData {
  const data = new FormData();
  data.set("file", file);
  return data;
}

describe("portfolio uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PORTFOLIO_UPLOAD_SIGNING_SECRET = "test-portfolio-signing-secret-at-least-32-bytes";
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = originalNodeEnv;
    mocks.upload.mockResolvedValue({
      data: {
        id: "portfolio-object-id",
        path: `${OWNER_ID}/portfolio/file.pdf`,
        fullPath: `portfolio-evidence/${OWNER_ID}/portfolio/file.pdf`,
      },
      error: null,
    });
    mocks.info.mockResolvedValue({
      data: {
        id: "portfolio-object-id",
        version: "portfolio-version-1",
        size: 8,
        contentType: "application/pdf",
      },
      error: null,
    });
    mocks.download.mockResolvedValue({
      data: new Blob(["%PDF-1.7"], { type: "application/pdf" }),
      error: null,
    });
    mocks.portfolioMaybeSingle.mockResolvedValue({ data: { id: PORTFOLIO_ID }, error: null });
    mocks.insertItem.mockResolvedValue({ error: null });
    mocks.storageFrom.mockReturnValue({
      upload: mocks.upload,
      info: mocks.info,
      download: mocks.download,
    });
    const portfolioQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.portfolioMaybeSingle,
    };
    mocks.tableFrom.mockImplementation((table: string) => (
      table === "portfolios" ? portfolioQuery : { insert: mocks.insertItem }
    ));
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
      storage: { from: mocks.storageFrom },
      from: mocks.tableFrom,
    });
  });

  afterAll(() => {
    if (originalSigningSecret === undefined) delete process.env.PORTFOLIO_UPLOAD_SIGNING_SECRET;
    else process.env.PORTFOLIO_UPLOAD_SIGNING_SECRET = originalSigningSecret;
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it("rejects arbitrary bytes with a valid extension and MIME", async () => {
    const result = await uploadPortfolioFile(form(
      new File(["not-a-pdf"], "project.pdf", { type: "application/pdf" }),
    ));

    expect(result).toMatchObject({ ok: false });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects mismatched and empty files", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const mismatch = await uploadPortfolioFile(form(
      new File([png], "project.png", { type: "image/jpeg" }),
    ));
    const empty = await uploadPortfolioFile(form(
      new File([], "project.pdf", { type: "application/pdf" }),
    ));

    expect(mismatch).toMatchObject({ ok: false });
    expect(empty).toMatchObject({ ok: false });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("stores a valid portfolio document with normalized metadata", async () => {
    const result = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.PDF", { type: "application/pdf" }),
    ));

    expect(result).toMatchObject({
      ok: true,
      storageKey: expect.stringMatching(/^portfolio\.v1\./u),
      mimeType: "application/pdf",
    });
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${OWNER_ID}/portfolio/[0-9a-f-]+\\.pdf$`, "u")),
      expect.any(File),
      { contentType: "application/pdf", upsert: false },
    );
  });

  it("fails closed in production without the dedicated signing secret", async () => {
    mutableEnv.NODE_ENV = "production";
    delete process.env.PORTFOLIO_UPLOAD_SIGNING_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-must-never-sign-portfolio-receipts";

    const result = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.pdf", { type: "application/pdf" }),
    ));

    expect(result).toEqual({ ok: false, error: "Portfolio uploads are not configured." });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects a client-controlled storage path instead of creating an item", async () => {
    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Forged item",
      storageKey: `${OWNER_ID}/portfolio/forged.pdf`,
      mimeType: "application/pdf",
    });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.info).not.toHaveBeenCalled();
    expect(mocks.insertItem).not.toHaveBeenCalled();
  });

  it("does not allow client metadata to forge an upload integrity binding", async () => {
    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Text-only item",
      metadata: {
        category: "reflection",
        uploadIntegrity: {
          algorithm: "sha256",
          digest: "0".repeat(64),
          storageKey: `${OWNER_ID}/portfolio/forged.pdf`,
        },
      },
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.insertItem).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { category: "reflection" },
      storage_key: null,
      mime_type: null,
    }));
  });

  it("binds the signed receipt to its canonical MIME and stored owner path", async () => {
    const uploaded = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.pdf", { type: "application/pdf" }),
    ));
    if (!uploaded.ok) throw new Error(uploaded.error);

    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Verified item",
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.insertItem).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: OWNER_ID,
      storage_key: expect.stringMatching(new RegExp(`^${OWNER_ID}/portfolio/`, "u")),
      mime_type: "application/pdf",
      metadata: expect.objectContaining({
        uploadIntegrity: expect.objectContaining({
          algorithm: "sha256",
          digest: expect.stringMatching(/^[a-f0-9]{64}$/u),
          objectId: "portfolio-object-id",
          objectVersion: "portfolio-version-1",
          storageKey: expect.stringMatching(new RegExp(`^${OWNER_ID}/portfolio/`, "u")),
        }),
      }),
    }));
  });

  it("rejects a valid receipt paired with client-substituted MIME metadata", async () => {
    const uploaded = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.pdf", { type: "application/pdf" }),
    ));
    if (!uploaded.ok) throw new Error(uploaded.error);

    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Mismatched item",
      storageKey: uploaded.storageKey,
      mimeType: "image/jpeg",
    });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.info).toHaveBeenCalledTimes(1);
    expect(mocks.insertItem).not.toHaveBeenCalled();
  });

  it("rejects stored bytes replaced after a receipt was issued", async () => {
    const uploaded = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.pdf", { type: "application/pdf" }),
    ));
    if (!uploaded.ok) throw new Error(uploaded.error);
    mocks.download.mockResolvedValueOnce({
      data: new Blob(["<html>x</html>"], { type: "application/pdf" }),
      error: null,
    });

    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Replaced item",
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
    });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.insertItem).not.toHaveBeenCalled();
  });

  it("rejects a same-size valid replacement even when its object metadata is unchanged", async () => {
    const uploaded = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.pdf", { type: "application/pdf" }),
    ));
    if (!uploaded.ok) throw new Error(uploaded.error);
    mocks.download.mockResolvedValueOnce({
      data: new Blob(["%PDF-1.6"], { type: "application/pdf" }),
      error: null,
    });

    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Same-size replacement",
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
    });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.insertItem).not.toHaveBeenCalled();
  });

  it("rejects a replacement whose immutable storage version changed", async () => {
    const uploaded = await uploadPortfolioFile(form(
      new File(["%PDF-1.7"], "project.pdf", { type: "application/pdf" }),
    ));
    if (!uploaded.ok) throw new Error(uploaded.error);
    mocks.info.mockResolvedValueOnce({
      data: {
        id: "portfolio-object-id",
        version: "portfolio-version-2",
        size: 8,
        contentType: "application/pdf",
      },
      error: null,
    });

    const result = await addPortfolioItem({
      portfolioId: PORTFOLIO_ID,
      title: "Changed object version",
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
    });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.insertItem).not.toHaveBeenCalled();
  });
});
