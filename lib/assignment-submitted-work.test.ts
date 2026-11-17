import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { sha256Hex } from "@/lib/security/submission-file-integrity";
import { GET } from "@/app/api/assignments/[id]/submitted-file/[fileId]/route";
import { loadSubmittedWork, submittedFilePath } from "./assignment-submitted-work";

const { createClient, loadAssignmentSubmissionBundle } = vi.hoisted(() => ({
  createClient: vi.fn(),
  loadAssignmentSubmissionBundle: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/assignment-submission-server", () => ({ loadAssignmentSubmissionBundle }));

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOwner = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const assignmentId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const otherFileId = "33333333-3333-4333-8333-333333333333";
const storageVersion = "44444444-4444-4444-8444-444444444444";
const storageKey = `${ownerId}/${assignmentId}/${storageVersion}/algebra.pdf`;
const payloadDigest = "a".repeat(64);
const submittedAt = "2026-11-16T03:00:00.000Z";
const filename = "Álgebra worksheet.pdf";
const originalBytes = new TextEncoder().encode("%PDF-1.7\nOriginal student work\n%%EOF");
const mime = "application/pdf";

const assignment = {
  id: assignmentId,
  owner_id: ownerId,
  title: "Linear equations",
  status: "submitted",
  submitted_at: submittedAt,
  external_source: null,
  external_url: null,
  submission_url: null,
  classes: { name: "Algebra I" },
};
const artifact = {
  id: fileId,
  owner_id: ownerId,
  assignment_id: assignmentId,
  filename,
  canonical_mime_type: mime,
  storage_bucket: "assignment-submissions",
  storage_key: storageKey,
  storage_version: storageVersion,
  integrity_status: "bound",
  byte_size: originalBytes.byteLength,
  payload_digest: payloadDigest,
  sha256_digest: sha256Hex(originalBytes),
  created_at: "2026-11-16T02:00:00.000Z",
};
const receipt = {
  assignment_id: assignmentId,
  owner_id: ownerId,
  provider: "canvas",
  status: "submitted",
  provider_receipt_id: "canvas-confirmed",
  provider_response: {},
  capability: "upload_file",
  submission_file_id: fileId,
  created_at: submittedAt,
};

function setup(options: {
  assignmentChanges?: Record<string, unknown>;
  receipts?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  userId?: string | null;
  storedBytes?: Uint8Array<ArrayBuffer>;
} = {}) {
  const download = vi.fn().mockResolvedValue({ data: new Blob([options.storedBytes ?? originalBytes]), error: null });
  const fromStorage = vi.fn(() => ({ download }));
  const user = options.userId === null ? null : { id: options.userId ?? ownerId };
  const rows: Record<string, Record<string, unknown>[]> = {
    assignments: [{ ...assignment, ...options.assignmentChanges }],
    assignment_submission_files: options.files ?? [artifact],
    assignment_submission_receipts: options.receipts ?? [],
  };
  const from = vi.fn((table: string) => {
    let selected = rows[table] ?? [];
    return {
      select() { return this; },
      eq(key: string, value: unknown) {
        selected = selected.filter((row) => row[key] === value);
        return this;
      },
      lte(key: string, value: string) {
        selected = selected.filter((row) => typeof row[key] === "string" && row[key] <= value);
        return this;
      },
      order(key: string, { ascending }: { ascending: boolean }) {
        selected = [...selected].sort((first, second) =>
          String(first[key]).localeCompare(String(second[key])) * (ascending ? 1 : -1));
        return this;
      },
      limit(count: number) {
        selected = selected.slice(0, count);
        return this;
      },
      async maybeSingle() {
        return { data: selected[0] ?? null, error: null };
      },
    };
  });
  const supabase = {
    from, storage: { from: fromStorage },
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as SupabaseClient<Database>;
  createClient.mockResolvedValue(supabase);
  return { supabase, from, fromStorage, download };
}

function readFile(id = fileId) {
  return GET(new Request(`http://localhost${submittedFilePath(assignmentId, id)}`), {
    params: Promise.resolve({ id: assignmentId, fileId: id }),
  });
}

describe("submitted work archive", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: { payloadDigest, textPayload: "The slope is 3." },
    });
  });

  it("opens the school receipt's exact file even if the student's workspace changed", async () => {
    const newerFile = { ...artifact, id: otherFileId, payload_digest: "b".repeat(64) };
    const { supabase } = setup({
      assignmentChanges: { status: "graded", external_source: "canvas" },
      receipts: [receipt],
      files: [artifact, newerFile],
    });
    expect(await loadSubmittedWork({ supabase, ownerId, assignmentId })).toMatchObject({
      assignment: { status: "graded", className: "Algebra I" },
      provider: "Canvas",
      copy: { kind: "file", id: fileId, source: "school" },
    });
    expect(loadAssignmentSubmissionBundle).not.toHaveBeenCalled();
  });

  it("keeps other provider and pending receipts out of the archive", async () => {
    const { supabase } = setup({
      assignmentChanges: { external_source: "google_classroom" },
      receipts: [receipt, { ...receipt, provider: "google_classroom", status: "confirmation_pending" }],
    });
    expect(await loadSubmittedWork({ supabase, ownerId, assignmentId })).toMatchObject({ provider: null, copy: null });
  });

  it("keeps a confirmed receipt when its file is absent", async () => {
    const { supabase } = setup({
      assignmentChanges: { external_source: "canvas" },
      receipts: [receipt],
      files: [],
    });
    expect(await loadSubmittedWork({ supabase, ownerId, assignmentId })).toMatchObject({ provider: "Canvas", copy: null });
  });

  it("shows confirmed Canvas text only while it matches the recorded digest", async () => {
    const { supabase } = setup({
      assignmentChanges: { external_source: "canvas" },
      receipts: [{
        ...receipt,
        capability: "submit_text",
        provider_response: { payload_digest: payloadDigest },
        submission_file_id: null,
      }],
    });
    expect(await loadSubmittedWork({ supabase, ownerId, assignmentId })).toMatchObject({
      provider: "Canvas", copy: { kind: "text", text: "The slope is 3.", source: "school" },
    });
    loadAssignmentSubmissionBundle.mockResolvedValueOnce({
      preview: { payloadDigest: "b".repeat(64), textPayload: "Edited after hand-in." },
    });
    expect(await loadSubmittedWork({ supabase, ownerId, assignmentId })).toMatchObject({ provider: "Canvas", copy: null });
  });

  it("labels only the matching PDF already prepared at manual hand-in as Diana's copy", async () => {
    const { supabase } = setup({
      files: [
        { ...artifact, id: otherFileId, created_at: "2026-11-16T04:00:00.000Z" },
        { ...artifact, id: otherFileId, payload_digest: "b".repeat(64) },
        artifact,
      ],
    });
    expect(await loadSubmittedWork({ supabase, ownerId, assignmentId })).toMatchObject({
      provider: null, copy: { kind: "file", id: fileId, source: "diana" },
    });
    const withoutArchive = setup({ files: [{ ...artifact, created_at: "2026-11-16T04:00:00.000Z" }] });
    expect(await loadSubmittedWork({ supabase: withoutArchive.supabase, ownerId, assignmentId })).toMatchObject({ copy: null });
  });

  it("uses the stored PDF bytes and keeps the download private", async () => {
    const { fromStorage, download } = setup();
    const response = await readFile();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe(mime);
    expect(response.headers.get("content-disposition")).toContain("filename*=UTF-8''%C3%81lgebra%20worksheet.pdf");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(originalBytes);
    expect(fromStorage).toHaveBeenCalledWith("assignment-submissions");
    expect(download).toHaveBeenCalledWith(storageKey);
  });

  it("requires a signed-in owner, final status, and the resolved copy's file ID", async () => {
    const anonymous = setup({ userId: null });
    expect((await readFile()).status).toBe(401);
    expect(anonymous.from).not.toHaveBeenCalled();
    const nonOwner = setup({ userId: otherOwner });
    expect((await readFile()).status).toBe(404);
    expect(nonOwner.download).not.toHaveBeenCalled();
    const active = setup({ assignmentChanges: { status: "exporting" } });
    expect((await readFile()).status).toBe(404);
    expect(active.download).not.toHaveBeenCalled();
    const mismatched = setup();
    expect((await readFile(otherFileId)).status).toBe(404);
    expect(mismatched.download).not.toHaveBeenCalled();
  });

  it("keeps inconsistent storage metadata or bytes unavailable", async () => {
    const wrongPath = setup({ files: [{ ...artifact, storage_key: storageKey.replace(assignmentId, otherFileId) }] });
    expect((await readFile()).status).toBe(404);
    expect(wrongPath.download).not.toHaveBeenCalled();
    const changed = new Uint8Array(Buffer.from("%PDF-1.7\nRecorded student work\n%%EOF"));
    expect(changed.byteLength).toBe(originalBytes.byteLength);
    setup({ storedBytes: changed });
    const response = await readFile();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
