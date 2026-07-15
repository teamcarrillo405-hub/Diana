import Link from "next/link";
import { BookOpen, CheckSquare, Network, NotebookPen, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../page-shell";

type SearchResult = {
  key: string;
  title: string;
  detail: string;
  href: string;
  kind: string;
  Icon: typeof Search;
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const supabase = await createClient();

  const notesQuery = supabase.from("notes").select("id, title, body_text, updated_at").order("updated_at", { ascending: false }).limit(12);
  const assignmentsQuery = supabase.from("assignments").select("id, title, description, status, due_at").order("updated_at", { ascending: false }).limit(12);
  const classesQuery = supabase.from("classes").select("id, name, teacher, updated_at").is("archived_at", null).order("updated_at", { ascending: false }).limit(12);
  const conceptsQuery = supabase.from("mastery_concepts").select("id, name, mastery_level, class_id").order("updated_at", { ascending: false }).limit(12);

  if (query) {
    notesQuery.ilike("title", `%${query}%`);
    assignmentsQuery.ilike("title", `%${query}%`);
    classesQuery.ilike("name", `%${query}%`);
    conceptsQuery.ilike("name", `%${query}%`);
  }

  const [{ data: notes }, { data: assignments }, { data: classes }, { data: concepts }] = await Promise.all([
    notesQuery,
    assignmentsQuery,
    classesQuery,
    conceptsQuery,
  ]);

  const results: SearchResult[] = [
    ...(assignments ?? []).map((item) => ({ key: `assignment-${item.id}`, title: item.title, detail: item.description || item.status.replaceAll("_", " "), href: `/assignments/${item.id}`, kind: "Work", Icon: CheckSquare })),
    ...(notes ?? []).map((item) => ({ key: `note-${item.id}`, title: item.title, detail: item.body_text.slice(0, 110) || "Class note", href: `/notes/${item.id}`, kind: "Note", Icon: NotebookPen })),
    ...(classes ?? []).map((item) => ({ key: `class-${item.id}`, title: item.name, detail: item.teacher || "Class", href: `/classes/${item.id}`, kind: "Class", Icon: BookOpen })),
    ...(concepts ?? []).map((item) => ({ key: `concept-${item.id}`, title: item.name, detail: `Mastery level ${Number(item.mastery_level).toFixed(1)} of 4`, href: `/concepts/${item.id}`, kind: "Concept", Icon: Network })),
  ];

  return (
    <PageShell active="More" eyebrow="Search" title="Find your next play" subtitle="Search your own classes, work, notes, and concept map. Results stay inside your account.">
      <form action="/search" className="sd-panel sd-panel-pad sd-search-form">
        <Search size={18} aria-hidden="true" />
        <input className="sd-input" name="q" defaultValue={query} placeholder="Search classes, notes, work, or concepts" aria-label="Search" />
        <button className="sd-button sd-button-primary" type="submit">Search</button>
      </form>

      <section className="sd-grid" style={{ marginTop: "1.25rem" }} aria-live="polite">
        <div className="sd-section-head">
          <h2 className="sd-section-title">{query ? `Results for “${query}”` : "Recently updated"}</h2>
          <span className="sd-chip">{results.length} found</span>
        </div>
        {results.length ? (
          <div className="sd-grid sd-grid-2">
            {results.map(({ key, title, detail, href, kind, Icon }) => (
              <Link href={href} key={key} className="sd-panel sd-search-result">
                <span className="sd-class-icon"><Icon size={18} aria-hidden="true" /></span>
                <span>
                  <span className="sd-kicker">{kind}</span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="sd-panel sd-panel-pad"><p className="sd-subtitle">No match yet. Try a shorter title or open the related class.</p></div>
        )}
      </section>
    </PageShell>
  );
}
