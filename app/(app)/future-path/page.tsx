import Link from "next/link";
import { ArrowRight, FileText, GraduationCap, Landmark, Map, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { deriveFuturePath } from "@/lib/future-path/derive";
import { FutureMapVisual } from "@/components/student-portal/future-map-visual";

export default async function FuturePathPage() {
  const supabase = await createClient();
  const profile = await loadProfile();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ count: proofCount }, { count: portfolioItemCount }, { count: openAssignmentCount }] = user
    ? await Promise.all([
        supabase
          .from("task_signals")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("kind", "completed"),
        supabase
          .from("portfolio_items")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
        supabase
          .from("assignments")
          .select("id", { count: "exact", head: true })
          .neq("status", "submitted")
          .neq("status", "graded")
          .neq("status", "abandoned"),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  const model = deriveFuturePath({
    schoolYear: profile?.school_year ?? null,
    interests: (profile?.interests ?? []) as string[],
    accommodations: (profile?.accommodations ?? []) as string[],
    proofCount: proofCount ?? 0,
    portfolioItemCount: portfolioItemCount ?? 0,
    openAssignmentCount: openAssignmentCount ?? 0,
  });

  return (
    <div className="diana-page student-portal-page space-y-8">
      <section className="future-path-stage grid gap-6 pb-20 pt-2 md:pb-2 lg:grid-cols-[0.7fr_1.3fr]">
        <header className="space-y-5">
          <p className="diana-kicker">
            <GraduationCap size={15} />
            Future Path
          </p>
          <h1 className="diana-app-title max-w-xl">Turn schoolwork into a future story.</h1>
          <p className="diana-copy">
            Future Path connects daily work, learning strengths, proof points, applications, scholarships,
            and support planning. It should feel like a personal map, not a counselor portal.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/proof" className="diana-button diana-button-primary">
              Open Proof Folder
              <ShieldCheck size={17} />
            </Link>
            <Link href="/me" className="diana-button diana-button-secondary">
              View My Brain
            </Link>
          </div>
        </header>

        <FutureMapVisual model={model} />
      </section>

      <section className="future-path-lanes grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="future-lane feature-lane nexus-panel p-5">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Sparkles size={19} className="text-brand" />
            My strengths
          </h2>
          <div className="mt-5 grid gap-3">
            {model.strengths.map((strength) => (
              <div key={strength} className="strength-line text-sm leading-6">
                {strength}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FutureCard
            icon={Map}
            title="My college map"
            body="Grade-based steps from habits and interests to applications and decisions."
            href="/future-path"
          />
          <FutureCard
            icon={FileText}
            title="My application builder"
            body="Activities, essay ideas, recommendation asks, FAFSA, and scholarship tasks."
            href="/future-path"
          />
          <FutureCard
            icon={ShieldCheck}
            title="My proof folder"
            body={`${model.proofCount} completed proof points and ${model.portfolioItemCount} portfolio items can support essays and conversations.`}
            href="/proof"
          />
          <FutureCard
            icon={Landmark}
            title="My support plan"
            body="What helps me learn, how I ask for help, and what I need before due dates."
            href="/me"
          />
        </div>
      </section>

      <section className="essay-rule-stage nexus-panel grid gap-5 p-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <h2 className="text-xl font-black">College essay rule</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Diana can help students write better, but only after it captures and preserves the student&apos;s
            original thinking.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {["Think", "Outline", "Draft", "Check", "Proof"].map((step) => (
            <div key={step} className="rounded-2xl border border-border bg-surface/70 p-4">
              <p className="text-sm font-black">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FutureCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: typeof Map;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="future-lane nexus-panel group block p-5 transition hover:bg-surface-soft">
      <Icon size={21} className="text-brand" />
      <h3 className="mt-6 text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-brand-strong dark:text-brand">
        Open
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
