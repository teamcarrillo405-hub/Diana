import Link from "next/link";
import { ProductPreviewCard } from "@/components/product-preview-card";
import { ResponsiveActionRow } from "@/components/responsive-action-row";

export default function LandingPage() {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center gap-8 pb-10 pt-6 md:grid-cols-[0.92fr_1.08fr] md:gap-10">
        <div className="w-full min-w-0 space-y-7">
          <header className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-sm font-medium text-brand-strong dark:text-brand">
              <span className="size-2 shrink-0 rounded-full bg-brand" />
              <span className="min-w-0 truncate">Built for high school focus</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.04] tracking-normal sm:text-5xl lg:text-6xl">
              Your next 5 minutes, made clear.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Diana turns school chaos into one calm move at a time. It helps you plan, read, write, study, and check your work while keeping the work yours.
            </p>
          </header>

          <ResponsiveActionRow>
            <Link
              href="/signup"
              className="touch-target inline-flex w-full items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong sm:w-auto"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="touch-target inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface-raised px-5 py-3 text-sm font-semibold text-fg transition hover:bg-surface-soft sm:w-auto"
            >
              I already have an account
            </Link>
          </ResponsiveActionRow>

          <div className="grid gap-3 text-sm text-fg/90 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-raised p-3">
              One next thing, not a wall of tasks.
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-3">
              Subject tools that match how the class works.
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-3">
              Private progress without streak pressure.
            </div>
          </div>

          <p className="max-w-xl text-xs leading-5 text-muted">
            Signup requires a date of birth. Users under 13 cannot use AI features.
          </p>
        </div>

        <ProductPreviewCard />
      </section>
    </main>
  );
}
