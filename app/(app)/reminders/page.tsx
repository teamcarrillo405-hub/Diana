import Link from "next/link";

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      <h1 className="text-2xl font-bold">Reminders</h1>
      <p className="text-sm text-muted">
        Reminders live on your dashboard. When something is due soon, or is still open,
        you will see it at the top.
      </p>
      <p className="text-sm text-muted">
        Diana stays quiet between 8 PM and 7 AM, and on weekends — unless something is still open beyond its due date.
      </p>
      <Link
        href="/dashboard"
        className="inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Open dashboard
      </Link>
    </div>
  );
}
