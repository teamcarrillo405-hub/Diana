export default function DashboardLoading() {
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

      {/* Hero skeleton */}
      <div style={{ background: "var(--gl-bg-card)", borderBottom: "1px solid var(--gl-border-neutral)", padding: "var(--space-19) var(--space-17)" }}>
        <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", display: "grid", gap: "var(--space-12)" }}>
          <div className="gl-skel" style={{ height: "1rem", width: "8rem" }} />
          <div className="gl-skel" style={{ height: "3.5rem", width: "min(28rem, 90%)" }} />
          <div className="gl-skel" style={{ height: "1rem", width: "min(22rem, 80%)" }} />
          <div style={{ display: "flex", gap: "var(--space-8)" }}>
            <div className="gl-skel" style={{ height: "2.75rem", width: "10rem", borderRadius: "var(--radius-pill)" }} />
            <div className="gl-skel" style={{ height: "2.75rem", width: "8rem", borderRadius: "var(--radius-pill)" }} />
          </div>
        </div>
      </div>

      {/* Class grid skeleton */}
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)" }}>
        <div className="gl-skel" style={{ height: "1.25rem", width: "7rem", marginBottom: "var(--space-12)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--space-9)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="gl-skel" style={{ height: "8rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
