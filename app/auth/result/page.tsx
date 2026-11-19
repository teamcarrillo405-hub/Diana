import Link from "next/link";
import type { Metadata } from "next";
import { EntryFrame } from "@/app/(auth)/entry-frame";
export const metadata: Metadata = {
  title: "Account link | Diana",
  robots: {
    index: false,
    follow: false
  },
  referrer: "same-origin"
};
export default async function AuthResultPage({
  searchParams
}: {
  searchParams: Promise<{
    status?: string;
  }>;
}) {
  const search = await searchParams;
  const unavailable = search.status === "recovery-unavailable";
  return <EntryFrame><div className="entry-sent"><h1>{unavailable ? "Recovery unavailable" : "Try a fresh link"}</h1><p className="entry-description">{unavailable ? "Password recovery is not available right now. Try again later." : "This account link could not be confirmed. It may have expired or already been used."}</p><Link className="entry-submit" href="/forgot-password">Request reset link</Link><Link className="entry-inline-link" href="/login">Back to sign in</Link></div></EntryFrame>;
}
