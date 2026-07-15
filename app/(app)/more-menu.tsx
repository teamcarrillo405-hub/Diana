"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const GROUPS: { title: string; links: { label: string; href: string; note: string }[] }[] = [
  {
    title: "Learn and review",
    links: [
      { label: "Search", href: "/search", note: "Find notes, work, and concepts" },
      { label: "Study lab", href: "/study-artifacts", note: "Guides, tests, and flashcards" },
      { label: "Tutor", href: "/study-buddy", note: "Guided learning with Diana" },
      { label: "Knowledge graph", href: "/knowledge-graph", note: "See connected concepts" },
    ],
  },
  {
    title: "Evidence and growth",
    links: [
      { label: "Proof", href: "/proof", note: "Authorship and achievements" },
      { label: "Grades", href: "/grades", note: "Scores and useful next moves" },
      { label: "Transcript", href: "/grades/transcript", note: "Private LMS record" },
      { label: "Portfolio", href: "/portfolio", note: "Curated work" },
      { label: "Future path", href: "/future-path", note: "College and career planning" },
      { label: "AP exam prep", href: "/ap", note: "Plans and practice" },
    ],
  },
  {
    title: "Profile and support",
    links: [
      { label: "Notifications", href: "/notifications", note: "Updates you control" },
      { label: "Tutor settings", href: "/settings/tutor", note: "Tutor and teaching style" },
      { label: "Study goals", href: "/settings/goals", note: "Objectives and next steps" },
      { label: "Me", href: "/me", note: "Learning profile" },
      { label: "Wellness", href: "/wellness", note: "Energy and recovery" },
      { label: "Settings", href: "/settings", note: "Access, tutor, and connections" },
    ],
  },
  {
    title: "Connections and sharing",
    links: [
      { label: "Export", href: "/export", note: "Privacy and your data" },
      { label: "Sharing", href: "/sharing", note: "Parents and teachers" },
      { label: "Study groups", href: "/study-groups", note: "Shared sessions and decks" },
    ],
  },
];

export function MoreMenu({ active, variant = "tab" }: { active: boolean; variant?: "tab" | "mobile" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
        className={variant === "mobile" ? undefined : "sd-nav-more"}
      >
        {variant === "mobile" ? <Menu size={20} aria-hidden="true" /> : null}
        More
      </button>

      {open && createPortal(
        <div className="sd-drawer-scrim" role="dialog" aria-modal="true" aria-label="More destinations" onClick={() => setOpen(false)}>
          <div className="sd-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="sd-drawer-head">
              <div>
                <p className="sd-kicker">All tools</p>
                <h2 className="sd-title" style={{ fontSize: "2rem" }}>More</h2>
              </div>
              <button type="button" className="sd-nav-icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {GROUPS.map((group) => (
              <section className="sd-drawer-group" key={group.title}>
                <p className="sd-kicker">{group.title}</p>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="sd-drawer-link" onClick={() => setOpen(false)}>
                    <strong>{link.label}</strong>
                    <small>{link.note}</small>
                  </Link>
                ))}
              </section>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
