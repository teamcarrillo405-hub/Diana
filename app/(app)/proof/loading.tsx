export default function ProofLoading() {
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

      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>
        {/* Hero two-col */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-13)" }}>
          <div style={{ display: "grid", gap: "var(--space-8)" }}>
            <div className="gl-skel" style={{ height: "0.75rem", width: "5rem" }} />
            <div className="gl-skel" style={{ height: "3rem", width: "min(18rem, 85%)" }} />
            <div className="gl-skel" style={{ height: "1rem", width: "min(15rem, 75%)" }} />
            <div style={{ display: "flex", gap: "var(--space-6)" }}>
              <div className="gl-skel" style={{ height: "2.5rem", width: "8rem", borderRadius: "var(--radius-pill)" }} />
              <div className="gl-skel" style={{ height: "2.5rem", width: "7rem", borderRadius: "var(--radius-pill)" }} />
            </div>
          </div>
          <div className="gl-skel" style={{ height: "12rem" }} />
        </div>

        {/* Authorship trail */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "var(--space-9)" }}>
          <div className="gl-skel" style={{ height: "16rem" }} />
          <div style={{ display: "grid", gap: "var(--space-9)" }}>
            <div className="gl-skel" style={{ height: "7.5rem" }} />
            <div className="gl-skel" style={{ height: "7.5rem" }} />
          </div>
        </div>

        {/* Wins + artifacts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-9)" }}>
          <div className="gl-skel" style={{ height: "10rem" }} />
          <div className="gl-skel" style={{ height: "10rem" }} />
        </div>
      </div>
    </div>
  );
}
