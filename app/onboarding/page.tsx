import { redirect } from "next/navigation";
import { loadProfile } from "@/lib/profile";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const profile = await loadProfile();
  if (!profile) redirect("/login");
  if (profile.onboarded_at) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted">Welcome</p>
        <h1 className="text-display">Let&apos;s set Diana up for you.</h1>
        <p className="text-sm text-muted">
          Three quick questions. Everything is private to you. You can change any answer later in Settings.
          Nothing here is shared with teachers or parents unless you explicitly turn that on later.
        </p>
      </header>
      <div className="mt-8">
        <OnboardingForm initial={profile} />
      </div>
    </main>
  );
}
