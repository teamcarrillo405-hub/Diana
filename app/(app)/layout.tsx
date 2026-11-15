import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile, profileBodyClass } from "@/lib/profile";
import { PlatformAnalyticsTracker } from "@/components/platform-analytics-tracker";
import { PwaRuntime } from "@/components/pwa-runtime";
import { SessionHandoffTracker } from "@/components/session-handoff-tracker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  if (profile?.age_bracket === "under_13") redirect("/");
  if (profile && !profile.onboarded_at) redirect("/onboarding");

  return (
    <div className={`diana-app-shell flex min-h-dvh ${profileBodyClass(profile)}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="app-field diana-authenticated-field flex-1 pb-24 md:pb-6">
          <div className="app-command-frame app-command-frame--flush min-w-0">
            {children}
          </div>
        </div>
        <PlatformAnalyticsTracker />
        <SessionHandoffTracker />
        <PwaRuntime />
      </div>
    </div>
  );
}
