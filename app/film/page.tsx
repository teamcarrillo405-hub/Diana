import Link from "next/link";
import { ScrollFilm, type Chapter } from "@/components/immersive/scroll-film";

// "The Anatomy of Focus" — the immersive scroll film. Lives at /film until
// sign-off, then becomes / with the standard landing as the reduced-motion
// and small-screen fallback.

const CHAPTERS: Chapter[] = [
  {
    from: 0.0,
    to: 0.08,
    side: "center",
    eyebrow: "Diana",
    title: "School runs on this.",
    body: "And it was never built for every kind of brain. Scroll.",
  },
  {
    from: 0.08,
    to: 0.2,
    side: "left",
    eyebrow: "The display — Focus",
    title: "One move. Never the mountain.",
    body: "Diana opens to a single clear next step, sized to your real attention — not a wall of everything you owe.",
  },
  {
    from: 0.2,
    to: 0.32,
    side: "right",
    eyebrow: "The processor — Learning loop",
    title: "It learns how you learn.",
    body: "Every helped moment teaches Diana which kind of help works for you — hints, visuals, or quizzes — and it adapts.",
  },
  {
    from: 0.32,
    to: 0.45,
    side: "left",
    eyebrow: "The memory — Spaced review",
    title: "Reviews timed to your memory.",
    body: "Flashcards scheduled by the science of forgetting — calibrated to you. No streaks. Nothing to lose.",
  },
  {
    from: 0.45,
    to: 0.58,
    side: "right",
    eyebrow: "The storage — Your sources",
    title: "Every note, anchored. Yours.",
    body: "Voice captures, photos, readings — organized by class, and every AI assist points back to your own material.",
  },
  {
    from: 0.58,
    to: 0.7,
    side: "left",
    eyebrow: "The keyboard — Authorship",
    title: "AI that never types for you.",
    body: "Diana asks the next question; you write the answer. Every assist is logged — receipts you can show a teacher.",
  },
  {
    from: 0.7,
    to: 0.82,
    side: "right",
    eyebrow: "The battery — Energy",
    title: "Low-energy days are planned for.",
    body: "Tell Diana how you're running and the plan resizes itself. Rough days get smaller steps, not guilt.",
  },
  {
    from: 0.82,
    to: 0.96,
    side: "center",
    eyebrow: "All of it together",
    title: "One calm system.",
    body: "Planning, learning, memory, proof — working as one. Built for brains that school wasn't built for.",
  },
];

export default function FilmPage() {
  return (
    <main className="bg-[#030712]">
      <ScrollFilm chapters={CHAPTERS} heightVh={800}>
        <div className="flex flex-col items-center gap-6 px-6 text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-6xl">
            <span className="block">Your next 5 minutes,</span>
            <span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-teal-300 bg-clip-text text-transparent">
              made clear.
            </span>
          </h2>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="press-scale touch-target inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-slate-950 hover:bg-slate-200"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/"
              className="touch-target inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10"
            >
              Explore the overview
            </Link>
          </div>
        </div>
      </ScrollFilm>
    </main>
  );
}
