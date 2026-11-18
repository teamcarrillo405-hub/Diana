import { EntryFrame } from "./entry-frame";
export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <EntryFrame>{children}</EntryFrame>;
}
