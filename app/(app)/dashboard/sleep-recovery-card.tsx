import Link from "next/link";

export function SleepRecoveryCard({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">Sleep + recovery</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <Link href="/wellness" className="mt-2 inline-block text-sm text-accent hover:underline">
        Update sleep log
      </Link>
    </section>
  );
}
