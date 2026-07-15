"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#04060f",
        color: "#e8e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "28rem", textAlign: "center", display: "grid", gap: "1.5rem" }}>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffd24a", margin: 0 }}>
            Something needs attention
          </p>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.1, textTransform: "uppercase", color: "#e8e8f0", margin: 0 }}>
            This page needs a refresh.
          </h1>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#a0a0b8", margin: 0 }}>
            Your work is safe. Try reloading. If it keeps happening, go back to the start.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "999px", background: "#29d0ff", color: "#001a24", fontWeight: 700, fontSize: "0.8rem", border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{ padding: "0.6rem 1.25rem", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#a0a0b8", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none" }}
          >
            Back to start
          </Link>
        </div>
      </div>
    </div>
  );
}
