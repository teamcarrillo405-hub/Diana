import type { Metadata } from "next";
import { PublicPageFrame } from "@/components/marketing/public-page-frame";

export const metadata: Metadata = {
  title: "Student Control",
  description: "Diana guides the work without replacing a student’s ideas, writing, or decision to submit.",
  alternates: { canonical: "/student-control" },
};

export default function StudentControlPage() {
  return (
    <PublicPageFrame
      title="Guidance That Keeps You In Control"
      intro="Diana is designed to help students take the next useful step while keeping the thinking, writing, and turn-in choice their own."
    >
      <section className="dpl-sub-content dpl-sub-control">
        <div className="dpl-sub-control-copy">
          <article>
            <h2>Help stays beside the work</h2>
            <p>Diana can refer to the assignment and class materials without replacing the student’s response.</p>
          </article>
          <article>
            <h2>The draft is still the student’s</h2>
            <p>Guidance and student writing stay visibly separate, so the student remains the author of the work.</p>
          </article>
          <article>
            <h2>Turn-in is a student choice</h2>
            <p>Diana can help check the work, but a student decides when it is ready to submit.</p>
          </article>
        </div>
        <img
          className="dpl-sub-product-image"
          src="/assets/video/diana-work-stays-yours-film-poster-v2.webp"
          alt="Diana guidance and a student writing document displayed in separate areas"
        />
      </section>
    </PublicPageFrame>
  );
}
