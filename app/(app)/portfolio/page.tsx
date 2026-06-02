import { createClient } from "@/lib/supabase/server";
import { PortfolioClient } from "./portfolio-client";

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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted">Collect creative work with process notes.</p>
      </header>
      <PortfolioClient portfolios={portfolios} />
    </div>
  );
}
