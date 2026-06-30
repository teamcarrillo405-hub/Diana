// HUD corner-bracket motif — 4 absolute-positioned L-shaped spans at each corner.
// Named design-system element per CLAUDE.md. Used on focus panels and info cards.
export function HudCorners({ color = "var(--gl-cyan-85)", size = 16 }: { color?: string; size?: number }) {
  const base: React.CSSProperties = { position: "absolute", width: size, height: size };
  const s = `2px solid ${color}`;
  return (
    <>
      <span aria-hidden="true" style={{ ...base, top: -1, left: -1, borderTop: s, borderLeft: s, borderRadius: "var(--radius-xs) 0 0 0" }} />
      <span aria-hidden="true" style={{ ...base, top: -1, right: -1, borderTop: s, borderRight: s, borderRadius: "0 var(--radius-xs) 0 0" }} />
      <span aria-hidden="true" style={{ ...base, bottom: -1, left: -1, borderBottom: s, borderLeft: s, borderRadius: "0 0 0 var(--radius-xs)" }} />
      <span aria-hidden="true" style={{ ...base, bottom: -1, right: -1, borderBottom: s, borderRight: s, borderRadius: "0 0 var(--radius-xs) 0" }} />
    </>
  );
}
