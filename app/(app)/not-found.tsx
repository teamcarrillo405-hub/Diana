import Link from "next/link";

export default function NotFound() {
  const SF = "var(--font-display)";
  const BODY = "var(--font-body)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gl-bg-base)",
        color: "var(--gl-text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-17)",
      }}
    >
      <div style={{ maxWidth: "28rem", textAlign: "center", display: "grid", gap: "var(--space-12)" }}>
        <div style={{ display: "grid", gap: "var(--space-6)" }}>
          <p
            style={{
              fontFamily: BODY,
              fontSize: "var(--text-11)",
              fontWeight: "var(--weight-700)",
              letterSpacing: "var(--tracking-20)",
              textTransform: "uppercase",
              color: "var(--gl-cyan)",
              margin: 0,
            }}
          >
            Page not found
          </p>
          <h1
            style={{
              fontFamily: SF,
              fontWeight: "var(--weight-800)",
              fontSize: "var(--text-42)",
              lineHeight: "var(--leading-tight)",
              textTransform: "uppercase",
              color: "var(--gl-text-primary)",
              margin: 0,
            }}
          >
            This page moved or does not exist.
          </h1>
          <p
            style={{
              fontFamily: BODY,
              fontSize: "var(--text-15)",
              lineHeight: "var(--leading-body)",
              color: "var(--gl-text-secondary)",
              margin: 0,
            }}
          >
            Your work is still saved. Head back to the dashboard to pick up where you left off.
          </p>
        </div>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-9) var(--space-14)",
            borderRadius: "var(--radius-pill)",
            background: "var(--gl-cyan)",
            color: "#001a24",
            fontFamily: BODY,
            fontWeight: "var(--weight-700)",
            fontSize: "var(--text-13)",
            textDecoration: "none",
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
