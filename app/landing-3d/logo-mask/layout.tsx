import type { ReactNode } from "react";
import { Instrument_Sans } from "next/font/google";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

export default function LogoMaskLayout({ children }: { children: ReactNode }) {
  return <div className={instrumentSans.variable}>{children}</div>;
}