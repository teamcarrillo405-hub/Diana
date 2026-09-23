export default function AssignmentsLoading() {
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

      {/* Navigation placeholder */}
      <div style={{ height: "3.25rem", background: "var(--gl-bg-card)", borderBottom: "1px solid var(--gl-border-neutral)" }} />

      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-15)" }}>
        {/* Header */}
        <div style={{ display: "grid", gap: "var(--space-8)" }}>
          <div className="gl-skel" style={{ height: "0.75rem", width: "4rem" }} />
          <div className="gl-skel" style={{ height: "2.75rem", width: "min(26rem, 85%)" }} />
        </div>

        {/* Start Now + metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-9)" }}>
          <div className="gl-skel" style={{ height: "11rem", gridColumn: "1 / 2" }} />
          <div style={{ gridColumn: "2 / 4", display: "grid", gap: "var(--space-9)" }}>
            <div className="gl-skel" style={{ height: "5rem" }} />
            <div className="gl-skel" style={{ height: "5rem" }} />
          </div>
        </div>

        {/* Lane rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: "grid", gap: "var(--space-6)" }}>
            <div className="gl-skel" style={{ height: "1.25rem", width: "9rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-6)" }}>
              <div className="gl-skel" style={{ height: "7rem" }} />
              <div className="gl-skel" style={{ height: "7rem" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
