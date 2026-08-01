import Link from "next/link";

export default function OfflinePage() {
  return (
    <main id="main-content" className="app-field min-h-dvh px-4 py-10 text-fg">
      <div className="diana-panel mx-auto max-w-md space-y-5 p-6">
        <header className="space-y-2">
          <p className="diana-kicker text-xs font-semibold uppercase tracking-wider text-muted">Offline</p>
          <h1 className="text-display">Diana is ready locally</h1>
          <p className="text-sm text-muted">
            Visited pages, queued note edits, assignment status changes, and flashcard reviews can sync when the connection returns.
          </p>
        </header>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <Link href="/dashboard" className="diana-button diana-button-secondary inline-flex">
            Back to Focus
          </Link>
        </div>
      </div>
    </main>
  );
}
