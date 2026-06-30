// Kicker + H1 + subtitle heading block used on every dashboard tab page.
// accent controls the kicker color; defaults to cyan (WORK tab). Pass the
// tab's primary color token for THINK (purple), PROOF (green), FUTURE (cyan).
export function TabHeading({
  kicker,
  title,
  sub,
  accent = "var(--gl-cyan)",
}: {
  kicker: string;
  title: string;
  sub: string;
  accent?: string;
}) {
  return (
    <header style={{ marginBottom: "var(--space-15)" }}>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-13)",
          fontWeight: "var(--weight-700)",
          letterSpacing: "var(--tracking-30)",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {kicker}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-40)",
          fontWeight: "var(--weight-800)",
          fontStyle: "italic",
          textTransform: "uppercase",
          color: "var(--gl-text-primary)",
          lineHeight: "var(--leading-tight)",
        }}
      >
        {title}
      </h1>
      <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-15)", color: "var(--gl-text-overlay-60)" }}>
        {sub}
      </p>
    </header>
  );
}
