import "server-only";

import {
  cloneLandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG,
  LANDING_PAGE_SLUG,
  parseLandingPageConfig,
  type LandingPageConfig,
} from "@/lib/landing-page/config";
import { createServiceClient } from "@/lib/supabase/service";

export interface LandingPageEditorState {
  draft: LandingPageConfig;
  published: LandingPageConfig;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  storageReady: boolean;
}

export async function getPublishedLandingPageConfig(): Promise<LandingPageConfig> {
  const service = createServiceClient();
  if (!service) return cloneLandingPageConfig();

  const { data } = await service
    .from("landing_page_publications")
    .select("config")
    .eq("slug", LANDING_PAGE_SLUG)
    .maybeSingle();

  return data
    ? parseLandingPageConfig(data.config)
    : cloneLandingPageConfig(DEFAULT_LANDING_PAGE_CONFIG);
}

export async function getLandingPageEditorState(): Promise<LandingPageEditorState> {
  const service = createServiceClient();
  if (!service) {
    const fallback = cloneLandingPageConfig();
    return {
      draft: fallback,
      published: cloneLandingPageConfig(fallback),
      draftUpdatedAt: null,
      publishedAt: null,
      storageReady: false,
    };
  }

  const [draftResult, publicationResult] = await Promise.all([
    service
      .from("landing_page_drafts")
      .select("config, updated_at")
      .eq("slug", LANDING_PAGE_SLUG)
      .maybeSingle(),
    service
      .from("landing_page_publications")
      .select("config, published_at")
      .eq("slug", LANDING_PAGE_SLUG)
      .maybeSingle(),
  ]);

  const storageReady = !draftResult.error && !publicationResult.error;
  const published = publicationResult.data
    ? parseLandingPageConfig(publicationResult.data.config)
    : cloneLandingPageConfig(DEFAULT_LANDING_PAGE_CONFIG);
  const draft = draftResult.data
    ? parseLandingPageConfig(draftResult.data.config)
    : cloneLandingPageConfig(published);

  return {
    draft,
    published,
    draftUpdatedAt: draftResult.data?.updated_at ?? null,
    publishedAt: publicationResult.data?.published_at ?? null,
    storageReady,
  };
}
