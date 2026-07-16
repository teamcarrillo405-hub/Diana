import type { ReactNode } from "react";

/** Keep the App Router template transparent so streamed route segments hydrate
 * against the exact DOM emitted by the authenticated layout. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return children;
}
