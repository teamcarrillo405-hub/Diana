import { redirect } from "next/navigation";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { canvaEnv } from "@/lib/integrations/canva";
import { isCanvaConnected } from "@/lib/integrations/canva-server";
import { createClient } from "@/lib/supabase/server";

import { PortfolioClient } from "./portfolio-client";

const PORTFOLIO_STYLES = `
  .diana-app-shell:has(.sd-portfolio-gallery) .agent-fab-anchor,
  .app-command-frame:has(.sd-portfolio-gallery) .diana-mobile-command { display: none !important; }
  .app-command-frame:has(.sd-portfolio-gallery) { padding: 0 !important; }
  .diana-app:has(.sd-portfolio-gallery) nextjs-portal { display: none !important; }
  .sd-portfolio-gallery { min-height: max(100dvh, 852px); font-family: var(--font-body); background: #0b1428; }
  .sd-portfolio-shell { display: flex; min-height: max(100dvh, 852px); flex-direction: column; }
  .sd-portfolio-scroll { flex: 1; padding: 27px 20px 28px; background: radial-gradient(circle at 95% 3%, rgb(255 121 218 / .12), transparent 27%), #0b1428; }
  .sd-portfolio-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .sd-portfolio-header .sd-source-wordmark { height: 18px; }
  .sd-portfolio-share { display: grid; width: 39px; height: 39px; place-items: center; border: 1px solid rgb(255 255 255 / .13); border-radius: 50%; color: #f8fafc; text-decoration: none; }
  .sd-portfolio-title { margin: 27px 0 18px; font-family: var(--font-display); font-size: 42px; font-style: italic; font-weight: 950; letter-spacing: -.06em; line-height: .88; text-transform: uppercase; }
  .sd-portfolio-title span { display: block; color: #ff79da; }
  .sd-portfolio-status { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 19px; color: #71809c; font-size: 9px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
  .sd-portfolio-canva { display: inline-flex; align-items: center; gap: 5px; color: #74c0ff; text-decoration: none; }
  .sd-portfolio-filters { display: flex; gap: 8px; overflow-x: auto; margin: 0 -20px 18px; padding: 0 20px 2px; scrollbar-width: none; }
  .sd-portfolio-filter { flex: 0 0 auto; border: 1px solid rgb(255 255 255 / .12); border-radius: 999px; background: rgb(255 255 255 / .03); padding: 8px 13px; color: #94a3b8; font: inherit; font-size: 9px; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; }
  .sd-portfolio-filter[aria-pressed="true"] { border-color: rgb(255 121 218 / .45); background: rgb(255 121 218 / .12); color: #ff79da; }
  .sd-portfolio-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 19px 12px; }
  .sd-portfolio-card { min-width: 0; }
  .sd-portfolio-open { position: relative; display: block; width: 100%; overflow: hidden; border: 1px solid rgb(255 255 255 / .12); border-radius: 17px; background: #151f35; padding: 0; color: inherit; text-align: left; }
  .sd-portfolio-thumb { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
  .sd-portfolio-ring { position: absolute; top: 8px; right: 8px; width: 41px; height: 41px; object-fit: contain; filter: drop-shadow(0 4px 8px rgb(0 0 0 / .5)); }
  .sd-portfolio-card-copy { padding-top: 9px; }
  .sd-portfolio-card h2 { overflow: hidden; margin: 0; color: #f8fafc; font-family: var(--font-display); font-size: 14px; font-style: italic; font-weight: 900; letter-spacing: -.025em; line-height: 1.1; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .sd-portfolio-card p { margin: 5px 0 0; color: #71809c; font-size: 8px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
  .sd-portfolio-empty { grid-column: 1 / -1; border: 1px dashed rgb(148 163 184 / .25); border-radius: 18px; padding: 26px 20px; text-align: center; }
  .sd-portfolio-empty h2 { margin: 0; font-family: var(--font-display); font-size: 20px; font-style: italic; text-transform: uppercase; }
  .sd-portfolio-empty p { margin: 8px auto 0; max-width: 28ch; color: #94a3b8; font-size: 12px; line-height: 1.5; }
  .sd-portfolio-add { margin-top: 24px; border: 1px solid rgb(116 192 255 / .16); border-radius: 17px; background: #121d31; }
  .sd-portfolio-add > summary { cursor: pointer; padding: 15px 16px; color: #74c0ff; font-size: 10px; font-weight: 950; letter-spacing: .13em; list-style: none; text-transform: uppercase; }
  .sd-portfolio-form { display: grid; gap: 11px; border-top: 1px solid rgb(255 255 255 / .07); padding: 15px; }
  .sd-portfolio-form h2 { margin: 2px 0 0; color: #ff79da; font-size: 9px; font-weight: 950; letter-spacing: .14em; text-transform: uppercase; }
  .sd-portfolio-form label { display: grid; gap: 5px; color: #94a3b8; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
  .sd-portfolio-form input, .sd-portfolio-form textarea, .sd-portfolio-form select { min-width: 0; border: 1px solid rgb(255 255 255 / .12); border-radius: 12px; background: #0b1428; padding: 11px 12px; color: #f8fafc; font: inherit; font-size: 12px; letter-spacing: 0; text-transform: none; }
  .sd-portfolio-form button { min-height: 42px; border: 0; border-radius: 13px; background: #74c0ff; color: #0b1428; font: inherit; font-size: 11px; font-style: italic; font-weight: 950; text-transform: uppercase; }
  .sd-portfolio-form button:disabled { opacity: .45; }
  .sd-portfolio-upload { display: flex !important; min-height: 44px; align-items: center; gap: 8px; border: 1px dashed rgb(116 192 255 / .25); border-radius: 12px; padding: 11px 12px; }
  .sd-portfolio-message { margin: 0; color: #fbbf24; font-size: 11px; line-height: 1.4; }
  .sd-portfolio-dialog-backdrop { position: fixed; z-index: 90; inset: 0; display: grid; place-items: end center; background: rgb(2 6 23 / .77); padding: 18px; }
  .sd-portfolio-dialog { width: min(357px, 100%); max-height: min(80dvh, 680px); overflow-y: auto; border: 1px solid rgb(255 121 218 / .25); border-radius: 24px; background: #111c31; box-shadow: 0 22px 80px rgb(0 0 0 / .55); }
  .sd-portfolio-dialog-media { width: 100%; max-height: 310px; object-fit: cover; border-radius: 23px 23px 0 0; }
  .sd-portfolio-dialog-copy { padding: 18px; }
  .sd-portfolio-dialog-copy h2 { margin: 0; font-family: var(--font-display); font-size: 25px; font-style: italic; text-transform: uppercase; }
  .sd-portfolio-dialog-copy p { margin: 11px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
  .sd-portfolio-dialog-actions { display: grid; grid-template-columns: 1fr auto; gap: 9px; margin-top: 17px; }
  .sd-portfolio-dialog-actions a, .sd-portfolio-dialog-actions button { display: inline-flex; min-height: 43px; align-items: center; justify-content: center; border-radius: 13px; padding: 0 14px; font: inherit; font-size: 10px; font-style: italic; font-weight: 950; text-decoration: none; text-transform: uppercase; }
  .sd-portfolio-dialog-actions a { background: #ff79da; color: #0b1428; }
  .sd-portfolio-dialog-actions button { border: 1px solid rgb(255 255 255 / .14); background: transparent; color: #f8fafc; }
  .sd-portfolio-gallery .sd-student-bottom-nav { position: sticky; bottom: 0; }
  @media (min-width: 700px) { .sd-portfolio-dialog-backdrop { place-items: center; } }
`;

type PortfolioItemRow = {
  id: string;
  title: string;
  reflection_text: string | null;
  storage_key: string | null;
  mime_type: string | null;
  position: number;
  created_at: string;
};

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("portfolios")
    .select(
      "id, title, description, portfolio_items(id, title, reflection_text, storage_key, mime_type, position, created_at)",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const portfolios = (rows ?? []).map((portfolio) => ({
    id: portfolio.id,
    title: portfolio.title,
    description: portfolio.description,
    items: ((portfolio.portfolio_items ?? []) as PortfolioItemRow[])
      .sort((a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at))
      .map((item) => ({
        id: item.id,
        title: item.title,
        reflection_text: item.reflection_text,
        mime_type: item.mime_type,
        hasStoredFile: Boolean(item.storage_key),
        created_at: item.created_at,
      })),
  }));

  let canvaState: "connected" | "disconnected" | "unavailable" = "unavailable";
  if (canvaEnv()) {
    canvaState = (await isCanvaConnected(supabase).catch(() => false))
      ? "connected"
      : "disconnected";
  }

  return (
    <ScreenDesignViewport className="sd-portfolio-gallery">
      <style>{PORTFOLIO_STYLES}</style>
      <PortfolioClient portfolios={portfolios} canvaState={canvaState} />
    </ScreenDesignViewport>
  );
}
