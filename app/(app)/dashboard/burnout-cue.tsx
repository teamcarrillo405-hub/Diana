import Link from "next/link";

export function BurnoutCue({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <section className="rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="text-sm font-medium">Reset cue</p>
      <p className="mt-1 text-sm">{message}</p>
      <Link href="/timer?mode=rough" className="mt-3 inline-block rounded-md border border-amber-500/40 px-3 py-2 text-sm hover:bg-amber-100/60 dark:hover:bg-amber-900/40">
        Start a light block
      </Link>
    </section>
  );
}
