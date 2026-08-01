"use server";

import { revalidatePath } from "next/cache";

import {
  LANDING_PAGE_SLUG,
  landingPageConfigSchema,
} from "@/lib/landing-page/config";
import { requireLandingPageEditorUser } from "@/lib/landing-page/require-editor";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/types";

export type LandingEditorActionResult =
  | {
      ok: true;
      savedAt: string;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function saveLandingPageDraft(
  input: unknown,
): Promise<LandingEditorActionResult> {
  const parsed = landingPageConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Review the page settings and try again.",
    };
  }

  try {
    const user = await requireLandingPageEditorUser();
    const service = createServiceClient();
    if (!service) {
      return {
        ok: false,
        error: "Supabase editor storage is not configured.",
      };
    }

    const savedAt = new Date().toISOString();
    const { error } = await service.from("landing_page_drafts").upsert(
      {
        slug: LANDING_PAGE_SLUG,
        config: parsed.data as unknown as Json,
        updated_by: user.id,
        updated_at: savedAt,
      },
      { onConflict: "slug" },
    );

    if (error) {
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      savedAt,
      message: "Draft saved.",
    };
  } catch {
    return {
      ok: false,
      error: "Landing page editor access is not available.",
    };
  }
}

export async function publishLandingPage(
  input: unknown,
): Promise<LandingEditorActionResult> {
  const parsed = landingPageConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Review the page settings and try again.",
    };
  }

  try {
    const user = await requireLandingPageEditorUser();
    const service = createServiceClient();
    if (!service) {
      return {
        ok: false,
        error: "Supabase editor storage is not configured.",
      };
    }

    const savedAt = new Date().toISOString();
    const config = parsed.data as unknown as Json;
    const publication = await service
      .from("landing_page_publications")
      .upsert(
        {
          slug: LANDING_PAGE_SLUG,
          config,
          published_by: user.id,
          published_at: savedAt,
        },
        { onConflict: "slug" },
      );

    if (publication.error) {
      return { ok: false, error: publication.error.message };
    }

    const draft = await service.from("landing_page_drafts").upsert(
      {
        slug: LANDING_PAGE_SLUG,
        config,
        updated_by: user.id,
        updated_at: savedAt,
      },
      { onConflict: "slug" },
    );

    if (draft.error) {
      return { ok: false, error: draft.error.message };
    }

    revalidatePath("/");
    return {
      ok: true,
      savedAt,
      message: "Landing page published.",
    };
  } catch {
    return {
      ok: false,
      error: "Landing page editor access is not available.",
    };
  }
}
