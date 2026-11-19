import type { Metadata } from "next";
import { EntryFrame } from "@/app/(auth)/entry-frame";
import { safeAuthDestination } from "@/lib/auth/entry";
import { ForgotPasswordForm } from "./form";
export const metadata: Metadata = {
  title: "Reset password | Diana",
  robots: {
    index: false,
    follow: false
  },
  referrer: "same-origin"
};
export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{
    next?: string;
  }>;
}) {
  const search = await searchParams;
  return <EntryFrame><ForgotPasswordForm next={safeAuthDestination(search.next)} /></EntryFrame>;
}
