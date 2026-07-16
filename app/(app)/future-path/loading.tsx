export default function FuturePathLoading() {
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

      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>
        {/* Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.3fr", gap: "var(--space-13)" }}>
          <div style={{ display: "grid", gap: "var(--space-8)" }}>
            <div className="gl-skel" style={{ height: "0.75rem", width: "5rem" }} />
            <div className="gl-skel" style={{ height: "3.5rem", width: "min(16rem, 90%)" }} />
            <div className="gl-skel" style={{ height: "1rem", width: "min(14rem, 80%)" }} />
            <div style={{ display: "flex", gap: "var(--space-6)" }}>
              <div className="gl-skel" style={{ height: "2.5rem", width: "9rem", borderRadius: "var(--radius-pill)" }} />
              <div className="gl-skel" style={{ height: "2.5rem", width: "7rem", borderRadius: "var(--radius-pill)" }} />
            </div>
          </div>
          <div className="gl-skel" style={{ height: "14rem" }} />
        </div>

        {/* Strengths + cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "0.88fr 1.12fr", gap: "var(--space-9)" }}>
          <div className="gl-skel" style={{ height: "12rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-9)" }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className="gl-skel" style={{ height: "5.5rem" }} />)}
          </div>
        </div>

        {/* Essay rule */}
        <div className="gl-skel" style={{ height: "7rem" }} />
      </div>
    </div>
  );
}
