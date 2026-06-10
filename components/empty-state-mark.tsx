/**
 * Branded mark for empty states — the Diana ✦ on a soft layered disc.
 * Decorative only (aria-hidden); copy next to it carries the meaning.
 * Pure markup so server components can render it. No motion.
 */
export function EmptyStateMark({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`mx-auto mb-4 flex items-center justify-center ${className}`}>
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand/20 via-brand-soft/40 to-subject-science/15" />
        <span className="absolute inset-0 rounded-3xl border border-brand/20" />
        <span className="absolute -inset-2 rounded-[1.4rem] border border-brand/10" />
        <span className="relative text-2xl text-brand">✦</span>
      </div>
    </div>
  );
}
