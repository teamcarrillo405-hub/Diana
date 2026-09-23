import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { displayNotificationPrefs, displayVerbosity } from "@/lib/privacy/export";
import { createClient } from "@/lib/supabase/server";

import { inventoryForUser } from "./actions";
import { PrivacyDashboard } from "./privacy-dashboard";

const PRIVACY_STYLES = `
  .diana-app-shell:has(.sd-privacy-export) .agent-fab-anchor,
  .app-command-frame:has(.sd-privacy-export) .diana-mobile-command { display: none !important; }
  .app-command-frame:has(.sd-privacy-export) { padding: 0 !important; }
  .diana-app:has(.sd-privacy-export) nextjs-portal { display: none !important; }
  .diana-app:has(.sd-privacy-export) .skip-link { transition: none; }
  .diana-app:has(.sd-privacy-export) .skip-link:focus { transform: translateY(0) !important; }
  .sd-privacy-export { min-height: max(100dvh, 852px); font-family: var(--font-body); background: #0b1428; }
  .sd-privacy-shell { display: flex; min-height: max(100dvh, 852px); flex-direction: column; }
  .sd-privacy-scroll { flex: 1; padding: 25px 20px 30px; background: radial-gradient(circle at 92% 2%, rgb(116 192 255 / .11), transparent 27%), #0b1428; }
  .sd-privacy-header { display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; }
  .sd-privacy-back { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgb(255 255 255 / .13); border-radius: 50%; color: #f8fafc; }
  .sd-privacy-header .sd-source-wordmark { justify-self: center; height: 18px; }
  .sd-privacy-title { margin: 25px 0 4px; font-family: var(--font-display); font-size: 39px; font-style: italic; font-weight: 950; letter-spacing: -.055em; line-height: .9; text-transform: uppercase; }
  .sd-privacy-title span { display: block; color: #74c0ff; }
  .sd-privacy-subtitle { margin: 11px 0 22px; color: #71809c; font-size: 9px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
  .sd-privacy-message { margin: 0 0 12px; border: 1px solid rgb(251 191 36 / .28); border-radius: 12px; background: rgb(251 191 36 / .08); padding: 10px 12px; color: #fbbf24; font-size: 11px; line-height: 1.4; }
  .sd-privacy-section-label { margin: 0 0 10px; color: #ff79da; font-size: 9px; font-weight: 950; letter-spacing: .17em; text-transform: uppercase; }
  .sd-privacy-export-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  .sd-privacy-export-card { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 12px; align-items: center; border: 1px solid rgb(255 255 255 / .11); border-radius: 17px; background: #151f35; padding: 14px; }
  .sd-privacy-export-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: rgb(116 192 255 / .1); color: #74c0ff; }
  .sd-privacy-export-copy { min-width: 0; }
  .sd-privacy-export-card h2 { margin: 0 0 4px; font-family: var(--font-display); font-size: 14px; font-style: italic; font-weight: 900; text-transform: uppercase; }
  .sd-privacy-export-card p { margin: 0; color: #71809c; font-size: 8px; line-height: 1.4; }
  .sd-privacy-export-card button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 11px; background: #74c0ff; padding: 0 12px; color: #0b1428; font: inherit; font-size: 8px; font-style: italic; font-weight: 950; white-space: nowrap; text-transform: uppercase; }
  .sd-privacy-export-card button:disabled { opacity: .5; }
  .sd-privacy-panel { margin-top: 17px; border: 1px solid rgb(45 212 191 / .22); border-radius: 18px; background: rgb(45 212 191 / .055); padding: 15px; }
  .sd-privacy-panel-title { display: flex; align-items: center; gap: 8px; margin: 0 0 13px; color: #2dd4bf; font-size: 9px; font-weight: 950; letter-spacing: .15em; text-transform: uppercase; }
  .sd-privacy-status { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 1px solid rgb(255 255 255 / .07); }
  .sd-privacy-status:first-of-type { border-top: 0; }
  .sd-privacy-status strong { display: block; color: #f8fafc; font-size: 11px; }
  .sd-privacy-status span { display: block; margin-top: 3px; color: #71809c; font-size: 9px; }
  .sd-privacy-pill { flex: 0 0 auto; border: 1px solid rgb(45 212 191 / .25); border-radius: 999px; background: rgb(45 212 191 / .08); padding: 6px 8px; color: #2dd4bf !important; font-size: 8px !important; font-weight: 950; letter-spacing: .07em; text-transform: uppercase; }
  .sd-privacy-advanced { margin-top: 17px; border: 1px solid rgb(255 255 255 / .1); border-radius: 17px; background: #121d31; }
  .sd-privacy-advanced > summary { cursor: pointer; padding: 15px; color: #94a3b8; font-size: 9px; font-weight: 950; letter-spacing: .12em; list-style: none; text-transform: uppercase; }
  .sd-privacy-controls { display: grid; gap: 14px; border-top: 1px solid rgb(255 255 255 / .07); padding: 15px; }
  .sd-privacy-control { display: grid; gap: 9px; border-bottom: 1px solid rgb(255 255 255 / .07); padding-bottom: 14px; }
  .sd-privacy-control:last-child { border-bottom: 0; padding-bottom: 0; }
  .sd-privacy-control h2 { margin: 0; color: #f8fafc; font-family: var(--font-display); font-size: 14px; font-style: italic; text-transform: uppercase; }
  .sd-privacy-control p { margin: 0; color: #94a3b8; font-size: 10px; line-height: 1.45; }
  .sd-privacy-control label { display: flex; align-items: flex-start; gap: 8px; color: #cbd5e1; font-size: 10px; line-height: 1.4; }
  .sd-privacy-control input:not([type="checkbox"]), .sd-privacy-control select { min-width: 0; width: 100%; border: 1px solid rgb(255 255 255 / .12); border-radius: 11px; background: #0b1428; padding: 10px 11px; color: #f8fafc; font: inherit; font-size: 11px; }
  .sd-privacy-control button, .sd-privacy-control .sd-privacy-file { display: inline-flex; min-height: 39px; align-items: center; justify-content: center; gap: 7px; border: 1px solid rgb(116 192 255 / .25); border-radius: 11px; background: rgb(116 192 255 / .08); padding: 9px 11px; color: #74c0ff; font: inherit; font-size: 9px; font-weight: 950; text-transform: uppercase; }
  .sd-privacy-control button:disabled { opacity: .45; }
  .sd-privacy-inventory { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
  .sd-privacy-inventory div { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-radius: 9px; background: rgb(255 255 255 / .035); padding: 8px; color: #94a3b8; font-size: 8px; }
  .sd-privacy-inventory strong { color: #f8fafc; font-size: 10px; }
  .sd-privacy-delete { border: 1px solid rgb(251 191 36 / .25); border-radius: 13px; background: rgb(251 191 36 / .06); padding: 12px; }
  .sd-privacy-delete button { border-color: rgb(251 191 36 / .35); background: rgb(251 191 36 / .12); color: #fbbf24; }
  .sd-privacy-export .sd-student-bottom-nav { position: sticky; bottom: 0; }
`;

export default async function ExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: classes },
    { data: handoff },
    { count: activeShareCount },
    { data: deletionRequest },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("ai_verbosity_by_subject, notification_preferences, timezone")
      .eq("user_id", user.id)
      .single(),
    supabase.from("classes").select("id, name").eq("owner_id", user.id).order("name"),
    supabase
      .from("session_handoffs")
      .select("route, updated_at")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("share_links")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("data_deletion_requests")
      .select("status, requested_at")
      .eq("owner_id", user.id)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const inventory = await inventoryForUser(user.id);

  return (
    <ScreenDesignViewport className="sd-privacy-export">
      <style>{PRIVACY_STYLES}</style>
      <div className="sd-privacy-shell">
        <main className="sd-privacy-scroll">
          <header className="sd-privacy-header">
            <Link href="/settings" className="sd-privacy-back" aria-label="Back to settings">
              <ArrowLeft size={17} aria-hidden="true" />
            </Link>
            <DianaWordmark />
            <span aria-hidden="true" />
          </header>
          <h1 className="sd-privacy-title">
            Front <span>office</span>
          </h1>
          <p className="sd-privacy-subtitle">Data inventory and privacy hub</p>
          <PrivacyDashboard
            inventory={inventory}
            notificationPrefs={displayNotificationPrefs(profile?.notification_preferences)}
            timezone={profile?.timezone ?? "UTC"}
            handoff={handoff ?? null}
            activeShareCount={activeShareCount ?? 0}
            deletionStatus={deletionRequest?.status ?? null}
            classes={(classes ?? []).map((klass) => ({
              id: klass.id,
              name: klass.name,
              verbosity: displayVerbosity(profile?.ai_verbosity_by_subject, klass.id),
            }))}
          />
        </main>
        <StudentBottomNav />
      </div>
    </ScreenDesignViewport>
  );
}
