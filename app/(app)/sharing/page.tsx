import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppTopNav } from "../app-top-nav";
import { ParentSharingView } from "./parent-view";
import { TeacherSharingView } from "./teacher-view";

type SharingTab = "parent" | "teacher";

export default async function SharingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const active: SharingTab = tab === "teacher" ? "teacher" : "parent";

  const tabs: { key: SharingTab; label: string }[] = [
    { key: "parent", label: "Parents" },
    { key: "teacher", label: "Teachers" },
  ];

  return (
    <>
      <AppTopNav active="More" />
      <div className="diana-page space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Sharing</p>
          <h1 className="text-display">Share progress, on your terms</h1>
          <p className="text-sm text-muted">
            Student-controlled views for the people who support you. Pick who you&apos;re sharing with.
          </p>
        </header>

        {/* Tab switcher */}
        <div role="tablist" aria-label="Sharing audience" className="flex gap-2 border-b border-border">
          {tabs.map(({ key, label }) => {
            const isActive = key === active;
            return (
              <Link
                key={key}
                role="tab"
                aria-selected={isActive}
                href={`/sharing?tab=${key}`}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-accent text-fg"
                    : "border-transparent text-muted hover:text-fg"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {active === "teacher" ? <TeacherSharingView /> : <ParentSharingView />}
      </div>
    </>
  );
}
