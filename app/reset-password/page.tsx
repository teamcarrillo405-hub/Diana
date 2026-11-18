import type { Metadata } from "next";
import { EntryFrame } from "@/app/(auth)/entry-frame";
import { getPasswordResetContext } from "@/app/(auth)/password-actions";
import { ResetPasswordForm } from "./form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Choose password | Diana",
  robots: {
    index: false,
    follow: false
  },
  referrer: "same-origin"
};
export default async function ResetPasswordPage() {
  const context = await getPasswordResetContext();
  // Cookie updates refresh this page. Preserve the client form so its successful
  // action result can render after the now-used proof becomes unavailable.
  return <EntryFrame><ResetPasswordForm available={context.available} /></EntryFrame>;
}
