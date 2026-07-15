import Head from "next/head";
import { QuietCommandLanding } from "@/components/landing/quiet-command-landing";

const title = "Diana | Your next five minutes, made obvious";
const description =
  "A private ADHD and dyslexia-aware learning companion that turns schoolwork into one clear next move.";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta
          property="og:description"
          content="A private learning companion that turns the pile into one clear, student-owned next move."
        />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#02030A" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>
      <QuietCommandLanding />
    </>
  );
}
