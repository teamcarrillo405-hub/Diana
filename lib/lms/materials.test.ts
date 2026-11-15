import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Agent } from "undici";

import type { AssignmentSourceInput } from "@/lib/assignment-sources";
import { fetchClassroomAssignments } from "./google";
import {
  materializeAssignmentMaterial,
  planAssignmentMaterialDownload,
} from "./materials";

const canvasConfig = {
  provider: "canvas" as const,
  institution_id: "school",
  base_url: "https://93.184.216.34",
  token: "canvas-token",
};

const canvasSource: AssignmentSourceInput = {
  source_type: "attachment",
  title: "Lab guide.pdf",
  provider: "canvas",
  external_id: "42:attachment:987",
  url: "https://93.184.216.34/courses/12/files/987/download?download_frd=1",
  mime_type: "application/pdf",
  import_status: "ready",
};

const googleConfig = {
  provider: "google_classroom" as const,
  token: "google-token",
};

const googleFileId = "1AbCdEfGhIjKlMnOp";
const pdfBytes = new Uint8Array(Buffer.from("%PDF-1.7", "ascii"));
const googleSource: AssignmentSourceInput = {
  source_type: "attachment",
  title: "Reading",
  provider: "google_classroom",
  external_id: `work-1:material:${googleFileId}`,
  url: `https://drive.google.com/open?id=${googleFileId}`,
  import_status: "ready",
};

const originalRegistry = process.env.CANVAS_INSTITUTIONS_JSON;
const originalAllowlist = process.env.CANVAS_ALLOWED_ORIGINS;

beforeEach(() => {
  process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({ school: canvasConfig.base_url });
  delete process.env.CANVAS_ALLOWED_ORIGINS;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalRegistry === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalRegistry;
  if (originalAllowlist === undefined) delete process.env.CANVAS_ALLOWED_ORIGINS;
  else process.env.CANVAS_ALLOWED_ORIGINS = originalAllowlist;
});

describe("Classroom material normalization", () => {
  it("marks Drive files ready and generic links partial", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        courses: [{ id: "course-1", name: "English" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        courseWork: [{
          id: "work-1",
          title: "Essay",
          dueDate: { year: 2026, month: 8, day: 1 },
          materials: [
            {
              driveFile: {
                driveFile: {
                  id: googleFileId,
                  title: "Prompt",
                  alternateLink: `https://drive.google.com/open?id=${googleFileId}`,
                },
              },
            },
            { link: { title: "Research site", url: "https://example.com/research" } },
          ],
        }],
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await fetchClassroomAssignments("google-token");
      expect(result.items[0].sources).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source_type: "attachment",
          external_id: `work-1:material:${googleFileId}`,
          import_status: "ready",
        }),
        expect.objectContaining({
          source_type: "link",
          url: "https://example.com/research",
          import_status: "partial",
        }),
      ]));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("planAssignmentMaterialDownload", () => {
  it("allows a Canvas file URL only on the configured origin with a matching numeric file ID", () => {
    expect(planAssignmentMaterialDownload(canvasSource, canvasConfig)).toEqual({
      status: "ready",
      provider: "canvas",
      fileId: "987",
      url: canvasSource.url,
    });
  });

  it("rejects a Canvas attachment URL from an arbitrary origin", () => {
    const result = planAssignmentMaterialDownload(
      { ...canvasSource, url: "https://attacker.example/files/987/download" },
      canvasConfig,
    );
    expect(result).toMatchObject({ status: "unsupported", code: "origin_not_allowed" });
  });

  it.each([
    "http://93.184.216.34/files/987/download",
    "https://93.184.216.34:444/files/987/download",
    "https://student:secret@93.184.216.34/files/987/download",
    "https://localhost/files/987/download",
  ])("rejects unsafe Canvas attachment URL syntax: %s", (url) => {
    const result = planAssignmentMaterialDownload({ ...canvasSource, url }, canvasConfig);
    expect(result).toMatchObject({ status: "unsupported", code: "invalid_url" });
  });

  it("rejects a Canvas URL whose path does not contain the allowlisted file ID", () => {
    const result = planAssignmentMaterialDownload(
      { ...canvasSource, url: "https://93.184.216.34/files/123/download" },
      canvasConfig,
    );
    expect(result).toMatchObject({ status: "unsupported", code: "invalid_file_id" });
  });

  it("constructs Google API requests from validated Drive IDs, not source URLs", () => {
    const result = planAssignmentMaterialDownload(
      { ...googleSource, url: "https://attacker.example/ignored" },
      googleConfig,
    );
    expect(result).toMatchObject({
      status: "ready",
      provider: "google_classroom",
      fileId: googleFileId,
    });
    if (result.status !== "ready" || result.provider !== "google_classroom") {
      throw new Error("Expected a Google Drive plan");
    }
    expect(result.metadataUrl).toMatch(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\//);
  });

  it("rejects path-like Google file IDs before constructing a request", () => {
    const result = planAssignmentMaterialDownload(
      { ...googleSource, external_id: "work-1:material:../../metadata" },
      googleConfig,
    );
    expect(result).toMatchObject({ status: "unsupported", code: "invalid_file_id" });
  });

  it("marks generic links unsupported and does not turn their URL into a plan", () => {
    const result = planAssignmentMaterialDownload(
      {
        source_type: "link",
        title: "Teacher website",
        provider: "google_classroom",
        external_id: "work-1:material:0",
        url: "https://example.com/homework",
        import_status: "ready",
      },
      googleConfig,
    );
    expect(result).toMatchObject({ status: "unsupported", code: "unsupported_link" });
  });

  it("marks sources without provider file IDs partial", () => {
    const result = planAssignmentMaterialDownload(
      { ...googleSource, external_id: "work-1" },
      googleConfig,
    );
    expect(result).toMatchObject({ status: "partial", code: "missing_file_id" });
  });
});

describe("materializeAssignmentMaterial", () => {
  it("downloads Canvas bytes with authorization and manual redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(pdfBytes, {
        status: 200,
        headers: { "content-type": "application/pdf", "content-length": String(pdfBytes.length) },
      }),
    );

    const result = await materializeAssignmentMaterial(canvasSource, canvasConfig, fetchMock);

    expect(result).toMatchObject({
      status: "downloaded",
      provider: "canvas",
      fileId: "987",
      filename: "Lab guide.pdf",
      mimeType: "application/pdf",
    });
    if (result.status !== "downloaded") throw new Error("Expected downloaded Canvas bytes");
    expect(result.bytes).toEqual(pdfBytes);
    expect(String(fetchMock.mock.calls[0][0])).toBe(canvasSource.url);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      dispatcher: expect.any(Agent),
      headers: { Authorization: "Bearer canvas-token", Accept: "*/*" },
      redirect: "manual",
    });
  });

  it("requires a server-issued Canvas institution ID before fetching", async () => {
    const fetchMock = vi.fn();
    const result = await materializeAssignmentMaterial(
      canvasSource,
      { ...canvasConfig, institution_id: "" },
      fetchMock,
    );

    expect(result).toMatchObject({ status: "partial", code: "download_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a client-stored Canvas origin that conflicts with the institution registry", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      school: "https://93.184.216.35",
    });
    const fetchMock = vi.fn();

    const result = await materializeAssignmentMaterial(canvasSource, canvasConfig, fetchMock);

    expect(result).toMatchObject({ status: "partial", code: "download_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks private Canvas destinations even when client config and source URL agree", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({ school: "https://127.0.0.1" });
    const fetchMock = vi.fn();
    const privateConfig = { ...canvasConfig, base_url: "https://127.0.0.1" };
    const privateSource = { ...canvasSource, url: "https://127.0.0.1/files/987/download" };

    const result = await materializeAssignmentMaterial(privateSource, privateConfig, fetchMock);

    expect(result).toMatchObject({ status: "partial", code: "download_failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not follow a Canvas redirect to a private destination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { Location: "https://127.0.0.1/latest/meta-data" },
    }));

    const result = await materializeAssignmentMaterial(canvasSource, canvasConfig, fetchMock);

    expect(result).toMatchObject({ status: "partial", code: "download_failed" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops an unknown-length Canvas response when its streamed body exceeds the limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(Uint8Array.from([1, 2, 3]), { status: 200 }),
    );

    const result = await materializeAssignmentMaterial(
      canvasSource,
      { ...canvasConfig, max_bytes: 2 },
      fetchMock,
    );

    expect(result).toMatchObject({ status: "partial", code: "download_too_large" });
  });

  it("never fetches an arbitrary generic link", async () => {
    const fetchMock = vi.fn();
    const result = await materializeAssignmentMaterial(
      {
        source_type: "link",
        title: "Outside resource",
        provider: "google_classroom",
        external_id: "work-1:material:0",
        url: "https://example.com/resource",
        import_status: "ready",
      },
      googleConfig,
      fetchMock,
    );

    expect(result).toMatchObject({ status: "unsupported", code: "unsupported_link" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads a binary Drive file from the Google API origin", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: googleFileId,
        name: "Worksheet.pdf",
        mimeType: "application/pdf",
        size: String(pdfBytes.length),
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(pdfBytes, {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }));

    const result = await materializeAssignmentMaterial(googleSource, googleConfig, fetchMock);

    expect(result).toMatchObject({
      status: "downloaded",
      provider: "google_classroom",
      filename: "Worksheet.pdf",
      mimeType: "application/pdf",
    });
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      `https://www.googleapis.com/drive/v3/files/${googleFileId}?alt=media`,
    );
  });

  it("exports Google Docs as PDF", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: googleFileId,
        name: "Essay prompt",
        mimeType: "application/vnd.google-apps.document",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(pdfBytes, {
        status: 200,
        headers: { "content-type": "application/pdf" },
      }));

    const result = await materializeAssignmentMaterial(googleSource, googleConfig, fetchMock);

    expect(result).toMatchObject({
      status: "downloaded",
      filename: "Essay prompt.pdf",
      mimeType: "application/pdf",
    });
    const downloadUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(downloadUrl.origin).toBe("https://www.googleapis.com");
    expect(downloadUrl.pathname).toBe(`/drive/v3/files/${googleFileId}/export`);
    expect(downloadUrl.searchParams.get("mimeType")).toBe("application/pdf");
  });

  it("rejects HTML bytes even when the LMS declares a PDF", async () => {
    const html = new Uint8Array(Buffer.from("<html>sign in</html>", "ascii"));
    const fetchMock = vi.fn().mockResolvedValue(new Response(html, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    }));

    const result = await materializeAssignmentMaterial(canvasSource, canvasConfig, fetchMock);

    expect(result).toMatchObject({ status: "unsupported", code: "invalid_file_format" });
  });

  it("returns canonical assignment-source metadata only", async () => {
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
    const source = {
      ...canvasSource,
      title: "Lab photo.JPEG",
      mime_type: "image/jpg",
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(jpeg, {
      status: 200,
      headers: { "content-type": "image/jpg" },
    }));

    const result = await materializeAssignmentMaterial(source, canvasConfig, fetchMock);

    expect(result).toMatchObject({
      status: "downloaded",
      filename: "Lab photo.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("returns an explicit failure for unsupported Google-native files without downloading", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      id: googleFileId,
      name: "Classroom map",
      mimeType: "application/vnd.google-apps.map",
    }), { status: 200 }));

    const result = await materializeAssignmentMaterial(googleSource, googleConfig, fetchMock);

    expect(result).toMatchObject({ status: "unsupported", code: "unsupported_google_file" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an explicit size failure before downloading declared oversized Drive files", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      id: googleFileId,
      name: "Large video",
      mimeType: "video/mp4",
      size: "11",
    }), { status: 200 }));

    const result = await materializeAssignmentMaterial(
      googleSource,
      { ...googleConfig, max_bytes: 10 },
      fetchMock,
    );

    expect(result).toMatchObject({ status: "partial", code: "download_too_large" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
