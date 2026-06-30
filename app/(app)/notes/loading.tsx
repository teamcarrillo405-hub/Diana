export default function NotesLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)" }}>
      <style>{`
        @keyframes gl-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.6; }
        }
        .gl-skel {
          background: var(--gl-bg-card);
          border-radius: var(--radius-card);
          animation: gl-pulse 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* AppTopNav stub */}
      <div style={{ height: "3.25rem", background: "var(--gl-bg-card)", borderBottom: "1px solid var(--gl-border-neutral)" }} />

      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-15)" }}>
        {/* Header */}
        <div style={{ display: "grid", gap: "var(--space-8)" }}>
          <div className="gl-skel" style={{ height: "0.75rem", width: "6rem" }} />
          <div className="gl-skel" style={{ height: "3rem", width: "min(22rem, 85%)" }} />
          <div className="gl-skel" style={{ height: "1rem", width: "min(18rem, 75%)" }} />
          <div className="gl-skel" style={{ height: "2.5rem", width: "8rem", borderRadius: "var(--radius-pill)" }} />
        </div>

        {/* Metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-9)" }}>
          {[1, 2, 3].map((i) => <div key={i} className="gl-skel" style={{ height: "5.5rem" }} />)}
        </div>

        {/* Note list */}
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="gl-skel" style={{ height: "5rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
