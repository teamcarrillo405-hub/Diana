import type { AppProps } from "next/app";
import { Barlow_Semi_Condensed, Saira_Condensed } from "next/font/google";
import "@/styles/quiet-command.css";
import "@/app/screendesign.css";

const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-saira-condensed",
  weight: "800",
  style: "normal",
});

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barlow",
  weight: ["400", "500"],
});

export default function DianaMarketingApp({ Component, pageProps }: AppProps) {
  return (
    <div
      className={`diana-app ${sairaCondensed.variable} ${barlowSemiCondensed.variable}`}
    >
      <a href="#main-content" className="skip-link">
        Skip to main
      </a>
      <Component {...pageProps} />
    </div>
  );
}
