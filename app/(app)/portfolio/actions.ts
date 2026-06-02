"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const PortfolioInput = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  classId: z.string().uuid().nullable().optional(),
});

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
  if (file.size >= 20 * 1024 * 1024) return { ok: false, error: "Files work best under 20 MB." };

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const storageKey = `${user.id}/portfolio-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: file.type || "application/octet-stream" });
  if (error) return { ok: false, error: error.message };

  return { ok: true, storageKey, mimeType: file.type || "application/octet-stream" };
}

const ItemInput = z.object({
  portfolioId: z.string().uuid(),
  title: z.string().min(1).max(160),
  reflectionText: z.string().max(2000).optional(),
  storageKey: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
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

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id")
    .eq("id", parsed.data.portfolioId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!portfolio) return { ok: false, error: "Portfolio not found." };

  const { error } = await supabase.from("portfolio_items").insert({
    owner_id: user.id,
    portfolio_id: parsed.data.portfolioId,
    title: parsed.data.title,
    reflection_text: parsed.data.reflectionText?.trim() || null,
    storage_key: parsed.data.storageKey ?? null,
    mime_type: parsed.data.mimeType ?? null,
    metadata: (parsed.data.metadata ?? {}) as Json,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portfolio");
  return { ok: true };
}
