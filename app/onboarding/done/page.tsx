import Link from "next/link";
import { ThemePicker } from "@/components/theme-picker";
import { ThemeProvider } from "@/components/theme-provider";
import { AccentPicker } from "@/components/accent-picker";

export default function OnboardingDonePage() {
  return (
    // ThemeProvider must wrap ThemePicker here — onboarding renders outside
    // the (app) layout, and without the provider the picker is a no-op.
    <ThemeProvider>
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-3">
          <p aria-hidden="true" className="text-5xl text-brand">✦</p>
          <h1 className="text-3xl font-bold">Diana is ready for you.</h1>
          <p className="text-muted">
            Make it yours — pick how Diana looks. You can adjust anything in Settings later.
          </p>
        </div>
        <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">Theme</span>
            <ThemePicker />
          </div>
          <AccentPicker />
        </div>
        <Link
          href="/dashboard"
          className="touch-target rounded-2xl bg-brand px-6 py-3 font-medium text-white hover:bg-brand-strong"
        >
          Let&apos;s go
        </Link>
      </main>
    </ThemeProvider>
  );
}
