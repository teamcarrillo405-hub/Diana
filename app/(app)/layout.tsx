import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile, profileBodyClass } from "@/lib/profile";
import { OverwhelmedButton } from "@/components/overwhelmed-button";
import { QuickCapture } from "@/components/quick-capture";
import { PlatformAnalyticsTracker } from "@/components/platform-analytics-tracker";
import { PwaRuntime } from "@/components/pwa-runtime";
import { SessionHandoffTracker } from "@/components/session-handoff-tracker";
import { AgentFab } from "@/components/agent-fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  if (profile && !profile.onboarded_at) redirect("/onboarding");

  return (
    <div className={`diana-app-shell flex min-h-dvh ${profileBodyClass(profile)}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main-content" className="app-field diana-authenticated-field flex-1 pb-24 md:pb-6">
          <div className="app-command-frame app-command-frame--flush min-w-0">
            {children}
            <div className="diana-mobile-command mt-8 border border-border bg-surface-raised/92 p-3 backdrop-blur md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <QuickCapture placement="inline" />
                <OverwhelmedButton placement="inline" />
              </div>
            </div>
          </div>
        </main>
        <div className="hidden md:block">
          <QuickCapture />
          <OverwhelmedButton />
        </div>
        <PlatformAnalyticsTracker />
        <SessionHandoffTracker />
        <PwaRuntime />
        {profile?.age_bracket !== "under_13" && <AgentFab />}
      </div>
    </div>
  );
}
