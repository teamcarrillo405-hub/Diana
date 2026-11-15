import { ArrowRight } from "lucide-react";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/collection.module.css";
import support from "@/components/student-shell/support.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  buildSupportSearchResult,
  normalizeSupportSearchQuery,
  parseSupportSearchKind,
  type SupportSearchKind,
  type SupportSearchResult,
} from "@/lib/screendesign/support-screens";
import { createClient } from "@/lib/supabase/server";
import { assignmentDestination } from "@/lib/assignment-navigation";

import type { SearchDirectoryItem } from "./search-directory-results";

const FILTERS: ReadonlyArray<Readonly<{ value: SupportSearchKind; label: string }>> = [
  { value: "all", label: "All" },
  { value: "concepts", label: "Concepts" },
  { value: "work", label: "Work" },
  { value: "notes", label: "Notes" },
  { value: "classes", label: "Classes" },
  { value: "artifacts", label: "Saved practice" },
];

type DesktopSearchItem = SearchDirectoryItem;


const SEARCH_DIRECTORY: ReadonlyArray<DesktopSearchItem & { keywords: string }> = [
  { key: "page-today", title: "Lobby", detail: "Next move and daily check-in", href: "/dashboard", keywords: "home lobby dashboard next move check in" },
  { key: "page-work", title: "Work", detail: "Assignments and captured work", href: "/assignments", keywords: "homework assignments tasks captured" },
  { key: "page-classes", title: "Classes", detail: "Every class in one place", href: "/classes", keywords: "subjects courses teachers" },
  { key: "page-calendar", title: "Calendar", detail: "Month, week, and day schedule", href: "/calendar", keywords: "schedule dates events" },
  { key: "tool-capture", title: "Quick capture", detail: "Add work by text, photo, or voice", href: "/quick-add", keywords: "new assignment add capture photo voice" },
  { key: "tool-record", title: "Record", detail: "Completed work and showcase", href: "/proof", keywords: "proof evidence portfolio completed showcase" },
  { key: "tool-notes", title: "Notes", detail: "Class notes and study context", href: "/notes", keywords: "note write photograph" },
  { key: "tool-study", title: "Quiz", detail: "Saved practice and review tools", href: "/study", keywords: "cards study review memorize" },
  { key: "tool-artifacts", title: "Saved practice", detail: "Guides and saved quizzes", href: "/study?view=saved", keywords: "study guide practice generate" },
  { key: "page-wellness", title: "Wellness", detail: "Energy, sleep, meals, and movement", href: "/wellness", keywords: "health mood exercise" },
  { key: "page-sharing", title: "Sharing", detail: "Weekly parent digest", href: "/sharing", keywords: "parent digest share" },
  { key: "page-settings", title: "Settings", detail: "Profile, accessibility, and account", href: "/settings", keywords: "preferences accessibility profile account" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawQuery = stringParam(params.q);
  const { query, pattern } = normalizeSupportSearchQuery(rawQuery);
  const requestedKind = parseSupportSearchKind(params.type);
  const selectedKind = requestedKind === "concepts" ? "all" : requestedKind;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let notesQuery = supabase
    .from("notes")
    .select("id, title, body_text, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(12);
  let assignmentsQuery = supabase
    .from("assignments")
    .select("id, title, description, status, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(12);
  let classesQuery = supabase
    .from("classes")
    .select("id, name, teacher, updated_at")
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(12);
  let artifactsQuery = supabase
    .from("study_artifacts")
    .select("id, title, artifact_type, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (pattern) {
    notesQuery = notesQuery.ilike("title", pattern);
    assignmentsQuery = assignmentsQuery.ilike("title", pattern);
    classesQuery = classesQuery.ilike("name", pattern);
    artifactsQuery = artifactsQuery.ilike("title", pattern);
  }

  const [
    { data: notes, error: notesError },
    { data: assignments, error: assignmentsError },
    { data: classes, error: classesError },
    { data: artifacts, error: artifactsError },
    { data: profile },
  ] = await Promise.all([
    notesQuery,
    assignmentsQuery,
    classesQuery,
    artifactsQuery,
    supabase
      .from("profiles")
      .select("display_name, photo_url, photo_offset_x, photo_offset_y")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const unavailable = notesError || assignmentsError || classesError || artifactsError;
  const allResults: SupportSearchResult[] = [
    ...(assignments ?? []).map((item) => ({ ...buildSupportSearchResult({
      type: "assignment",
      id: item.id,
      title: item.title,
      detail: item.description || labelize(item.status),
    }), href: assignmentDestination(item.id, item.status) })),
    ...(notes ?? []).map((item) => buildSupportSearchResult({
      type: "note",
      id: item.id,
      title: item.title,
      detail: item.body_text.slice(0, 90) || "Class note",
    })),
    ...(classes ?? []).map((item) => buildSupportSearchResult({
      type: "class",
      id: item.id,
      title: item.name,
      detail: item.teacher || "Class",
    })),
    ...(artifacts ?? []).map((item) => buildSupportSearchResult({
      type: "artifact",
      id: item.id,
      title: item.title,
      detail: labelize(item.artifact_type),
    })),
  ];
  const results = allResults.filter((result) => result.kind !== "Concept" && resultMatchesKind(result, selectedKind));
  const directoryQuery = query.toLowerCase();
  const directoryMatches = query && selectedKind === "all"
    ? SEARCH_DIRECTORY.filter(item => `${item.title} ${item.keywords}`.toLowerCase().includes(directoryQuery))
    : [];
  const navProfile = {
    displayName: profile?.display_name,
    photoUrl: profile?.photo_url,
    photoOffsetX: profile?.photo_offset_x,
    photoOffsetY: profile?.photo_offset_y,
  };

  return <StudentShell active="More" profile={navProfile}>
    <main id="main-content" className={styles.main}>
      <header className={styles.heading}><h1>Search</h1><Link href="/more">Back to More</Link></header>
      <form className={support.search} action="/search">
        <input name="q" defaultValue={query} placeholder="Class, assignment, note, or tool" aria-label="Search Diana" autoFocus />
        {selectedKind !== "all" ? <input type="hidden" name="type" value={selectedKind} /> : null}
        <button type="submit">Search</button>
      </form>
      <nav className={support.filters} aria-label="Search result types">{FILTERS.filter(filter=>filter.value !== "concepts").map(filter=><Link key={filter.value} href={filterHref(filter.value,query)} aria-current={filter.value===selectedKind?"page":undefined}>{filter.label}</Link>)}</nav>
      {unavailable ? <p role="status">Some results could not load. Try searching again.</p> : null}
      <p className={styles.muted} role="status">{query ? `${results.length + directoryMatches.length} matches for “${query}”` : "Recent work"}</p>
      <div className={support.results}>
        {directoryMatches.map(item=><Link key={item.key} href={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>)}
        {results.map(result=><Link key={result.key} href={result.href}><span><small>{result.kind === "Artifact" ? "Saved practice" : result.kind}</small><strong>{result.title}</strong><small>{result.detail}</small></span><ArrowRight size={18} aria-hidden="true" /></Link>)}
      </div>
      {!results.length && !directoryMatches.length && !unavailable ? <p>No matches. Try a shorter title.</p> : null}
    </main>
  </StudentShell>;
}

function stringParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function resultMatchesKind(result: SupportSearchResult, kind: SupportSearchKind): boolean {
  if (kind === "all") return true;
  return {
    classes: "Class",
    work: "Work",
    notes: "Note",
    concepts: "Concept",
    artifacts: "Artifact",
  }[kind] === result.kind;
}

function filterHref(kind: SupportSearchKind, query: string): string {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (kind !== "all") search.set("type", kind);
  const suffix = search.toString();
  return suffix ? `/search?${suffix}` : "/search";
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
