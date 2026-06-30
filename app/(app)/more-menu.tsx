"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BODY = "var(--font-body)";

// The MORE drawer is the single home for every secondary destination so no
// page is orphaned. Grouping mirrors docs/design/NAVIGATION.md §4.
const GROUPS: { title: string; links: { label: string; href: string; note?: string }[] }[] = [
  {
    title: "Evidence & growth",
    links: [
      { label: "Proof", href: "/proof", note: "Authorship, wins, artifacts" },
      { label: "Grades", href: "/grades", note: "Canvas scores + moves" },
      { label: "Portfolio", href: "/portfolio", note: "Curated work" },
      { label: "Future Path", href: "/future-path", note: "College prep" },
      { label: "AP exam prep", href: "/ap", note: "Plans + practice" },
    ],
  },
  {
    title: "Profile & support",
    links: [
      { label: "Me", href: "/me", note: "Learning profile" },
      { label: "Wellness", href: "/wellness", note: "Check-ins + sleep" },
      { label: "Settings", href: "/settings", note: "Reading + connections" },
    ],
  },
  {
    title: "Connections & sharing",
    links: [
      { label: "Export", href: "/export", note: "Your data" },
      { label: "Sharing", href: "/sharing", note: "Parents + teachers" },
      { label: "Study groups", href: "/study-groups", note: "Shared decks + notes" },
    ],
  },
];

export function MoreMenu({ active, variant = "tab" }: { active: boolean; variant?: "tab" | "mobile" }) {
  const [open, setOpen] = useState(false);

  // Close on Escape and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {variant === "mobile" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 0",
            color: active ? "#29d0ff" : "#8b96bd",
            fontFamily: SF,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: ".04em",
            textTransform: "uppercase",
          }}
        >
          <Menu size={20} />
          More
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={active ? undefined : "gl-tab"}
          style={{
            position: "relative",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: SF,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: active ? "#fff" : "#8b96bd",
            padding: active ? "18px 2px" : "0 2px",
          }}
        >
          {active && (
            <span
              aria-hidden="true"
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "#29d0ff", borderRadius: 2 }}
            />
          )}
          More
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More destinations"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(2,5,14,.66)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(440px, 92vw)",
              height: "100%",
              overflowY: "auto",
              background: "var(--gl-bg-base, #04060f)",
              borderLeft: "1px solid rgba(41,208,255,.18)",
              padding: "var(--space-15, 22px)",
              display: "grid",
              gap: "var(--space-15, 22px)",
              alignContent: "start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontFamily: SF, fontWeight: 800, fontSize: 24, letterSpacing: ".06em", textTransform: "uppercase", color: "#fff", margin: 0 }}>
                More
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "rgba(120,150,220,.12)",
                  border: "1px solid rgba(120,150,220,.22)",
                  color: "#aab8e0",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {GROUPS.map((group) => (
              <section key={group.title} style={{ display: "grid", gap: "var(--space-6, 8px)" }}>
                <p style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#8b96bd", margin: 0 }}>
                  {group.title}
                </p>
                <div style={{ display: "grid", gap: "var(--space-3, 4px)" }}>
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(120,150,220,.18)",
                        background: "rgba(120,150,220,.06)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 17, letterSpacing: ".04em", textTransform: "uppercase", color: "#e7ecff" }}>
                        {link.label}
                      </span>
                      {link.note && (
                        <span style={{ fontFamily: BODY, fontSize: 12, color: "#8b96bd", textAlign: "right" }}>
                          {link.note}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
