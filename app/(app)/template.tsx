/**
 * Route-level Settle (Quiet Command motion verb): every navigation inside
 * the app enters with the same calm 240ms rise. Next.js remounts a
 * template on each navigation, which is exactly the trigger we want.
 * Reduced motion collapses this to a fade via the .motion-settle rules.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="motion-settle">{children}</div>;
}
