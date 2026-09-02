import type { Metadata } from "next";
import { PublicPageFrame } from "@/components/marketing/public-page-frame";

export const metadata: Metadata = {
  title: "Trust",
  description: "How Diana approaches student control, early access, and product privacy before account launch.",
  alternates: { canonical: "/trust" },
};

export default function TrustPage() {
  return (
    <PublicPageFrame
      title="Built Around Student Control"
      intro="Diana is being built so homework guidance is useful without taking over a student’s work."
    >
      <section className="dpl-sub-content dpl-sub-trust">
        <article id="privacy">
          <h2>Early access</h2>
          <p>Joining the waitlist collects an email address for an early-access invitation. It does not create a Diana account.</p>
        </article>
        <article id="student-control">
          <h2>Student work</h2>
          <p>Diana is designed to keep guidance distinct from student writing and to leave the turn-in decision with the student.</p>
        </article>
        <article id="legal">
          <h2>Before accounts open</h2>
          <p>Account terms, privacy notices, and age-appropriate access requirements will be published before public account creation opens.</p>
        </article>
        <article id="contact">
          <h2>Questions</h2>
          <p>For early-access questions, contact the Diana team through the invitation email once early access opens.</p>
        </article>
      </section>
    </PublicPageFrame>
  );
}
