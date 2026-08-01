import { History, Search } from "lucide-react";
import Link from "next/link";

export type SearchDirectoryItem = {
  key: string;
  title: string;
  detail: string;
  href: string;
};

export function SearchDirectoryResults({
  items,
}: {
  items: ReadonlyArray<SearchDirectoryItem>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="sd-search-section" aria-labelledby="search-directory-title">
      <h1 id="search-directory-title">Pages and tools</h1>
      <div className="sd-search-results">
        {items.map((item) => (
          <Link
            href={item.href}
            className="sd-search-result"
            data-kind="Page"
            key={item.key}
          >
            <span className="sd-search-result-icon">
              <Search size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>{item.title}</strong>
              <small>Page or tool - {item.detail}</small>
            </span>
            <History size={15} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
