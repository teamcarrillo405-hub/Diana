import Link from "next/link";

export default function OnboardingDonePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <p className="text-5xl">✓</p>
        <h1 className="text-3xl font-bold">Diana is ready for you.</h1>
        <p className="text-muted">
          Your settings are saved. You can adjust anything in Settings later.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-lg bg-accent px-6 py-3 font-medium text-white hover:opacity-90"
      >
        Let&apos;s go
      </Link>
    </main>
  );
}
