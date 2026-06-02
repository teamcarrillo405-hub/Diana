import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-bg px-4 py-10 text-fg">
      <div className="mx-auto max-w-md space-y-5">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Offline</p>
          <h1 className="text-2xl font-bold">Diana is ready locally</h1>
          <p className="text-sm text-muted">
            Visited pages, queued note edits, assignment status changes, and flashcard reviews can sync when the connection returns.
          </p>
        </header>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <Link href="/dashboard" className="text-accent underline-offset-2 hover:underline">
            Back to Focus
          </Link>
        </div>
      </div>
    </main>
  );
}
