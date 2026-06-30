export default function ClassDetailLoading() {
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

      {/* Class header color bar stub */}
      <div className="gl-skel" style={{ height: "7rem", borderRadius: 0 }} />

      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-12)" }}>
        {/* Class title + meta */}
        <div style={{ display: "grid", gap: "var(--space-8)" }}>
          <div className="gl-skel" style={{ height: "2rem", width: "min(24rem, 80%)" }} />
          <div className="gl-skel" style={{ height: "1rem", width: "min(14rem, 60%)" }} />
        </div>

        {/* Two-column layout skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-9)" }}>
          <div className="gl-skel" style={{ height: "14rem" }} />
          <div className="gl-skel" style={{ height: "14rem" }} />
        </div>

        {/* Assignments list skeleton */}
        <div style={{ display: "grid", gap: "var(--space-6)" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="gl-skel" style={{ height: "4.5rem" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
