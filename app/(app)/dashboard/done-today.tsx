export function DoneToday({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-6)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--gl-green-30)",
        background: "var(--gl-green-12)",
        padding: "var(--space-10) var(--space-13)",
      }}
    >
      <span style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontStyle: "italic", fontSize: "var(--text-26)", color: "var(--gl-green)" }}>
        {count}
      </span>
      <span style={{ fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-text-secondary)" }}>
        {count === 1 ? "thing done today." : "things done today."}
      </span>
    </div>
  );
}
