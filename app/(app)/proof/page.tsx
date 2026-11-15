import { ArrowRight } from "lucide-react";
import { StudentShell } from "@/components/student-shell/student-shell";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import { SelectionCollection, type CollectionItem } from "@/components/student-shell/selection-collection";
import styles from "@/components/student-shell/collection.module.css";
import support from "@/components/student-shell/support.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import {
  selectLatestProofMilestone,
  type CompletedProofRow,
} from "./proof-state";

type AuthorshipRow = {
  id: string;
  assignment_id: string | null;
  actor: string;
  event_type: string;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  title: string;
  artifact_type: string;
  source_anchor_count: number;
  created_at: string;
};

type ShowcaseItemRow = {
  id: string;
  title: string;
  reflection_text: string | null;
  created_at: string;
};

type ShowcasePortfolioRow = {
  title: string;
  portfolio_items: ShowcaseItemRow[] | null;
};

export default async function ProofPage({
  searchParams,
}: {
  searchParams: Promise<{ celebrate?: string; sdState?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: completed, error: completedError }, { data: authorship }, { data: artifacts, error: artifactsError }, { data: showcasePortfolios, error: showcaseError }] =
    await Promise.all([
      supabase
        .from("task_signals")
        .select("id, occurred_at, assignments(id, title, kind)")
        .eq("owner_id", user.id)
        .eq("kind", "completed")
        .order("occurred_at", { ascending: false })
        .limit(8),
      supabase
        .from("authorship_log")
        .select("id, assignment_id, actor, event_type, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("study_artifacts")
        .select("id, title, artifact_type, source_anchor_count, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("portfolios")
        .select("title, portfolio_items(id, title, reflection_text, created_at)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const unavailable = completedError || artifactsError || showcaseError;
  const completedRows = (completed ?? []) as unknown as CompletedProofRow[];
  const authorshipRows = (authorship ?? []) as AuthorshipRow[];
  const artifactRows = (artifacts ?? []) as ArtifactRow[];
  const showcaseWeeks = groupShowcaseByWeek(
    ((showcasePortfolios ?? []) as unknown as ShowcasePortfolioRow[]).flatMap((portfolio) =>
      (portfolio.portfolio_items ?? []).map((item) => ({
        ...item,
        portfolioTitle: portfolio.title,
      })),
    ),
  );
  const requested =
    params.celebrate === "latest" || params.sdState === "celebrate=latest";
  const milestone = selectLatestProofMilestone({
    requested,
    completed: completedRows,
    authorship: authorshipRows,
  });

  const profile = await loadProfile();
  const workItems: CollectionItem[] = completedRows.flatMap(row => {
    const assignment = Array.isArray(row.assignments) ? row.assignments[0] : row.assignments;
    if (!assignment?.id || !assignment.title) return [];
    return [{ id: String(row.id), title: assignment.title, meta: `${formatKind(assignment.kind ?? "Assignment")} · ${formatDate(row.occurred_at)}`, content: <div className={styles.actions}><Link className={styles.primary} href={`/assignments/${assignment.id}`}>Open work</Link></div> }];
  });
  return <StudentShell active="More" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}>
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}><h1>Record</h1><Link href="/sharing">Sharing</Link></header>
      {milestone ? <p role="status" className={styles.notice}>Completed: {milestone.title}. Your work is saved.</p> : null}
      {unavailable ? <p role="status">Some records could not load. <Link href="/proof">Try again</Link></p> : null}
      <SectionTabs id="record" label="Record sections" sections={[
        {id:"work",label:"Completed work",content:<SelectionCollection label="Completed work" items={workItems} empty={<><h2>No completed work yet</h2><Link href="/assignments">Open Work</Link></>} />},
        {id:"practice",label:"Saved practice",content:<div className={support.results}>{artifactRows.map(artifact=><Link key={artifact.id} href={`/study-artifacts/${artifact.id}`}><span><strong>{artifact.title}</strong><small>{artifact.artifact_type === "study_guide" ? "Guide" : "Quiz"} · {formatDate(artifact.created_at)}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>)}<Link href="/study?view=saved">All saved practice<ArrowRight size={18} aria-hidden="true" /></Link></div>},
        {id:"showcase",label:"Showcase",content:<div className={support.results}>{showcaseWeeks.length ? showcaseWeeks.map(week=><section key={week.key}><h2>{week.label}</h2>{week.items.map(item=><details key={item.id}><summary>{item.title}</summary><p>{item.portfolioTitle}</p><p>{item.reflection_text || "No reflection saved."}</p></details>)}</section>) : <p>No showcase work saved yet.</p>}</div>},
      ]} />
    </main>
  </StudentShell>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatKind(value: string): string {
  return value.replaceAll("_", " ");
}

function groupShowcaseByWeek(
  items: Array<ShowcaseItemRow & { portfolioTitle: string }>,
): Array<{
  key: string;
  label: string;
  items: Array<ShowcaseItemRow & { portfolioTitle: string }>;
}> {
  const weeks = new Map<string, Array<ShowcaseItemRow & { portfolioTitle: string }>>();

  for (const item of items.sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const date = new Date(item.created_at);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const key = date.toISOString().slice(0, 10);
    const group = weeks.get(key) ?? [];
    group.push(item);
    weeks.set(key, group);
  }

  return [...weeks.entries()].map(([key, groupedItems]) => ({
    key,
    label: `Week of ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(`${key}T12:00:00`))}`,
    items: groupedItems,
  }));
}
