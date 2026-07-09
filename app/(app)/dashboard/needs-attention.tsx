"use client";

import Link from "next/link";
import { useState } from "react";
import type { NeedsAttentionCategory } from "@/lib/dashboard/needs-attention";

const SF = "var(--font-saira-condensed), 'Saira Condensed', sans-serif";
const BF = "var(--font-barlow), 'Barlow Semi Condensed', sans-serif";

function CornerBrackets({ size, color }: { size: number; color: string }) {
  const base = { position: "absolute" as const, width: size, height: size };
  return (
    <>
      <span aria-hidden="true" style={{ ...base, left: -1, top: -1, borderLeft: `2px solid ${color}`, borderTop: `2px solid ${color}`, borderRadius: "2px 0 0 0" }} />
      <span aria-hidden="true" style={{ ...base, right: -1, top: -1, borderRight: `2px solid ${color}`, borderTop: `2px solid ${color}`, borderRadius: "0 2px 0 0" }} />
      <span aria-hidden="true" style={{ ...base, left: -1, bottom: -1, borderLeft: `2px solid ${color}`, borderBottom: `2px solid ${color}`, borderRadius: "0 0 0 2px" }} />
      <span aria-hidden="true" style={{ ...base, right: -1, bottom: -1, borderRight: `2px solid ${color}`, borderBottom: `2px solid ${color}`, borderRadius: "0 0 2px 0" }} />
    </>
  );
}

export function NeedsAttention({ categories }: { categories: NeedsAttentionCategory[] }) {
  const [openKey, setOpenKey] = useState<NeedsAttentionCategory["key"] | null>(null);
  const active = categories.find((c) => c.key === openKey) ?? null;

  return (
    <>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "22px 34px 60px", position: "relative", zIndex: 1 }}>
        <div style={{ fontFamily: SF, fontWeight: 700, fontSize: 12, letterSpacing: ".3em", textTransform: "uppercase", color: "#29d0ff", opacity: 0.85, marginBottom: 13 }}>
          Needs attention
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {categories.map((cat) => {
            const empty = cat.items.length === 0;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setOpenKey(cat.key)}
                style={{
                  flex: 1,
                  minWidth: 230,
                  position: "relative",
                  padding: "16px 18px",
                  background: "transparent",
                  border: "1px solid rgba(41,208,255,.2)",
                  borderRadius: 14,
                  opacity: empty ? 0.5 : 1,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                }}
              >
                <CornerBrackets size={14} color="rgba(41,208,255,.8)" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 15, letterSpacing: ".1em", textTransform: "uppercase", color: cat.accent, textShadow: `0 0 12px ${cat.soft}` }}>
                    {cat.label}
                  </span>
                  <span style={{ fontFamily: SF, fontWeight: 800, fontSize: 26, color: "#fff" }}>{cat.items.length}</span>
                </div>
                <div style={{ fontSize: 13, color: "#9fb0dd", marginBottom: 11, marginTop: 4 }}>
                  {empty ? cat.emptyMsg : `${cat.items.length} ${categorySubLabel(cat.key)}`}
                </div>
                <div style={{ fontFamily: SF, fontWeight: 700, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: cat.accent, opacity: 0.85, display: "flex", alignItems: "center", gap: 4 }}>
                  View list
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.label}
          onClick={() => setOpenKey(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,6,15,.82)", backdropFilter: "blur(10px)", padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 540,
              maxWidth: "94vw",
              maxHeight: "82vh",
              overflowY: "auto",
              position: "relative",
              background: "linear-gradient(180deg,rgba(14,20,42,.98),rgba(8,12,28,.98))",
              border: `1px solid ${active.soft}`,
              borderRadius: 18,
              padding: "24px 26px",
              boxShadow: "0 32px 80px rgba(0,0,0,.6)",
            }}
          >
            <CornerBrackets size={16} color={active.accent} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ fontFamily: SF, fontWeight: 800, fontStyle: "italic", fontSize: 26, letterSpacing: ".02em", textTransform: "uppercase", color: active.accent }}>
                {active.label}
              </span>
              <span style={{ padding: "3px 11px", borderRadius: 7, background: "rgba(120,150,220,.12)", color: "#fff", fontFamily: BF, fontSize: 13, fontWeight: 600 }}>
                {active.items.length}
              </span>
              <button
                type="button"
                onClick={() => setOpenKey(null)}
                aria-label="Close"
                style={{ marginLeft: "auto", width: 34, height: 34, borderRadius: 9, background: "rgba(120,150,220,.1)", border: "none", color: "#aab8e0", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {active.items.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 20, borderRadius: 12, background: "rgba(54,224,122,.06)", border: "1px solid rgba(54,224,122,.2)" }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#36e07a" }} />
                <span style={{ fontFamily: SF, fontWeight: 700, fontSize: 16, color: "#36e07a" }}>{active.emptyMsg}.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {active.items.map((it) => (
                  <Link
                    key={it.id}
                    href={it.href}
                    onClick={() => setOpenKey(null)}
                    style={{ display: "flex", gap: 13, padding: "14px 15px", borderRadius: 12, background: "rgba(120,150,220,.05)", border: "1px solid rgba(120,150,220,.14)", textDecoration: "none", color: "inherit" }}
                  >
                    <span aria-hidden="true" style={{ width: 3, alignSelf: "stretch", background: active.accent, borderRadius: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SF, fontWeight: 700, fontSize: 17, color: "#fff", lineHeight: 1.1 }}>{it.title}</div>
                      <div style={{ fontSize: 12.5, color: "#9fb0dd", marginTop: 3 }}>{it.meta}</div>
                    </div>
                    <div style={{ fontFamily: SF, fontWeight: 800, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: active.accent, flexShrink: 0, alignSelf: "center" }}>
                      {it.when}
                    </div>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(200,218,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, alignSelf: "center" }}><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function categorySubLabel(key: NeedsAttentionCategory["key"]): string {
  switch (key) {
    case "tests":
      return "coming up";
    case "overdue":
      return "past the due date";
    case "not_turned_in":
      return "done, not submitted";
    case "feedback":
      return "new from teachers";
  }
}
