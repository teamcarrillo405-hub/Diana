import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow_Semi_Condensed, Lexend, Saira_Condensed } from "next/font/google";
import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "@fontsource/opendyslexic"; // weight 400 only; Pitfall 7 guard (no all.css)
import "katex/dist/katex.min.css";
import "./globals.css";
import "../tokens.css";
import "./screendesign.css";
import "./assignment-workspace.css";
import "./canonical-public-landing.css";
import "./public-landing-v2.css";
import { AccentProvider } from "@/components/accent-provider";
import { ThemeProvider } from "@/components/theme-provider";

const publicSiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://diana.app";
const publicSiteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Diana",
      url: publicSiteUrl,
      logo: `${publicSiteUrl}/screendesign/brand/diana-logo-no-shadow.png`,
    },
    {
      "@type": "WebSite",
      name: "Diana",
      url: publicSiteUrl,
      description: "Homework workspace for students.",
    },
  ],
};

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://diana.app"),
  title: {
    default: "Diana | Homework Workspace for Students",
    template: "%s | Diana",
  },
  description: "Bring assignments, notes, deadlines, and guided homework help into one workspace. Diana shows the next move while your work stays yours.",
  applicationName: "Diana",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Diana",
    title: "Diana | Homework Workspace for Students",
    description: "Bring assignments, notes, deadlines, and guided homework help into one workspace.",
    images: [{
      url: "/assets/dashboard/diana-today-home-screen.png",
      width: 1900,
      height: 920,
      alt: "Diana Today homework workspace",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diana | Homework Workspace for Students",
    description: "Bring assignments, notes, deadlines, and guided homework help into one workspace.",
    images: ["/assets/dashboard/diana-today-home-screen.png"],
  },
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${sairaCondensed.variable} ${barlowSemiCondensed.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          suppressHydrationWarning
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('diana_theme');var c=document.documentElement.classList;if(t==='dark'){c.add('dark');}else if(t==='light'){c.add('light');}}catch(e){}})();`,
          }}
        />
        <script
          suppressHydrationWarning
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(publicSiteStructuredData) }}
        />
      </head>
      <body className="diana-app" suppressHydrationWarning>
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
