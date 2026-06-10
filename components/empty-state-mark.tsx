/**
 * Branded mark for empty states — the Diana ✦ on a soft layered disc.
 * Decorative only (aria-hidden); copy next to it carries the meaning.
 * Pure markup so server components can render it. No motion.
 */
import { SparkConstellation } from "@/components/spark/spark-constellation";

export function EmptyStateMark({ className = "", seed = "diana" }: { className?: string; seed?: string }) {
  return (
    <div aria-hidden="true" className={`mx-auto mb-4 flex items-center justify-center ${className}`}>
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-1 rounded-3xl bg-gradient-to-br from-brand/15 via-brand-soft/30 to-subject-science/10" />
        <span className="absolute inset-1 rounded-3xl border border-brand/20" />
        <SparkConstellation seed={seed} stars={9} className="absolute inset-0 text-brand" />
        <span className="relative text-xl text-brand">✦</span>
      </div>
    </div>
  );
}
