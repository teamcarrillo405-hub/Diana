import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

// GAP-01: Lexend is referenced in .dyslexia-font CSS but must be explicitly
// loaded by next/font/google to actually download. The CSS variable is
// always present on <html>; the .dyslexia-font class (applied in (app)/layout
// based on profile) toggles whether the body actually uses it.
const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Diana",
  description: "Quiet, structured help with school for ADHD students.",
  applicationName: "Diana",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Diana",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={lexend.variable}>
      <body>{children}</body>
    </html>
  );
}
