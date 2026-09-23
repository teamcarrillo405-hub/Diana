import Link from "next/link";

export default function EarlyAccessLayout({ children }: { children: React.ReactNode }) {
  return <main id="main-content" className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-16 text-white">
    <Link href="/" className="text-3xl font-bold">DIANA</Link>
    {children}
    <Link href="/" className="underline underline-offset-4">Return to Diana</Link>
  </main>;
}
