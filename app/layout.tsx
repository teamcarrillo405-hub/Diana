import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Lexend, Saira_Condensed } from "next/font/google";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/opendyslexic"; // weight 400 only; Pitfall 7 guard (no all.css)
import "./globals.css";
import "../tokens.css";
import "./screendesign.css";
import { AccentProvider } from "@/components/accent-provider";
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
      className={`${lexend.variable} ${sairaCondensed.variable} ${barlowSemiCondensed.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('diana_theme');var c=document.documentElement.classList;if(t==='dark'){c.add('dark');}else if(t==='light'){c.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="diana-app">
        <a href="#main-content" className="skip-link">
          Skip to main
        </a>
        <ThemeProvider>
          <AccentProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
