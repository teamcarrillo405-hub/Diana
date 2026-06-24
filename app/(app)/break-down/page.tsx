import { BreakDownClient } from "./break-down-client";

export default function Page() {
  return (
    <div className="diana-page space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Task break-down</p>
        <h1 className="text-display">Turn a big prompt into the next visible move</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Built for the moment when the assignment is real but the first move is hard to see.
        </p>
      </header>
      <BreakDownClient />
    </div>
  );
}
