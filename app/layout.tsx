import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Lexend, Saira_Condensed, Space_Grotesk, Space_Mono, VT323 } from "next/font/google";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/opendyslexic"; // weight 400 only; Pitfall 7 guard (no all.css)
import "./globals.css";
import { AccentProvider } from "@/components/accent-provider";
import { FutureModeProvider } from "@/components/future-mode-provider";
import { ThemeProvider } from "@/components/theme-provider";

// GAP-01: Lexend is referenced in .dyslexia-font CSS but must be explicitly
// loaded by next/font/google to actually download. The CSS variable is
// always present on <html>; the .dyslexia-font class (applied in (app)/layout
// based on profile) toggles whether the body actually uses it.
const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nexus-display",
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nexus-mono",
  weight: ["400", "700"],
});

const vt323 = VT323({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nexus-arcade",
  weight: "400",
});

const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-saira-condensed",
  weight: ["600", "700", "800"],
  style: "normal",
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barlow",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Diana",
  description: "Student-owned school support for next moves, original thinking, and future planning.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#02030A" },
    { media: "(prefers-color-scheme: dark)", color: "#02030A" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${vt323.variable} ${sairaCondensed.variable} ${barlowSemiCondensed.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('diana_theme');var c=document.documentElement.classList;if(t==='dark'){c.add('dark');}else if(t==='light'){c.add('light');}var m=localStorage.getItem('diana_experience_mode');document.documentElement.dataset.experienceMode=m==='future'?'future':'calm';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="nexus-app">
        <a href="#main-content" className="skip-link">
          Skip to main
        </a>
        <ThemeProvider>
          <FutureModeProvider />
          <AccentProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
