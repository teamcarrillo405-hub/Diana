import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="space-y-8">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm text-accent">
            <span className="size-2 rounded-full bg-accent" />
            For students with ADHD
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Help with school that doesn&apos;t shame you.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Diana sits beside you while you do the work. It doesn&apos;t do the work for you, doesn&apos;t lecture, and never pings you on weekends.
          </p>
        </header>

        <ul className="space-y-3 text-fg/90">
          <li>One next thing on your screen, not a list of twenty.</li>
          <li>A checklist before you click submit, so nothing slips.</li>
          <li>A clear way to ask &ldquo;is this on the rubric?&rdquo; without asking the teacher.</li>
        </ul>

        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:opacity-90"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-3 font-medium hover:bg-card"
          >
            I already have an account
          </Link>
        </div>

        <p className="text-xs text-muted">
          Signup requires a date of birth. Users under 13 cannot use the AI features.
        </p>
      </div>
    </main>
  );
}
