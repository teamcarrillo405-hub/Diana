import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function PublicNotFoundPage() {
  return (
    <main className="dpl-action-page">
      <h1>That Page Is Not Here</h1>
      <p>Return to Diana to see how the homework workspace works.</p>
      <Link className="dpl-sub-cta" href="/">Back to Diana</Link>
    </main>
  );
}
