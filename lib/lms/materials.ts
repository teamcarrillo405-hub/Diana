import type { AssignmentSourceInput } from "@/lib/assignment-sources";
import {
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
} from "@/lib/security/canvas-institutions";
import { parseHttpsUrl } from "@/lib/security/outbound-url";
import { fileExtension, validateUpload } from "@/lib/security/upload-validation";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const GOOGLE_DRIVE_ORIGIN = "https://www.googleapis.com";
const GOOGLE_DRIVE_FILE_ID = /^[A-Za-z0-9_-]{10,200}$/;
const CANVAS_FILE_ID = /^\d+$/;

const GOOGLE_NATIVE_EXPORTS: Readonly<Record<string, { mimeType: string; extension: string }>> = {
  "application/vnd.google-apps.document": { mimeType: "application/pdf", extension: ".pdf" },
  "application/vnd.google-apps.spreadsheet": { mimeType: "application/pdf", extension: ".pdf" },
  "application/vnd.google-apps.presentation": { mimeType: "application/pdf", extension: ".pdf" },
};

export type MaterialProviderConfig =
  | { provider: "canvas"; institution_id: string; base_url: string; token: string; max_bytes?: number }
  | { provider: "google_classroom"; token: string; max_bytes?: number };

export type CanvasMaterialDownloadPlan = {
  status: "ready";
  provider: "canvas";
  fileId: string;
  url: string;
};

export type GoogleDriveMaterialDownloadPlan = {
  status: "ready";
  provider: "google_classroom";
  fileId: string;
  metadataUrl: string;
};

export type MaterialCapabilityFailure = {
  status: "partial" | "unsupported";
  code:
    | "source_not_ready"
    | "provider_mismatch"
    | "unsupported_source"
    | "unsupported_link"
    | "missing_file_id"
    | "invalid_file_id"
    | "missing_url"
    | "invalid_url"
    | "origin_not_allowed"
    | "unsupported_google_file"
    | "metadata_failed"
    | "download_failed"
    | "download_too_large"
    | "invalid_file_format";
  message: string;
};

export type MaterialDownloadPlan =
  | CanvasMaterialDownloadPlan
  | GoogleDriveMaterialDownloadPlan
  | MaterialCapabilityFailure;

export type DownloadedAssignmentMaterial = {
  status: "downloaded";
  provider: "canvas" | "google_classroom";
  fileId: string;
  filename: string;
  mimeType: string | null;
  bytes: Uint8Array;
};

export type MaterializationResult = DownloadedAssignmentMaterial | MaterialCapabilityFailure;

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
type GoogleDriveMetadata = { id?: string; name?: string; mimeType?: string; size?: string };

function failure(
  status: MaterialCapabilityFailure["status"],
  code: MaterialCapabilityFailure["code"],
  message: string,
): MaterialCapabilityFailure {
  return { status, code, message };
}

function safeProviderUrl(value: string): URL | null {
  try {
    return parseHttpsUrl(value);
  } catch {
    return null;
  }
}

function providerFileId(source: AssignmentSourceInput): string | null {
  const externalId = source.external_id?.trim();
  if (!externalId) return null;
  const marker = source.provider === "canvas" ? ":attachment:" : ":material:";
  const markerIndex = externalId.lastIndexOf(marker);
  return markerIndex >= 0 ? externalId.slice(markerIndex + marker.length) : null;
}

function canvasFilePathMatches(pathname: string, fileId: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.some((segment, index) => segment === "files" && segments[index + 1] === fileId);
}

export function planAssignmentMaterialDownload(
  source: AssignmentSourceInput,
  config: MaterialProviderConfig,
): MaterialDownloadPlan {
  if (source.import_status !== "ready") {
    return failure("partial", "source_not_ready", "The assignment material is not ready to download.");
  }
  if (source.provider !== config.provider) {
    return failure("unsupported", "provider_mismatch", "The source does not belong to this LMS provider.");
  }
  if (source.source_type === "link") {
    return failure(
      "unsupported",
      "unsupported_link",
      "Generic assignment links are never fetched by the materialization service.",
    );
  }
  if (source.source_type !== "attachment") {
    return failure("unsupported", "unsupported_source", "This source type cannot be downloaded from an LMS.");
  }

  const fileId = providerFileId(source);
  if (!fileId) {
    return failure("partial", "missing_file_id", "The LMS did not provide a file identifier.");
  }

  if (config.provider === "canvas") {
    if (!CANVAS_FILE_ID.test(fileId)) {
      return failure("unsupported", "invalid_file_id", "The Canvas file identifier is not valid.");
    }
    if (!source.url) {
      return failure("partial", "missing_url", "Canvas did not provide an attachment download URL.");
    }
    const base = safeProviderUrl(config.base_url);
    const sourceUrl = safeProviderUrl(source.url);
    if (!base || !sourceUrl) {
      return failure("unsupported", "invalid_url", "The Canvas attachment URL is not secure.");
    }
    if (sourceUrl.origin !== base.origin) {
      return failure("unsupported", "origin_not_allowed", "The Canvas attachment origin is not allowlisted.");
    }
    if (!canvasFilePathMatches(sourceUrl.pathname, fileId)) {
      return failure("unsupported", "invalid_file_id", "The Canvas URL does not match the attachment identifier.");
    }
    return { status: "ready", provider: "canvas", fileId, url: sourceUrl.toString() };
  }

  if (!GOOGLE_DRIVE_FILE_ID.test(fileId)) {
    return failure("unsupported", "invalid_file_id", "The Google Drive file identifier is not valid.");
  }
  const metadataUrl = new URL(`/drive/v3/files/${encodeURIComponent(fileId)}`, GOOGLE_DRIVE_ORIGIN);
  metadataUrl.searchParams.set("fields", "id,name,mimeType,size");
  return {
    status: "ready",
    provider: "google_classroom",
    fileId,
    metadataUrl: metadataUrl.toString(),
  };
}

function maxBytes(config: MaterialProviderConfig): number {
  const requested = config.max_bytes;
  return typeof requested === "number" && Number.isSafeInteger(requested) && requested > 0
    ? requested
    : DEFAULT_MAX_BYTES;
}

function responseSize(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function readBoundedBytes(
  response: Response,
  limit: number,
): Promise<Uint8Array | MaterialCapabilityFailure> {
  const declaredSize = responseSize(response);
  if (declaredSize !== null && declaredSize > limit) {
    return failure("partial", "download_too_large", `The assignment material exceeds the ${limit}-byte limit.`);
  }

  try {
    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      return bytes.byteLength <= limit
        ? bytes
        : failure("partial", "download_too_large", `The assignment material exceeds the ${limit}-byte limit.`);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return failure("partial", "download_too_large", `The assignment material exceeds the ${limit}-byte limit.`);
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch {
    return failure("partial", "download_failed", "The LMS response body could not be read.");
  }
}

function withExtension(filename: string, extension: string): string {
  const trimmed = filename.trim() || "Google Classroom material";
  return trimmed.toLowerCase().endsWith(extension) ? trimmed : `${trimmed}${extension}`;
}

function canonicalFilename(filename: string, extension: string): string {
  const trimmed = filename.trim();
  const currentExtension = fileExtension(trimmed);
  if (!trimmed || !currentExtension) return `Assignment material.${extension}`;
  return `${trimmed.slice(0, -(currentExtension.length + 1))}.${extension}`;
}

function validatedMaterial(input: DownloadedAssignmentMaterial): MaterializationResult {
  const validation = validateUpload("assignmentSource", {
    name: input.filename,
    mimeType: input.mimeType ?? "",
    size: input.bytes.byteLength,
    bytes: input.bytes,
  });
  if (!validation.ok) {
    return failure(
      "unsupported",
      "invalid_file_format",
      "The LMS material did not match a supported assignment file format.",
    );
  }
  return {
    ...input,
    filename: canonicalFilename(input.filename, validation.value.extension),
    mimeType: validation.value.mimeType,
  };
}

async function materializeCanvas(
  source: AssignmentSourceInput,
  plan: CanvasMaterialDownloadPlan,
  config: Extract<MaterialProviderConfig, { provider: "canvas" }>,
  fetchImpl: FetchLike,
): Promise<MaterializationResult> {
  let response: Response;
  try {
    if (!config.institution_id?.trim()) {
      return failure("partial", "download_failed", "Reconnect Canvas to import assignment files.");
    }
    const institution = await resolveCanvasConnectionDestination(config);
    response = await fetchCanvasDestination(institution, plan.url, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: "*/*" },
      redirect: "manual",
    }, { fetchImpl: fetchImpl as typeof fetch });
  } catch {
    return failure("partial", "download_failed", "Canvas could not provide the assignment material.");
  }
  if (!response.ok || response.type === "opaqueredirect") {
    return failure("partial", "download_failed", `Canvas returned ${response.status} for the assignment material.`);
  }
  const bytes = await readBoundedBytes(response, maxBytes(config));
  if (!(bytes instanceof Uint8Array)) return bytes;
  return validatedMaterial({
    status: "downloaded",
    provider: "canvas",
    fileId: plan.fileId,
    filename: source.title.trim() || "Canvas attachment",
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || source.mime_type || null,
    bytes,
  });
}

async function materializeGoogleDrive(
  source: AssignmentSourceInput,
  plan: GoogleDriveMaterialDownloadPlan,
  config: Extract<MaterialProviderConfig, { provider: "google_classroom" }>,
  fetchImpl: FetchLike,
): Promise<MaterializationResult> {
  let metadataResponse: Response;
  try {
    metadataResponse = await fetchImpl(plan.metadataUrl, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      redirect: "manual",
    });
  } catch {
    return failure("partial", "metadata_failed", "Google Drive metadata is unavailable.");
  }
  if (!metadataResponse.ok || metadataResponse.type === "opaqueredirect") {
    return failure("partial", "metadata_failed", `Google Drive metadata returned ${metadataResponse.status}.`);
  }

  let metadata: GoogleDriveMetadata;
  try {
    metadata = (await metadataResponse.json()) as GoogleDriveMetadata;
  } catch {
    return failure("partial", "metadata_failed", "Google Drive returned invalid file metadata.");
  }
  if (metadata.id !== plan.fileId || !metadata.mimeType) {
    return failure("partial", "metadata_failed", "Google Drive metadata did not match the requested file.");
  }

  const declaredSize = metadata.size && /^\d+$/.test(metadata.size) ? Number(metadata.size) : null;
  if (declaredSize !== null && declaredSize > maxBytes(config)) {
    return failure("partial", "download_too_large", `The assignment material exceeds the ${maxBytes(config)}-byte limit.`);
  }

  const nativeExport = GOOGLE_NATIVE_EXPORTS[metadata.mimeType];
  if (metadata.mimeType.startsWith("application/vnd.google-apps.") && !nativeExport) {
    return failure("unsupported", "unsupported_google_file", "This Google-native file type cannot be exported.");
  }

  const downloadUrl = new URL(`/drive/v3/files/${encodeURIComponent(plan.fileId)}`, GOOGLE_DRIVE_ORIGIN);
  let filename = metadata.name?.trim() || source.title.trim() || "Google Classroom material";
  let mimeType = metadata.mimeType;
  if (nativeExport) {
    downloadUrl.pathname += "/export";
    downloadUrl.searchParams.set("mimeType", nativeExport.mimeType);
    filename = withExtension(filename, nativeExport.extension);
    mimeType = nativeExport.mimeType;
  } else {
    downloadUrl.searchParams.set("alt", "media");
  }

  let response: Response;
  try {
    response = await fetchImpl(downloadUrl.toString(), {
      headers: { Authorization: `Bearer ${config.token}`, Accept: mimeType },
      redirect: "manual",
    });
  } catch {
    return failure("partial", "download_failed", "Google Drive could not provide the assignment material.");
  }
  if (!response.ok || response.type === "opaqueredirect") {
    return failure("partial", "download_failed", `Google Drive returned ${response.status} for the material.`);
  }
  const bytes = await readBoundedBytes(response, maxBytes(config));
  if (!(bytes instanceof Uint8Array)) return bytes;
  return validatedMaterial({
    status: "downloaded",
    provider: "google_classroom",
    fileId: plan.fileId,
    filename,
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || mimeType,
    bytes,
  });
}

export async function materializeAssignmentMaterial(
  source: AssignmentSourceInput,
  config: MaterialProviderConfig,
  fetchImpl: FetchLike = fetch,
): Promise<MaterializationResult> {
  const plan = planAssignmentMaterialDownload(source, config);
  if (plan.status !== "ready") return plan;
  if (plan.provider === "canvas" && config.provider === "canvas") {
    return materializeCanvas(source, plan, config, fetchImpl);
  }
  if (plan.provider === "google_classroom" && config.provider === "google_classroom") {
    return materializeGoogleDrive(source, plan, config, fetchImpl);
  }
  return failure("unsupported", "provider_mismatch", "The download plan does not match the LMS provider.");
}
