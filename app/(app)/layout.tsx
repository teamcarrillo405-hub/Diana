import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile, profileBodyClass } from "@/lib/profile";
import { BottomNav, SideNav } from "@/components/nav";
import { Fab } from "@/components/fab";
import { OverwhelmedButton } from "@/components/overwhelmed-button";
import { QuickCapture } from "@/components/quick-capture";
import { AccentProvider } from "@/components/accent-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PlatformAnalyticsTracker } from "@/components/platform-analytics-tracker";
import { PwaRuntime } from "@/components/pwa-runtime";
import { SessionHandoffTracker } from "@/components/session-handoff-tracker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  if (profile && !profile.onboarded_at) redirect("/onboarding");

  return (
    <ThemeProvider>
      <div className={`flex min-h-dvh ${profileBodyClass(profile)}`}>
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile bottom padding clears the bottom nav plus the floating
              quick-capture / overwhelmed pills so they never cover the last
              content rows. */}
          <main className="app-field flex-1 pb-44 md:pb-6">
            <div className="mx-auto w-full max-w-2xl min-w-0 px-4 py-6 md:max-w-5xl md:px-8">
              {children}
            </div>
          </main>
          <BottomNav />
          <Fab />
          <QuickCapture />
          <OverwhelmedButton />
          <AccentProvider />
          <PlatformAnalyticsTracker />
          <SessionHandoffTracker />
          <PwaRuntime />
        </div>
      </div>
    </ThemeProvider>
  );
}
