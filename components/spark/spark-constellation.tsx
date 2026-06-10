/**
 * Spark constellation — Quiet Command's generative identity system.
 * No mascot: teens read mascots as condescension. Instead, deterministic
 * constellations of the Diana ✦ spark — seeded (hydration-safe, no
 * Math.random), theme-aware via currentColor + brand tokens, rendered in
 * code so the identity is infinitely consistent and free. Decorative only.
 */

type Star = { x: number; y: number; r: number; bright: boolean };

function hash(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function constellation(seed: string, count: number): Star[] {
  const rand = hash(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: 8 + rand() * 84,
      y: 8 + rand() * 84,
      r: 0.8 + rand() * 1.6,
      bright: rand() > 0.65,
    });
  }
  return stars;
}

export function SparkConstellation({
  seed,
  stars = 7,
  className = "",
}: {
  seed: string;
  stars?: number;
  className?: string;
}) {
  const points = constellation(seed, Math.min(Math.max(stars, 3), 24));
  const bright = points.filter((p) => p.bright);

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      {/* faint connective lines between consecutive bright sparks */}
      {bright.slice(0, -1).map((p, i) => (
        <line
          key={`l${i}`}
          x1={p.x}
          y1={p.y}
          x2={bright[i + 1].x}
          y2={bright[i + 1].y}
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.25"
        />
      ))}
      {points.map((p, i) =>
        p.bright ? (
          <path
            key={i}
            d={`M ${p.x} ${p.y - p.r * 2.4} L ${p.x + p.r * 0.7} ${p.y - p.r * 0.7} L ${p.x + p.r * 2.4} ${p.y} L ${p.x + p.r * 0.7} ${p.y + p.r * 0.7} L ${p.x} ${p.y + p.r * 2.4} L ${p.x - p.r * 0.7} ${p.y + p.r * 0.7} L ${p.x - p.r * 2.4} ${p.y} L ${p.x - p.r * 0.7} ${p.y - p.r * 0.7} Z`}
            fill="currentColor"
            opacity="0.9"
          />
        ) : (
          <circle key={i} cx={p.x} cy={p.y} r={p.r * 0.5} fill="currentColor" opacity="0.4" />
        ),
      )}
    </svg>
  );
}
