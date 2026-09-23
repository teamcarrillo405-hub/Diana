"use server";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  hasOwnerStoragePrefix,
  ownerStorageKey,
  validateFileUpload,
  validateUpload,
} from "@/lib/security/upload-validation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const PortfolioInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  classId: z.string().uuid().nullable().optional(),
});

const PORTFOLIO_RECEIPT_TTL_MS = 15 * 60 * 1000;
const PORTFOLIO_BUCKET = "portfolio-evidence";

type PortfolioUploadReceipt = {
  v: 1;
  ownerId: string;
  storageKey: string;
  objectId: string;
  objectVersion: string;
  mimeType: string;
  size: number;
  sha256: string;
  expiresAt: number;
};

function portfolioSigningSecret(): string | null {
  const secret = process.env.PORTFOLIO_UPLOAD_SIGNING_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function signPortfolioUpload(payload: PortfolioUploadReceipt, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `portfolio.v1.${encoded}.${signature}`;
}

function verifyPortfolioUpload(receipt: string, ownerId: string): PortfolioUploadReceipt | null {
  const secret = portfolioSigningSecret();
  const parts = receipt.split(".");
  if (!secret || parts.length !== 4 || parts[0] !== "portfolio" || parts[1] !== "v1") return null;

  const encoded = parts[2];
  const actualSignature = Buffer.from(parts[3], "base64url");
  const expectedSignature = createHmac("sha256", secret).update(encoded).digest();
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<PortfolioUploadReceipt>;
    if (
      payload.v !== 1
      || payload.ownerId !== ownerId
      || typeof payload.storageKey !== "string"
      || typeof payload.objectId !== "string"
      || payload.objectId.length === 0
      || typeof payload.objectVersion !== "string"
      || payload.objectVersion.length === 0
      || typeof payload.mimeType !== "string"
      || !Number.isSafeInteger(payload.size)
      || (payload.size ?? 0) <= 0
      || typeof payload.sha256 !== "string"
      || !/^[a-f0-9]{64}$/u.test(payload.sha256)
      || !Number.isSafeInteger(payload.expiresAt)
      || (payload.expiresAt ?? 0) < Date.now()
    ) return null;
    return payload as PortfolioUploadReceipt;
  } catch {
    return null;
  }
}

export async function createPortfolio(
  input: z.infer<typeof PortfolioInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = PortfolioInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a portfolio title." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("portfolios")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      class_id: parsed.data.classId ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create portfolio." };

  revalidatePath("/portfolio");
  return { ok: true, id: data.id };
}

export async function uploadPortfolioFile(
  formData: FormData,
): Promise<{ ok: true; storageKey: string; mimeType: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "Choose an image or document." };
  const validation = await validateFileUpload("portfolioFile", file);
  if (!validation.ok) return { ok: false, error: validation.error };
  const signingSecret = portfolioSigningSecret();
  if (!signingSecret) return { ok: false, error: "Portfolio uploads are not configured." };
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(fileBytes).digest("hex");

  const storageKey = ownerStorageKey(
    user.id,
    "portfolio",
    `${crypto.randomUUID()}.${validation.value.extension}`,
  );
  const bucket = supabase.storage.from(PORTFOLIO_BUCKET);
  const { data: uploadedObject, error } = await bucket.upload(storageKey, file, {
    contentType: validation.value.mimeType,
    upsert: false,
  });
  if (error || !uploadedObject) return { ok: false, error: error?.message ?? "Could not store portfolio file." };

  const { data: storedObject, error: infoError } = await bucket.info(storageKey);
  const storedMime = storedObject?.contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (
    infoError
    || !storedObject
    || storedObject.id !== uploadedObject.id
    || typeof storedObject.version !== "string"
    || storedObject.version.length === 0
    || Number(storedObject.size) !== file.size
    || storedMime !== validation.value.mimeType
  ) return { ok: false, error: "The stored portfolio file could not be bound to an immutable version." };

  const receipt = signPortfolioUpload({
    v: 1,
    ownerId: user.id,
    storageKey,
    objectId: storedObject.id,
    objectVersion: storedObject.version,
    mimeType: validation.value.mimeType,
    size: file.size,
    sha256,
    expiresAt: Date.now() + PORTFOLIO_RECEIPT_TTL_MS,
  }, signingSecret);
  return { ok: true, storageKey: receipt, mimeType: validation.value.mimeType };
}

const ItemInput = z.object({
  portfolioId: z.string().uuid(),
  title: z.string().min(1).max(160),
  reflectionText: z.string().max(2000).optional(),
  storageKey: z.string().max(2048).nullable().optional(),
  mimeType: z.string().max(200).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function addPortfolioItem(
  input: z.infer<typeof ItemInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a title for this item." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  let verifiedUpload: PortfolioUploadReceipt | null = null;
  if (parsed.data.storageKey || parsed.data.mimeType) {
    if (!parsed.data.storageKey || !parsed.data.mimeType) {
      return { ok: false, error: "The portfolio upload receipt is incomplete." };
    }
    verifiedUpload = verifyPortfolioUpload(parsed.data.storageKey, user.id);
    if (
      !verifiedUpload
      || parsed.data.mimeType !== verifiedUpload.mimeType
      || !hasOwnerStoragePrefix(user.id, verifiedUpload.storageKey)
      || !verifiedUpload.storageKey.startsWith(`${user.id}/portfolio/`)
    ) return { ok: false, error: "The portfolio upload receipt is not valid." };

    const bucket = supabase.storage.from(PORTFOLIO_BUCKET);
    const { data: storedObject, error: infoError } = await bucket.info(verifiedUpload.storageKey);
    const storedMime = storedObject?.contentType?.split(";", 1)[0]?.trim().toLowerCase();
    if (
      infoError
      || storedObject?.id !== verifiedUpload.objectId
      || storedObject?.version !== verifiedUpload.objectVersion
      || Number(storedObject?.size) !== verifiedUpload.size
      || storedMime !== verifiedUpload.mimeType
    ) return { ok: false, error: "The stored portfolio file no longer matches its upload receipt." };

    const { data: storedFile, error: downloadError } = await bucket.download(verifiedUpload.storageKey);
    if (downloadError || !storedFile) {
      return { ok: false, error: "The stored portfolio file could not be verified." };
    }
    const storedBytes = new Uint8Array(await storedFile.arrayBuffer());
    const storedSha256 = createHash("sha256").update(storedBytes).digest("hex");
    const validation = validateUpload("portfolioFile", {
      name: verifiedUpload.storageKey,
      mimeType: verifiedUpload.mimeType,
      size: storedBytes.byteLength,
      bytes: storedBytes,
    });
    if (
      !validation.ok
      || storedSha256 !== verifiedUpload.sha256
      || validation.value.mimeType !== verifiedUpload.mimeType
      || validation.value.size !== verifiedUpload.size
      || !verifiedUpload.storageKey.endsWith(`.${validation.value.extension}`)
    ) return { ok: false, error: "The stored portfolio file did not pass format verification." };
  }

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id")
    .eq("id", parsed.data.portfolioId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!portfolio) return { ok: false, error: "Portfolio not found." };

  const itemMetadata = { ...(parsed.data.metadata ?? {}) };
  delete itemMetadata.uploadIntegrity;

  const { error } = await supabase.from("portfolio_items").insert({
    owner_id: user.id,
    portfolio_id: parsed.data.portfolioId,
    title: parsed.data.title,
    reflection_text: parsed.data.reflectionText?.trim() || null,
    storage_bucket: verifiedUpload ? PORTFOLIO_BUCKET : "note-docs",
    storage_key: verifiedUpload?.storageKey ?? null,
    mime_type: verifiedUpload?.mimeType ?? null,
    metadata: {
      ...itemMetadata,
      ...(verifiedUpload ? {
        uploadIntegrity: {
          algorithm: "sha256",
          digest: verifiedUpload.sha256,
          storageKey: verifiedUpload.storageKey,
          objectId: verifiedUpload.objectId,
          objectVersion: verifiedUpload.objectVersion,
        },
      } : {}),
    } as Json,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portfolio");
  return { ok: true };
}
