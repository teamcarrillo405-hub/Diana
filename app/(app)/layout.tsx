import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile, profileBodyClass } from "@/lib/profile";
import { BottomNav, SideNav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  if (profile && !profile.onboarded_at) redirect("/onboarding");

  return (
    <div className={`flex min-h-dvh ${profileBodyClass(profile)}`}>
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-20 md:pb-6">
          <div className="mx-auto max-w-2xl px-4 py-6 md:max-w-3xl md:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
