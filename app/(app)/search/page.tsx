import {
  ArrowLeft,
  BookOpen,
  CheckSquare,
  FileStack,
  History,
  Network,
  NotebookPen,
  Search,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import {
  buildSupportSearchResult,
  normalizeSupportSearchQuery,
  parseSupportSearchKind,
  type SupportSearchKind,
  type SupportSearchResult,
} from "@/lib/screendesign/support-screens";
import { createClient } from "@/lib/supabase/server";

const SEARCH_STYLES = `
  .diana-authenticated-field:has(.sd-smart-search) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-smart-search) { padding:0!important; }
  .app-command-frame:has(.sd-smart-search) .diana-mobile-command,
  .diana-app-shell:has(.sd-smart-search) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-smart-search) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-smart-search) .skip-link { transition:none; }
  .diana-app:has(.sd-smart-search) .skip-link:focus { transform:translateY(0)!important; }
  .sd-smart-search { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-smart-search * { box-sizing:border-box; }
  .sd-search-header { position:relative; z-index:30; flex:none; padding:52px 24px 14px; background:rgb(15 23 42 / .92); backdrop-filter:blur(12px); }
  .sd-search-header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:17px; }
  .sd-search-brand { display:flex; align-items:center; gap:11px; }
  .sd-search-back { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .08); border-radius:999px; background:rgb(255 255 255 / .05); color:#fff; text-decoration:none; }
  .sd-search-brand .sd-source-wordmark { width:auto; height:18px; }
  .sd-search-avatar-ring { width:40px; height:40px; border-radius:999px; background:linear-gradient(135deg,#ff79da,#74c0ff); padding:1px; }
  .sd-search-avatar { width:100%; height:100%; border-radius:999px; object-fit:cover; }
  .sd-search-form { display:grid; grid-template-columns:20px minmax(0,1fr) auto; align-items:center; gap:9px; border:1px solid rgb(255 255 255 / .1); border-radius:16px; background:rgb(255 255 255 / .05); padding:4px 5px 4px 14px; }
  .sd-search-form svg { color:#74c0ff; }
  .sd-search-form input { min-width:0; border:0; outline:0; background:transparent; padding:10px 0; color:#f8fafc; font:inherit; font-size:10px; font-style:italic; font-weight:900; letter-spacing:.025em; text-transform:uppercase; }
  .sd-search-form input::placeholder { color:#64748b; }
  .sd-search-form button { min-height:34px; border:0; border-radius:12px; background:#74c0ff; padding:0 10px; color:#0f172a; font:inherit; font-size:8px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-search-filters { display:flex; gap:7px; overflow-x:auto; margin:11px -24px 0; padding:0 24px 2px; scrollbar-width:none; }
  .sd-search-filters::-webkit-scrollbar { display:none; }
  .sd-search-filter { flex:none; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .045); padding:7px 11px; color:#f8fafc; font-size:8px; font-weight:950; letter-spacing:.1em; text-decoration:none; text-transform:uppercase; }
  .sd-search-filter[aria-current="page"] { border-color:#ff79da; background:#ff79da; color:#0f172a; }
  .sd-search-scroll { min-height:0; flex:1; overflow-y:auto; padding:17px 24px 31px; scrollbar-width:none; }
  .sd-search-scroll::-webkit-scrollbar { display:none; }
  .sd-search-section { display:grid; gap:11px; margin-bottom:25px; }
  .sd-search-section h1,.sd-search-section h2 { margin:0; color:#ff79da; font-size:10px; font-style:italic; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
  .sd-search-section h2 { color:#94a3b8; }
  .sd-search-featured { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; }
  .sd-search-featured-card { min-width:0; border:1px solid rgb(255 255 255 / .1); border-radius:17px; background:rgb(255 255 255 / .05); padding:11px; color:#f8fafc; text-decoration:none; backdrop-filter:blur(8px); }
  .sd-search-featured-media { position:relative; width:100%; height:73px; overflow:hidden; border-radius:10px; background:#17223a; }
  .sd-search-featured-media .sd-source-media { width:100%; height:100%; object-fit:cover; opacity:.58; }
  .sd-search-featured-kind { position:absolute; right:7px; bottom:6px; border-radius:999px; background:rgb(15 23 42 / .82); padding:4px 6px; color:#74c0ff; font-size:7px; font-weight:950; text-transform:uppercase; }
  .sd-search-featured-card strong { display:-webkit-box; overflow:hidden; margin-top:9px; font-size:10px; font-style:italic; font-weight:950; line-height:1.15; text-transform:uppercase; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
  .sd-search-featured-card small { display:block; overflow:hidden; margin-top:5px; color:#94a3b8; font-size:7px; font-weight:800; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-search-results { display:grid; gap:9px; }
  .sd-search-result { display:grid; grid-template-columns:42px minmax(0,1fr) auto; align-items:center; gap:11px; border:1px solid rgb(255 255 255 / .1); border-radius:14px; background:rgb(255 255 255 / .05); padding:11px; color:#f8fafc; text-decoration:none; }
  .sd-search-result-icon { display:grid; width:42px; height:42px; place-items:center; border-radius:11px; background:rgb(116 192 255 / .1); color:#74c0ff; }
  .sd-search-result[data-kind="Artifact"] .sd-search-result-icon,.sd-search-result[data-kind="Note"] .sd-search-result-icon { background:rgb(255 121 218 / .1); color:#ff79da; }
  .sd-search-result strong { display:block; overflow:hidden; font-size:10px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-search-result small { display:block; overflow:hidden; margin-top:4px; color:#64748b; font-size:8px; font-weight:800; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-search-result > svg { color:#475569; }
  .sd-search-empty { border:1px dashed rgb(116 192 255 / .25); border-radius:17px; background:rgb(116 192 255 / .04); padding:24px 18px; color:#94a3b8; font-size:11px; line-height:1.5; text-align:center; }
  .sd-smart-search > .sd-student-bottom-nav { position:relative; z-index:60; flex:none; }
  .sd-smart-search a:focus-visible,.sd-smart-search button:focus-visible,.sd-smart-search input:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  @media (prefers-reduced-motion:reduce) { .sd-smart-search * { scroll-behavior:auto!important; transition:none!important; } }
`;

const FILTERS: ReadonlyArray<Readonly<{ value: SupportSearchKind; label: string }>> = [
  { value: "all", label: "All" },
  { value: "concepts", label: "Concepts" },
  { value: "work", label: "Work" },
  { value: "notes", label: "Notes" },
  { value: "classes", label: "Classes" },
  { value: "artifacts", label: "Artifacts" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawQuery = stringParam(params.q);
  const { query, pattern } = normalizeSupportSearchQuery(rawQuery);
  const selectedKind = parseSupportSearchKind(params.type);
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
  let conceptsQuery = supabase
    .from("mastery_concepts")
    .select("id, name, mastery_level, updated_at")
    .eq("owner_id", user.id)
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
    conceptsQuery = conceptsQuery.ilike("name", pattern);
    artifactsQuery = artifactsQuery.ilike("title", pattern);
  }

  const [{ data: notes }, { data: assignments }, { data: classes }, { data: concepts }, { data: artifacts }] =
    await Promise.all([notesQuery, assignmentsQuery, classesQuery, conceptsQuery, artifactsQuery]);

  const allResults: SupportSearchResult[] = [
    ...(concepts ?? []).map((item) => buildSupportSearchResult({
      type: "concept",
      id: item.id,
      title: item.name,
      detail: `Practice evidence · level ${Number(item.mastery_level).toFixed(1)} of 4`,
    })),
    ...(assignments ?? []).map((item) => buildSupportSearchResult({
      type: "assignment",
      id: item.id,
      title: item.title,
      detail: item.description || labelize(item.status),
    })),
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
  const results = allResults.filter((result) => resultMatchesKind(result, selectedKind));
  const featured = results.slice(0, 2);
  const recent = results.slice(2);

  return (
    <ScreenDesignViewport className="sd-smart-search" aria-label="Smart search">
      <style>{SEARCH_STYLES}</style>
      <header className="sd-search-header">
        <div className="sd-search-header-row">
          <div className="sd-search-brand">
            <Link className="sd-search-back" href="/dashboard" aria-label="Back to dashboard"><ArrowLeft size={19} aria-hidden="true" /></Link>
            <DianaWordmark />
          </div>
          <div className="sd-search-avatar-ring">
            <SourceMedia assetId="search-student-avatar" width={80} height={80} alt="Student profile" className="sd-search-avatar" />
          </div>
        </div>
        <form className="sd-search-form" action="/search">
          <Search size={18} aria-hidden="true" />
          <input name="q" defaultValue={query} placeholder="Find your class, work, or note..." aria-label="Search Diana" />
          {selectedKind !== "all" ? <input type="hidden" name="type" value={selectedKind} /> : null}
          <button type="submit">Search</button>
        </form>
        <nav className="sd-search-filters" aria-label="Search result types">
          {FILTERS.map((filter) => (
            <Link
              key={filter.value}
              className="sd-search-filter"
              href={filterHref(filter.value, query)}
              aria-current={filter.value === selectedKind ? "page" : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="sd-search-scroll" aria-live="polite">
        {featured.length ? (
          <section className="sd-search-section">
            <h1>{query ? `Results for ${query}` : "Your next plays"}</h1>
            <div className="sd-search-featured">
              {featured.map((result, index) => (
                <Link href={result.href} className="sd-search-featured-card" key={result.key}>
                  <div className="sd-search-featured-media">
                    <SourceMedia
                      assetId={index === 0 ? "search-biology-graphic" : "search-economics-graphic"}
                      width={180}
                      height={120}
                      decorative
                    />
                    <span className="sd-search-featured-kind">{result.kind}</span>
                  </div>
                  <strong>{result.title}</strong>
                  <small>{result.detail}</small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {recent.length ? (
          <section className="sd-search-section">
            <h2>{query ? "More matches" : "Recent scouting"}</h2>
            <div className="sd-search-results">
              {recent.map((result) => <SearchResultCard key={result.key} result={result} />)}
            </div>
          </section>
        ) : null}

        {results.length === 0 ? (
          <div className="sd-search-empty">No match in your account yet. Try a shorter title or choose another result type.</div>
        ) : null}
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function SearchResultCard({ result }: { result: SupportSearchResult }) {
  const Icon = {
    Class: BookOpen,
    Work: CheckSquare,
    Note: NotebookPen,
    Concept: Network,
    Artifact: FileStack,
  }[result.kind];
  return (
    <Link href={result.href} className="sd-search-result" data-kind={result.kind}>
      <span className="sd-search-result-icon"><Icon size={18} aria-hidden="true" /></span>
      <span><strong>{result.title}</strong><small>{result.kind} · {result.detail}</small></span>
      <History size={15} aria-hidden="true" />
    </Link>
  );
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
