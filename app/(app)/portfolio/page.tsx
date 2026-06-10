import { createClient } from "@/lib/supabase/server";
import { PortfolioClient } from "./portfolio-client";
import { canvaEnv, listCanvaDesigns, type CanvaDesign } from "@/lib/integrations/canva";
import { getValidCanvaToken } from "@/lib/integrations/canva-server";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("portfolios")
    .select("id, title, description, portfolio_items(id, title, reflection_text, storage_key, storage_bucket, mime_type, position, created_at)")
    .order("created_at", { ascending: false });

  const portfolios = await Promise.all((rows ?? []).map(async (portfolio) => {
    const items = await Promise.all(((portfolio.portfolio_items ?? []) as Array<{
      id: string;
      title: string;
      reflection_text: string | null;
      storage_key: string | null;
      storage_bucket: string;
      mime_type: string | null;
      position: number;
      created_at: string;
    }>)
      .sort((a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at))
      .map(async (item) => {
        let signedUrl: string | null = null;
        if (item.storage_key && item.mime_type?.startsWith("image/")) {
          const { data } = await supabase.storage
            .from(item.storage_bucket || "note-docs")
            .createSignedUrl(item.storage_key, 60 * 30);
          signedUrl = data?.signedUrl ?? null;
        }
        return {
          id: item.id,
          title: item.title,
          reflection_text: item.reflection_text,
          mime_type: item.mime_type,
          signedUrl,
        };
      }));
    return {
      id: portfolio.id,
      title: portfolio.title,
      description: portfolio.description,
      items,
    };
  }));

  // Recent Canva designs — shown read-only when the student linked Canva.
  // Failure or no connection just hides the strip.
  let canvaDesigns: CanvaDesign[] = [];
  if (canvaEnv()) {
    try {
      const token = await getValidCanvaToken(supabase);
      if (token) canvaDesigns = await listCanvaDesigns(token, 8);
    } catch {
      canvaDesigns = [];
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted">Collect creative work with process notes.</p>
      </header>

      {canvaDesigns.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Your recent Canva designs
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {canvaDesigns.map((design) => (
              <li key={design.id}>
                <a
                  href={design.editUrl ?? design.viewUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-2xl border border-border bg-card transition hover:bg-surface-soft"
                >
                  {design.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external Canva CDN thumbnail
                    <img src={design.thumbnailUrl} alt="" className="h-28 w-full object-cover" />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-brand/5 text-2xl text-brand">✦</div>
                  )}
                  <p className="truncate px-3 py-2 text-sm font-medium">{design.title}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PortfolioClient portfolios={portfolios} />
    </div>
  );
}
