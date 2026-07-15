// Canva (design tool) Connect integration.
//
// Canva is where students MAKE things — posters, slide decks, infographics.
// Diana's job here is removing blank-canvas paralysis: build a design brief
// from the student's own material (assignment, rubric, notes), open a fresh
// draft in their Canva account, and hand them the brief to fill it. The
// thinking stays the student's; Diana removes the empty page.
//
// The Connect API cannot inject arbitrary content into a new design (that
// needs enterprise brand-template autofill), so the honest shape is:
// create the titled draft + give the structured brief alongside.
//
// Activation: requires a (free) Canva developer app. Without CANVA_CLIENT_ID
// and CANVA_CLIENT_SECRET in the environment every surface degrades to
// setup guidance — nothing breaks. See docs/CANVA_SETUP.md.

const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const CANVA_API_BASE = "https://api.canva.com/rest/v1";

export const CANVA_SCOPES = "design:meta:read design:content:write profile:read";

export type CanvaEnv = { clientId: string; clientSecret: string; redirectUri: string };

export function canvaEnv(): CanvaEnv | null {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  const redirectUri =
    process.env.CANVA_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/canva/callback` : null);
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

// ---------------------------------------------------------------------------
// Pure helpers (testable)
// ---------------------------------------------------------------------------

/** Assignments where a design tool is the natural medium. */
export function looksLikeVisualProject(title: string | null | undefined, kind: string | null | undefined): boolean {
  if (kind === "presentation") return true;
  if (!title) return false;
  return /\b(poster|slides?|slideshow|slide deck|infographic|brochure|flyer|storyboard|collage|timeline poster|one[- ]pager)\b/i.test(title);
}

export type DesignBrief = {
  title: string;
  designType: "presentation" | "poster";
  sections: Array<{ heading: string; points: string[] }>;
};

/**
 * A fill-this-in brief from the student's own material. Sections come from
 * rubric criteria first (the teacher's definition of done), then note titles.
 * Deterministic — no AI call, nothing invented.
 */
export function buildDesignBrief(input: {
  assignmentTitle: string;
  description?: string | null;
  rubricCriteria?: string[];
  noteTitles?: string[];
}): DesignBrief {
  const designType: DesignBrief["designType"] = /\b(poster|infographic|one[- ]pager|flyer|brochure|collage)\b/i.test(
    input.assignmentTitle,
  )
    ? "poster"
    : "presentation";

  const sections: DesignBrief["sections"] = [];

  sections.push({
    heading: designType === "poster" ? "Headline" : "Title slide",
    points: [input.assignmentTitle, "Your name and class"],
  });

  for (const criterion of (input.rubricCriteria ?? []).slice(0, 5)) {
    sections.push({
      heading: criterion,
      points: ["Your evidence or example here", "One visual that shows it"],
    });
  }

  if (sections.length === 1) {
    const fromNotes = (input.noteTitles ?? []).slice(0, 4);
    for (const note of fromNotes) {
      sections.push({ heading: note, points: ["Key point in your words", "One supporting detail"] });
    }
  }

  if (sections.length === 1) {
    sections.push(
      { heading: "Main idea", points: ["The one thing your audience should remember"] },
      { heading: "Evidence", points: ["Two facts or examples from class material"] },
      { heading: "Why it matters", points: ["Your own take, one sentence"] },
    );
  }

  sections.push({
    heading: designType === "poster" ? "Sources corner" : "Sources slide",
    points: ["Where your facts came from: Diana's citation tool can format these"],
  });

  return {
    title: input.assignmentTitle.slice(0, 90),
    designType,
    sections,
  };
}

/** The brief as copyable text for pasting into Canva's editor. */
export function briefToClipboardText(brief: DesignBrief): string {
  return brief.sections
    .map((section) => [`## ${section.heading}`, ...section.points.map((p) => `- ${p}`)].join("\n"))
    .join("\n\n");
}

export function buildCanvaAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: CANVA_SCOPES,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });
  return `${CANVA_AUTH_URL}?${params.toString()}`;
}

export type CanvaDesign = {
  id: string;
  title: string;
  editUrl: string | null;
  viewUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: string | null;
};

export function normalizeCanvaDesign(raw: unknown): CanvaDesign | null {
  const design = raw as {
    id?: unknown;
    title?: unknown;
    urls?: { edit_url?: unknown; view_url?: unknown };
    thumbnail?: { url?: unknown };
    updated_at?: unknown;
  };
  if (typeof design?.id !== "string") return null;
  return {
    id: design.id,
    title: typeof design.title === "string" && design.title ? design.title : "Untitled design",
    editUrl: typeof design.urls?.edit_url === "string" ? design.urls.edit_url : null,
    viewUrl: typeof design.urls?.view_url === "string" ? design.urls.view_url : null,
    thumbnailUrl: typeof design.thumbnail?.url === "string" ? design.thumbnail.url : null,
    updatedAt: typeof design.updated_at === "number" ? new Date(design.updated_at * 1000).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Token exchange and API calls (network)
// ---------------------------------------------------------------------------

export type CanvaTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

export async function exchangeCanvaCode(
  env: CanvaEnv,
  code: string,
  codeVerifier: string,
): Promise<CanvaTokens> {
  return tokenRequest(env, {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: env.redirectUri,
  });
}

export async function refreshCanvaToken(env: CanvaEnv, refreshToken: string): Promise<CanvaTokens> {
  return tokenRequest(env, { grant_type: "refresh_token", refresh_token: refreshToken });
}

async function tokenRequest(env: CanvaEnv, body: Record<string, string>): Promise<CanvaTokens> {
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    throw new Error(`Canva token request returned ${res.status}`);
  }
  return (await res.json()) as CanvaTokens;
}

export async function listCanvaDesigns(accessToken: string, limit = 8): Promise<CanvaDesign[]> {
  const res = await fetch(`${CANVA_API_BASE}/designs?limit=${limit}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Canva designs request returned ${res.status}`);
  const data = (await res.json()) as { items?: unknown[] };
  return (data.items ?? [])
    .map(normalizeCanvaDesign)
    .filter((design): design is CanvaDesign => design !== null);
}

export async function createCanvaDesign(
  accessToken: string,
  brief: Pick<DesignBrief, "title" | "designType">,
): Promise<CanvaDesign | null> {
  const res = await fetch(`${CANVA_API_BASE}/designs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      design_type: { type: "preset", name: brief.designType },
      title: brief.title,
    }),
  });
  if (!res.ok) throw new Error(`Canva create design returned ${res.status}`);
  const data = (await res.json()) as { design?: unknown };
  return normalizeCanvaDesign(data.design);
}
