import type { Metadata, Viewport } from "next";
import { Lexend, Atkinson_Hyperlegible_Next } from "next/font/google";
import "@fontsource/opendyslexic"; // weight 400 only — Pitfall 7 guard (no all.css)
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

// F19: Atkinson Hyperlegible Next (2025 update — 7 weights, 150+ languages)
// Pitfall 6: variable MUST be on <html> className or --font-atkinson is undefined
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
  weight: ["400", "700"],
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
    <html lang="en" className={`${lexend.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
